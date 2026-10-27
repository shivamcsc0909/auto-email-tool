import { prisma } from '../../prisma.js';
import {
  LeadStatus,
  SuppressionReason,
  LeadDto,
} from '@rankrise/shared';
import { determineGreeting, extractCleanDomain } from './greetingExtractor.js';
import { Prisma } from '@prisma/client';

export interface GetLeadsQuery {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  country?: string;
  serviceInterest?: string;
  campaignId?: string;
  senderId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function getLeads(query: GetLeadsQuery): Promise<{
  leads: LeadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.LeadWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.country) {
    where.country = { equals: query.country, mode: 'insensitive' };
  }

  if (query.serviceInterest) {
    where.serviceInterest = query.serviceInterest;
  }

  if (query.campaignId) {
    where.campaignId = query.campaignId;
  }

  if (query.senderId) {
    where.lastSenderId = query.senderId;
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { email: { contains: s, mode: 'insensitive' } },
      { companyName: { contains: s, mode: 'insensitive' } },
      { fullName: { contains: s, mode: 'insensitive' } },
      { website: { contains: s, mode: 'insensitive' } },
      { domain: { contains: s, mode: 'insensitive' } },
    ];
  }

  const orderBy: Prisma.LeadOrderByWithRelationInput = {};
  const validSortFields = ['createdAt', 'email', 'companyName', 'status', 'lastContactedAt'];
  const sortField = query.sortBy && validSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  orderBy[sortField as keyof Prisma.LeadOrderByWithRelationInput] = query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [total, rawLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  const leads: LeadDto[] = rawLeads.map(lead => ({
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    fullName: lead.fullName,
    companyName: lead.companyName,
    email: lead.email,
    website: lead.website,
    domain: lead.domain,
    country: lead.country,
    city: lead.city,
    phone: lead.phone,
    industry: lead.industry,
    serviceInterest: lead.serviceInterest,
    source: lead.source,
    sourceRowNumber: lead.sourceRowNumber,
    customNotes: lead.customNotes,
    status: lead.status as LeadStatus,
    lastContactedAt: lead.lastContactedAt,
    lastSenderId: lead.lastSenderId,
    lastTemplateId: lead.lastTemplateId,
    campaignId: lead.campaignId,
    leadSourceId: lead.leadSourceId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }));

  return {
    leads,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createLead(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  companyName?: string;
  website?: string;
  domain?: string;
  country?: string;
  city?: string;
  phone?: string;
  industry?: string;
  serviceInterest?: string;
  customNotes?: string;
  status?: LeadStatus;
}): Promise<LeadDto> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanDomain = data.domain || extractCleanDomain(data.website) || extractCleanDomain(cleanEmail);

  // Check suppression list
  const suppressed = await prisma.suppressionEntry.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        ...(cleanDomain ? [{ domain: cleanDomain }] : []),
      ],
    },
  });

  const greeting = determineGreeting({
    email: cleanEmail,
    explicitName: data.fullName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : null),
    companyName: data.companyName,
    website: data.website,
    domain: cleanDomain,
  });

  const finalStatus = suppressed ? LeadStatus.DO_NOT_CONTACT : (data.status || LeadStatus.NEW);
  const notes = suppressed ? `Automatically suppressed: ${suppressed.reason}` : data.customNotes;

  const lead = await prisma.lead.create({
    data: {
      email: cleanEmail,
      firstName: greeting.firstName || data.firstName || null,
      lastName: greeting.lastName || data.lastName || null,
      fullName: greeting.fullName || data.fullName || null,
      companyName: greeting.companyName || data.companyName || null,
      website: data.website || null,
      domain: cleanDomain || null,
      country: data.country || 'United States',
      city: data.city || null,
      phone: data.phone || null,
      industry: data.industry || null,
      serviceInterest: data.serviceInterest || null,
      customNotes: notes || null,
      status: finalStatus,
    },
  });

  return {
    ...lead,
    status: lead.status as LeadStatus,
  };
}

export async function bulkSuppressLeads(leadIds: string[], reason: SuppressionReason = SuppressionReason.MANUAL_BLOCK, notes?: string): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, email: true, domain: true },
  });

  if (leads.length === 0) return 0;

  // 1. Create suppression entries
  for (const lead of leads) {
    await prisma.suppressionEntry.upsert({
      where: { email: lead.email },
      create: {
        email: lead.email,
        domain: lead.domain,
        reason,
        notes: notes || 'Bulk suppressed from lead table',
      },
      update: {
        reason,
        notes: notes || 'Updated via bulk suppression',
      },
    });
  }

  // 2. Update lead statuses
  const updateResult = await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: {
      status: LeadStatus.DO_NOT_CONTACT,
      customNotes: `Suppressed: ${reason}`,
    },
  });

  return updateResult.count;
}

export async function bulkDeleteLeads(leadIds: string[]): Promise<number> {
  const result = await prisma.lead.deleteMany({
    where: { id: { in: leadIds } },
  });
  return result.count;
}

export async function exportLeadsToCsv(query: GetLeadsQuery): Promise<string> {
  // Fetch up to 10,000 matching leads for CSV export
  const { leads } = await getLeads({ ...query, limit: 10000, page: 1 });

  const headers = [
    'ID',
    'Email',
    'First Name',
    'Last Name',
    'Full Name',
    'Company',
    'Website',
    'Domain',
    'Country',
    'Phone',
    'Service Interest',
    'Status',
    'Last Contacted',
    'Created At',
  ];

  const rows = leads.map(l => [
    `"${l.id}"`,
    `"${l.email}"`,
    `"${l.firstName || ''}"`,
    `"${l.lastName || ''}"`,
    `"${l.fullName || ''}"`,
    `"${l.companyName || ''}"`,
    `"${l.website || ''}"`,
    `"${l.domain || ''}"`,
    `"${l.country || ''}"`,
    `"${l.phone || ''}"`,
    `"${l.serviceInterest || ''}"`,
    `"${l.status}"`,
    `"${l.lastContactedAt ? new Date(l.lastContactedAt).toISOString() : ''}"`,
    `"${new Date(l.createdAt).toISOString()}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
