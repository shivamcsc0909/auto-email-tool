import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  renderTemplatePreview,
  sendTestEmail,
} from './templatesService.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  sendTestEmailSchema,
  ServiceCategory,
} from '@rankrise/shared';
import { logAudit } from '../audit/auditService.js';

export const templatesRouter = Router();

templatesRouter.use(requireAuth);

// GET /api/templates - List templates
templatesRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const category = req.query.category as ServiceCategory | undefined;
  const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;

  const templates = await getTemplates({ category, active });
  res.json({ templates });
});

// GET /api/templates/:id - Get template details
templatesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const template = await getTemplateById(req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json({ template });
});

// POST /api/templates - Create template
templatesRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const created = await createTemplate(parsed.data);

  await logAudit({
    userId: req.user?.userId,
    module: 'TEMPLATES',
    action: 'CREATE_TEMPLATE',
    referenceId: created.id,
    details: { name: created.name, category: created.category },
    ipAddress: req.ip,
  });

  res.status(201).json({ template: created });
});

// PUT /api/templates/:id - Update template
templatesRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const updated = await updateTemplate(req.params.id, parsed.data);

  await logAudit({
    userId: req.user?.userId,
    module: 'TEMPLATES',
    action: 'UPDATE_TEMPLATE',
    referenceId: updated.id,
    details: { name: updated.name },
    ipAddress: req.ip,
  });

  res.json({ template: updated });
});

// DELETE /api/templates/:id - Delete template
templatesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteTemplate(req.params.id);

  await logAudit({
    userId: req.user?.userId,
    module: 'TEMPLATES',
    action: 'DELETE_TEMPLATE',
    referenceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Template deleted' });
});

// POST /api/templates/:id/duplicate - Duplicate template
templatesRouter.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const duplicated = await duplicateTemplate(req.params.id);

  await logAudit({
    userId: req.user?.userId,
    module: 'TEMPLATES',
    action: 'DUPLICATE_TEMPLATE',
    referenceId: duplicated.id,
    ipAddress: req.ip,
  });

  res.status(201).json({ template: duplicated });
});

// POST /api/templates/:id/preview - Render live preview with simulated lead & sender variables
templatesRouter.post('/:id/preview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const preview = await renderTemplatePreview({
      templateId: req.params.id,
      leadId: req.body.leadId,
      senderId: req.body.senderId,
    });
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to render preview' });
  }
});

// POST /api/templates/test-send - Send test email
templatesRouter.post('/test-send', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = sendTestEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const result = await sendTestEmail({
      senderId: parsed.data.senderId,
      templateId: parsed.data.templateId,
      recipientEmail: parsed.data.recipientEmail,
      customSubject: parsed.data.customSubject,
      customBodyHtml: parsed.data.customBodyHtml,
      userId: req.user?.userId,
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to dispatch test email' });
  }
});
