import { Router } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';
import { promoService } from '../services/promoService.js';

export const promoRouter = Router();

// ============================================================================
// USER PROMO HUB & REDEMPTION ENDPOINTS
// ============================================================================

/**
 * GET /api/promos/hub
 * Returns active public promos, expired promos, and redemption history for user
 */
promoRouter.get('/hub', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const hub = await promoService.getUserPromoHub(req.user?.id);
    res.json({ success: true, ...hub });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/promos/redeem
 * User redemptions: 1-time free access pass to ANY single movie or series of choice
 */
promoRouter.post('/redeem', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { code, contentId } = req.body;
    const result = await promoService.redeemPromoCode(req.user!.id, code, contentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/promos/validate
 * Validate promo code and calculate discount for checkout / payment
 */
promoRouter.post('/validate', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { code, amount } = req.body;
    const originalAmount = Math.max(0, Number(amount || 0));
    const result = await promoService.validatePromoForCheckout(req.user?.id, code, originalAmount);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ADMIN PROMO CODE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/promos/admin/redemptions
 * Requirement 4: List all promo redemptions audit history
 */
promoRouter.get(['/admin/redemptions', '/redemptions'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const redemptions = await promoService.getAllRedemptionsAdmin(limit);
    res.json({ success: true, redemptions });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/promos/admin/all & /api/admin/promos
 * List all created promo codes with status, usage counts, and expiry
 */
promoRouter.get(['/admin/all', '/admin'], requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const promos = await promoService.getAllPromoCodesAdmin();
    res.json({ success: true, promos });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/promos/admin/create & /api/admin/promos
 * Create a new promo code
 */
promoRouter.post(['/admin/create', '/admin'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      code,
      description,
      validity_days,
      validity_hours,
      expires_at,
      visibility,
      discount_enabled,
      discount_percent,
      max_uses,
      is_lifetime
    } = req.body;

    const promo = await promoService.createPromoCodeAdmin({
      code,
      description,
      validity_days,
      validity_hours,
      expires_at,
      visibility,
      discount_enabled,
      discount_percent,
      max_uses,
      is_lifetime
    });
    res.status(201).json({ success: true, message: 'Promo code created successfully.', promo });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/promos/admin/:id & /api/admin/promos/:id
 * Requirement 1: Update promo code cleanly even if live/active
 */
promoRouter.put(['/admin/:id', '/:id'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const {
      code,
      description,
      validity_days,
      validity_hours,
      expires_at,
      visibility,
      discount_enabled,
      discount_percent,
      max_uses,
      is_lifetime,
      status
    } = req.body;

    const promo = await promoService.updatePromoCodeAdmin(promoId, {
      code,
      description,
      validity_days,
      validity_hours,
      expires_at,
      visibility,
      discount_enabled,
      discount_percent,
      max_uses,
      is_lifetime,
      status
    });

    res.json({ success: true, message: `Promo code "${promo.code}" updated successfully.`, promo });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/promos/admin/:id/status
 * Enable / disable promo code
 */
promoRouter.patch(['/admin/:id/status', '/:id/status'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'DISABLED') {
      return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.' });
    }
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const promo = await promoService.setPromoStatusAdmin(promoId, status);
    res.json({ success: true, message: `Promo code set to ${status}.`, promo });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/promos/admin/:id & /api/admin/promos/:id
 * Delete promo code
 */
promoRouter.delete(['/admin/:id', '/:id'], requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await promoService.deletePromoCodeAdmin(promoId);
    res.json({ success: true, message: 'Promo code deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
