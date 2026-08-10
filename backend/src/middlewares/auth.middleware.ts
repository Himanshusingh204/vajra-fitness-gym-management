import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { JWT_SECRET } from '../utils/env';
import { requestContext } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; role: string; tokenVersion: number };

    // Validate against the database on every request so suspensions, role changes,
    // and password resets take effect immediately — never trust a stale token alone.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });

    if (!user || user.isActive === false) {
      return res.status(403).json({ error: 'Account suspended or no longer active.' });
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.user = { userId: user.id, role: user.role };
    // Enrich the request's correlation context so downstream logs include the actor.
    const ctx = requestContext.getStore();
    if (ctx) {
      ctx.userId = user.id;
      ctx.role = user.role;
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Role guard. SUPER_ADMIN always passes (platform-wide access), except on
// routes explicitly restricted to a different single role via isStrict.
export const authorize = (roles: string[], opts: { allowSuperAdmin?: boolean } = { allowSuperAdmin: true }) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (opts.allowSuperAdmin && req.user.role === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
