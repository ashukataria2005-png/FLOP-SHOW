import crypto from 'crypto';
import { adminService } from './adminService.js';
import {
  watchPassRepository,
  WatchPassPlan,
  WatchPassRecord,
  WatchPassStatus,
} from '../repositories/watchPassRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';

export interface WatchPassPlanConfig {
  id: string;
  plan: WatchPassPlan;
  name: string;
  durationLabel: string;
  durationDays: number;
  priceRupees: number;
  maxResolution: '720p' | '1080p';
  downloadAllowed: boolean;
  maxDevices: number;
  allowedDevicesLabel: string;
  allowedDeviceTypes: string[];
  description: string;
  popular?: boolean;
  highlight?: string;
  benefits: string[];
}

export const WATCH_PASS_DEVICE_LIMITS: Record<WatchPassPlan, { maxDevices: number; allowedDevicesLabel: string; allowedDeviceTypes: string[] }> = {
  PASS_24H: {
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
  },
  PASS_3D: {
    maxDevices: 1,
    allowedDevicesLabel: '1 Device',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
  },
  PASS_7D: {
    maxDevices: 2,
    allowedDevicesLabel: '2 Devices (1 Tablet + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'TV'],
  },
  PASS_15D: {
    maxDevices: 3,
    allowedDevicesLabel: '3 Devices (2 Tablets + 1 TV)',
    allowedDeviceTypes: ['Tablet', 'Tablet', 'TV'],
  },
  PASS_30D: {
    maxDevices: 4,
    allowedDevicesLabel: '4 Devices',
    allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
  },
};

const DURATION_DAYS_MAP: Record<string, number> = {
  PASS_24H: 1,
  PASS_3D: 3,
  PASS_7D: 7,
  PASS_15D: 15,
  PASS_30D: 30,
};

const PLAN_NAME_MAP: Record<string, string> = {
  PASS_24H: '24 Hours Pass',
  PASS_3D: '3 Days Pass',
  PASS_7D: '7 Days Pass',
  PASS_15D: '15 Days Pass',
};

const PLAN_DESC_MAP: Record<string, string> = {
  PASS_24H: '24 Hours Access • 720p HD • 1 Device',
  PASS_3D: '3 Days Access • 720p HD • 1 Device',
  PASS_7D: '7 Days Access • 1080p Full HD • 2 Devices',
  PASS_15D: '15 Days Access • 1080p Full HD • 3 Devices',
};

export const watchPassService = {
  /**
   * Return dynamic plan pricing configured by the Administrator in app_settings.
   * Exactly 4 standard plans: 24H, 3D, 7D, 15D.
   */
  async getPlans(): Promise<WatchPassPlanConfig[]> {
    const settings = await adminService.getSettings();
    const p24 = parseInt(settings.watch_pass_price_24h || '19', 10);
    const p3d = parseInt(settings.watch_pass_price_3d || '29', 10);
    const p7d = parseInt(settings.watch_pass_price_7d || '44', 10);
    const p15d = parseInt(settings.watch_pass_price_15d || '69', 10);

    return [
      {
        id: 'PASS_24H',
        plan: 'PASS_24H',
        name: PLAN_NAME_MAP.PASS_24H,
        durationLabel: '24 Hours',
        durationDays: 1,
        priceRupees: isNaN(p24) ? 19 : p24,
        maxResolution: '720p',
        downloadAllowed: false,
        maxDevices: WATCH_PASS_DEVICE_LIMITS.PASS_24H.maxDevices,
        allowedDevicesLabel: WATCH_PASS_DEVICE_LIMITS.PASS_24H.allowedDevicesLabel,
        allowedDeviceTypes: WATCH_PASS_DEVICE_LIMITS.PASS_24H.allowedDeviceTypes,
        description: PLAN_DESC_MAP.PASS_24H,
        highlight: 'Quick Access',
        benefits: [
          '24 Hours Access',
          'HD 720p',
          '1 Device',
          'Unlimited eligible catalog streaming',
          'No Download',
        ],
      },
      {
        id: 'PASS_3D',
        plan: 'PASS_3D',
        name: PLAN_NAME_MAP.PASS_3D,
        durationLabel: '3 Days',
        durationDays: 3,
        priceRupees: isNaN(p3d) ? 29 : p3d,
        maxResolution: '720p',
        downloadAllowed: false,
        maxDevices: WATCH_PASS_DEVICE_LIMITS.PASS_3D.maxDevices,
        allowedDevicesLabel: WATCH_PASS_DEVICE_LIMITS.PASS_3D.allowedDevicesLabel,
        allowedDeviceTypes: WATCH_PASS_DEVICE_LIMITS.PASS_3D.allowedDeviceTypes,
        description: PLAN_DESC_MAP.PASS_3D,
        highlight: 'Weekend Favorite',
        benefits: [
          '3 Days Access',
          'HD 720p',
          '1 Device',
          'No Download',
        ],
      },
      {
        id: 'PASS_7D',
        plan: 'PASS_7D',
        name: PLAN_NAME_MAP.PASS_7D,
        durationLabel: '7 Days',
        durationDays: 7,
        priceRupees: isNaN(p7d) ? 44 : p7d,
        maxResolution: '1080p',
        downloadAllowed: true,
        maxDevices: WATCH_PASS_DEVICE_LIMITS.PASS_7D.maxDevices,
        allowedDevicesLabel: WATCH_PASS_DEVICE_LIMITS.PASS_7D.allowedDevicesLabel,
        allowedDeviceTypes: WATCH_PASS_DEVICE_LIMITS.PASS_7D.allowedDeviceTypes,
        description: PLAN_DESC_MAP.PASS_7D,
        popular: true,
        highlight: 'Recommended',
        benefits: [
          '7 Days Access',
          'Full HD 1080p',
          'Download Available',
          '2 Devices',
          '1 Tablet + 1 TV',
        ],
      },
      {
        id: 'PASS_15D',
        plan: 'PASS_15D',
        name: PLAN_NAME_MAP.PASS_15D,
        durationLabel: '15 Days',
        durationDays: 15,
        priceRupees: isNaN(p15d) ? 69 : p15d,
        maxResolution: '1080p',
        downloadAllowed: true,
        maxDevices: WATCH_PASS_DEVICE_LIMITS.PASS_15D.maxDevices,
        allowedDevicesLabel: WATCH_PASS_DEVICE_LIMITS.PASS_15D.allowedDevicesLabel,
        allowedDeviceTypes: WATCH_PASS_DEVICE_LIMITS.PASS_15D.allowedDeviceTypes,
        description: PLAN_DESC_MAP.PASS_15D,
        highlight: 'Best Value',
        benefits: [
          '15 Days Access',
          'Full HD 1080p',
          'Download Available',
          '3 Devices',
          '2 Tablets + 1 TV',
        ],
      },
    ];
  },

  async getPlanConfig(plan: WatchPassPlan): Promise<WatchPassPlanConfig> {
    const plans = await this.getPlans();
    const found = plans.find(p => p.plan === plan);
    if (found) return found;

    const days = DURATION_DAYS_MAP[plan] || 1;
    const limits = WATCH_PASS_DEVICE_LIMITS[plan] || { maxDevices: 1, allowedDevicesLabel: '1 Device', allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'] };
    return {
      id: plan,
      plan,
      name: PLAN_NAME_MAP[plan] || `${days} Days Pass`,
      durationLabel: `${days} Days`,
      durationDays: days,
      priceRupees: 44,
      maxResolution: days >= 7 ? '1080p' : '720p',
      downloadAllowed: days >= 7,
      maxDevices: limits.maxDevices,
      allowedDevicesLabel: limits.allowedDevicesLabel,
      allowedDeviceTypes: limits.allowedDeviceTypes,
      description: PLAN_DESC_MAP[plan] || 'FLOPSHOW Watch Pass',
      benefits: ['Unlimited movies & web series'],
    };
  },

  /**
   * User submits a manual UPI payment for a catalog-wide Watch Pass.
   * Creates a PENDING request waiting for administrator approval.
   */
  async submitPassRequest(
    userId: string,
    data: {
      contentId?: string | null;
      plan: WatchPassPlan;
      utr: string;
      userName?: string;
      userEmail?: string;
    }
  ): Promise<WatchPassRecord> {
    if (!['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D'].includes(data.plan)) {
      const err = new Error('Invalid watch pass plan selected. Choose from 24H, 3D, 7D, or 15D.');
      (err as any).statusCode = 400;
      throw err;
    }

    let finalContentId: string | null = null;
    if (data.contentId && data.contentId !== 'ALL_CATALOG') {
      const content = await contentRepository.findByIdOrSlug(data.contentId);
      if (content) {
        finalContentId = content.id;
      }
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

    // Check if user already has a pending pass request
    const latest = await watchPassRepository.getUserLatestPass(userId);
    if (latest && latest.status === 'PENDING') {
      const err = new Error('You already have a Watch Pass request pending administrator verification.');
      (err as any).statusCode = 409;
      throw err;
    }

    const planConfig = await this.getPlanConfig(data.plan);
    const passId = `wpass_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const createdPass = await watchPassRepository.createPass({
      id: passId,
      userId,
      contentId: finalContentId,
      plan: data.plan,
      durationDays: planConfig.durationDays,
      amountPaid: planConfig.priceRupees,
      status: 'PENDING',
      paymentMethod: 'MANUAL_UPI',
      paymentReference: cleanUtr,
      submittedAt: now,
    });

    // Check if AUTOMATIC APPROVAL mode is active
    const settings = await adminService.getSettings();
    if (settings.payment_approval_mode === 'AUTOMATIC') {
      try {
        return await this.approvePass(
          'SYSTEM_AUTO',
          createdPass.id,
          'Auto-approved via Automatic Approval mode'
        );
      } catch (autoErr) {
        console.error('[Automatic Approval] Error auto-approving watch pass:', autoErr);
      }
    }

    return createdPass;
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

    const now = new Date();
    const durationDays = Number(pass.duration_days) || DURATION_DAYS_MAP[pass.plan] || 1;

    // Check if user currently has an active pass to extend validity seamlessly
    const currentActive = await watchPassRepository.getUserActivePass(pass.user_id);
    let baseTime = now.getTime();
    if (currentActive && currentActive.expires_at) {
      const currentExpiryMs = new Date(currentActive.expires_at).getTime();
      if (currentExpiryMs > baseTime) {
        baseTime = currentExpiryMs;
      }
    }

    const expiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const activatedAt = now.toISOString();

    return watchPassRepository.updateStatus(passId, 'ACTIVE', {
      adminId,
      adminNote: adminNote || 'Payment approved via Admin Ledger.',
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
      const err = new Error(`Cannot reject watch pass with status "${pass.status}".`);
      (err as any).statusCode = 400;
      throw err;
    }

    return watchPassRepository.updateStatus(passId, 'REJECTED', {
      adminId,
      adminNote: adminNote || 'Payment could not be verified by administrator.'
    });
  },

  /**
   * Check if a user currently has authorized active access via watch pass.
   * Catalog-wide: returns true for all titles while active.
   */
  async hasActivePass(userId: string, _contentId?: string): Promise<boolean> {
    return watchPassRepository.hasActivePass(userId);
  },

  /**
   * Get active pass capabilities (quality cap, download entitlement, time remaining, device limits).
   */
  async getActivePassCapabilities(userId: string): Promise<{
    hasActivePass: boolean;
    plan?: WatchPassPlan;
    maxResolution: '720p' | '1080p';
    downloadAllowed: boolean;
    maxDevices: number;
    allowedDevicesLabel: string;
    allowedDeviceTypes: string[];
    remainingHours: number;
    remainingDays: number;
    expiresAt?: string;
  }> {
    const active = await watchPassRepository.getUserActivePass(userId);
    if (!active || !active.expires_at) {
      return {
        hasActivePass: false,
        maxResolution: '1080p',
        downloadAllowed: false,
        maxDevices: 1,
        allowedDevicesLabel: '1 Device',
        allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'],
        remainingHours: 0,
        remainingDays: 0,
      };
    }

    const now = Date.now();
    const end = new Date(active.expires_at).getTime();
    const diffMs = Math.max(0, end - now);
    const remainingHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const is1080p = active.plan === 'PASS_7D' || active.plan === 'PASS_15D' || active.plan === 'PASS_30D';
    const limits = WATCH_PASS_DEVICE_LIMITS[active.plan] || { maxDevices: 1, allowedDevicesLabel: '1 Device', allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'] };

    return {
      hasActivePass: true,
      plan: active.plan,
      maxResolution: is1080p ? '1080p' : '720p',
      downloadAllowed: is1080p,
      maxDevices: limits.maxDevices,
      allowedDevicesLabel: limits.allowedDevicesLabel,
      allowedDeviceTypes: limits.allowedDeviceTypes,
      remainingHours,
      remainingDays,
      expiresAt: active.expires_at,
    };
  },

  /**
   * Get pass status for user (for DetailsPage and PlansPage).
   */
  async getContentPassStatus(userId: string, contentId?: string): Promise<{
    hasActivePass: boolean;
    activePass: (WatchPassRecord & {
      remainingHours: number;
      remainingDays: number;
      maxResolution: string;
      downloadAllowed: boolean;
      maxDevices: number;
      allowedDevicesLabel: string;
      allowedDeviceTypes: string[];
    }) | null;
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
      const is1080p = active.plan === 'PASS_7D' || active.plan === 'PASS_15D' || active.plan === 'PASS_30D';
      const limits = WATCH_PASS_DEVICE_LIMITS[active.plan] || { maxDevices: 1, allowedDevicesLabel: '1 Device', allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'] };

      activeWithRemaining = {
        ...active,
        remainingHours,
        remainingDays,
        maxResolution: is1080p ? '1080p' : '720p',
        downloadAllowed: is1080p,
        maxDevices: limits.maxDevices,
        allowedDevicesLabel: limits.allowedDevicesLabel,
        allowedDeviceTypes: limits.allowedDeviceTypes,
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
    activePasses: Array<WatchPassRecord & {
      remainingHours: number;
      remainingDays: number;
      maxResolution: string;
      downloadAllowed: boolean;
      maxDevices: number;
      allowedDevicesLabel: string;
      allowedDeviceTypes: string[];
    }>;
    expiredPasses: WatchPassRecord[];
    pendingPasses: WatchPassRecord[];
  }> {
    const all = await watchPassRepository.getUserPasses(userId);
    const now = new Date().getTime();

    const activePasses: Array<WatchPassRecord & {
      remainingHours: number;
      remainingDays: number;
      maxResolution: string;
      downloadAllowed: boolean;
      maxDevices: number;
      allowedDevicesLabel: string;
      allowedDeviceTypes: string[];
    }> = [];
    const expiredPasses: WatchPassRecord[] = [];
    const pendingPasses: WatchPassRecord[] = [];

    for (const p of all) {
      if (p.status === 'ACTIVE' && p.expires_at) {
        const end = new Date(p.expires_at).getTime();
        const diffMs = Math.max(0, end - now);
        const is1080p = p.plan === 'PASS_7D' || p.plan === 'PASS_15D' || p.plan === 'PASS_30D';
        const limits = WATCH_PASS_DEVICE_LIMITS[p.plan] || { maxDevices: 1, allowedDevicesLabel: '1 Device', allowedDeviceTypes: ['Mobile', 'Tablet', 'TV', 'Laptop'] };

        activePasses.push({
          ...p,
          remainingHours: Math.ceil(diffMs / (1000 * 60 * 60)),
          remainingDays: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
          maxResolution: is1080p ? '1080p' : '720p',
          downloadAllowed: is1080p,
          maxDevices: limits.maxDevices,
          allowedDevicesLabel: limits.allowedDevicesLabel,
          allowedDeviceTypes: limits.allowedDeviceTypes,
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
