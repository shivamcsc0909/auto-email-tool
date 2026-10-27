import { prisma } from '../../prisma.js';
import { SuppressionReason, SuppressionEntryDto } from '@rankrise/shared';
import { extractCleanDomain } from '../leads/greetingExtractor.js';
import { parseSpreadsheetBuffer } from '../imports/fileParser.js';

export async function getSuppressionEntries(params: {
  page?: number;
  limit?: number;
  search?: string;
  reason?: SuppressionReason;
}): Promise<{
  entries: SuppressionEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.reason) {
    where.reason = params.reason;
  }
  if (params.search) {
    const s = params.search.trim().toLowerCase();
    where.OR = [
      { email: { contains: s, mode: 'insensitive' } },
      { domain: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, entries] = await Promise.all([
    prisma.suppressionEntry.count({ where }),
    prisma.suppressionEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    entries: entries.map(e => ({
      id: e.id,
      email: e.email,
      domain: e.domain,
      reason: e.reason as SuppressionReason,
      notes: e.notes,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function addSuppressionEntry(params: {
  email: string;
  domain?: string;
  reason?: SuppressionReason;
  notes?: string;
}): Promise<SuppressionEntryDto> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanDomain = params.domain ? extractCleanDomain(params.domain) : extractCleanDomain(cleanEmail);

  const entry = await prisma.suppressionEntry.upsert({
    where: { email: cleanEmail },
    create: {
      email: cleanEmail,
      domain: cleanDomain,
      reason: params.reason || SuppressionReason.MANUAL_BLOCK,
      notes: params.notes || null,
    },
    update: {
      reason: params.reason || SuppressionReason.MANUAL_BLOCK,
      notes: params.notes || null,
    },
  });

  // Automatically update any existing leads with this email or domain to DO_NOT_CONTACT
  await prisma.lead.updateMany({
    where: {
      OR: [
        { email: cleanEmail },
        ...(cleanDomain ? [{ domain: cleanDomain }] : []),
      ],
    },
    data: {
      status: 'DO_NOT_CONTACT',
      customNotes: `Suppressed: ${entry.reason}`,
    },
  });

  return {
    id: entry.id,
    email: entry.email,
    domain: entry.domain,
    reason: entry.reason as SuppressionReason,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function removeSuppressionEntry(id: string): Promise<void> {
  await prisma.suppressionEntry.delete({ where: { id } });
}

export async function importSuppressionCsv(buffer: Buffer): Promise<{
  importedCount: number;
  totalRows: number;
}> {
  const { headers, rows } = parseSpreadsheetBuffer(buffer);
  const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.toLowerCase().includes('mail')) || headers[0];

  let importedCount = 0;
  for (const row of rows) {
    const rawEmail = String(row[emailCol] || '').trim().toLowerCase();
    if (rawEmail && rawEmail.includes('@')) {
      await addSuppressionEntry({
        email: rawEmail,
        reason: SuppressionReason.CUSTOMER_REQUEST,
        notes: 'Imported via suppression CSV',
      });
      importedCount++;
    }
  }

  return {
    importedCount,
    totalRows: rows.length,
  };
}
