import { Router, Response } from 'express';
import { watchPassService } from '../services/watchPassService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { adminService } from '../services/adminService.js';

export const watchPassRouter = Router();

// ============================================================================
// 1. PUBLIC PLAN CONFIGURATION
// ============================================================================
watchPassRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await watchPassService.getPlans();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. AUTHENTICATED USER ENDPOINTS
// ============================================================================

// Check user's watch pass status on a specific movie or series
watchPassRouter.get('/content-status/:contentId', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const status = await watchPassService.getContentPassStatus(req.user!.id, req.params.contentId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// Get user's active and historical watch passes
watchPassRouter.get('/my-passes', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const passes = await watchPassService.getUserPasses(req.user!.id);
    res.json(passes);
  } catch (err) {
    next(err);
  }
});

// Submit manual UPI Watch Pass purchase request with UTR (Status: PENDING)
watchPassRouter.post('/submit-request', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { contentId, plan, utr, paymentReference, userName, userEmail } = req.body;
    const finalUtr = utr || paymentReference;

    if (!contentId || !plan || !finalUtr) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'contentId, plan, and payment UTR are required.' }
      });
      return;
    }

    const pass = await watchPassService.submitPassRequest(req.user!.id, {
      contentId,
      plan,
      utr: finalUtr,
      userName: userName || (req.user as any)?.name,
      userEmail: userEmail || req.user!.email,
    });

    res.status(201).json({
      success: true,
      message: 'Watch Pass payment submitted successfully. Access will become active once verified by an administrator.',
      pass,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. ADMIN MANAGEMENT, APPROVAL & SEPARATED ANALYTICS
// ============================================================================

// Admin: list watch passes
watchPassRouter.get('/admin/requests', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const statusFilter = req.query.status as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const requests = await watchPassService.getAllPasses(statusFilter, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// Admin: approve pending pass
watchPassRouter.post('/admin/approve', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { passId, adminNote } = req.body;
    if (!passId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'passId is required.' } });
      return;
    }

    const approved = await watchPassService.approvePass(req.user!.id, passId, adminNote);
    res.json({
      success: true,
      message: `Watch Pass approved successfully. Valid until ${new Date(approved.expires_at!).toLocaleString('en-IN')}.`,
      pass: approved,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: reject pending pass
watchPassRouter.post('/admin/reject', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { passId, adminNote } = req.body;
    if (!passId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'passId is required.' } });
      return;
    }

    const rejected = await watchPassService.rejectPass(req.user!.id, passId, adminNote);
    res.json({
      success: true,
      message: 'Watch Pass request rejected.',
      pass: rejected,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: update plan prices
watchPassRouter.post('/admin/plans', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { price24h, price3d, price7d, price30d } = req.body;

    const updates: Record<string, string> = {};
    if (price24h !== undefined) updates['watch_pass_price_24h'] = String(Math.max(1, parseInt(price24h, 10)));
    if (price3d !== undefined) updates['watch_pass_price_3d'] = String(Math.max(1, parseInt(price3d, 10)));
    if (price7d !== undefined) updates['watch_pass_price_7d'] = String(Math.max(1, parseInt(price7d, 10)));
    if (price30d !== undefined) updates['watch_pass_price_30d'] = String(Math.max(1, parseInt(price30d, 10)));

    await adminService.updateSettings(updates);
    const plans = await watchPassService.getPlans();

    res.json({
      success: true,
      message: 'Watch Pass prices updated successfully.',
      plans,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: separated watch pass analytics
watchPassRouter.get('/admin/analytics', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const analytics = await watchPassService.getAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});
