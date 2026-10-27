import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import {
  renderTemplateString,
  renderEmail,
  sanitizeEmailHtml,
} from '../src/modules/templates/renderer.js';
import {
  generateHtmlSignature,
  generatePlainTextSignature,
} from '../src/modules/senders/signatureEngine.js';
import { seedTemplatesIfNoneExist } from '../src/modules/templates/templatesService.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/config/env.js';
import { ServiceCategory } from '@rankrise/shared';

describe('Templates, Personalization & Signatures', () => {
  const app = createApp();
  let adminToken: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { userId: 'test-admin', email: 'admin@rankriseusa.com', role: 'ADMIN' },
      env.SESSION_SECRET,
      { expiresIn: '1h' }
    );
    await seedTemplatesIfNoneExist();
  });

  describe('Safe Variable Rendering Engine', () => {
    it('should correctly substitute all known variables', () => {
      const template = 'Hi {{first_name}}, at {{company_name}} in {{country}}. Best, {{sender_name}}';
      const rendered = renderTemplateString(template, {
        first_name: 'Linda',
        company_name: 'Gordon Design Group',
        country: 'United States',
        sender_name: 'Thomas',
      });

      expect(rendered).toBe('Hi Linda, at Gordon Design Group in United States. Best, Thomas');
    });

    it('should use fallbacks and NEVER output raw curly brackets for missing variables', () => {
      const template = 'Hi {{first_name}}, we noticed {{company_name}} at {{unknown_future_var}}!';
      const rendered = renderTemplateString(template, {});

      // Missing first_name falls back to "there"
      expect(rendered).toContain('Hi there,');
      // Missing company_name falls back to "your business"
      expect(rendered).toContain('your business');
      // Unknown placeholder is cleanly stripped
      expect(rendered).not.toContain('{{');
      expect(rendered).not.toContain('}}');
      expect(rendered).not.toContain('unknown_future_var');
    });

    it('should sanitize HTML and strip malicious script tags', () => {
      const dirty = '<p>Hi Linda,</p><script>alert("hack")</script><a href="https://example.com" onclick="steal()">Click here</a>';
      const clean = sanitizeEmailHtml(dirty);

      expect(clean).toContain('<p>Hi Linda,</p>');
      expect(clean).toContain('<a href="https://example.com">Click here</a>');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert');
      expect(clean).not.toContain('onclick');
    });
  });

  describe('Sender Dynamic Signature Engine', () => {
    it('should dynamically generate individual signatures matching sender details', () => {
      const thomasSig = generatePlainTextSignature({
        senderName: 'Thomas',
        email: 'thomas@rankriseusa.com',
        title: 'Business Development',
        company: 'RANKRISEUSA',
        website: 'rankriseusa.com',
      });
      expect(thomasSig).toContain('Thomas');
      expect(thomasSig).toContain('thomas@rankriseusa.com');
      expect(thomasSig).toContain('RANKRISEUSA');

      const samSig = generatePlainTextSignature({
        senderName: 'Sam',
        email: 'sam@rankriseusa.com',
        title: 'Business Development',
        company: 'RANKRISEUSA',
        website: 'rankriseusa.com',
      });
      expect(samSig).toContain('Sam');
      expect(samSig).toContain('sam@rankriseusa.com');

      const gmailSig = generatePlainTextSignature({
        senderName: 'Shivam',
        email: 'shivampandeyyuyu@gmail.com',
        title: 'Outreach Specialist',
        company: 'RANKRISEUSA',
      });
      expect(gmailSig).toContain('shivampandeyyuyu@gmail.com');
    });

    it('should generate email-safe HTML signature table', () => {
      const htmlSig = generateHtmlSignature({
        senderName: 'Thomas',
        email: 'thomas@rankriseusa.com',
        title: 'Business Development',
        company: 'RANKRISEUSA',
        website: 'rankriseusa.com',
      });

      expect(htmlSig).toContain('<table');
      expect(htmlSig).toContain('Thomas');
      expect(htmlSig).toContain('thomas@rankriseusa.com');
      expect(htmlSig).toContain('rankriseusa.com');
    });
  });

  describe('Template Management & REST API', () => {
    it('should have all 10 seed templates available with proper categories', async () => {
      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(10);

      // Check Template 1
      const t1 = res.body.templates.find((t: any) => t.id === 'template-1');
      expect(t1).toBeDefined();
      expect(t1.subject).toContain('📱 Transform Your Business with a Mobile App');
      expect(t1.category).toBe(ServiceCategory.APP_DEVELOPMENT);

      // Check Template 6 (Website & Apps)
      const t6 = res.body.templates.find((t: any) => t.id === 'template-6');
      expect(t6).toBeDefined();
      expect(t6.categories).toContain(ServiceCategory.WEBSITE);
    });

    it('should duplicate an existing template', async () => {
      const res = await request(app)
        .post('/api/templates/template-1/duplicate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      expect(res.body.template.name).toBe('Mobile App Transformation (Copy)');

      // Clean up duplicated template
      await prisma.template.delete({ where: { id: res.body.template.id } });
    });

    it('should render a realistic live email preview', async () => {
      const res = await request(app)
        .post('/api/templates/template-1/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.subject).toBe('📱 Transform Your Business with a Mobile App');
      expect(res.body.bodyHtml).toContain('Hi Linda,');
      expect(res.body.bodyHtml).toContain('<!DOCTYPE html>');
      expect(res.body.recipientEmail).toBe('linda@gordondesigngroup.com');
    });

    it('should execute test email send in DRY_RUN mode without error and log it', async () => {
      // First ensure a sender account exists in DB for testing
      const sender = await prisma.senderAccount.upsert({
        where: { email: 'thomas@rankriseusa.com' },
        create: {
          id: 'sender-test-1',
          provider: 'GMAIL',
          email: 'thomas@rankriseusa.com',
          displayName: 'Thomas RankRise',
          senderName: 'Thomas',
          title: 'Business Development',
          company: 'RANKRISEUSA',
          website: 'rankriseusa.com',
          dailySendLimit: 20,
          status: 'CONNECTED',
        },
        update: {},
      });

      const res = await request(app)
        .post('/api/templates/test-send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          senderId: sender.id,
          templateId: 'template-1',
          recipientEmail: 'client-test@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe('DRY_RUN');
      expect(res.body.logId).toBeDefined();

      // Verify email log in DB
      const log = await prisma.emailLog.findUnique({
        where: { id: res.body.logId },
      });
      expect(log).toBeDefined();
      expect(log?.recipient).toBe('client-test@example.com');
      expect(log?.status).toBe('SENT');
      expect(log?.providerMessageId).toContain('dry_run');
    });
  });
});
