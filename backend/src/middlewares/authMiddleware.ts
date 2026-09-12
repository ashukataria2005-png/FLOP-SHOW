import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
    req.user = payload;
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

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const payload = authService.verifyToken(token);
      req.user = payload;
    } catch {
      // Ignore token validation failure in optional auth
    }
  }

  next();
}
