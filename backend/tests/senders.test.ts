import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { GmailProvider } from '../src/modules/email/gmailProvider.js';
import { MicrosoftProvider } from '../src/modules/email/microsoftProvider.js';
import { seedDemoSendersIfNoneExist } from '../src/modules/senders/sendersService.js';
import { encryptToken } from '../src/utils/encryption.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/prisma.js';

describe('Sender Accounts & Gmail Provider Integration', () => {
  const app = createApp();
  let adminToken: string;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { userId: 'admin-senders-test', email: 'admin@rankriseusa.com', role: 'ADMIN' },
      env.SESSION_SECRET,
      { expiresIn: '1h' }
    );
    await seedDemoSendersIfNoneExist();
  });

  it('should list sender accounts with safety cap and remaining count without leaking tokens', async () => {
    const res = await request(app)
      .get('/api/senders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.senders.length).toBeGreaterThanOrEqual(2);

    for (const sender of res.body.senders) {
      expect(sender.dailySendLimit).toBeLessThanOrEqual(20);
      expect(sender.remainingToday).toBeDefined();
      expect(sender.signatureHtml).toBeDefined();
      expect(sender.signatureText).toBeDefined();

      // STRICT SECURITY CHECK: No token fields leak to client
      expect(sender.encryptedAccessToken).toBeUndefined();
      expect(sender.encryptedRefreshToken).toBeUndefined();
      expect(sender.password).toBeUndefined();
      expect(sender.clientSecret).toBeUndefined();
    }
  });

  it('should enforce application 20-send safety cap on update', async () => {
    const sendersRes = await request(app)
      .get('/api/senders')
      .set('Authorization', `Bearer ${adminToken}`);

    const targetSender = sendersRes.body.senders[0];

    // Attempt to update above the 20 safety limit
    const updateRes = await request(app)
      .put(`/api/senders/${targetSender.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dailySendLimit: 50, // Should be clamped or rejected
      });

    // Zod schema rejects > 20 with 400
    expect(updateRes.status).toBe(400);
    expect(updateRes.body.error).toContain('20');
  });

  it('should allow updating sender profile, signature, and title', async () => {
    const sendersRes = await request(app)
      .get('/api/senders')
      .set('Authorization', `Bearer ${adminToken}`);

    const targetSender = sendersRes.body.senders[0];

    const updateRes = await request(app)
      .put(`/api/senders/${targetSender.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Senior Business Development VP',
        phone: '123-456-7890',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.sender.title).toBe('Senior Business Development VP');
    expect(updateRes.body.sender.phone).toBe('123-456-7890');
  });

  it('should initialize GmailProvider with encrypted tokens and dispatch safely in DRY_RUN', async () => {
    const fakeAccessToken = encryptToken('ya29.test_fake_access_token');
    const fakeRefreshToken = encryptToken('1//test_fake_refresh_token');

    const provider = new GmailProvider({
      encryptedAccessToken: fakeAccessToken,
      encryptedRefreshToken: fakeRefreshToken,
    });

    const result = await provider.sendEmail({
      recipient: 'prospect@business.com',
      subject: '📱 Transform Your Business with a Mobile App',
      bodyHtml: '<p>Hi Prospect,</p><p>Check this out.</p>',
      bodyText: 'Hi Prospect,\n\nCheck this out.',
      senderName: 'Thomas',
      senderEmail: 'thomas@rankriseusa.com',
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toContain('dryrun-gmail');
  });

  it('should initialize MicrosoftProvider with encrypted tokens and dispatch safely in DRY_RUN', async () => {
    const fakeAccessToken = encryptToken('EwB4A8l6BAAU_test_ms_access_token');
    const fakeRefreshToken = encryptToken('M.R3_BAY_test_ms_refresh_token');

    const msProvider = new MicrosoftProvider({
      encryptedAccessToken: fakeAccessToken,
      encryptedRefreshToken: fakeRefreshToken,
    });

    const result = await msProvider.sendEmail({
      recipient: 'client@company.com',
      subject: '🚀 A Smarter Way to Grow Your Business',
      bodyHtml: '<p>Hi Client,</p><p>Check this out.</p>',
      bodyText: 'Hi Client,\n\nCheck this out.',
      senderName: 'Sam',
      senderEmail: 'sam@rankriseusa.com',
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toContain('dryrun-microsoft');
  });
});
