import { prisma } from '../../prisma.js';
import {
  parseSpreadsheetBuffer,
  detectColumns,
  buildDefaultMapping,
  generateImportPreview,
} from './fileParser.js';
import {
  ColumnMappingConfig,
  ImportPreviewResult,
  LeadStatus,
} from '@rankrise/shared';
import { determineGreeting, extractCleanDomain } from '../leads/greetingExtractor.js';
import { logAudit } from '../audit/auditService.js';

// Cache for in-flight import sources (maps leadSourceId -> { rows, headers, filename })
const importCache = new Map<string, { rows: Record<string, any>[]; headers: string[]; filename: string }>();

export async function processUploadedFile(file: Express.Multer.File): Promise<{
  leadSourceId: string;
  filename: string;
  defaultMapping: ColumnMappingConfig;
  preview: ImportPreviewResult;
}> {
  const { headers, rows } = parseSpreadsheetBuffer(file.buffer);

  const detectedColumns = detectColumns(headers, rows);
  const defaultMapping = buildDefaultMapping(detectedColumns);

  // Fetch existing emails and suppressions for collision detection
  const [existingLeads, suppressedEntries] = await Promise.all([
    prisma.lead.findMany({ select: { email: true, domain: true } }),
    prisma.suppressionEntry.findMany({ select: { email: true, domain: true } }),
  ]);

  const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()));
  const existingDomains = new Set(existingLeads.map(l => l.domain?.toLowerCase()).filter(Boolean) as string[]);
  const suppressedEmails = new Set(suppressedEntries.map(s => s.email.toLowerCase()));
  const suppressedDomains = new Set(suppressedEntries.map(s => s.domain?.toLowerCase()).filter(Boolean) as string[]);

  const preview = generateImportPreview({
    rows,
    headers,
    mapping: defaultMapping,
    detectedColumns,
    existingEmails,
    existingDomains,
    suppressedEmails,
    suppressedDomains,
  });

  // Create LeadSource record in DB
  const leadSource = await prisma.leadSource.create({
    data: {
      filename: `${Date.now()}_${file.originalname}`,
      originalName: file.originalname,
      fileSize: file.size,
      rowCount: rows.length,
      validCount: preview.validRowsCount,
      invalidCount: preview.invalidRowsCount,
      duplicateCount: preview.duplicateRowsCount,
    },
  });

  // Cache parsed rows in memory for subsequent preview or confirm steps
  importCache.set(leadSource.id, {
    rows,
    headers,
    filename: file.originalname,
  });

  return {
    leadSourceId: leadSource.id,
    filename: file.originalname,
    defaultMapping,
    preview,
  };
}

export async function recomputePreview(
  leadSourceId: string,
  customMapping: ColumnMappingConfig
): Promise<ImportPreviewResult> {
  const cached = importCache.get(leadSourceId);
  if (!cached) {
    throw new Error('Import session expired or not found. Please upload file again.');
  }

  const { rows, headers } = cached;
  const detectedColumns = detectColumns(headers, rows);

  const [existingLeads, suppressedEntries] = await Promise.all([
    prisma.lead.findMany({ select: { email: true, domain: true } }),
    prisma.suppressionEntry.findMany({ select: { email: true, domain: true } }),
  ]);

  const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()));
  const existingDomains = new Set(existingLeads.map(l => l.domain?.toLowerCase()).filter(Boolean) as string[]);
  const suppressedEmails = new Set(suppressedEntries.map(s => s.email.toLowerCase()));
  const suppressedDomains = new Set(suppressedEntries.map(s => s.domain?.toLowerCase()).filter(Boolean) as string[]);

  return generateImportPreview({
    rows,
    headers,
    mapping: customMapping,
    detectedColumns,
    existingEmails,
    existingDomains,
    suppressedEmails,
    suppressedDomains,
  });
}

export async function commitImport(params: {
  leadSourceId: string;
  columnMapping: ColumnMappingConfig;
  serviceInterest?: string;
  skipDuplicates?: boolean;
  userId?: string;
  ipAddress?: string;
}): Promise<{
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  leadSourceId: string;
}> {
  const cached = importCache.get(params.leadSourceId);
  if (!cached) {
    throw new Error('Import session expired or not found. Please re-upload the file.');
  }

  const { rows } = cached;
  const mapping = params.columnMapping;

  // Retrieve current suppressions and existing emails to guarantee atomic safety
  const [existingLeads, suppressedEntries] = await Promise.all([
    prisma.lead.findMany({ select: { email: true } }),
    prisma.suppressionEntry.findMany({ select: { email: true, domain: true } }),
  ]);

  const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()));
  const suppressedEmails = new Set(suppressedEntries.map(s => s.email.toLowerCase()));
  const suppressedDomains = new Set(suppressedEntries.map(s => s.domain?.toLowerCase()).filter(Boolean) as string[]);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const seenInBatch = new Set<string>();

  const leadsToCreate: any[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const rawEmail = String(row[mapping.email] || '').trim().toLowerCase();
    const rawWebsite = mapping.website ? String(row[mapping.website] || '').trim() : '';
    const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
    const rawCompany = mapping.company ? String(row[mapping.company] || '').trim() : '';
    const rawCountry = mapping.country ? String(row[mapping.country] || '').trim() : 'United States';
    const rawPhone = mapping.phone ? String(row[mapping.phone] || '').trim() : '';

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      invalidCount++;
      continue;
    }

    if (seenInBatch.has(rawEmail) || (params.skipDuplicates && existingEmails.has(rawEmail))) {
      duplicateCount++;
      continue;
    }

    seenInBatch.add(rawEmail);

    const cleanDomain = extractCleanDomain(rawWebsite) || extractCleanDomain(rawEmail);
    const isSuppressed = suppressedEmails.has(rawEmail) || (cleanDomain && suppressedDomains.has(cleanDomain));

    const greeting = determineGreeting({
      email: rawEmail,
      explicitName: rawName,
      companyName: rawCompany,
      website: rawWebsite,
      domain: cleanDomain,
    });

    leadsToCreate.push({
      email: rawEmail,
      firstName: greeting.firstName,
      lastName: greeting.lastName,
      fullName: greeting.fullName,
      companyName: greeting.companyName,
      website: rawWebsite || null,
      domain: cleanDomain || null,
      country: rawCountry || 'United States',
      phone: rawPhone || null,
      serviceInterest: params.serviceInterest || null,
      source: cached.filename,
      sourceRowNumber: rowNumber,
      status: isSuppressed ? LeadStatus.DO_NOT_CONTACT : LeadStatus.READY,
      customNotes: isSuppressed ? 'Suppressed prior to import' : null,
      leadSourceId: params.leadSourceId,
    });
  }

  // Batch insert leads
  if (leadsToCreate.length > 0) {
    await prisma.lead.createMany({
      data: leadsToCreate,
      skipDuplicates: true,
    });
  }

  // Update LeadSource stats
  await prisma.leadSource.update({
    where: { id: params.leadSourceId },
    data: {
      validCount: leadsToCreate.length,
      invalidCount,
      duplicateCount,
    },
  });

  await logAudit({
    userId: params.userId,
    module: 'IMPORTS',
    action: 'IMPORT_LEADS_SUCCESS',
    referenceId: params.leadSourceId,
    details: {
      totalRows: rows.length,
      importedCount: leadsToCreate.length,
      invalidCount,
      duplicateCount,
      filename: cached.filename,
    },
    ipAddress: params.ipAddress,
  });

  // Clean cache
  importCache.delete(params.leadSourceId);

  return {
    importedCount: leadsToCreate.length,
    duplicateCount,
    invalidCount,
    leadSourceId: params.leadSourceId,
  };
}
