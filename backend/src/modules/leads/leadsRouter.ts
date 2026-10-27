import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  getLeads,
  createLead,
  bulkSuppressLeads,
  bulkDeleteLeads,
  exportLeadsToCsv,
} from './leadsService.js';
import { prisma } from '../../prisma.js';
import { createLeadSchema, updateLeadSchema, LeadStatus, SuppressionReason } from '@rankrise/shared';
import { logAudit } from '../audit/auditService.js';

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

// GET /api/leads - List leads with filters and pagination
leadsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getLeads({
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50,
    status: req.query.status as LeadStatus,
    country: req.query.country as string,
    serviceInterest: req.query.serviceInterest as string,
    campaignId: req.query.campaignId as string,
    senderId: req.query.senderId as string,
    search: req.query.search as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
  });

  res.json(result);
});

// GET /api/leads/export/csv - Download leads as CSV
leadsRouter.get('/export/csv', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const csvData = await exportLeadsToCsv({
    status: req.query.status as LeadStatus,
    country: req.query.country as string,
    serviceInterest: req.query.serviceInterest as string,
    campaignId: req.query.campaignId as string,
    senderId: req.query.senderId as string,
    search: req.query.search as string,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=rankrise_leads_export.csv');
  res.status(200).send(csvData);
});

// GET /api/leads/:id - Single lead detail
leadsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      leadSource: true,
      emailLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  res.json({ lead });
});

// POST /api/leads - Create single lead
leadsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = createLeadSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const lead = await createLead(parseResult.data);

  await logAudit({
    userId: req.user?.userId,
    module: 'LEADS',
    action: 'CREATE_LEAD',
    referenceId: lead.id,
    details: { email: lead.email },
    ipAddress: req.ip,
  });

  res.status(201).json({ lead });
});

// PUT /api/leads/:id - Update lead
leadsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = updateLeadSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: parseResult.data,
  });

  res.json({ lead: updated });
});

// DELETE /api/leads/:id - Delete lead
leadsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await prisma.lead.delete({
    where: { id: req.params.id },
  });

  await logAudit({
    userId: req.user?.userId,
    module: 'LEADS',
    action: 'DELETE_LEAD',
    referenceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Lead deleted successfully' });
});

// POST /api/leads/bulk-suppress
leadsRouter.post('/bulk-suppress', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { leadIds, reason, notes } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    res.status(400).json({ error: 'Array of leadIds is required' });
    return;
  }

  const count = await bulkSuppressLeads(leadIds, reason as SuppressionReason, notes);

  await logAudit({
    userId: req.user?.userId,
    module: 'LEADS',
    action: 'BULK_SUPPRESS',
    details: { count, reason },
    ipAddress: req.ip,
  });

  res.json({ success: true, suppressedCount: count });
});

// POST /api/leads/bulk-delete
leadsRouter.post('/bulk-delete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    res.status(400).json({ error: 'Array of leadIds is required' });
    return;
  }

  const count = await bulkDeleteLeads(leadIds);

  await logAudit({
    userId: req.user?.userId,
    module: 'LEADS',
    action: 'BULK_DELETE',
    details: { count },
    ipAddress: req.ip,
  });

  res.json({ success: true, deletedCount: count });
});
