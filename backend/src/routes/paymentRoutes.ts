import { Router, Response } from 'express';
import { paymentRequestService } from '../services/paymentRequestService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

export const paymentRouter = Router();

// ============================================================================
// 1. PUBLIC PAYMENT CONFIG (for Recharge Modal)
// ============================================================================
paymentRouter.get('/config', async (_req, res, next) => {
  try {
    const config = await paymentRequestService.getPublicPaymentConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. AUTHENTICATED USER PAYMENT ENDPOINTS
// ============================================================================

// Submit a new manual UPI payment request with UTR
paymentRouter.post('/submit-request', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { amount, utr, userName, userEmail, contentId, productType, planId, planName, promoCode } = req.body;
    const request = await paymentRequestService.submitPaymentRequest(req.user!.id, {
      amountRupees: amount !== undefined && amount !== null && amount !== '' ? Number(amount) : undefined,
      utr,
      userName: userName || (req.user as any)?.name,
      userEmail: userEmail || req.user!.email,
      contentId: contentId || null,
      productType: productType || 'MOVIE',
      planId: planId || null,
      planName: planName || null,
      promoCode: promoCode || null,
    });

    const isApproved = request.status === 'APPROVED';

    res.status(201).json({
      success: true,
      message: isApproved
        ? 'Payment approved! Access is now active.'
        : 'Payment request submitted successfully. Awaiting administrator verification.',
      payment: request,
    });
  } catch (err) {
    next(err);
  }
});

// Get authenticated user's payment requests
paymentRouter.get('/my-requests', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const requests = await paymentRequestService.getUserRequests(req.user!.id, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. ADMIN-ONLY VERIFICATION & SETTINGS ENDPOINTS
// ============================================================================

// Admin metrics
paymentRouter.get('/admin/metrics', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const metrics = await paymentRequestService.getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// Admin list all requests (filter by status: PENDING, APPROVED, REJECTED, ALL)
paymentRouter.get('/admin/requests', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = (req.query.status as string) || 'ALL';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const requests = await paymentRequestService.getAllRequests(status, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// Admin get payment configuration
paymentRouter.get('/admin/settings', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const config = await paymentRequestService.getPublicPaymentConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// Admin update payment configuration
paymentRouter.post('/admin/settings', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { upiId, merchantName, approvalMode } = req.body;
    // Only pass 'enabled' when it is explicitly provided; otherwise undefined preserves existing value.
    const enabled = 'enabled' in req.body ? Boolean(req.body.enabled) : undefined;
    const updated = await paymentRequestService.updatePaymentConfig({
      upiId,
      enabled,
      merchantName,
      approvalMode,
    });
    res.json({
      success: true,
      message: 'UPI payment settings updated successfully.',
      config: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Admin approve payment request and atomically credit wallet
paymentRouter.post('/admin/requests/:id/approve', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { adminNote } = req.body;
    const result = await paymentRequestService.approvePayment(req.user!.id, id, adminNote);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// Admin reject payment request
paymentRouter.post('/admin/requests/:id/reject', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { adminNote } = req.body;
    const payment = await paymentRequestService.rejectPayment(req.user!.id, id, adminNote);
    res.json({
      success: true,
      message: 'Payment request rejected. Wallet balance unchanged.',
      payment,
    });
  } catch (err) {
    next(err);
  }
});
