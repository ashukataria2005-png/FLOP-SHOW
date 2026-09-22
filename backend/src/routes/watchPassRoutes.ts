import { Router, Response } from 'express';
import { watchPassService } from '../services/watchPassService.js';
import { paymentRequestService } from '../services/paymentRequestService.js';
import { paymentRequestRepository } from '../repositories/paymentRequestRepository.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin, requirePermission } from '../middlewares/adminMiddleware.js';
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
    const contentIdStr = Array.isArray(req.params.contentId) ? req.params.contentId[0] : req.params.contentId;
    const status = await watchPassService.getContentPassStatus(req.user!.id, contentIdStr);
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

// Submit manual UPI Watch Pass purchase request with UTR (Creates unified payment request)
watchPassRouter.post('/submit-request', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { contentId, plan, utr, paymentReference, userName, userEmail, promoCode } = req.body;
    const finalUtr = utr || paymentReference;

    if (!plan || !finalUtr) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Plan and payment UTR are required.' }
      });
      return;
    }

    const payReq = await paymentRequestService.submitPaymentRequest(req.user!.id, {
      productType: 'WATCH_PASS',
      planId: plan,
      contentId: contentId || null,
      utr: finalUtr,
      userName: userName || (req.user as any)?.name,
      userEmail: userEmail || req.user!.email,
      promoCode: promoCode || null,
    });

    const isApproved = payReq.status === 'APPROVED';

    res.status(201).json({
      success: true,
      message: isApproved
        ? 'Watch Pass payment approved! Catalog-wide access is now active.'
        : 'Watch Pass payment submitted successfully. Access will become active once verified by an administrator.',
      pass: payReq,
      payment: payReq,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. ADMIN MANAGEMENT, APPROVAL & SEPARATED ANALYTICS
// ============================================================================

// Admin: list watch passes
watchPassRouter.get('/admin/requests', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const statusFilter = req.query.status as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const requests = await watchPassService.getAllPasses(statusFilter, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// Admin: approve pending pass (centralized through paymentRequestService)
watchPassRouter.post('/admin/approve', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { passId, adminNote } = req.body;
    if (!passId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'passId is required.' } });
      return;
    }

    const payReq = await paymentRequestRepository.getById(passId);
    if (payReq) {
      const result = await paymentRequestService.approvePayment(req.user!.id, passId, adminNote);
      res.json({
        success: true,
        message: result.message,
        payment: result.payment,
      });
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

// Admin: reject pending pass (centralized through paymentRequestService)
watchPassRouter.post('/admin/reject', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { passId, adminNote } = req.body;
    if (!passId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'passId is required.' } });
      return;
    }

    const payReq = await paymentRequestRepository.getById(passId);
    if (payReq) {
      const rejectedPay = await paymentRequestService.rejectPayment(req.user!.id, passId, adminNote);
      res.json({
        success: true,
        message: 'Watch Pass payment request rejected.',
        payment: rejectedPay,
      });
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
watchPassRouter.post('/admin/plans', requireAuth, requirePermission('monetization'), async (req: AuthenticatedRequest, res: Response, next) => {
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
watchPassRouter.get('/admin/analytics', requireAuth, requirePermission('analytics'), async (_req, res, next) => {
  try {
    const analytics = await watchPassService.getAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});
