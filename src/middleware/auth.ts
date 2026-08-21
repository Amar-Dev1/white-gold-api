import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'EMPLOYEE';
  allowedDomains: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.wg_session;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            domainAccess: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    req.user = {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role as 'ADMIN' | 'EMPLOYEE',
      allowedDomains: session.user.domainAccess.map((da) => da.domain),
    };
    req.sessionToken = token;

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
}

export function requireDomain(domain: 'WHITE_GOLD' | 'AL_JAWHARA') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.role === 'ADMIN' || req.user.allowedDomains.includes(domain)) {
      next();
      return;
    }
    res.status(403).json({ error: `Forbidden: Access to domain ${domain} denied` });
  };
}
