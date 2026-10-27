import { Router, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  getSuppressionEntries,
  addSuppressionEntry,
  removeSuppressionEntry,
  importSuppressionCsv,
} from './suppressionService.js';
import { createSuppressionSchema, SuppressionReason } from '@rankrise/shared';
import { logAudit } from '../audit/auditService.js';

export const suppressionRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

suppressionRouter.use(requireAuth);

// GET /api/suppression - List entries
suppressionRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getSuppressionEntries({
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 50,
    search: req.query.search as string,
    reason: req.query.reason as SuppressionReason,
  });
  res.json(result);
});

// POST /api/suppression - Add single entry
suppressionRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createSuppressionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const entry = await addSuppressionEntry(parsed.data);

  await logAudit({
    userId: req.user?.userId,
    module: 'SUPPRESSION',
    action: 'ADD_SUPPRESSION_ENTRY',
    referenceId: entry.id,
    details: { email: entry.email, reason: entry.reason },
    ipAddress: req.ip,
  });

  res.status(201).json({ entry });
});

// POST /api/suppression/upload-csv - Bulk upload suppression CSV
suppressionRouter.post('/upload-csv', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'CSV file is required' });
    return;
  }

  try {
    const result = await importSuppressionCsv(req.file.buffer);

    await logAudit({
      userId: req.user?.userId,
      module: 'SUPPRESSION',
      action: 'BULK_IMPORT_SUPPRESSION_CSV',
      details: { importedCount: result.importedCount },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to import CSV' });
  }
});

// DELETE /api/suppression/:id - Remove suppression entry
suppressionRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await removeSuppressionEntry(req.params.id);

  await logAudit({
    userId: req.user?.userId,
    module: 'SUPPRESSION',
    action: 'REMOVE_SUPPRESSION_ENTRY',
    referenceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Entry removed' });
});
