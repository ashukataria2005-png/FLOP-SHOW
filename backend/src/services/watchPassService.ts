import crypto from 'crypto';
import { adminService } from './adminService.js';
import {
  watchPassRepository,
  WatchPassPlan,
  WatchPassRecord,
  WatchPassStatus,
  WatchPassPaymentMethod
} from '../repositories/watchPassRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';

export interface WatchPassPlanConfig {
  id: string;
  plan: WatchPassPlan;
  name: string;
  durationLabel: string;
  durationDays: number;
  priceRupees: number;
  description: string;
  popular?: boolean;
  highlight?: string;
}

const DURATION_DAYS_MAP: Record<WatchPassPlan, number> = {
  PASS_24H: 1,
  PASS_3D: 3,
  PASS_7D: 7,
  PASS_30D: 30,
};

const PLAN_NAME_MAP: Record<WatchPassPlan, string> = {
  PASS_24H: '24 Hours Pass',
  PASS_3D: '3 Days Pass',
  PASS_7D: '7 Days Pass',
  PASS_30D: '30 Days Pass',
};

const PLAN_DESC_MAP: Record<WatchPassPlan, string> = {
  PASS_24H: 'Perfect for movie night. 24 hours of instant playback on your chosen title.',
  PASS_3D: 'Ideal for weekend bingeing. 72 hours of uninterrupted access to this title.',
  PASS_7D: 'Full week of playback. Watch at your own pace across all devices in HD.',
  PASS_30D: 'Extended monthly title pass. Re-watch and finish complete series anytime.',
};

export const watchPassService = {
  /**
   * Return dynamic plan pricing configured by the Administrator in app_settings.
   * Prices are NEVER hardcoded throughout the system.
   */
  async getPlans(): Promise<WatchPassPlanConfig[]> {
    const settings = await adminService.getSettings();
    const p24 = parseInt(settings.watch_pass_price_24h || '29', 10);
    const p3d = parseInt(settings.watch_pass_price_3d || '49', 10);
    const p7d = parseInt(settings.watch_pass_price_7d || '79', 10);
    const p30d = parseInt(settings.watch_pass_price_30d || '149', 10);

    return [
      {
        id: 'PASS_24H',
        plan: 'PASS_24H',
        name: PLAN_NAME_MAP.PASS_24H,
        durationLabel: '24 Hours',
        durationDays: 1,
        priceRupees: isNaN(p24) ? 29 : p24,
        description: PLAN_DESC_MAP.PASS_24H,
        highlight: 'Quick Access'
      },
      {
        id: 'PASS_3D',
        plan: 'PASS_3D',
        name: PLAN_NAME_MAP.PASS_3D,
        durationLabel: '3 Days',
        durationDays: 3,
        priceRupees: isNaN(p3d) ? 49 : p3d,
        description: PLAN_DESC_MAP.PASS_3D,
        highlight: 'Weekend Favorite'
      },
      {
        id: 'PASS_7D',
        plan: 'PASS_7D',
        name: PLAN_NAME_MAP.PASS_7D,
        durationLabel: '7 Days',
        durationDays: 7,
        priceRupees: isNaN(p7d) ? 79 : p7d,
        description: PLAN_DESC_MAP.PASS_7D,
        popular: true,
        highlight: 'Most Popular'
      },
      {
        id: 'PASS_30D',
        plan: 'PASS_30D',
        name: PLAN_NAME_MAP.PASS_30D,
        durationLabel: '30 Days',
        durationDays: 30,
        priceRupees: isNaN(p30d) ? 149 : p30d,
        description: PLAN_DESC_MAP.PASS_30D,
        highlight: 'Best Value'
      }
    ];
  },

  async getPlanConfig(plan: WatchPassPlan): Promise<WatchPassPlanConfig> {
    const plans = await this.getPlans();
    const found = plans.find(p => p.plan === plan);
    if (!found) {
      const err = new Error(`Invalid watch pass plan: ${plan}`);
      (err as any).statusCode = 400;
      throw err;
    }
    return found;
  },

  /**
   * Submit manual UPI payment request for a specific movie or series.
   * Status starts as PENDING.
   * User does NOT receive playback access while pending.
   */
  async submitPassRequest(
    userId: string,
    data: {
      contentId: string;
      plan: WatchPassPlan;
      utr: string;
      userName?: string;
      userEmail?: string;
    }
  ): Promise<WatchPassRecord> {
    if (!['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_30D'].includes(data.plan)) {
      const err = new Error('Invalid watch pass plan selected.');
      (err as any).statusCode = 400;
      throw err;
    }

    const content = await contentRepository.getById(data.contentId);
    if (!content) {
      const err = new Error('Selected movie or series was not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const cleanUtr = (data.utr || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      const err = new Error('Please enter a valid 6-35 character alphanumeric UPI UTR / Transaction reference.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Check duplicate UTR across existing passes
    const existingWithUtr = await watchPassRepository.getByPaymentReference(cleanUtr);
    if (existingWithUtr) {
      if (existingWithUtr.status === 'ACTIVE') {
        const err = new Error('This payment UTR has already been approved for an active Watch Pass.');
        (err as any).statusCode = 409;
        throw err;
      }
      if (existingWithUtr.status === 'PENDING') {
        const err = new Error('A Watch Pass request with this UTR is already pending review.');
        (err as any).statusCode = 409;
        throw err;
      }
    }

    // If user already owns this content permanently, advise them
    const owned = await purchaseRepository.isOwned(userId, data.contentId);
    if (owned) {
      const err = new Error('You already permanently own this title in your Library! A temporary pass is not needed.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Check if user already has a pending pass for this specific title
    const latest = await watchPassRepository.getUserLatestPass(userId, data.contentId);
    if (latest && latest.status === 'PENDING') {
      const err = new Error('You already have a Watch Pass request for this title pending administrator review.');
      (err as any).statusCode = 409;
      throw err;
    }

    const planConfig = await this.getPlanConfig(data.plan);
    const passId = `wpass_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    return watchPassRepository.createPass({
      id: passId,
      userId,
      contentId: data.contentId,
      plan: data.plan,
      durationDays: planConfig.durationDays,
      amountPaid: planConfig.priceRupees,
      status: 'PENDING',
      paymentMethod: 'MANUAL_UPI',
      paymentReference: cleanUtr,
      submittedAt: now,
    });
  },

  /**
   * Admin approves a pending watch pass request.
   * Activates the pass and calculates expires_at.
   */
  async approvePass(
    adminId: string,
    passId: string,
    adminNote?: string
  ): Promise<WatchPassRecord> {
    const pass = await watchPassRepository.getById(passId);
    if (!pass) {
      const err = new Error('Watch pass request not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (pass.status === 'ACTIVE') {
      return pass;
    }

    if (pass.status !== 'PENDING') {
      const err = new Error(`Cannot approve watch pass with status "${pass.status}".`);
      (err as any).statusCode = 400;
      throw err;
    }

    const durationDays = DURATION_DAYS_MAP[pass.plan] || pass.duration_days || 1;
    const now = new Date();
    const activatedAt = now.toISOString();

    // Check if user has an existing active pass for this content that hasn't expired yet
    const existingActive = await watchPassRepository.getUserActivePass(pass.user_id, pass.content_id);
    let baseTime = now.getTime();
    if (existingActive && existingActive.expires_at) {
      const existingExpiryTime = new Date(existingActive.expires_at).getTime();
      if (existingExpiryTime > baseTime) {
        // Seamless extension: add duration onto remaining time
        baseTime = existingExpiryTime;
      }
    }

    const expiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();

    return watchPassRepository.updateStatus(passId, 'ACTIVE', {
      adminId,
      adminNote: adminNote || 'Approved by administrator.',
      activatedAt,
      expiresAt,
    });
  },

  /**
   * Admin rejects a pending watch pass request.
   */
  async rejectPass(
    adminId: string,
    passId: string,
    adminNote?: string
  ): Promise<WatchPassRecord> {
    const pass = await watchPassRepository.getById(passId);
    if (!pass) {
      const err = new Error('Watch pass request not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (pass.status !== 'PENDING') {
      const err = new Error(`Cannot reject watch pass with status "${pass.status}". Only PENDING passes can be rejected.`);
      (err as any).statusCode = 400;
      throw err;
    }

    return watchPassRepository.updateStatus(passId, 'REJECTED', {
      adminId,
      adminNote: adminNote || 'Payment could not be verified by administrator.'
    });
  },

  /**
   * Check if a user currently has authorized active access to a specific content via watch pass.
   */
  async hasActivePass(userId: string, contentId: string): Promise<boolean> {
    return watchPassRepository.hasActivePass(userId, contentId);
  },

  /**
   * Get pass status for user on a specific title (for DetailsPage).
   */
  async getContentPassStatus(userId: string, contentId: string): Promise<{
    hasActivePass: boolean;
    activePass: (WatchPassRecord & { remainingHours: number; remainingDays: number }) | null;
    pendingPass: WatchPassRecord | null;
    latestPass: WatchPassRecord | null;
    isExpired: boolean;
  }> {
    await watchPassRepository.markExpiredPasses();

    const active = await watchPassRepository.getUserActivePass(userId, contentId);
    const latest = await watchPassRepository.getUserLatestPass(userId, contentId);

    let activeWithRemaining = null;
    if (active && active.expires_at) {
      const now = new Date().getTime();
      const end = new Date(active.expires_at).getTime();
      const diffMs = Math.max(0, end - now);
      const remainingHours = Math.ceil(diffMs / (1000 * 60 * 60));
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      activeWithRemaining = {
        ...active,
        remainingHours,
        remainingDays,
      };
    }

    const pending = latest && latest.status === 'PENDING' ? latest : null;
    const isExpired = Boolean(latest && latest.status === 'EXPIRED' && !activeWithRemaining);

    return {
      hasActivePass: Boolean(activeWithRemaining),
      activePass: activeWithRemaining,
      pendingPass: pending,
      latestPass: latest,
      isExpired,
    };
  },

  /**
   * Get all passes for a user (Active vs Expired vs Pending).
   */
  async getUserPasses(userId: string): Promise<{
    activePasses: Array<WatchPassRecord & { remainingHours: number; remainingDays: number }>;
    expiredPasses: WatchPassRecord[];
    pendingPasses: WatchPassRecord[];
  }> {
    const all = await watchPassRepository.getUserPasses(userId);
    const now = new Date().getTime();

    const activePasses: Array<WatchPassRecord & { remainingHours: number; remainingDays: number }> = [];
    const expiredPasses: WatchPassRecord[] = [];
    const pendingPasses: WatchPassRecord[] = [];

    for (const p of all) {
      if (p.status === 'ACTIVE' && p.expires_at) {
        const end = new Date(p.expires_at).getTime();
        const diffMs = Math.max(0, end - now);
        activePasses.push({
          ...p,
          remainingHours: Math.ceil(diffMs / (1000 * 60 * 60)),
          remainingDays: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
        });
      } else if (p.status === 'EXPIRED') {
        expiredPasses.push(p);
      } else if (p.status === 'PENDING') {
        pendingPasses.push(p);
      }
    }

    return {
      activePasses,
      expiredPasses,
      pendingPasses,
    };
  },

  /**
   * Admin: get pass requests with optional status filter.
   */
  async getAllPasses(statusFilter?: WatchPassStatus, limit = 100): Promise<WatchPassRecord[]> {
    return watchPassRepository.getAllPasses(statusFilter, limit);
  },

  /**
   * Admin: strictly separated Watch Pass metrics.
   */
  async getAnalytics() {
    return watchPassRepository.getMetrics();
  }
};
