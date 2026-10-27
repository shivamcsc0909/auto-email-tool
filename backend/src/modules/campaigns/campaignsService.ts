import { prisma } from '../../prisma.js';
import {
  CampaignDto,
  CampaignStatus,
  CampaignLeadStatus,
  ServiceCategory,
  APPLICATION_DAILY_SENDER_LIMIT,
} from '@rankrise/shared';
import { enqueueEmailSend } from '../queue/queueService.js';
import { renderTemplateString, renderEmail } from '../templates/renderer.js';
import { resolveSenderSignatures } from '../senders/signatureEngine.js';
import { logAudit } from '../audit/auditService.js';

export async function getCampaigns(): Promise<CampaignDto[]> {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return campaigns.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    serviceCategory: c.serviceCategory as ServiceCategory,
    templateIds: c.templateIds,
    senderIds: c.senderIds,
    dailyCampaignLimit: c.dailyCampaignLimit,
    perSenderLimit: c.perSenderLimit,
    delayMin: c.delayMin,
    delayMax: c.delayMax,
    scheduleStart: c.scheduleStart,
    scheduleEnd: c.scheduleEnd,
    timezone: c.timezone,
    status: c.status as CampaignStatus,
    totalLeads: c.totalLeads,
    sentLeads: c.sentLeads,
    failedLeads: c.failedLeads,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function getCampaignById(id: string): Promise<any> {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      campaignLeads: {
        take: 100,
        include: {
          lead: true,
          sender: true,
        },
      },
    },
  });

  if (!campaign) return null;

  // Retrieve associated templates
  const templates = await prisma.template.findMany({
    where: { id: { in: campaign.templateIds } },
  });

  // Retrieve associated senders
  const senders = await prisma.senderAccount.findMany({
    where: { id: { in: campaign.senderIds } },
    select: {
      id: true,
      email: true,
      displayName: true,
      senderName: true,
      status: true,
      sentToday: true,
      dailySendLimit: true,
    },
  });

  return {
    ...campaign,
    templates,
    senders,
  };
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  serviceCategory?: ServiceCategory;
  templateIds: string[];
  senderIds: string[];
  leadIds?: string[];
  dailyCampaignLimit?: number;
  perSenderLimit?: number;
  delayMin?: number;
  delayMax?: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  timezone?: string;
}): Promise<CampaignDto> {
  const perSenderLimit = Math.min(
    APPLICATION_DAILY_SENDER_LIMIT,
    data.perSenderLimit || APPLICATION_DAILY_SENDER_LIMIT
  );

  const leadIds = data.leadIds || [];

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      description: data.description || null,
      serviceCategory: data.serviceCategory || ServiceCategory.GENERAL_DIGITAL_SERVICES,
      templateIds: data.templateIds,
      senderIds: data.senderIds,
      dailyCampaignLimit: data.dailyCampaignLimit || 100,
      perSenderLimit,
      delayMin: data.delayMin || 90,
      delayMax: data.delayMax || 300,
      scheduleStart: data.scheduleStart || '09:00',
      scheduleEnd: data.scheduleEnd || '17:00',
      timezone: data.timezone || 'America/New_York',
      status: CampaignStatus.DRAFT,
      totalLeads: leadIds.length,
    },
  });

  // Attach leads if provided
  if (leadIds.length > 0) {
    await prisma.campaignLead.createMany({
      data: leadIds.map(leadId => ({
        campaignId: campaign.id,
        leadId,
        status: CampaignLeadStatus.PENDING,
      })),
      skipDuplicates: true,
    });
  }

  return {
    ...campaign,
    serviceCategory: campaign.serviceCategory as ServiceCategory,
    status: campaign.status as CampaignStatus,
  };
}

export async function calculateCampaignSafetyMetrics(id: string): Promise<{
  recipientCount: number;
  selectedSendersCount: number;
  applicationMaxPerSender: number;
  estimatedDailyCapacity: number;
  sendersSummary: Array<{
    id: string;
    displayName: string;
    email: string;
    sentToday: number;
    remainingToday: number;
    status: string;
  }>;
}> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  const pendingLeadsCount = await prisma.campaignLead.count({
    where: { campaignId: id, status: CampaignLeadStatus.PENDING },
  });

  const senders = await prisma.senderAccount.findMany({
    where: { id: { in: campaign.senderIds }, enabled: true },
  });

  const sendersSummary = senders.map(s => {
    const effectiveLimit = Math.min(s.dailySendLimit, APPLICATION_DAILY_SENDER_LIMIT);
    return {
      id: s.id,
      displayName: s.displayName,
      email: s.email,
      sentToday: s.sentToday,
      remainingToday: Math.max(0, effectiveLimit - s.sentToday),
      status: s.status,
    };
  });

  const estimatedDailyCapacity = sendersSummary
    .filter(s => s.status === 'CONNECTED')
    .reduce((sum, s) => sum + s.remainingToday, 0);

  return {
    recipientCount: pendingLeadsCount,
    selectedSendersCount: senders.length,
    applicationMaxPerSender: APPLICATION_DAILY_SENDER_LIMIT,
    estimatedDailyCapacity,
    sendersSummary,
  };
}

export async function startCampaign(
  id: string,
  explicitConfirmation: boolean,
  userId?: string,
  ipAddress?: string
): Promise<{
  success: boolean;
  message: string;
  campaign: CampaignDto;
  scheduledJobsCount: number;
}> {
  if (!explicitConfirmation) {
    throw new Error('Explicit confirmation is required: "I understand that emails will be sent automatically using the selected accounts."');
  }

  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });

  if (campaign.status === CampaignStatus.RUNNING) {
    throw new Error('Campaign is already running');
  }

  if (campaign.senderIds.length === 0) {
    throw new Error('No sender accounts selected for this campaign');
  }

  if (campaign.templateIds.length === 0) {
    throw new Error('No templates selected for this campaign');
  }

  // Retrieve pending leads
  const pendingCampaignLeads = await prisma.campaignLead.findMany({
    where: { campaignId: id, status: CampaignLeadStatus.PENDING },
    include: { lead: true },
    orderBy: { createdAt: 'asc' },
  });

  if (pendingCampaignLeads.length === 0) {
    throw new Error('Campaign has no pending leads to contact');
  }

  // Retrieve templates
  const templates = await prisma.template.findMany({
    where: { id: { in: campaign.templateIds }, active: true },
  });

  if (templates.length === 0) {
    throw new Error('None of the assigned campaign templates are active');
  }

  // Update campaign to RUNNING
  const updatedCampaign = await prisma.campaign.update({
    where: { id },
    data: { status: CampaignStatus.RUNNING },
  });

  let scheduledJobsCount = 0;
  let cumulativeDelayMs = 0;

  for (let i = 0; i < pendingCampaignLeads.length; i++) {
    const cl = pendingCampaignLeads[i];
    const template = templates[i % templates.length]; // Round robin templates

    // Pre-render content with lead variables
    const rendered = renderEmail({
      subjectTemplate: template.subject,
      bodyHtmlTemplate: template.bodyHtml,
      bodyTextTemplate: template.bodyText,
      variables: {
        first_name: cl.lead.firstName || '',
        last_name: cl.lead.lastName || '',
        full_name: cl.lead.fullName || '',
        company_name: cl.lead.companyName || '',
        email: cl.lead.email,
        website: cl.lead.website || '',
        domain: cl.lead.domain || '',
        country: cl.lead.country || 'United States',
        city: cl.lead.city || '',
        phone: cl.lead.phone || '',
        service: cl.lead.serviceInterest || 'General',
        campaign_name: campaign.name,
      },
    });

    // Randomize delay between delayMin and delayMax seconds
    const randomizedSeconds = Math.floor(
      Math.random() * (campaign.delayMax - campaign.delayMin + 1) + campaign.delayMin
    );
    cumulativeDelayMs += randomizedSeconds * 1000;

    await enqueueEmailSend(
      {
        leadId: cl.leadId,
        campaignId: campaign.id,
        templateId: template.id,
        renderedSubject: rendered.subject,
        renderedHtml: rendered.bodyHtml,
        renderedText: rendered.bodyText,
      },
      cumulativeDelayMs
    );

    // Update CampaignLead to QUEUED
    await prisma.campaignLead.update({
      where: { campaignId_leadId: { campaignId: id, leadId: cl.leadId } },
      data: { status: CampaignLeadStatus.QUEUED },
    });

    scheduledJobsCount++;
  }

  await logAudit({
    userId,
    module: 'CAMPAIGNS',
    action: 'START_CAMPAIGN',
    referenceId: campaign.id,
    details: {
      name: campaign.name,
      scheduledJobsCount,
      estimatedHours: (cumulativeDelayMs / (1000 * 3600)).toFixed(2),
    },
    ipAddress,
  });

  return {
    success: true,
    message: `Campaign launched with ${scheduledJobsCount} leads scheduled.`,
    campaign: {
      ...updatedCampaign,
      serviceCategory: updatedCampaign.serviceCategory as ServiceCategory,
      status: updatedCampaign.status as CampaignStatus,
    },
    scheduledJobsCount,
  };
}

export async function pauseCampaign(id: string, userId?: string, ipAddress?: string): Promise<CampaignDto> {
  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: CampaignStatus.PAUSED },
  });

  await logAudit({
    userId,
    module: 'CAMPAIGNS',
    action: 'PAUSE_CAMPAIGN',
    referenceId: id,
    ipAddress,
  });

  return {
    ...updated,
    serviceCategory: updated.serviceCategory as ServiceCategory,
    status: updated.status as CampaignStatus,
  };
}

export async function resumeCampaign(id: string, userId?: string, ipAddress?: string): Promise<CampaignDto> {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });

  if (campaign.status !== CampaignStatus.PAUSED) {
    throw new Error('Only paused campaigns can be resumed');
  }

  // Restore queued/pending leads and resume
  await prisma.campaignLead.updateMany({
    where: { campaignId: id, status: CampaignLeadStatus.QUEUED },
    data: { status: CampaignLeadStatus.PENDING },
  });

  // Re-trigger start with explicit confirmation
  const result = await startCampaign(id, true, userId, ipAddress);
  return result.campaign;
}

export async function stopCampaign(id: string, userId?: string, ipAddress?: string): Promise<CampaignDto> {
  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: CampaignStatus.STOPPED },
  });

  // Mark all uncompleted leads as SKIPPED
  await prisma.campaignLead.updateMany({
    where: {
      campaignId: id,
      status: { in: [CampaignLeadStatus.PENDING, CampaignLeadStatus.QUEUED] },
    },
    data: {
      status: CampaignLeadStatus.SKIPPED,
      lastError: 'Campaign stopped by administrator',
    },
  });

  await logAudit({
    userId,
    module: 'CAMPAIGNS',
    action: 'STOP_CAMPAIGN',
    referenceId: id,
    ipAddress,
  });

  return {
    ...updated,
    serviceCategory: updated.serviceCategory as ServiceCategory,
    status: updated.status as CampaignStatus,
  };
}
