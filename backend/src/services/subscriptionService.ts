import crypto from 'crypto';
import { adminService } from './adminService.js';
import {
  subscriptionRepository,
  SubscriptionPlan,
  SubscriptionRecord,
  SubscriptionStatus,
  PaymentMethod
} from '../repositories/subscriptionRepository.js';

export interface PlanConfig {
  id: SubscriptionPlan;
  plan: SubscriptionPlan;
  name: string;
  durationDays: number;
  duration_days: number;
  priceRupees: number;
  price_inr: number;
  description: string;
  is_popular: boolean;
}

const PLAN_DURATIONS: Record<SubscriptionPlan, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  '3_MONTHS': 90,
  YEARLY: 365,
};

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  WEEKLY: 'Weekly Plan',
  MONTHLY: 'Monthly Plan',
  '3_MONTHS': '3 Months Plan',
  YEARLY: '12 Months / Full Year',
};

const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  WEEKLY: '7 days of uninterrupted streaming across all devices.',
  MONTHLY: '30 days full catalog access with HD & 1080p playback.',
  '3_MONTHS': '90 days full catalog access with HD & 1080p playback. Great quarterly value!',
  YEARLY: 'Best value! 365 days of unlimited movies and webseries across all devices.',
};

export const subscriptionService = {
  /**
   * Return dynamic plan pricing configured by the Administrator in app_settings.
   * Prices are NEVER hardcoded.
   */
  async getPlans(): Promise<PlanConfig[]> {
    const settings = await adminService.getSettings();
    const monthlyPrice = parseInt(settings.subscription_price_monthly || '89', 10);
    const threeMonthsPrice = parseInt(settings.subscription_price_3_months || '189', 10);
    const yearlyPrice = parseInt(settings.subscription_price_yearly || '449', 10);

    return [
      {
        id: 'MONTHLY',
        plan: 'MONTHLY',
        name: PLAN_NAMES.MONTHLY,
        durationDays: PLAN_DURATIONS.MONTHLY,
        duration_days: PLAN_DURATIONS.MONTHLY,
        priceRupees: isNaN(monthlyPrice) ? 89 : monthlyPrice,
        price_inr: isNaN(monthlyPrice) ? 89 : monthlyPrice,
        description: PLAN_DESCRIPTIONS.MONTHLY,
        is_popular: false,
      },
      {
        id: '3_MONTHS',
        plan: '3_MONTHS',
        name: PLAN_NAMES['3_MONTHS'],
        durationDays: PLAN_DURATIONS['3_MONTHS'],
        duration_days: PLAN_DURATIONS['3_MONTHS'],
        priceRupees: isNaN(threeMonthsPrice) ? 189 : threeMonthsPrice,
        price_inr: isNaN(threeMonthsPrice) ? 189 : threeMonthsPrice,
        description: PLAN_DESCRIPTIONS['3_MONTHS'],
        is_popular: true,
      },
      {
        id: 'YEARLY',
        plan: 'YEARLY',
        name: PLAN_NAMES.YEARLY,
        durationDays: PLAN_DURATIONS.YEARLY,
        duration_days: PLAN_DURATIONS.YEARLY,
        priceRupees: isNaN(yearlyPrice) ? 449 : yearlyPrice,
        price_inr: isNaN(yearlyPrice) ? 449 : yearlyPrice,
        description: PLAN_DESCRIPTIONS.YEARLY,
        is_popular: false,
      },
    ];
  },

  async getPlanConfig(plan: SubscriptionPlan): Promise<PlanConfig> {
    const plans = await this.getPlans();
    const found = plans.find(p => p.id === plan);
    if (!found) {
      const err = new Error(`Invalid subscription plan: ${plan}`);
      (err as any).statusCode = 400;
      throw err;
    }
    return found;
  },

  // ==========================================================================
  // 1. PAYMENT INITIATION / MANUAL UPI SUBMISSION
  // ==========================================================================

  /**
   * User selects plan and submits manual UPI UTR / transaction ID.
   * Creates a PENDING subscription request.
   * NOTE: The subscription is NOT activated yet. It strictly requires Admin approval.
   */
  async submitManualSubscriptionRequest(
    userId: string,
    data: {
      plan: SubscriptionPlan;
      utr: string;
      userName?: string;
      userEmail?: string;
    }
  ): Promise<SubscriptionRecord> {
    if (!['MONTHLY', '3_MONTHS', 'YEARLY'].includes(data.plan)) {
      const err = new Error('Invalid subscription plan. Choose MONTHLY, 3_MONTHS, or YEARLY.');
      (err as any).statusCode = 400;
      throw err;
    }

    const cleanUtr = (data.utr || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      const err = new Error('Please enter a valid 6-35 character alphanumeric UPI UTR / Transaction ID.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Check for duplicate UTR in subscriptions
    const existingWithUtr = await subscriptionRepository.getByPaymentReference(cleanUtr);
    if (existingWithUtr) {
      if (existingWithUtr.status === 'APPROVED' || existingWithUtr.status === 'ACTIVE') {
        const err = new Error('This UTR has already been approved for an active subscription.');
        (err as any).statusCode = 409;
        throw err;
      }
      if (existingWithUtr.status === 'PENDING') {
        const err = new Error('A subscription request with this UTR is already pending review.');
        (err as any).statusCode = 409;
        throw err;
      }
    }

    // Check if user already has an active subscription
    const currentActive = await subscriptionRepository.getUserActiveSubscription(userId);
    if (currentActive) {
      const err = new Error(
        `You already have an active ${currentActive.plan} subscription valid until ${new Date(currentActive.end_date!).toLocaleDateString('en-IN')}.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Check if user has a pending subscription request
    const latest = await subscriptionRepository.getUserLatestSubscription(userId);
    if (latest && latest.status === 'PENDING') {
      const err = new Error('You already have a subscription request pending admin verification. Please wait for review.');
      (err as any).statusCode = 409;
      throw err;
    }

    const planConfig = await this.getPlanConfig(data.plan);
    const subId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const createdSub = await subscriptionRepository.createSubscription({
      id: subId,
      userId,
      plan: data.plan,
      status: 'PENDING',
      amountPaid: planConfig.priceRupees,
      paymentMethod: 'MANUAL_UPI',
      paymentReference: cleanUtr,
      submittedAt: now,
    });

    // Check if AUTOMATIC APPROVAL mode is active
    const settings = await adminService.getSettings();
    if (settings.payment_approval_mode === 'AUTOMATIC') {
      try {
        return await this.approveSubscription(
          'SYSTEM_AUTO',
          createdSub.id,
          'Auto-approved via Automatic Approval mode'
        );
      } catch (autoErr) {
        console.error('[Automatic Approval] Error auto-approving subscription:', autoErr);
      }
    }

    return createdSub;
  },

  // ==========================================================================
  // 2. PAYMENT VERIFICATION (ADMIN REVIEW)
  // ==========================================================================

  /**
   * Admin approves a pending subscription request.
   * Calls the canonical subscription activation service.
   */
  async approveSubscription(
    adminId: string,
    subscriptionId: string,
    adminNote?: string
  ): Promise<SubscriptionRecord> {
    const sub = await subscriptionRepository.getById(subscriptionId);
    if (!sub) {
      const err = new Error('Subscription record not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (sub.status === 'ACTIVE') {
      return sub;
    }

    if (sub.status !== 'PENDING') {
      const err = new Error(`Cannot approve subscription with status "${sub.status}".`);
      (err as any).statusCode = 400;
      throw err;
    }

    return this.activateSubscription(subscriptionId, {
      adminId,
      adminNote: adminNote || 'Approved by administrator.',
      method: sub.payment_method
    });
  },

  /**
   * Admin rejects a pending subscription request.
   * User is NOT granted access.
   */
  async rejectSubscription(
    adminId: string,
    subscriptionId: string,
    adminNote?: string
  ): Promise<SubscriptionRecord> {
    const sub = await subscriptionRepository.getById(subscriptionId);
    if (!sub) {
      const err = new Error('Subscription record not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (sub.status !== 'PENDING') {
      const err = new Error(`Cannot reject subscription with status "${sub.status}". Only PENDING requests can be rejected.`);
      (err as any).statusCode = 400;
      throw err;
    }

    return subscriptionRepository.updateStatus(subscriptionId, 'REJECTED', {
      adminId,
      adminNote: adminNote || 'Payment could not be verified by administrator.'
    });
  },

  // ==========================================================================
  // 3. CORE SUBSCRIPTION ACTIVATION ENGINE
  // ==========================================================================

  /**
   * CANONICAL ACTIVATION FUNCTION:
   * 
   * [FUTURE PAYMENT GATEWAY INTEGRATION POINT]
   * When an automated payment gateway (e.g. Stripe, Razorpay, Cashfree, PhonePe SDK)
   * is integrated later:
   *   1. The gateway webhook receives verified payment notification.
   *   2. The gateway handler verifies signature/status.
   *   3. The gateway handler calls this exact function:
   *      await subscriptionService.activateSubscription(subscriptionId, {
   *        paymentReference: gatewayTransactionId,
   *        method: 'GATEWAY'
   *      });
   * 
   * NO RESTRUCTURING of plans, access logic, or UI is needed.
   */
  async activateSubscription(
    subscriptionId: string,
    options?: {
      adminId?: string | null;
      adminNote?: string | null;
      paymentReference?: string | null;
      method?: PaymentMethod;
    }
  ): Promise<SubscriptionRecord> {
    const sub = await subscriptionRepository.getById(subscriptionId);
    if (!sub) {
      const err = new Error('Subscription record not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const durationDays = PLAN_DURATIONS[sub.plan] || 30;
    const now = new Date();
    const startDate = now.toISOString();

    const endDateObj = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const endDate = endDateObj.toISOString();

    return subscriptionRepository.updateStatus(subscriptionId, 'ACTIVE', {
      adminId: options?.adminId,
      adminNote: options?.adminNote,
      startDate,
      endDate,
      activatedAt: startDate
    });
  },

  /**
   * Admin direct grant: Creates and immediately activates a subscription for a user.
   */
  async adminGrantSubscription(
    adminId: string,
    data: {
      userId: string;
      plan: SubscriptionPlan;
      adminNote?: string;
    }
  ): Promise<SubscriptionRecord> {
    const planConfig = await this.getPlanConfig(data.plan);
    const subId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const startDate = now.toISOString();
    const durationDays = PLAN_DURATIONS[data.plan];
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    return subscriptionRepository.createSubscription({
      id: subId,
      userId: data.userId,
      plan: data.plan,
      status: 'ACTIVE',
      amountPaid: planConfig.priceRupees,
      paymentMethod: 'ADMIN_GRANT',
      paymentReference: `MANUAL_GRANT_BY_${adminId}`,
      adminId,
      adminNote: data.adminNote || 'Granted directly by administrator.',
      submittedAt: startDate,
      activatedAt: startDate,
      startDate,
      endDate,
    });
  },

  // ==========================================================================
  // 4. USER SUBSCRIPTION STATUS & PLAYBACK ACCESS
  // ==========================================================================

  /**
   * Checks if user has an active, unexpired subscription.
   * Used for playback authorization in mediaService.
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    if (!userId) return false;
    // Periodically update expired statuses
    await subscriptionRepository.markExpiredSubscriptions();
    const active = await subscriptionRepository.getUserActiveSubscription(userId);
    return Boolean(active);
  },

  /**
   * Returns current user subscription status summary for UI.
   */
  async getUserStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    activeSubscription: (SubscriptionRecord & { daysRemaining: number }) | null;
    pendingSubscription: SubscriptionRecord | null;
    latestSubscription: SubscriptionRecord | null;
  }> {
    await subscriptionRepository.markExpiredSubscriptions();

    const active = await subscriptionRepository.getUserActiveSubscription(userId);
    const latest = await subscriptionRepository.getUserLatestSubscription(userId);

    let activeWithRemaining: (SubscriptionRecord & { daysRemaining: number }) | null = null;
    if (active && active.end_date) {
      const now = new Date().getTime();
      const end = new Date(active.end_date).getTime();
      const diffDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      activeWithRemaining = {
        ...active,
        daysRemaining: diffDays,
      };
    }

    const pending = latest && latest.status === 'PENDING' ? latest : null;

    return {
      hasActiveSubscription: Boolean(activeWithRemaining),
      has_active: Boolean(activeWithRemaining),
      activeSubscription: activeWithRemaining,
      active: activeWithRemaining,
      pendingSubscription: pending,
      pending,
      latestSubscription: latest,
      latest,
    };
  },

  /**
   * Admin: List all subscriptions with optional status filter.
   */
  async getAllSubscriptions(statusFilter?: SubscriptionStatus, limit = 100): Promise<SubscriptionRecord[]> {
    await subscriptionRepository.markExpiredSubscriptions();
    return subscriptionRepository.getAllSubscriptions(statusFilter, limit);
  }
};
