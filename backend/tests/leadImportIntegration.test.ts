import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import * as XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/config/env.js';
import { LeadStatus } from '@rankrise/shared';

describe('Lead Ingestion & Import Integration', () => {
  const app = createApp();
  let adminToken: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.campaignLead.deleteMany({});
    await prisma.emailLog.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.leadSource.deleteMany({});
    await prisma.suppressionEntry.deleteMany({});

    adminToken = jwt.sign(
      { userId: 'admin-test-id', email: 'admin@rankriseusa.com', role: 'ADMIN' },
      env.SESSION_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('should upload spreadsheet, preview mapping, and import valid leads with greetings', async () => {
    // 1. Create a test workbook with diverse realistic leads
    const testData = [
      {
        website: 'https://hostdesk.us',
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
        website: 'https://gordondesigngroup.com',
        country: 'United States',
        'email id': 'linda@gordondesigngroup.com',
        'contact number': '5551234567',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(testData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TestLeads');
    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Upload via /api/imports/upload
    const uploadRes = await request(app)
      .post('/api/imports/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fileBuffer, 'business_leads.xlsx');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.leadSourceId).toBeDefined();
    expect(uploadRes.body.defaultMapping.email).toBe('email id');
    expect(uploadRes.body.defaultMapping.website).toBe('website');
    expect(uploadRes.body.preview.totalRows).toBe(3);
    expect(uploadRes.body.preview.validRowsCount).toBe(3);

    const leadSourceId = uploadRes.body.leadSourceId;
    const columnMapping = uploadRes.body.defaultMapping;

    // 3. Confirm import via /api/imports/confirm
    const confirmRes = await request(app)
      .post('/api/imports/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leadSourceId,
        columnMapping,
        serviceInterest: 'APP_DEVELOPMENT',
        skipDuplicates: true,
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.importedCount).toBe(3);
    expect(confirmRes.body.duplicateCount).toBe(0);

    // 4. Verify leads via /api/leads
    const listRes = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(3);

    const lindaLead = listRes.body.leads.find((l: any) => l.email === 'linda@gordondesigngroup.com');
    expect(lindaLead).toBeDefined();
    expect(lindaLead.firstName).toBe('Linda');
    expect(lindaLead.domain).toBe('gordondesigngroup.com');
    expect(lindaLead.status).toBe(LeadStatus.READY);

    const hostdeskLead = listRes.body.leads.find((l: any) => l.email === 'hostdesk7@gmail.com');
    expect(hostdeskLead).toBeDefined();
    // Role-based address hostdesk7 should NOT invent "Hi Hostdesk"
    expect(hostdeskLead.firstName).toBeNull();
    expect(hostdeskLead.domain).toBe('hostdesk.us');
  });
});
