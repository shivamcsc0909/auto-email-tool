import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/prisma.js';
import {
  getNextAvailableSender,
  checkAndResetDailyCounters,
  handleSenderRateLimit,
} from '../src/modules/senders/senderRotation.js';
import { processEmailSendJob } from '../src/modules/queue/queueService.js';
import {
  SenderProvider,
  SenderStatus,
  LeadStatus,
  APPLICATION_DAILY_SENDER_LIMIT,
  EmailLogStatus,
} from '@rankrise/shared';

describe('Sender Rotation, 20/Day Cap & Queue Processing', () => {
  beforeAll(async () => {
    // Reset test database senders
    await prisma.senderAccount.deleteMany({});

    // Create 2 test senders:
    // Sender A: 19/20
    // Sender B: 5/20
    await prisma.senderAccount.createMany({
      data: [
        {
          id: 'rot-sender-a',
          provider: SenderProvider.GMAIL,
          email: 'sendera@rankriseusa.com',
          displayName: 'Sender A',
          senderName: 'Alice',
          dailySendLimit: 20,
          sentToday: 19,
          status: SenderStatus.CONNECTED,
          enabled: true,
          priority: 1,
        },
        {
          id: 'rot-sender-b',
          provider: SenderProvider.GMAIL,
          email: 'senderb@rankriseusa.com',
          displayName: 'Sender B',
          senderName: 'Bob',
          dailySendLimit: 20,
          sentToday: 5,
          status: SenderStatus.CONNECTED,
          enabled: true,
          priority: 1,
        },
      ],
    });
  });

  it('should prioritize the sender with more remaining daily capacity (Sender B with 5/20)', async () => {
    const result = await getNextAvailableSender();
    expect(result.sender).toBeDefined();
    // Sender B has sent 5 (15 remaining), whereas Sender A has sent 19 (1 remaining)
    expect(result.sender?.email).toBe('senderb@rankriseusa.com');
    expect(result.capacitySummary.totalRemainingToday).toBe(16); // 1 + 15
  });

  it('should rotate away from a sender once they hit the 20/20 application safety cap', async () => {
    // Max out Sender B to 20/20
    await prisma.senderAccount.update({
      where: { id: 'rot-sender-b' },
      data: { sentToday: 20 },
    });

    // Now only Sender A has remaining capacity (19/20)
    const result = await getNextAvailableSender();
    expect(result.sender?.email).toBe('sendera@rankriseusa.com');
    expect(result.capacitySummary.availableSenders).toBe(1);
  });

  it('should return ALL_DAILY_LIMITS_REACHED when all senders hit 20/20 cap', async () => {
    // Max out Sender A to 20/20
    await prisma.senderAccount.update({
      where: { id: 'rot-sender-a' },
      data: { sentToday: 20 },
    });

    const result = await getNextAvailableSender();
    expect(result.sender).toBeNull();
    expect(result.reason).toBe('ALL_DAILY_LIMITS_REACHED');
    expect(result.capacitySummary.totalRemainingToday).toBe(0);
  });

  it('should reset counters when daily cycle advances in target timezone', async () => {
    // Simulate last reset being yesterday
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await prisma.senderAccount.updateMany({
      data: { lastCounterReset: yesterday },
    });

    const resetCount = await checkAndResetDailyCounters('America/New_York');
    expect(resetCount).toBe(2);

    const refreshed = await prisma.senderAccount.findMany();
    for (const s of refreshed) {
      expect(s.sentToday).toBe(0);
    }
  });

  it('should process email send job, enforce suppression, and update lead & logs atomically', async () => {
    // Create test lead & campaign
    const lead = await prisma.lead.create({
      data: {
        email: 'queue-test@client.com',
        firstName: 'QueueUser',
        status: LeadStatus.READY,
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        name: 'Queue Test Campaign',
        senderIds: ['rot-sender-a', 'rot-sender-b'],
        templateIds: ['template-1'],
        status: 'RUNNING',
      },
    });

    await prisma.campaignLead.create({
      data: {
        campaignId: campaign.id,
        leadId: lead.id,
        status: 'PENDING',
      },
    });

    const jobResult = await processEmailSendJob({
      leadId: lead.id,
      campaignId: campaign.id,
      templateId: 'template-1',
      renderedSubject: '📱 Test Subject',
      renderedHtml: '<p>Test Body</p>',
      renderedText: 'Test Body',
    });

    expect(jobResult.success).toBe(true);
    expect(jobResult.status).toBe(EmailLogStatus.SENT);

    // Verify lead was marked SENT
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updatedLead?.status).toBe(LeadStatus.SENT);
    expect(updatedLead?.lastContactedAt).toBeDefined();

    // Verify email log created
    const log = await prisma.emailLog.findFirst({
      where: { leadId: lead.id, campaignId: campaign.id },
    });
    expect(log).toBeDefined();
    expect(log?.status).toBe(EmailLogStatus.SENT);
  });
});
