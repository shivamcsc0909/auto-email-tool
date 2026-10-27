import { prisma } from '../../prisma.js';
import {
  SEED_TEMPLATES,
  ServiceCategory,
  TemplateDto,
  RenderedEmail,
  SenderProvider,
  EmailLogStatus,
} from '@rankrise/shared';
import { renderEmail, renderTemplateString } from './renderer.js';
import { resolveSenderSignatures } from '../senders/signatureEngine.js';
import { env } from '../../config/env.js';
import { logAudit } from '../audit/auditService.js';

export async function seedTemplatesIfNoneExist(): Promise<void> {
  try {
    const count = await prisma.template.count();
    if (count === 0) {
      console.log('Seeding initial 10 reference outreach templates...');
      for (const seed of SEED_TEMPLATES) {
        await prisma.template.create({
          data: {
            id: seed.id,
            name: seed.name,
            category: seed.category,
            categories: seed.categories,
            subject: seed.subject,
            bodyHtml: seed.bodyHtml,
            bodyText: seed.bodyText,
            weight: seed.weight,
            variables: ['first_name', 'company_name', 'sender_name', 'sender_signature'],
            active: true,
          },
        });
      }
      console.log('✅ 10 reference outreach templates seeded successfully');
    }
  } catch (error) {
    console.warn('Notice: Could not check/seed templates (Database may be initializing):', error);
  }
}

export async function getTemplates(filter: {
  category?: ServiceCategory;
  active?: boolean;
}): Promise<TemplateDto[]> {
  const where: any = {};
  if (filter.category) {
    where.OR = [
      { category: filter.category },
      { categories: { has: filter.category } },
    ];
  }
  if (filter.active !== undefined) {
    where.active = filter.active;
  }

  const templates = await prisma.template.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  return templates.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category as ServiceCategory,
    categories: t.categories,
    service: t.service,
    language: t.language,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    bodyText: t.bodyText,
    variables: t.variables,
    weight: t.weight,
    active: t.active,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getTemplateById(id: string): Promise<TemplateDto | null> {
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t) return null;

  return {
    id: t.id,
    name: t.name,
    category: t.category as ServiceCategory,
    categories: t.categories,
    service: t.service,
    language: t.language,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    bodyText: t.bodyText,
    variables: t.variables,
    weight: t.weight,
    active: t.active,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function createTemplate(data: {
  name: string;
  category?: ServiceCategory;
  categories?: string[];
  service?: string;
  language?: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  weight?: number;
  active?: boolean;
}): Promise<TemplateDto> {
  const created = await prisma.template.create({
    data: {
      name: data.name,
      category: data.category || ServiceCategory.GENERAL_DIGITAL_SERVICES,
      categories: data.categories || [data.category || ServiceCategory.GENERAL_DIGITAL_SERVICES],
      service: data.service || 'General',
      language: data.language || 'en',
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
      weight: data.weight || 1,
      active: data.active !== undefined ? data.active : true,
    },
  });

  return {
    ...created,
    category: created.category as ServiceCategory,
  };
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    category: ServiceCategory;
    categories: string[];
    service: string;
    language: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    weight: number;
    active: boolean;
  }>
): Promise<TemplateDto> {
  const updated = await prisma.template.update({
    where: { id },
    data,
  });

  return {
    ...updated,
    category: updated.category as ServiceCategory,
  };
}

export async function duplicateTemplate(id: string): Promise<TemplateDto> {
  const original = await prisma.template.findUniqueOrThrow({ where: { id } });

  const duplicated = await prisma.template.create({
    data: {
      name: `${original.name} (Copy)`,
      category: original.category,
      categories: original.categories,
      service: original.service,
      language: original.language,
      subject: original.subject,
      bodyHtml: original.bodyHtml,
      bodyText: original.bodyText,
      variables: original.variables,
      weight: original.weight,
      active: original.active,
    },
  });

  return {
    ...duplicated,
    category: duplicated.category as ServiceCategory,
  };
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.template.delete({ where: { id } });
}

export async function renderTemplatePreview(params: {
  templateId: string;
  leadId?: string;
  senderId?: string;
}): Promise<RenderedEmail & { recipientEmail: string; senderEmail: string; senderName: string }> {
  const template = await prisma.template.findUniqueOrThrow({ where: { id: params.templateId } });

  // Resolve lead or fallback simulation
  let leadData = {
    first_name: 'Linda',
    last_name: '',
    full_name: 'Linda',
    company_name: 'Gordon Design Group',
    email: 'linda@gordondesigngroup.com',
    website: 'gordondesigngroup.com',
    domain: 'gordondesigngroup.com',
    country: 'United States',
    city: 'New York',
    phone: '555-123-4567',
    industry: 'Design',
    service: 'App Development',
  };

  if (params.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: params.leadId } });
    if (lead) {
      leadData = {
        first_name: lead.firstName || '',
        last_name: lead.lastName || '',
        full_name: lead.fullName || '',
        company_name: lead.companyName || '',
        email: lead.email,
        website: lead.website || '',
        domain: lead.domain || '',
        country: lead.country || 'United States',
        city: lead.city || '',
        phone: lead.phone || '',
        industry: lead.industry || '',
        service: lead.serviceInterest || 'App Development',
      };
    }
  }

  // Resolve sender or fallback simulation
  let senderData = {
    sender_name: 'Thomas',
    sender_email: 'thomas@rankriseusa.com',
    sender_title: 'Business Development',
    sender_company: 'RANKRISEUSA',
    sender_website: 'rankriseusa.com',
    sender_phone: '408-930-6964',
    sender_signature: '',
  };

  if (params.senderId) {
    const sender = await prisma.senderAccount.findUnique({ where: { id: params.senderId } });
    if (sender) {
      const sigs = resolveSenderSignatures(sender, sender.signatureHtml, sender.signatureText);
      senderData = {
        sender_name: sender.senderName,
        sender_email: sender.email,
        sender_title: sender.title || 'Business Development',
        sender_company: sender.company || 'RANKRISEUSA',
        sender_website: sender.website || 'rankriseusa.com',
        sender_phone: sender.phone || '',
        sender_signature: sigs.signatureHtml,
      };
    }
  } else {
    const sigs = resolveSenderSignatures({
      senderName: senderData.sender_name,
      email: senderData.sender_email,
      title: senderData.sender_title,
      company: senderData.sender_company,
      website: senderData.sender_website,
      phone: senderData.sender_phone,
    });
    senderData.sender_signature = sigs.signatureHtml;
  }

  const rendered = renderEmail({
    subjectTemplate: template.subject,
    bodyHtmlTemplate: template.bodyHtml,
    bodyTextTemplate: template.bodyText,
    variables: {
      ...leadData,
      ...senderData,
      campaign_name: 'RankRise Outreach Preview',
    },
  });

  return {
    ...rendered,
    recipientEmail: leadData.email,
    senderEmail: senderData.sender_email,
    senderName: senderData.sender_name,
  };
}

export async function sendTestEmail(params: {
  senderId: string;
  templateId?: string;
  recipientEmail: string;
  customSubject?: string;
  customBodyHtml?: string;
  userId?: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  message: string;
  mode: string;
  logId: string;
  rendered: RenderedEmail;
}> {
  const sender = await prisma.senderAccount.findUniqueOrThrow({
    where: { id: params.senderId },
  });

  const sigs = resolveSenderSignatures(sender, sender.signatureHtml, sender.signatureText);

  let subjectTemplate = params.customSubject || '📱 Test Email from RankRiseUSA Platform';
  let bodyHtmlTemplate = params.customBodyHtml || '<p>Hi there,</p><p>This is a verified test email sent from RankRiseUSA Outreach Platform.</p>';
  let bodyTextTemplate = 'Hi there,\n\nThis is a verified test email sent from RankRiseUSA Outreach Platform.';

  if (params.templateId) {
    const t = await prisma.template.findUnique({ where: { id: params.templateId } });
    if (t) {
      subjectTemplate = params.customSubject || t.subject;
      bodyHtmlTemplate = params.customBodyHtml || t.bodyHtml;
      bodyTextTemplate = t.bodyText;
    }
  }

  const rendered = renderEmail({
    subjectTemplate,
    bodyHtmlTemplate,
    bodyTextTemplate,
    variables: {
      first_name: 'Admin',
      company_name: 'RankRiseUSA',
      email: params.recipientEmail,
      sender_name: sender.senderName,
      sender_email: sender.email,
      sender_title: sender.title || 'Business Development',
      sender_company: sender.company || 'RANKRISEUSA',
      sender_website: sender.website || 'rankriseusa.com',
      sender_signature: sigs.signatureHtml,
    },
  });

  // Record email log
  const log = await prisma.emailLog.create({
    data: {
      senderId: sender.id,
      templateId: params.templateId || null,
      provider: sender.provider,
      recipient: params.recipientEmail.trim().toLowerCase(),
      subject: rendered.subject,
      status: EmailLogStatus.SENT,
      providerMessageId: `test-${env.EMAIL_SEND_MODE.toLowerCase()}-${Date.now()}`,
      errorMessage: env.EMAIL_SEND_MODE === 'DRY_RUN' ? '[DRY_RUN] Email rendered and logged without network dispatch' : null,
      startedAt: new Date(),
      sentAt: new Date(),
    },
  });

  await logAudit({
    userId: params.userId,
    module: 'TEMPLATES',
    action: 'SEND_TEST_EMAIL',
    referenceId: log.id,
    details: {
      recipient: params.recipientEmail,
      senderId: sender.id,
      mode: env.EMAIL_SEND_MODE,
    },
    ipAddress: params.ipAddress,
  });

  return {
    success: true,
    message: env.EMAIL_SEND_MODE === 'DRY_RUN'
      ? `Test email rendered successfully in DRY_RUN mode (logged to send logs).`
      : `Test email dispatched to ${params.recipientEmail}.`,
    mode: env.EMAIL_SEND_MODE,
    logId: log.id,
    rendered,
  };
}
