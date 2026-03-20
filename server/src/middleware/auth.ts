import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  adminSession?: {
    authenticated: boolean;
    loginTime?: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session || !req.session.adminAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function isAuthenticated(req: AuthRequest): boolean {
  return !!(req.session && req.session.adminAuthenticated);
}
