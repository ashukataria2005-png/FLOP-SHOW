import { Router, Response } from 'express';
import { subscriptionService } from '../services/subscriptionService.js';
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

export const subscriptionRouter = Router();

// ============================================================================
// 1. PUBLIC PLAN CONFIGURATION
// ============================================================================
subscriptionRouter.get('/plans', async (_req, res, next) => {
  try {
    const plans = await subscriptionService.getPlans();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. AUTHENTICATED USER ENDPOINTS
// ============================================================================

// Get authenticated user's current subscription status
subscriptionRouter.get('/my-status', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const status = await subscriptionService.getUserStatus(req.user!.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// User submits manual UPI subscription payment request with UTR (Status: PENDING)
subscriptionRouter.post('/submit-request', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { plan, utr, paymentReference, userName, userEmail } = req.body;
    const finalUtr = utr || paymentReference;
    if (!plan || !finalUtr) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Both subscription plan and payment UTR are required.' }
      });
      return;
    }

    const sub = await subscriptionService.submitManualSubscriptionRequest(req.user!.id, {
      plan,
      utr: finalUtr,
      userName: userName || (req.user as any)?.name,
      userEmail: userEmail || req.user!.email,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription payment submitted successfully. Your subscription will become active once verified by an administrator.',
      subscription: sub,
    });
  } catch (err) {
    next(err);
  }
});

// User views all past subscriptions
subscriptionRouter.get('/my-history', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = await subscriptionRepository.getUserSubscriptions(req.user!.id, limit);
    res.json({ count: history.length, subscriptions: history });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. ADMIN SUBSCRIPTION MANAGEMENT & APPROVAL
// ============================================================================

// Admin: list all subscription requests / records
subscriptionRouter.get('/admin/requests', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const statusFilter = req.query.status as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const requests = await subscriptionService.getAllSubscriptions(statusFilter, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// Admin: approve pending subscription
subscriptionRouter.post('/admin/approve', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { subscriptionId, adminNote } = req.body;
    if (!subscriptionId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'subscriptionId is required.' } });
      return;
    }

    const approved = await subscriptionService.approveSubscription(req.user!.id, subscriptionId, adminNote);
    res.json({
      success: true,
      message: `Subscription approved successfully. ${approved.plan} plan is now ACTIVE until ${new Date(approved.end_date!).toLocaleDateString('en-IN')}.`,
      subscription: approved,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: reject pending subscription
subscriptionRouter.post('/admin/reject', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { subscriptionId, adminNote } = req.body;
    if (!subscriptionId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'subscriptionId is required.' } });
      return;
    }

    const rejected = await subscriptionService.rejectSubscription(req.user!.id, subscriptionId, adminNote);
    res.json({
      success: true,
      message: 'Subscription request rejected.',
      subscription: rejected,
    });
  } catch (err) {
    next(err);
  }
});

// Admin: directly grant an active subscription to a user
subscriptionRouter.post('/admin/grant', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { userId, plan, adminNote } = req.body;
    if (!userId || !plan) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'userId and plan are required.' } });
      return;
    }

    const granted = await subscriptionService.adminGrantSubscription(req.user!.id, {
      userId,
      plan,
      adminNote,
    });

    res.status(201).json({
      success: true,
      message: `Successfully granted active ${plan} subscription to user.`,
      subscription: granted,
    });
  } catch (err) {
    next(err);
  }
});
