import { Request, Response, NextFunction } from 'express';
import { authService, toSafeUser } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  is_super_admin?: boolean;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required. Please sign in.'
      }
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = authService.verifyToken(token);

    // On every admin request, strictly re-verify fresh DB permissions and active status
    if (payload.role === 'ADMIN') {
      const freshUser = (await userRepository.findById(payload.id)) ||
        (payload.email ? await userRepository.findByEmail(payload.email) : null);

      if (!freshUser) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Administrator account no longer exists. Please sign in again.'
          }
        });
        return;
      }

      if (freshUser.status === 'SUSPENDED') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Administrator account is suspended. Access denied.'
          }
        });
        return;
      }

      const safe = toSafeUser(freshUser);
      req.user = {
        id: safe.id,
        email: safe.email,
        role: safe.role,
        is_super_admin: safe.is_super_admin,
        permissions: safe.permissions,
      };
    } else {
      req.user = payload;
    }

    next();
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: err.message || 'Invalid or expired session. Please log in again.'
      }
    });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const payload = authService.verifyToken(token);
      if (payload.role === 'ADMIN') {
        const freshUser = (await userRepository.findById(payload.id)) ||
          (payload.email ? await userRepository.findByEmail(payload.email) : null);
        if (freshUser && freshUser.status !== 'SUSPENDED') {
          const safe = toSafeUser(freshUser);
          req.user = {
            id: safe.id,
            email: safe.email,
            role: safe.role,
            is_super_admin: safe.is_super_admin,
            permissions: safe.permissions,
          };
        } else {
          req.user = payload;
        }
      } else {
        req.user = payload;
      }
    } catch {
      // Ignore token validation failure in optional auth
    }
  }

  next();
}
