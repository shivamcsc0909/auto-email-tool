import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';
import {
  SenderProvider,
  LeadStatus,
  CampaignLeadStatus,
  EmailLogStatus,
  APPLICATION_DAILY_SENDER_LIMIT,
} from '@rankrise/shared';
import { GmailProvider } from '../email/gmailProvider.js';
import { MicrosoftProvider } from '../email/microsoftProvider.js';
import { getNextAvailableSender, handleSenderRateLimit } from '../senders/senderRotation.js';
import { logAudit } from '../audit/auditService.js';

export interface SendJobPayload {
  leadId: string;
  campaignId: string;
  templateId: string;
  senderId?: string;
  renderedSubject: string;
  renderedHtml: string;
  renderedText: string;
  attemptNumber?: number;
}

let redisConnection: Redis | null = null;
let emailSendQueue: Queue | null = null;
let emailWorker: Worker | null = null;
let isInMemoryFallback = false;

/**
 * Initializes Redis connection and BullMQ queue or falls back to in-memory processing.
 */
export async function initializeQueue(): Promise<void> {
  try {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: () => null, // Do not endlessly retry if initial connection fails
    });

    redisConnection.on('error', (err) => {
      // Suppress unhandled crash events if Redis is unreachable
      if (isInMemoryFallback) return;
    });

    await redisConnection.connect();

    emailSendQueue = new Queue('EMAIL_SEND', { connection: redisConnection });

    emailWorker = new Worker(
      'EMAIL_SEND',
      async (job: Job<SendJobPayload>) => {
        return processEmailSendJob(job.data);
      },
      { connection: redisConnection, concurrency: 5 }
    );

    emailWorker.on('failed', (job, err) => {
      console.error(`BullMQ job ${job?.id} failed:`, err);
    });

    console.log('✅ BullMQ queue initialized with Redis at', env.REDIS_URL);
  } catch (err) {
    try {
      redisConnection?.disconnect(false);
    } catch (_) {}
    redisConnection = null;
    isInMemoryFallback = true;
    console.warn('⚠️ Redis not reachable. Activating In-Memory Background Queue Fallback for local/DRY_RUN mode.');
  }
}

/**
 * Returns operational health status of the background queue system.
 */
export function getQueueHealth(): {
  status: 'active' | 'in-memory-fallback' | 'uninitialized';
  engine: 'BULLMQ_REDIS' | 'IN_MEMORY_FALLBACK';
  redisConnected: boolean;
} {
  return {
    status: isInMemoryFallback ? 'in-memory-fallback' : (emailWorker ? 'active' : 'uninitialized'),
    engine: isInMemoryFallback ? 'IN_MEMORY_FALLBACK' : 'BULLMQ_REDIS',
    redisConnected: !isInMemoryFallback && redisConnection?.status === 'ready',
  };
}

/**
 * Enqueues an email dispatch job with optional delay.
 */
export async function enqueueEmailSend(payload: SendJobPayload, delayMs = 0): Promise<string> {
  const jobId = `send-${payload.campaignId}-${payload.leadId}-${Date.now()}`;

  // Record in EmailJob table for full observability
  await prisma.emailJob.create({
    data: {
      jobId,
      queueName: 'EMAIL_SEND',
      campaignId: payload.campaignId,
      leadId: payload.leadId,
      senderId: payload.senderId,
      templateId: payload.templateId,
      status: 'QUEUED',
      payload: JSON.stringify(payload),
      scheduledFor: new Date(Date.now() + delayMs),
    },
  });

  if (!isInMemoryFallback && emailSendQueue) {
    await emailSendQueue.add('EMAIL_SEND', payload, {
      jobId,
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });
  } else {
    // Process via in-memory timer
    setTimeout(async () => {
      try {
        await processEmailSendJob(payload);
      } catch (err) {
        console.error('In-memory job execution error:', err);
      }
    }, Math.min(delayMs, 100)); // Accelerated for dry-run/unit test if in-memory
  }

  return jobId;
}

/**
 * Core processor for an individual email job.
 * Executes the 5-point verification check before dispatch.
 */
export async function processEmailSendJob(payload: SendJobPayload): Promise<{
  success: boolean;
  status: EmailLogStatus;
  messageId?: string;
  error?: string;
}> {
  const attemptNumber = payload.attemptNumber || 1;

  // 1. Fetch Lead
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead) {
    return { success: false, status: EmailLogStatus.SKIPPED, error: 'Lead not found' };
  }

  // 2. Suppression Check
  const suppressed = await prisma.suppressionEntry.findFirst({
    where: {
      OR: [
        { email: lead.email.toLowerCase() },
        ...(lead.domain ? [{ domain: lead.domain.toLowerCase() }] : []),
      ],
    },
  });

  if (suppressed || lead.status === LeadStatus.DO_NOT_CONTACT) {
    await recordLogAndSkip(payload, lead.email, 'Lead is on suppression list');
    return { success: false, status: EmailLogStatus.SKIPPED, error: 'Suppressed' };
  }

  // 2b. Duplicate Send Protection (Ensure lead was not already sent in this campaign)
  const existingCampaignLead = await prisma.campaignLead.findUnique({
    where: { campaignId_leadId: { campaignId: payload.campaignId, leadId: payload.leadId } },
  });
  if (existingCampaignLead && existingCampaignLead.status === CampaignLeadStatus.SENT) {
    await recordLogAndSkip(payload, lead.email, 'Lead has already received an email for this campaign');
    return { success: false, status: EmailLogStatus.SKIPPED, error: 'Already sent' };
  }

  // 3. Campaign Status Check (Pause / Stop verification)
  const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } });
  if (!campaign || campaign.status === 'PAUSED' || campaign.status === 'STOPPED') {
    return { success: false, status: EmailLogStatus.SKIPPED, error: `Campaign is ${campaign?.status || 'NOT_FOUND'}` };
  }

  // 4. Sender Allocation & 20-send Daily Cap Check
  let senderId = payload.senderId;
  let sender = senderId ? await prisma.senderAccount.findUnique({ where: { id: senderId } }) : null;

  // If sender has exceeded the 20/day safety cap, rotate to next available sender in campaign
  if (!sender || sender.sentToday >= Math.min(sender.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT) || sender.status !== 'CONNECTED') {
    const rotation = await getNextAvailableSender(campaign.senderIds);
    if (!rotation.sender) {
      // All senders capped out for today
      await prisma.campaignLead.update({
        where: { campaignId_leadId: { campaignId: payload.campaignId, leadId: payload.leadId } },
        data: { status: CampaignLeadStatus.PENDING, lastError: 'Daily capacity reached across all senders' },
      });
      return { success: false, status: EmailLogStatus.SKIPPED, error: 'Daily sender limit reached' };
    }
    senderId = rotation.sender.id;
    sender = await prisma.senderAccount.findUnique({ where: { id: senderId } });
  }

  if (!sender) {
    return { success: false, status: EmailLogStatus.FAILED, error: 'No sender available' };
  }

  // 5. Instantiate Provider
  let provider;
  if (sender.provider === SenderProvider.GMAIL) {
    provider = new GmailProvider({
      encryptedAccessToken: sender.encryptedAccessToken,
      encryptedRefreshToken: sender.encryptedRefreshToken,
    });
  } else {
    provider = new MicrosoftProvider({
      encryptedAccessToken: sender.encryptedAccessToken,
      encryptedRefreshToken: sender.encryptedRefreshToken,
    });
  }

  const sendResult = await provider.sendEmail({
    recipient: lead.email,
    subject: payload.renderedSubject,
    bodyHtml: payload.renderedHtml,
    bodyText: payload.renderedText,
    senderName: sender.senderName,
    senderEmail: sender.email,
  });

  const now = new Date();

  if (sendResult.success) {
    // Record successful send
    await prisma.$transaction([
      // 1. Email Log
      prisma.emailLog.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          senderId: sender.id,
          templateId: payload.templateId,
          provider: sender.provider,
          recipient: lead.email,
          subject: payload.renderedSubject,
          status: EmailLogStatus.SENT,
          providerMessageId: sendResult.providerMessageId,
          attemptNumber,
          sentAt: now,
        },
      }),
      // 2. Increment Sender daily counter
      prisma.senderAccount.update({
        where: { id: sender.id },
        data: {
          sentToday: { increment: 1 },
          lastSentAt: now,
        },
      }),
      // 3. Update Lead status
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.SENT,
          lastContactedAt: now,
          lastSenderId: sender.id,
          lastTemplateId: payload.templateId,
        },
      }),
      // 4. Update CampaignLead
      prisma.campaignLead.update({
        where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
        data: {
          status: CampaignLeadStatus.SENT,
          senderId: sender.id,
          templateId: payload.templateId,
          sentAt: now,
        },
      }),
      // 5. Update Campaign stats
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          sentLeads: { increment: 1 },
        },
      }),
    ]);

    return {
      success: true,
      status: EmailLogStatus.SENT,
      messageId: sendResult.providerMessageId,
    };
  } else {
    // Handle Provider Error
    const isRateLimit = sendResult.error?.isRateLimit || sendResult.error?.isQuotaExceeded;
    if (isRateLimit) {
      await handleSenderRateLimit(sender.id, {
        message: sendResult.error?.message || 'Rate limit triggered',
      });
    }

    const isTemporary = isRateLimit || attemptNumber < 3;
    const finalStatus = isTemporary ? EmailLogStatus.TEMPORARY_FAILURE : EmailLogStatus.FAILED;

    await prisma.emailLog.create({
      data: {
        leadId: lead.id,
        campaignId: campaign.id,
        senderId: sender.id,
        templateId: payload.templateId,
        provider: sender.provider,
        recipient: lead.email,
        subject: payload.renderedSubject,
        status: finalStatus,
        errorCode: sendResult.error?.code || 'SEND_ERROR',
        errorMessage: sendResult.error?.message || 'Failed to dispatch email',
        attemptNumber,
      },
    });

    await prisma.campaignLead.update({
      where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
      data: {
        status: isTemporary ? CampaignLeadStatus.PENDING : CampaignLeadStatus.FAILED,
        attempts: attemptNumber,
        lastError: sendResult.error?.message,
      },
    });

    if (!isTemporary) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { failedLeads: { increment: 1 } },
      });
    }

    return {
      success: false,
      status: finalStatus,
      error: sendResult.error?.message,
    };
  }
}

async function recordLogAndSkip(payload: SendJobPayload, recipient: string, reason: string): Promise<void> {
  await prisma.emailLog.create({
    data: {
      leadId: payload.leadId,
      campaignId: payload.campaignId,
      senderId: payload.senderId || null,
      templateId: payload.templateId,
      provider: SenderProvider.GMAIL,
      recipient,
      subject: payload.renderedSubject,
      status: EmailLogStatus.SKIPPED,
      errorMessage: reason,
    },
  });

  await prisma.campaignLead.update({
    where: { campaignId_leadId: { campaignId: payload.campaignId, leadId: payload.leadId } },
    data: {
      status: CampaignLeadStatus.SKIPPED,
      lastError: reason,
    },
  });
}
