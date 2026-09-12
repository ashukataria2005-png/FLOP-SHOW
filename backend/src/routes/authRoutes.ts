import { Router, Response } from 'express';
import { authService } from '../services/authService.js';
import { walletService } from '../services/walletService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    const wallet = walletService.getBalance(result.user.id);

    res.status(201).json({
      user: result.user,
      token: result.token,
      wallet
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    const wallet = walletService.getBalance(result.user.id);

    res.json({
      user: result.user,
      token: result.token,
      wallet
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin-login (and aliases)
export const handleAdminLogin = async (req: any, res: any, next: any) => {
  try {
    const { adminId, adminPassword, id, password, email } = req.body;
    const inputId = adminId || id || email;
    const inputPassword = adminPassword || password;

    const result = await authService.adminLogin({
      adminId: inputId,
      adminPassword: inputPassword
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (err) {
    next(err);
  }
};

authRouter.post('/admin-login', handleAdminLogin);
authRouter.post('/admin/login', handleAdminLogin);

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = authService.getUserProfile(req.user!.id);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    const wallet = walletService.getBalance(user.id);
    res.json({ user, wallet });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  // Stateless JWT: client discards token
  res.json({ message: 'Signed out successfully.' });
});
