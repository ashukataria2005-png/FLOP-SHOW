import { Router, Response } from 'express';
import { authService } from '../services/authService.js';
import { walletService } from '../services/walletService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const result = await authService.register({ name, email, phone, password });
    const wallet = await walletService.getBalance(result.user.id);

    res.status(201).json({
      user: result.user,
      token: result.token,
      wallet,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, username, identifier, phone, password } = req.body || {};
    const finalIdentifier = (username || identifier || email || phone || '').toString().trim();
    const result = await authService.login({ email: finalIdentifier, password });
    const wallet = await walletService.getBalance(result.user.id);

    res.json({
      user: result.user,
      token: result.token,
      wallet,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin-login (and aliases)
export const handleAdminLogin = async (req: any, res: any, next: any) => {
  try {
    const body = req.body || {};

    // Normalize all possible field names and sanitize
    const rawId = (body.adminId || body.id || body.username || body.identifier || body.email || '').toString().trim().toLowerCase();
    const rawPassword = (body.adminPassword || body.password || '').toString();

    if (!rawId || !rawPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Admin ID/email and password are required.'
        }
      });
      return;
    }

    console.log(`[Admin Login] Attempt for: ${rawId}`);

    const result = await authService.adminLogin({
      adminId: rawId,
      adminPassword: rawPassword,
    });

    console.log(`[Admin Login] ✓ Success for: ${rawId} (id=${result.user.id}, is_super_admin=${result.user.is_super_admin})`);

    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    console.error(`[Admin Login] ✗ Failed:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'INVALID_CREDENTIALS'
             : statusCode === 403 ? 'ACCOUNT_SUSPENDED'
             : statusCode === 400 ? 'MISSING_CREDENTIALS'
             : 'LOGIN_ERROR',
        message: err.message || 'An unexpected error occurred during login.'
      }
    });
  }
};


authRouter.post('/admin-login', handleAdminLogin);
authRouter.post('/admin/login', handleAdminLogin);

// GET /api/auth/me (with session refresh)
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    const wallet = await walletService.getBalance(user.id);
    const refreshedToken = authService.generateToken(user);
    res.json({ user, wallet, token: refreshedToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh (extend active session without re-login)
authRouter.post('/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    const wallet = await walletService.getBalance(user.id);
    const freshToken = authService.generateToken(user);
    res.json({ success: true, user, wallet, token: freshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin-quick-login (verifies remembered admin session and issues active session)
authRouter.post('/admin-quick-login', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    if (!user || user.role !== 'ADMIN') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Administrator privileges required.'
        }
      });
      return;
    }

    const freshToken = authService.generateToken(user);
    res.json({
      success: true,
      user,
      token: freshToken,
      message: 'Quick login successful.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, email } = req.body;
    const user = await authService.updateProfile(req.user!.id, name, email);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  // Stateless JWT: client discards token
  res.json({ message: 'Signed out successfully.' });
});

