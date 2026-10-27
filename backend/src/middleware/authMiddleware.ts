import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, TokenPayload } from '../modules/auth/authService.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // 1. Try extracting from signed or unsigned cookies
  let token: string | undefined = req.cookies?.['rankrise_token'] || req.signedCookies?.['rankrise_token'];

  // 2. Try extracting from Authorization: Bearer <token>
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    return;
  }

  req.user = payload;
  next();
}
