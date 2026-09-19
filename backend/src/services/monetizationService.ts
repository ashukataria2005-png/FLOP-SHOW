import { adminService } from './adminService.js';
import { subscriptionService, PlanConfig } from './subscriptionService.js';
import { getAdapter } from '../db/adapter.js';

export type MonetizationMode = 'PER_CONTENT' | 'SUBSCRIPTION';

export interface MonetizationPublicConfig {
  mode: MonetizationMode;
  plans: PlanConfig[];
  currencySymbol: string;
  upiId: string;
  merchantName: string;
  defaultMoviePrice: number;
  defaultSeriesPrice: number;
}

export interface MonetizationAdminConfig {
  mode: MonetizationMode;
  weeklyPrice?: number;
  monthlyPrice: number;
  threeMonthsPrice: number;
  yearlyPrice: number;
  defaultMoviePrice: number;
  defaultSeriesPrice: number;
  currencySymbol: string;
  metrics: {
    totalSubscriptions: number;
    activeCount: number;
    pendingCount: number;
    totalRevenueRupees: number;
  };
}

export const monetizationService = {
  /**
   * Get the globally active monetization mode: 'PER_CONTENT' or 'SUBSCRIPTION'
   */
  async getMonetizationMode(): Promise<MonetizationMode> {
    const settings = await adminService.getSettings();
    const mode = (settings.monetization_mode || '').trim().toUpperCase();
    if (mode === 'SUBSCRIPTION') {
      return 'SUBSCRIPTION';
    }
    return 'PER_CONTENT';
  },

  /**
   * Update the globally active monetization mode persistently.
   */
  async setMonetizationMode(mode: MonetizationMode): Promise<MonetizationMode> {
    const validMode: MonetizationMode = mode === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PER_CONTENT';
    await adminService.updateSettings({
      monetization_mode: validMode,
    });
    return validMode;
  },

  /**
   * Public config consumed by frontend client on launch/refresh.
   */
  async getPublicConfig(): Promise<MonetizationPublicConfig> {
    const mode = await this.getMonetizationMode();
    const plans = await subscriptionService.getPlans();
    const settings = await adminService.getSettings();

    const defaultMoviePrice = parseInt(settings.per_movie_price || '30', 10);
    const defaultSeriesPrice = parseInt(settings.per_series_price || '35', 10);

    return {
      mode,
      plans,
      currencySymbol: settings.currency_symbol || '₹',
      upiId: settings.payment_upi_id || 'flopshow@upi',
      merchantName: settings.payment_upi_merchant_name || 'FLOPSHOW',
      defaultMoviePrice: isNaN(defaultMoviePrice) ? 30 : defaultMoviePrice,
      defaultSeriesPrice: isNaN(defaultSeriesPrice) ? 35 : defaultSeriesPrice,
    };
  },

  /**
   * Admin-specific config including mode, editable plan prices, and subscription metrics.
   */
  async getAdminConfig(): Promise<MonetizationAdminConfig> {
    const mode = await this.getMonetizationMode();
    const settings = await adminService.getSettings();
    const plans = await subscriptionService.getPlans();

    const monthly = plans.find(p => p.id === 'MONTHLY')?.priceRupees || 89;
    const threeMonths = plans.find(p => p.id === '3_MONTHS')?.priceRupees || 189;
    const yearly = plans.find(p => p.id === 'YEARLY')?.priceRupees || 449;

    const defaultMoviePrice = parseInt(settings.per_movie_price || '30', 10);
    const defaultSeriesPrice = parseInt(settings.per_series_price || '35', 10);

    // Fetch subscription metrics from DB
    const db = getAdapter();
    const now = new Date().toISOString();

    const { rows: countRows } = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVE' AND end_date >= ? THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'ACTIVE' THEN amount_paid ELSE 0 END) as total_revenue
      FROM subscriptions;
    `, [now]);

    const stats = countRows[0] || {};

    return {
      mode,
      monthlyPrice: monthly,
      threeMonthsPrice: threeMonths,
      yearlyPrice: yearly,
      defaultMoviePrice: isNaN(defaultMoviePrice) ? 30 : defaultMoviePrice,
      defaultSeriesPrice: isNaN(defaultSeriesPrice) ? 35 : defaultSeriesPrice,
      currencySymbol: settings.currency_symbol || '₹',
      metrics: {
        totalSubscriptions: parseInt(stats.total || '0', 10),
        activeCount: parseInt(stats.active_count || '0', 10),
        pendingCount: parseInt(stats.pending_count || '0', 10),
        totalRevenueRupees: parseInt(stats.total_revenue || '0', 10),
      },
    };
  },

  /**
   * Admin updates monetization mode and/or subscription plan prices.
   */
  async updateAdminConfig(data: {
    mode?: MonetizationMode;
    weeklyPrice?: number;
    monthlyPrice?: number;
    threeMonthsPrice?: number;
    yearlyPrice?: number;
    defaultMoviePrice?: number;
    defaultSeriesPrice?: number;
  }): Promise<MonetizationAdminConfig> {
    const updates: Record<string, string> = {};

    if (data.mode) {
      updates.monetization_mode = data.mode === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PER_CONTENT';
    }

    if (data.weeklyPrice !== undefined) {
      const num = Math.round(Number(data.weeklyPrice));
      if (isNaN(num) || num < 0) throw new Error('Weekly plan price must be a valid non-negative number.');
      updates.subscription_price_weekly = String(num);
    }

    if (data.monthlyPrice !== undefined) {
      const num = Math.round(Number(data.monthlyPrice));
      if (isNaN(num) || num < 0) throw new Error('Monthly plan price must be a valid non-negative number.');
      updates.subscription_price_monthly = String(num);
    }

    if (data.threeMonthsPrice !== undefined) {
      const num = Math.round(Number(data.threeMonthsPrice));
      if (isNaN(num) || num < 0) throw new Error('3-Months plan price must be a valid non-negative number.');
      updates.subscription_price_3_months = String(num);
    }

    if (data.yearlyPrice !== undefined) {
      const num = Math.round(Number(data.yearlyPrice));
      if (isNaN(num) || num < 0) throw new Error('Yearly plan price must be a valid non-negative number.');
      updates.subscription_price_yearly = String(num);
    }

    if (data.defaultMoviePrice !== undefined) {
      const num = Math.round(Number(data.defaultMoviePrice));
      if (isNaN(num) || num < 0) throw new Error('Default movie price must be a valid non-negative number.');
      updates.per_movie_price = String(num);
    }

    if (data.defaultSeriesPrice !== undefined) {
      const num = Math.round(Number(data.defaultSeriesPrice));
      if (isNaN(num) || num < 0) throw new Error('Default series price must be a valid non-negative number.');
      updates.per_series_price = String(num);
    }

    if (Object.keys(updates).length > 0) {
      await adminService.updateSettings(updates);
    }

    return this.getAdminConfig();
  }
};
