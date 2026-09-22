import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export type AdminPermission =
  | 'analytics'
  | 'monetization'
  | 'promos'
  | 'payments'
  | 'catalog'
  | 'users'
  | 'settings';

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

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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

  if (!req.user.is_super_admin) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '403 Forbidden: Access Denied. Only Super Administrators can perform this action.'
      }
    });
    return;
  }

  next();
}

export function requirePermission(permission: AdminPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

    // Super Admin has unrestricted full bypass on all permissions
    if (req.user.is_super_admin) {
      next();
      return;
    }

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!perms.includes(permission)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `403 Forbidden: Access Denied. You do not have permission for the '${permission}' module.`
        }
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(...permissions: AdminPermission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

    // Super Admin has unrestricted full bypass
    if (req.user.is_super_admin) {
      next();
      return;
    }

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasAny = permissions.some(p => perms.includes(p));
    if (!hasAny) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `403 Forbidden: Access Denied. Requires one of permissions: ${permissions.join(', ')}.`
        }
      });
      return;
    }

    next();
  };
}

