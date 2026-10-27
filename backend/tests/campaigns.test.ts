import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/config/env.js';
import { CampaignStatus, CampaignLeadStatus, ServiceCategory } from '@rankrise/shared';

describe('Campaigns Lifecycle, Safety & Scheduling', () => {
  const app = createApp();
  let adminToken: string;
  let testLeadId: string;
  let testSenderId: string;
  let testTemplateId: string;

  let testCampaignId: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { userId: 'admin-campaigns-test', email: 'admin@rankriseusa.com', role: 'ADMIN' },
      env.SESSION_SECRET,
      { expiresIn: '1h' }
    );

    // Create prerequisite test lead, sender, and template
    const lead = await prisma.lead.create({
      data: {
        email: `campaign-lead-${Date.now()}@testfirm.com`,
        firstName: 'Diana',
        companyName: 'TestFirm LLC',
      },
    });
    testLeadId = lead.id;

    const sender = await prisma.senderAccount.upsert({
      where: { email: 'campaign-sender@rankriseusa.com' },
      create: {
        id: 'camp-sender-1',
        provider: 'GMAIL',
        email: 'campaign-sender@rankriseusa.com',
        displayName: 'Campaign Sender',
        senderName: 'Alex',
        dailySendLimit: 20,
        sentToday: 0,
        status: 'CONNECTED',
      },
      update: {
        status: 'CONNECTED',
        sentToday: 0,
      },
    });
    testSenderId = sender.id;

    const template = await prisma.template.upsert({
      where: { id: 'template-1' },
      create: {
        id: 'template-1',
        name: 'Mobile App Transformation',
        category: 'APP_DEVELOPMENT',
        subject: 'Transform Your Business',
        bodyHtml: '<p>Hi {{first_name}},</p>',
        bodyText: 'Hi {{first_name}},',
      },
      update: {},
    });
    testTemplateId = template.id;
  });

  it('should create a campaign in DRAFT state with proper safety limits', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Summer Outreach Campaign ${Date.now()}`,
        serviceCategory: ServiceCategory.APP_DEVELOPMENT,
        templateIds: [testTemplateId],
        senderIds: [testSenderId],
        leadIds: [testLeadId],
        perSenderLimit: 20,
        delayMin: 90,
        delayMax: 300,
      });

    expect(res.status).toBe(201);
    expect(res.body.campaign.status).toBe(CampaignStatus.DRAFT);
    expect(res.body.campaign.totalLeads).toBe(1);
    expect(res.body.campaign.perSenderLimit).toBe(20);
    testCampaignId = res.body.campaign.id;
  });

  it('should calculate capacity and reject start if explicit confirmation is missing', async () => {
    expect(testCampaignId).toBeDefined();

    // Verify campaign is present in listing
    const listRes = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const found = listRes.body.campaigns.find((c: any) => c.id === testCampaignId);
    expect(found).toBeDefined();

    // Check capacity metrics
    const capRes = await request(app)
      .get(`/api/campaigns/${testCampaignId}/capacity`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(capRes.status).toBe(200);
    expect(capRes.body.applicationMaxPerSender).toBe(20);
    expect(capRes.body.estimatedDailyCapacity).toBeGreaterThan(0);

    // Attempt start without confirmation
    const startFailRes = await request(app)
      .post(`/api/campaigns/${testCampaignId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmation: false });

    expect(startFailRes.status).toBe(400);
    expect(startFailRes.body.error).toContain('confirmation is required');
  });

  it('should launch, pause, and resume campaign lifecycle safely', async () => {
    expect(testCampaignId).toBeDefined();

    // Start with confirmation
    const startRes = await request(app)
      .post(`/api/campaigns/${testCampaignId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmation: true });

    expect(startRes.status).toBe(200);
    expect(startRes.body.campaign.status).toBe(CampaignStatus.RUNNING);

    // Pause campaign
    const pauseRes = await request(app)
      .post(`/api/campaigns/${testCampaignId}/pause`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.campaign.status).toBe(CampaignStatus.PAUSED);

    // Resume campaign
    const resumeRes = await request(app)
      .post(`/api/campaigns/${testCampaignId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.campaign.status).toBe(CampaignStatus.RUNNING);

    // Stop campaign
    const stopRes = await request(app)
      .post(`/api/campaigns/${testCampaignId}/stop`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(stopRes.status).toBe(200);
    expect(stopRes.body.campaign.status).toBe(CampaignStatus.STOPPED);
  });
});
