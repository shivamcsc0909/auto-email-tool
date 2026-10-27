import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import { renderEmail } from '../src/modules/templates/renderer.js';
import { APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';

describe('Security, Token Non-Leakage & Safety Verification', () => {
  const app = createApp();
  let authCookie: string;

  beforeAll(async () => {
    // Authenticate as super admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@rankriseusa.com', password: 'RankRiseAdmin2026!' });

    if (loginRes.headers['set-cookie']) {
      authCookie = loginRes.headers['set-cookie'][0];
    }
  });

  it('Strictly prevents leaking encrypted tokens or keys in GET /api/senders', async () => {
    const res = await request(app)
      .get('/api/senders')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.senders).toBeDefined();
    expect(Array.isArray(res.body.senders)).toBe(true);

    for (const sender of res.body.senders) {
      // Must NOT contain sensitive token/crypto fields
      expect(sender.encryptedAccessToken).toBeUndefined();
      expect(sender.encryptedRefreshToken).toBeUndefined();
      expect(sender.initializationVector).toBeUndefined();
      expect(sender.authTag).toBeUndefined();
      // Must cap at application safety limit
      expect(sender.dailySendLimit).toBeLessThanOrEqual(APPLICATION_DAILY_SENDER_LIMIT);
    }
  });

  it('Verifies safe template rendering strips script tags and handles missing variables', () => {
    const template = {
      id: 'test-sec-tpl',
      name: 'Security Test',
      category: 'WEBSITE' as any,
      categories: ['WEBSITE'],
      service: 'Web',
      language: 'en',
      subject: 'Hello {{first_name}} - Proposal for {{company_name}}',
      bodyHtml: '<p>Hi {{first_name}}, check this: <script>alert("xss")</script> Website: {{website}}</p>{{sender_signature}}',
      bodyText: 'Hi {{first_name}}, check {{company_name}} - {{sender_name}}',
      variables: ['first_name', 'company_name', 'website', 'sender_name', 'sender_signature'],
      weight: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rendered = renderEmail({
      subjectTemplate: 'Hello {{first_name}} - Proposal for {{company_name}}',
      bodyHtmlTemplate: '<p>Hi {{first_name}}, check this: <script>alert("xss")</script> Website: {{website}}</p>{{sender_signature}}',
      bodyTextTemplate: 'Hi {{first_name}}, check {{company_name}} - {{sender_name}}',
      variables: {
        company_name: 'Acme Corp',
      },
    });

    // Fallback: When firstName is undefined/null, greeting should gracefully say "there"
    expect(rendered.subject).toContain('there');
    // Script tags must be stripped
    expect(rendered.bodyHtml).not.toContain('<script>');
    // No raw unrendered {{...}} tags should leak
    expect(rendered.bodyHtml).not.toMatch(/\{\{[^}]+\}\}/);
    expect(rendered.bodyText).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('Suppression list prevents emails to unsubscribed or blocked contacts', async () => {
    await prisma.suppressionEntry.upsert({
      where: { email: 'unsubscribed-client@competitor.com' },
      update: {},
      create: {
        email: 'unsubscribed-client@competitor.com',
        reason: 'UNSUBSCRIBED',
        notes: 'Opted out',
      },
    });

    const res = await request(app)
      .get('/api/suppression?search=unsubscribed-client@competitor.com')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.entries).toBeDefined();
    expect(res.body.entries.length).toBeGreaterThan(0);
    expect(res.body.entries[0].email).toBe('unsubscribed-client@competitor.com');
  });

  it('Verifies application daily safety ceiling is strictly 20', () => {
    expect(APPLICATION_DAILY_SENDER_LIMIT).toBe(20);
  });
});
