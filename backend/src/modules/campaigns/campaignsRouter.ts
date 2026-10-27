import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  calculateCampaignSafetyMetrics,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
} from './campaignsService.js';
import { createCampaignSchema, updateCampaignSchema } from '@rankrise/shared';
import { prisma } from '../../prisma.js';

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

// GET /api/campaigns - List all campaigns
campaignsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const campaigns = await getCampaigns();
  res.json({ campaigns });
});

// GET /api/campaigns/:id - Get single campaign
campaignsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const campaign = await getCampaignById(req.params.id);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  res.json({ campaign });
});

// GET /api/campaigns/:id/capacity - Get safety check & capacity calculation
campaignsRouter.get('/:id/capacity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const metrics = await calculateCampaignSafetyMetrics(req.params.id);
    res.json(metrics);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns - Create campaign
campaignsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const campaign = await createCampaign(parsed.data);
  res.status(201).json({ campaign });
});

// PUT /api/campaigns/:id - Update campaign
campaignsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json({ campaign: updated });
});

// POST /api/campaigns/:id/start - Launch with safety confirmation
campaignsRouter.post('/:id/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { confirmation } = req.body;
  const isConfirmed = confirmation === true || confirmation === 'true';

  try {
    const result = await startCampaign(
      req.params.id,
      isConfirmed,
      req.user?.userId,
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/pause - Pause campaign safely
campaignsRouter.post('/:id/pause', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaign = await pauseCampaign(req.params.id, req.user?.userId, req.ip);
    res.json({ campaign, message: 'Campaign paused safely.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/resume - Resume campaign
campaignsRouter.post('/:id/resume', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaign = await resumeCampaign(req.params.id, req.user?.userId, req.ip);
    res.json({ campaign, message: 'Campaign resumed.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/campaigns/:id/stop - Stop campaign & cancel pending
campaignsRouter.post('/:id/stop', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaign = await stopCampaign(req.params.id, req.user?.userId, req.ip);
    res.json({ campaign, message: 'Campaign stopped.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
campaignsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
