import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { prisma } from '../../prisma.js';
import { APPLICATION_DAILY_SENDER_LIMIT } from '@rankrise/shared';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/analytics - Comprehensive dashboard metrics
analyticsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const [
    totalLeads,
    readyLeads,
    suppressedLeads,
    senders,
    campaigns,
    templates,
    emailLogs,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'READY' } }),
    prisma.suppressionEntry.count(),
    prisma.senderAccount.findMany(),
    prisma.campaign.findMany(),
    prisma.template.findMany({ select: { id: true, name: true } }),
    prisma.emailLog.findMany({ select: { status: true, senderId: true, templateId: true } }),
  ]);

  // Senders metrics
  const connectedSenders = senders.filter(s => s.status === 'CONNECTED');
  const sentToday = senders.reduce((sum, s) => sum + s.sentToday, 0);
  const remainingToday = connectedSenders.reduce((sum, s) => {
    const limit = Math.min(s.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT);
    return sum + Math.max(0, limit - s.sentToday);
  }, 0);

  // Email status breakdown
  let sentEmails = 0;
  let failedEmails = 0;
  let skippedEmails = 0;

  const senderStatsMap = new Map<string, { sent: number; failed: number }>();
  const templateStatsMap = new Map<string, { used: number; failed: number }>();

  for (const log of emailLogs) {
    if (log.status === 'SENT') {
      sentEmails++;
      if (log.senderId) {
        const curr = senderStatsMap.get(log.senderId) || { sent: 0, failed: 0 };
        curr.sent++;
        senderStatsMap.set(log.senderId, curr);
      }
      if (log.templateId) {
        const curr = templateStatsMap.get(log.templateId) || { used: 0, failed: 0 };
        curr.used++;
        templateStatsMap.set(log.templateId, curr);
      }
    } else if (log.status === 'FAILED' || log.status === 'TEMPORARY_FAILURE' || log.status === 'BOUNCED') {
      failedEmails++;
      if (log.senderId) {
        const curr = senderStatsMap.get(log.senderId) || { sent: 0, failed: 0 };
        curr.failed++;
        senderStatsMap.set(log.senderId, curr);
      }
      if (log.templateId) {
        const curr = templateStatsMap.get(log.templateId) || { used: 0, failed: 0 };
        curr.failed++;
        templateStatsMap.set(log.templateId, curr);
      }
    } else if (log.status === 'SKIPPED') {
      skippedEmails++;
    }
  }

  // Senders breakdown
  const senderAnalytics = senders.map(s => {
    const stats = senderStatsMap.get(s.id) || { sent: 0, failed: 0 };
    const totalAttempted = stats.sent + stats.failed;
    const successRate = totalAttempted > 0 ? ((stats.sent / totalAttempted) * 100).toFixed(1) : '100.0';
    const limit = Math.min(s.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT);

    return {
      id: s.id,
      displayName: s.displayName,
      email: s.email,
      provider: s.provider,
      status: s.status,
      sentToday: s.sentToday,
      dailySendLimit: limit,
      remainingToday: Math.max(0, limit - s.sentToday),
      totalSent: stats.sent,
      totalFailed: stats.failed,
      successRate: `${successRate}%`,
      lastSentAt: s.lastSentAt,
    };
  });

  // Template breakdown
  const templateAnalytics = templates.map(t => {
    const stats = templateStatsMap.get(t.id) || { used: 0, failed: 0 };
    return {
      id: t.id,
      name: t.name,
      usedCount: stats.used,
      failedCount: stats.failed,
    };
  });

  // Campaign breakdown
  const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING').length;
  const campaignAnalytics = campaigns.map(c => {
    const remaining = Math.max(0, c.totalLeads - c.sentLeads - c.failedLeads);
    const progressPct = c.totalLeads > 0 ? ((c.sentLeads / c.totalLeads) * 100).toFixed(1) : '0';
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      totalLeads: c.totalLeads,
      sentLeads: c.sentLeads,
      failedLeads: c.failedLeads,
      remainingLeads: remaining,
      progressPercentage: `${progressPct}%`,
    };
  });

  res.json({
    cards: {
      totalLeads,
      readyLeads,
      sentToday,
      remainingToday,
      failedEmails,
      suppressedLeads,
      activeCampaigns,
      connectedSenders: connectedSenders.length,
      totalSenders: senders.length,
    },
    funnel: {
      totalLeads,
      readyLeads,
      sentEmails,
      failedEmails,
      suppressedLeads,
      skippedEmails,
    },
    senders: senderAnalytics,
    templates: templateAnalytics,
    campaigns: campaignAnalytics,
  });
});
