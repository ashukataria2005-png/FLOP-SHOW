import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      }
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Administrator privileges are required.'
      }
    });
    return;
  }

  next();
}
