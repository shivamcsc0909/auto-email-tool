import { Router, Response, Request } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  getSenders,
  getSenderById,
  updateSender,
  deleteSender,
  getGoogleAuthUrl,
  handleGoogleCallback,
  getMicrosoftAuthUrl,
  handleMicrosoftCallback,
  disconnectSender,
  testSenderConnectivity,
} from './sendersService.js';
import { updateSenderProfileSchema } from '@rankrise/shared';
import { logAudit } from '../audit/auditService.js';
import { env } from '../../config/env.js';

export const sendersRouter = Router();

// OAuth callbacks are public because Google/Microsoft redirect the user's browser here
sendersRouter.get('/gmail/callback', async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  const state = req.query.state as string | undefined;

  if (!code) {
    res.redirect(`${env.APP_URL}/senders?error=missing_code`);
    return;
  }

  try {
    const account = await handleGoogleCallback(code, state);
    await logAudit({
      module: 'SENDERS',
      action: 'GMAIL_OAUTH_CONNECTED',
      referenceId: account.id,
      details: { email: account.email },
      ipAddress: req.ip,
    });
    res.redirect(`${env.APP_URL}/senders?status=connected&email=${encodeURIComponent(account.email)}`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${env.APP_URL}/senders?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
});

sendersRouter.get('/microsoft/callback', async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  const state = req.query.state as string | undefined;

  if (!code) {
    res.redirect(`${env.APP_URL}/senders?error=missing_code`);
    return;
  }

  try {
    const account = await handleMicrosoftCallback(code, state);
    await logAudit({
      module: 'SENDERS',
      action: 'MICROSOFT_OAUTH_CONNECTED',
      referenceId: account.id,
      details: { email: account.email },
      ipAddress: req.ip,
    });
    res.redirect(`${env.APP_URL}/senders?status=connected&email=${encodeURIComponent(account.email)}`);
  } catch (err: any) {
    console.error('Microsoft OAuth callback error:', err);
    res.redirect(`${env.APP_URL}/senders?error=${encodeURIComponent(err.message || 'oauth_failed')}`);
  }
});

// All other endpoints require admin auth
sendersRouter.use(requireAuth);

// GET /api/senders - List all connected accounts
sendersRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const senders = await getSenders();
  res.json({ senders });
});

// GET /api/senders/gmail/connect - Start Google OAuth flow
sendersRouter.get('/gmail/connect', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authUrl = getGoogleAuthUrl(req.user?.userId);
    res.json({ url: authUrl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/senders/microsoft/connect - Start Microsoft OAuth flow
sendersRouter.get('/microsoft/connect', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const authUrl = getMicrosoftAuthUrl(req.user?.userId);
    res.json({ url: authUrl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/senders/:id - Get single sender
sendersRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const sender = await getSenderById(req.params.id);
  if (!sender) {
    res.status(404).json({ error: 'Sender account not found' });
    return;
  }
  res.json({ sender });
});

// PUT /api/senders/:id - Update sender profile, signature, or limit
sendersRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateSenderProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const updated = await updateSender(req.params.id, parsed.data);

  await logAudit({
    userId: req.user?.userId,
    module: 'SENDERS',
    action: 'UPDATE_SENDER_PROFILE',
    referenceId: updated.id,
    details: { email: updated.email },
    ipAddress: req.ip,
  });

  res.json({ sender: updated });
});

// DELETE /api/senders/:id - Delete sender
sendersRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteSender(req.params.id);

  await logAudit({
    userId: req.user?.userId,
    module: 'SENDERS',
    action: 'DELETE_SENDER',
    referenceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Sender deleted' });
});

// POST /api/senders/:id/disconnect - Disconnect account
sendersRouter.post('/:id/disconnect', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await disconnectSender(req.params.id);

    await logAudit({
      userId: req.user?.userId,
      module: 'SENDERS',
      action: 'DISCONNECT_SENDER',
      referenceId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Sender disconnected' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/senders/:id/test - Test connection
sendersRouter.post('/:id/test', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await testSenderConnectivity(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
