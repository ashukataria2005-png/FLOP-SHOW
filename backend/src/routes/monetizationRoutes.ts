import { Router, Response } from 'express';
import { monetizationService } from '../services/monetizationService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin, requirePermission } from '../middlewares/adminMiddleware.js';

export const monetizationRouter = Router();

// ============================================================================
// 1. PUBLIC MONETIZATION CONFIG
// ============================================================================
monetizationRouter.get('/config', async (_req, res, next) => {
  try {
    const config = await monetizationService.getPublicConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. ADMIN MONETIZATION CONTROLS & METRICS
// ============================================================================
monetizationRouter.get('/admin', requireAuth, requirePermission('monetization'), async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    const config = await monetizationService.getAdminConfig();
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
});

monetizationRouter.put('/admin', requireAuth, requirePermission('monetization'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { mode, weeklyPrice, monthlyPrice, threeMonthsPrice, yearlyPrice, prices, defaultMoviePrice, defaultSeriesPrice } = req.body;
    const finalWeekly = weeklyPrice !== undefined ? Number(weeklyPrice) : (prices?.weekly !== undefined ? Number(prices.weekly) : undefined);
    const finalMonthly = monthlyPrice !== undefined ? Number(monthlyPrice) : (prices?.monthly !== undefined ? Number(prices.monthly) : undefined);
    const finalThreeMonths = threeMonthsPrice !== undefined ? Number(threeMonthsPrice) : (prices?.threeMonths !== undefined ? Number(prices.threeMonths) : undefined);
    const finalYearly = yearlyPrice !== undefined ? Number(yearlyPrice) : (prices?.yearly !== undefined ? Number(prices.yearly) : undefined);
    const finalDefaultMoviePrice = defaultMoviePrice !== undefined ? Number(defaultMoviePrice) : (prices?.defaultMoviePrice !== undefined ? Number(prices.defaultMoviePrice) : undefined);
    const finalDefaultSeriesPrice = defaultSeriesPrice !== undefined ? Number(defaultSeriesPrice) : (prices?.defaultSeriesPrice !== undefined ? Number(prices.defaultSeriesPrice) : undefined);

    const updated = await monetizationService.updateAdminConfig({
      mode,
      weeklyPrice: finalWeekly,
      monthlyPrice: finalMonthly,
      threeMonthsPrice: finalThreeMonths,
      yearlyPrice: finalYearly,
      defaultMoviePrice: finalDefaultMoviePrice,
      defaultSeriesPrice: finalDefaultSeriesPrice,
    });

    res.json({
      success: true,
      mode: updated.mode,
      message: `Monetization configuration saved successfully. Active mode: ${updated.mode}.`,
      config: updated,
    });
  } catch (err) {
    next(err);
  }
});
