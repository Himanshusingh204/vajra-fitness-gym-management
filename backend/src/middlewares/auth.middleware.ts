import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { JWT_SECRET } from '../utils/env';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; tokenVersion: number };

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
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
