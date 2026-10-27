import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSpreadsheetBuffer,
  detectColumns,
  buildDefaultMapping,
  generateImportPreview,
} from '../src/modules/imports/fileParser.js';

describe('Spreadsheet Parser & Column Detection', () => {
  it('should parse XLSX buffer and detect columns from sample 1 format', () => {
    // website | country | email id | contact number
    const data = [
      {
        website: 'hostdesk.us',
        country: 'United States',
        'email id': 'hostdesk7@gmail.com',
        'contact number': '4089306964',
      },
      {
        website: 'meteorminerals.us',
        country: 'United States',
        'email id': 'brad@bradazz.com',
        'contact number': '5413824600',
      },
      {
        website: 'ttdtruckingsolutions.com',
        country: 'United States',
        'email id': 'chmsolutionsllc@gmail.com',
        'contact number': '3072038936',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseSpreadsheetBuffer(buffer);
    expect(parsed.headers).toContain('email id');
    expect(parsed.headers).toContain('website');
    expect(parsed.headers).toContain('contact number');
    expect(parsed.rows.length).toBe(3);

    const detected = detectColumns(parsed.headers, parsed.rows);
    const mapping = buildDefaultMapping(detected);

    expect(mapping.email).toBe('email id');
    expect(mapping.website).toBe('website');
    expect(mapping.phone).toBe('contact number');
    expect(mapping.country).toBe('country');

    const preview = generateImportPreview({
      rows: parsed.rows,
      headers: parsed.headers,
      mapping,
      detectedColumns: detected,
    });

    expect(preview.totalRows).toBe(3);
    expect(preview.validRowsCount).toBe(3);
    expect(preview.invalidRowsCount).toBe(0);
    expect(preview.duplicateRowsCount).toBe(0);
  });

  it('should detect sample 2 format (domain_name, registrant_email, registrant_phone)', () => {
    const data = [
      {
        domain_name: 'carolinacruise.com',
        registrant_country: 'United States',
        registrant_email: 'admin@namefind.com',
        Status: 'Active',
        registrant_phone: '7813736856',
        response: 'OK',
      },
      {
        domain_name: 'emberpeak.us',
        registrant_country: 'United States',
        registrant_email: 'operation@usunfinite.com',
        Status: 'Active',
        registrant_phone: '9515728866',
        response: 'OK',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Domains');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseSpreadsheetBuffer(buffer);
    const detected = detectColumns(parsed.headers, parsed.rows);
    const mapping = buildDefaultMapping(detected);

    expect(mapping.email).toBe('registrant_email');
    expect(mapping.website).toBe('domain_name');
    expect(mapping.phone).toBe('registrant_phone');
    expect(mapping.country).toBe('registrant_country');
  });

  it('should flag duplicates and suppressed emails during preview', () => {
    const rows = [
      { email: 'valid@example.com', website: 'example.com' },
      { email: 'valid@example.com', website: 'example.com' }, // duplicate
      { email: 'suppressed@bad.com', website: 'bad.com' }, // suppressed
      { email: 'not-an-email', website: 'broken.com' }, // invalid email
    ];

    const detected = detectColumns(['email', 'website'], rows);
    const mapping = buildDefaultMapping(detected);

    const preview = generateImportPreview({
      rows,
      headers: ['email', 'website'],
      mapping,
      detectedColumns: detected,
      suppressedEmails: new Set(['suppressed@bad.com']),
    });

    expect(preview.totalRows).toBe(4);
    expect(preview.validRowsCount).toBe(1);
    expect(preview.invalidRowsCount).toBe(3);
    expect(preview.duplicateRowsCount).toBe(1);
    expect(preview.suppressedRowsCount).toBe(1);
  });
});
