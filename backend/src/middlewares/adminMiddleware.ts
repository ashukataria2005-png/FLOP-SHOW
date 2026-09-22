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

export function isUserSuperAdmin(user: any): boolean {
  if (!user) return false;
  const email = typeof user.email === 'string' ? user.email.toLowerCase().trim() : '';
  if (email === 'ashukataria2005@gmail.com') {
    return true;
  }
  if (user.role === 'ADMIN' && (user.is_super_admin === true || user.is_super_admin === 1) && email === 'ashukataria2005@gmail.com') {
    return true;
  }
  return false;
}

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

  if (!isUserSuperAdmin(req.user)) {
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
    if (isUserSuperAdmin(req.user)) {
      next();
      return;
    }

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!perms.includes('*') && !perms.includes(permission)) {
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

export function requireAnyPermission(...permissionsInput: (AdminPermission | AdminPermission[])[]) {
  const permissions = (permissionsInput.flat() as AdminPermission[]);

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
    if (isUserSuperAdmin(req.user)) {
      next();
      return;
    }

    const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    const hasAny = perms.includes('*') || permissions.some(p => perms.includes(p));
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

