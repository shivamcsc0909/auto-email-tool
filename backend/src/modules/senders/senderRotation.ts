import { prisma } from '../../prisma.js';
import { SenderAccountDto, SenderStatus, APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';

export interface EligibleSenderResult {
  sender: SenderAccountDto | null;
  reason?: 'NO_ENABLED_SENDERS' | 'ALL_DAILY_LIMITS_REACHED' | 'ALL_SENDERS_PAUSED_OR_LIMITED';
  capacitySummary: {
    totalEligibleSenders: number;
    availableSenders: number;
    totalRemainingToday: number;
  };
}

/**
 * Checks and resets daily counters if a new calendar day has started in the specified timezone.
 */
export async function checkAndResetDailyCounters(targetTimezone = 'America/New_York'): Promise<number> {
  const now = new Date();

  // Get current date string in target timezone (YYYY-MM-DD)
  const currentTzDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: targetTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const senders = await prisma.senderAccount.findMany();
  let resetCount = 0;

  for (const sender of senders) {
    const lastResetDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(sender.lastCounterReset));

    if (currentTzDate !== lastResetDate) {
      await prisma.senderAccount.update({
        where: { id: sender.id },
        data: {
          sentToday: 0,
          lastCounterReset: now,
          // If rate limited yesterday, restore to CONNECTED
          status: sender.status === SenderStatus.RATE_LIMITED ? SenderStatus.CONNECTED : sender.status,
        },
      });
      resetCount++;
    }
  }

  return resetCount;
}

/**
 * Robust sender rotation engine.
 * Selects an eligible connected sender that has not breached the 20-send daily cap.
 * Prioritizes senders with the lowest sentToday count to balance utilization.
 */
export async function getNextAvailableSender(allowedSenderIds?: string[]): Promise<EligibleSenderResult> {
  // First ensure daily counters are up to date
  await checkAndResetDailyCounters();

  const where: any = {
    enabled: true,
  };

  if (allowedSenderIds && allowedSenderIds.length > 0) {
    where.id = { in: allowedSenderIds };
  }

  const allEligible = await prisma.senderAccount.findMany({
    where,
    orderBy: [
      { priority: 'asc' },
      { sentToday: 'asc' }, // Prioritize sender with most remaining capacity
    ],
  });

  if (allEligible.length === 0) {
    return {
      sender: null,
      reason: 'NO_ENABLED_SENDERS',
      capacitySummary: { totalEligibleSenders: 0, availableSenders: 0, totalRemainingToday: 0 },
    };
  }

  // Filter for connected status
  const connectedSenders = allEligible.filter(s => s.status === SenderStatus.CONNECTED);
  if (connectedSenders.length === 0) {
    return {
      sender: null,
      reason: 'ALL_SENDERS_PAUSED_OR_LIMITED',
      capacitySummary: { totalEligibleSenders: allEligible.length, availableSenders: 0, totalRemainingToday: 0 },
    };
  }

  // Filter for strict application 20-send daily limit
  const availableSenders = connectedSenders.filter(s => {
    const effectiveLimit = Math.min(s.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT);
    return s.sentToday < effectiveLimit;
  });

  const totalRemainingToday = availableSenders.reduce((sum, s) => {
    const effectiveLimit = Math.min(s.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT);
    return sum + (effectiveLimit - s.sentToday);
  }, 0);

  if (availableSenders.length === 0) {
    return {
      sender: null,
      reason: 'ALL_DAILY_LIMITS_REACHED',
      capacitySummary: {
        totalEligibleSenders: allEligible.length,
        availableSenders: 0,
        totalRemainingToday: 0,
      },
    };
  }

  // Pick the best sender (lowest sentToday)
  const chosen = availableSenders[0];

  const senderDto: SenderAccountDto = {
    id: chosen.id,
    provider: chosen.provider as any,
    email: chosen.email,
    displayName: chosen.displayName,
    senderName: chosen.senderName,
    title: chosen.title,
    company: chosen.company,
    phone: chosen.phone,
    website: chosen.website,
    signatureHtml: chosen.signatureHtml,
    signatureText: chosen.signatureText,
    signatureLogoUrl: chosen.signatureLogoUrl,
    status: chosen.status as SenderStatus,
    dailySendLimit: chosen.dailySendLimit,
    sentToday: chosen.sentToday,
    remainingToday: Math.max(0, chosen.dailySendLimit - chosen.sentToday),
    lastSentAt: chosen.lastSentAt,
    enabled: chosen.enabled,
    priority: chosen.priority,
    lastErrorMessage: chosen.lastErrorMessage,
    createdAt: chosen.createdAt,
    updatedAt: chosen.updatedAt,
  };

  return {
    sender: senderDto,
    capacitySummary: {
      totalEligibleSenders: allEligible.length,
      availableSenders: availableSenders.length,
      totalRemainingToday,
    },
  };
}

/**
 * Handles provider rate limit responses by temporarily marking the sender and recording the error.
 */
export async function handleSenderRateLimit(
  senderId: string,
  error: { message: string; backoffMinutes?: number }
): Promise<void> {
  await prisma.senderAccount.update({
    where: { id: senderId },
    data: {
      status: SenderStatus.RATE_LIMITED,
      lastErrorMessage: `[RATE_LIMIT] ${error.message}. Paused until next daily cycle or manual reset.`,
    },
  });
}
