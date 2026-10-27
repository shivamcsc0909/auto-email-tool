import { Router, Request, Response } from 'express';
import { loginSchema } from '@rankrise/shared';
import { authenticateAdmin } from './authService.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { logAudit } from '../audit/auditService.js';
import { prisma } from '../../prisma.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { email, password } = parseResult.data;
  const authResult = await authenticateAdmin(email, password);

  if (!authResult) {
    await logAudit({
      module: 'AUTH',
      action: 'LOGIN_FAILURE',
      status: 'FAILED',
      details: { email },
      ipAddress: req.ip,
    });
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Set secure HttpOnly cookie
  res.cookie('rankrise_token', authResult.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  await logAudit({
    userId: authResult.user.id,
    module: 'AUTH',
    action: 'LOGIN_SUCCESS',
    status: 'SUCCESS',
    ipAddress: req.ip,
  });

  res.json({
    user: authResult.user,
    token: authResult.token,
  });
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.clearCookie('rankrise_token');
  if (req.user) {
    await logAudit({
      userId: req.user.userId,
      module: 'AUTH',
      action: 'LOGOUT',
      status: 'SUCCESS',
      ipAddress: req.ip,
    });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});
