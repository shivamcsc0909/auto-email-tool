import { Router, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  processUploadedFile,
  recomputePreview,
  commitImport,
} from './importsService.js';
import { importConfirmSchema, columnMappingSchema } from '@rankrise/shared';
import { z } from 'zod';

export const importsRouter = Router();

// Configure multer memory storage with file size cap (25 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.originalname.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => lowerName.endsWith(ext));
    if (!isAllowed) {
      return cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) are accepted.'));
    }
    cb(null, true);
  },
});

importsRouter.use(requireAuth);

// POST /api/imports/upload - Step 1 & 2: Upload file and detect columns
importsRouter.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please provide a valid Excel or CSV file.' });
    return;
  }

  try {
    const result = await processUploadedFile(req.file);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process file' });
  }
});

// POST /api/imports/preview - Step 3 & 4: Recompute preview with custom column mapping
importsRouter.post('/preview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const schema = z.object({
    leadSourceId: z.string().min(1),
    columnMapping: columnMappingSchema,
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const preview = await recomputePreview(parsed.data.leadSourceId, parsed.data.columnMapping);
    res.json({ preview });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/imports/confirm - Step 5 & 6: Validate & commit import to database
importsRouter.post('/confirm', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = importConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const result = await commitImport({
      leadSourceId: parsed.data.leadSourceId,
      columnMapping: parsed.data.columnMapping,
      serviceInterest: parsed.data.serviceInterest,
      skipDuplicates: parsed.data.skipDuplicates,
      userId: req.user?.userId,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
