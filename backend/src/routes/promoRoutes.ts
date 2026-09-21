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
 * Returns active promos, expired promos, and redemption history for user
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

// ============================================================================
// ADMIN PROMO CODE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/promos
 * List all created promo codes with status, usage counts, and expiry
 */
promoRouter.get('/admin/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const promos = await promoService.getAllPromoCodesAdmin();
    res.json({ success: true, promos });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/promos
 * Create a new promo code
 */
promoRouter.post('/admin/create', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { code, description, validity_days, validity_hours, expires_at } = req.body;
    const promo = await promoService.createPromoCodeAdmin({
      code,
      description,
      validity_days,
      validity_hours,
      expires_at
    });
    res.status(201).json({ success: true, message: 'Promo code created successfully.', promo });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/promos/:id/status
 * Enable / disable promo code
 */
promoRouter.patch('/admin/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
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
 * DELETE /api/admin/promos/:id
 * Delete promo code
 */
promoRouter.delete('/admin/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res, next) => {
  try {
    const promoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await promoService.deletePromoCodeAdmin(promoId);
    res.json({ success: true, message: 'Promo code deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
