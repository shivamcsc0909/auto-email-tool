import * as XLSX from 'xlsx';
import {
  COLUMN_ALIASES,
  DetectedColumn,
  ColumnMappingConfig,
  ImportPreviewRow,
  ImportPreviewResult,
} from '@rankrise/shared';
import { extractCleanDomain, determineGreeting } from '../leads/greetingExtractor.js';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Normalizes a header string for comparison:
 * "Email ID" -> "emailid", "registrant_phone" -> "registrantphone"
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an uploaded Excel or CSV buffer into raw records and headers.
 */
export function parseSpreadsheetBuffer(buffer: Buffer): {
  headers: string[];
  rows: Record<string, any>[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Spreadsheet does not contain any sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  // Extract all unique headers across all rows to handle inconsistent shapes
  const headerSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach(key => headerSet.add(key.trim()));
  }

  return {
    headers: Array.from(headerSet),
    rows,
  };
}

/**
 * Detects and scores candidate fields for each header based on aliases and value heuristics.
 */
export function detectColumns(
  headers: string[],
  rows: Record<string, any>[]
): DetectedColumn[] {
  return headers.map(header => {
    const normH = normalizeHeader(header);
    let bestField: string | null = null;
    let maxScore = 0;

    // 1. Alias matching
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      for (const alias of aliases) {
        const normAlias = normalizeHeader(alias);
        if (normH === normAlias) {
          bestField = field;
          maxScore = 0.95;
          break;
        } else if (normH.includes(normAlias) || normAlias.includes(normH)) {
          if (0.75 > maxScore) {
            bestField = field;
            maxScore = 0.75;
          }
        }
      }
      if (maxScore >= 0.95) break;
    }

    // 2. Sample value inspection
    const sampleValues: string[] = [];
    let emailCount = 0;
    let urlCount = 0;
    let validSampleCount = 0;

    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const val = String(rows[i][header] || '').trim();
      if (val) {
        if (sampleValues.length < 5) {
          sampleValues.push(val);
        }
        validSampleCount++;
        if (EMAIL_REGEX.test(val)) emailCount++;
        if (val.includes('.') && (val.includes('.com') || val.includes('.us') || val.includes('http'))) {
          urlCount++;
        }
      }
    }

    // Value heuristics boost
    if (validSampleCount > 0) {
      if (emailCount / validSampleCount > 0.5) {
        bestField = 'email';
        maxScore = 1.0;
      } else if (urlCount / validSampleCount > 0.5 && bestField !== 'email') {
        bestField = 'website';
        maxScore = Math.max(maxScore, 0.9);
      }
    }

    return {
      originalHeader: header,
      suggestedField: bestField,
      sampleValues,
      confidence: maxScore,
    };
  });
}

/**
 * Creates default column mapping from detected columns.
 */
export function buildDefaultMapping(detected: DetectedColumn[]): ColumnMappingConfig {
  const mapping: Partial<ColumnMappingConfig> = {};

  for (const col of detected) {
    if (col.suggestedField && !mapping[col.suggestedField as keyof ColumnMappingConfig]) {
      mapping[col.suggestedField as keyof ColumnMappingConfig] = col.originalHeader;
    }
  }

  return {
    email: mapping.email || '',
    website: mapping.website,
    name: mapping.name,
    company: mapping.company,
    country: mapping.country,
    phone: mapping.phone,
    city: mapping.city,
    industry: mapping.industry,
  };
}

/**
 * Validates, normalizes, and previews rows according to chosen column mapping.
 */
export function generateImportPreview(params: {
  rows: Record<string, any>[];
  headers: string[];
  mapping: ColumnMappingConfig;
  detectedColumns: DetectedColumn[];
  existingEmails?: Set<string>;
  existingDomains?: Set<string>;
  suppressedEmails?: Set<string>;
  suppressedDomains?: Set<string>;
}): ImportPreviewResult {
  const {
    rows,
    headers,
    mapping,
    detectedColumns,
    existingEmails = new Set(),
    existingDomains = new Set(),
    suppressedEmails = new Set(),
    suppressedDomains = new Set(),
  } = params;

  const sampleRows: ImportPreviewRow[] = [];
  const seenEmailsInFile = new Set<string>();
  const seenDomainsInFile = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let suppressedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const errors: string[] = [];

    // Extract raw fields using mapping
    const rawEmail = String(row[mapping.email] || '').trim().toLowerCase();
    const rawWebsite = mapping.website ? String(row[mapping.website] || '').trim() : '';
    const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
    const rawCompany = mapping.company ? String(row[mapping.company] || '').trim() : '';
    const rawCountry = mapping.country ? String(row[mapping.country] || '').trim() : 'United States';
    const rawPhone = mapping.phone ? String(row[mapping.phone] || '').trim() : '';

    const cleanDomain = extractCleanDomain(rawWebsite) || extractCleanDomain(rawEmail);

    // Validation checks
    if (!rawEmail) {
      errors.push('Missing email address');
    } else if (!EMAIL_REGEX.test(rawEmail)) {
      errors.push(`Invalid email format: "${rawEmail}"`);
    }

    // Suppression checks
    let isSuppressed = false;
    if (rawEmail && suppressedEmails.has(rawEmail)) {
      isSuppressed = true;
      errors.push('Recipient email is in the suppression / do-not-contact list');
    }
    if (cleanDomain && suppressedDomains.has(cleanDomain)) {
      isSuppressed = true;
      errors.push(`Domain "${cleanDomain}" is in the suppression list`);
    }

    // Duplicate checks
    let isDuplicate = false;
    if (rawEmail) {
      if (seenEmailsInFile.has(rawEmail)) {
        isDuplicate = true;
        errors.push('Duplicate email within this file');
      } else if (existingEmails.has(rawEmail)) {
        isDuplicate = true;
        errors.push('Email already exists in database');
      }
      seenEmailsInFile.add(rawEmail);
    }

    if (cleanDomain) {
      if (seenDomainsInFile.has(cleanDomain)) {
        // Optional duplicate domain flag
      }
      seenDomainsInFile.add(cleanDomain);
    }

    const isValid = errors.length === 0;

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      if (isDuplicate) duplicateCount++;
      if (isSuppressed) suppressedCount++;
    }

    // Compute greeting & identity
    const greeting = determineGreeting({
      email: rawEmail,
      explicitName: rawName,
      companyName: rawCompany,
      website: rawWebsite,
      domain: cleanDomain,
    });

    if (sampleRows.length < 50) {
      sampleRows.push({
        rowNumber,
        raw: row,
        normalized: {
          email: rawEmail,
          domain: cleanDomain || undefined,
          website: rawWebsite || undefined,
          firstName: greeting.firstName || undefined,
          lastName: greeting.lastName || undefined,
          fullName: greeting.fullName || undefined,
          companyName: greeting.companyName || undefined,
          country: rawCountry || 'United States',
          phone: rawPhone || undefined,
        },
        isValid,
        validationErrors: errors,
        isDuplicate,
        isSuppressed,
      });
    }
  }

  return {
    totalRows: rows.length,
    validRowsCount: validCount,
    invalidRowsCount: invalidCount,
    duplicateRowsCount: duplicateCount,
    suppressedRowsCount: suppressedCount,
    sampleRows,
    headers,
    detectedColumns,
  };
}
