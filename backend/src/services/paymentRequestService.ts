import crypto from 'crypto';
import { getAdapter } from '../db/adapter.js';
import { adminService } from './adminService.js';
import {
  paymentRequestRepository,
  PaymentRequestRecord,
  PaymentMetrics,
} from '../repositories/paymentRequestRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { purchaseRepository } from '../repositories/purchaseRepository.js';
import { contentRepository, ContentRecord } from '../repositories/contentRepository.js';
import { subscriptionRepository, SubscriptionPlan } from '../repositories/subscriptionRepository.js';
import { watchPassRepository, WatchPassPlan } from '../repositories/watchPassRepository.js';
import { subscriptionService } from './subscriptionService.js';
import { watchPassService } from './watchPassService.js';

export interface PublicPaymentConfig {
  upiId: string;
  upiEnabled: boolean;
  merchantName: string;
  approvalMode: 'MANUAL' | 'AUTOMATIC';
}

export const paymentRequestService = {
  /**
   * Public configuration for the frontend recharge modal.
   * Safe to call by any user; exposes only the public UPI ID and enabled status.
   */
  async getPublicPaymentConfig(): Promise<PublicPaymentConfig> {
    const settings = await adminService.getSettings();
    const upiId = settings.payment_upi_id || 'flopshow@upi';
    const upiEnabled = settings.payment_upi_enabled !== 'false';
    const merchantName = settings.payment_upi_merchant_name || 'FLOPSHOW';
    const approvalMode = settings.payment_approval_mode === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';

    return {
      upiId,
      upiEnabled,
      merchantName,
      approvalMode,
    };
  },

  /**
   * Admin: Update UPI configuration.
   */
  async updatePaymentConfig(data: {
    upiId?: string;
    enabled?: boolean;
    merchantName?: string;
    approvalMode?: 'MANUAL' | 'AUTOMATIC';
  }): Promise<PublicPaymentConfig> {
    const updates: Record<string, string> = {};
    if (data.upiId) {
      const clean = data.upiId.trim();
      if (!clean.includes('@') || clean.length < 5) {
        const err = new Error('Invalid UPI ID format. Expected format: username@bank');
        (err as any).statusCode = 400;
        throw err;
      }
      updates.payment_upi_id = clean;
    }

    if (data.enabled !== undefined) {
      updates.payment_upi_enabled = data.enabled ? 'true' : 'false';
    }

    if (data.merchantName) {
      updates.payment_upi_merchant_name = data.merchantName.trim();
    }

    if (data.approvalMode) {
      updates.payment_approval_mode = data.approvalMode;
    }

    if (Object.keys(updates).length > 0) {
      await adminService.updateSettings(updates);
    }
    return this.getPublicPaymentConfig();
  },

  /**
   * User submits a manual UPI payment request with UTR.
   * Supports all 4 paid product types: MOVIE, SERIES, WATCH_PASS, SUBSCRIPTION.
   */
  async submitPaymentRequest(
    userId: string,
    data: {
      amountRupees?: number;
      utr: string;
      userName?: string;
      userEmail?: string;
      contentId?: string | null;
      productType?: 'MOVIE' | 'SERIES' | 'WATCH_PASS' | 'SUBSCRIPTION';
      planId?: string | null;
      planName?: string | null;
    }
  ): Promise<PaymentRequestRecord> {
    const { upiId, upiEnabled } = await this.getPublicPaymentConfig();

    if (!upiEnabled) {
      const err = new Error('UPI payments are currently disabled by administrator.');
      (err as any).statusCode = 400;
      throw err;
    }

    let productType: 'MOVIE' | 'SERIES' | 'WATCH_PASS' | 'SUBSCRIPTION' = data.productType || 'MOVIE';
    let finalContentId: string | null = null;
    let planId: string | null = data.planId || null;
    let planName: string | null = data.planName || null;
    let numRupees = 0;

    // Resolve product details and authoritative backend price
    if (productType === 'SUBSCRIPTION' || (planId && ['MONTHLY', '3_MONTHS', 'YEARLY', 'WEEKLY'].includes(planId))) {
      productType = 'SUBSCRIPTION';
      const subPlan = (planId || 'MONTHLY') as SubscriptionPlan;
      const planConfig = await subscriptionService.getPlanConfig(subPlan);
      planId = subPlan;
      planName = planConfig.name;
      numRupees = planConfig.priceRupees;

      // Check if user already has an active subscription
      const currentActive = await subscriptionRepository.getUserActiveSubscription(userId);
      if (currentActive) {
        const err = new Error(`You already have an active ${currentActive.plan} subscription.`);
        (err as any).statusCode = 400;
        throw err;
      }
    } else if (productType === 'WATCH_PASS' || (planId && ['PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D', 'PASS_30D'].includes(planId))) {
      productType = 'WATCH_PASS';
      const passPlan = (planId || 'PASS_24H') as WatchPassPlan;
      const planConfig = await watchPassService.getPlanConfig(passPlan);
      planId = passPlan;
      planName = planConfig.name;
      numRupees = planConfig.priceRupees;
      if (data.contentId) {
        const content = await contentRepository.findByIdOrSlug(data.contentId);
        if (content) finalContentId = content.id;
      }
    } else {
      // MOVIE or SERIES
      if (data.contentId && typeof data.contentId === 'string' && data.contentId.trim()) {
        const targetContent = await contentRepository.findByIdOrSlug(data.contentId.trim());
        if (!targetContent) {
          const err = new Error('Content not found for purchase.');
          (err as any).statusCode = 404;
          throw err;
        }
        finalContentId = targetContent.id;
        productType = targetContent.type === 'SERIES' ? 'SERIES' : 'MOVIE';
        planName = targetContent.title;
        const resolvedPrice = targetContent.priceRupees ?? (targetContent.price > 0 ? Math.round(targetContent.price / 100) : (targetContent.type === 'SERIES' ? 35 : 30));
        numRupees = resolvedPrice;
      } else {
        numRupees = Math.round(Number(data.amountRupees) || 30);
      }
    }

    if (isNaN(numRupees) || numRupees < 1) {
      const err = new Error('Invalid purchase amount.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (numRupees > 10000) {
      const err = new Error('Maximum payment amount per transaction is ₹10,000.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Sanitize and validate UTR
    const cleanUtr = (data.utr || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      const err = new Error('Please enter a valid 6-35 character alphanumeric UTR / Transaction ID.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Check if this UTR has already been approved previously
    const alreadyApproved = await paymentRequestRepository.getApprovedByUtr(cleanUtr);
    if (alreadyApproved) {
      const err = new Error(
        'This UTR / Transaction ID has already been verified and credited. Duplicate submissions are not allowed.'
      );
      (err as any).statusCode = 409;
      throw err;
    }

    // Check if this user already submitted a pending request with the exact same UTR
    const pendingSame = await paymentRequestRepository.getPendingByUtrAndUser(cleanUtr, userId);
    if (pendingSame) {
      return pendingSame; // Prevent double submission; return existing record
    }

    const requestId = `pay_req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amountPaise = numRupees * 100;
    const now = new Date().toISOString();

    await paymentRequestRepository.createRequest({
      id: requestId,
      userId,
      userName: data.userName,
      userEmail: data.userEmail,
      amountPaise,
      upiIdSnapshot: upiId,
      utr: cleanUtr,
      submittedAt: now,
      contentId: finalContentId,
      productType,
      planId,
      planName,
    });

    const created = await paymentRequestRepository.getById(requestId);
    if (!created) {
      throw new Error('Failed to record payment request.');
    }

    // AUTOMATIC APPROVAL MODE: Auto-approve immediately and grant entitlement
    const { approvalMode } = await this.getPublicPaymentConfig();
    if (approvalMode === 'AUTOMATIC') {
      try {
        const approvedRes = await this.approvePayment(
          'SYSTEM_AUTO',
          created.id,
          'Auto-approved via Automatic Approval mode'
        );
        return approvedRes.payment;
      } catch (autoErr) {
        console.error('[Automatic Approval] Error auto-approving payment request:', autoErr);
      }
    }

    return created;
  },

  /**
   * Get user's payment requests.
   */
  async getUserRequests(userId: string, limit = 50): Promise<PaymentRequestRecord[]> {
    return paymentRequestRepository.getUserRequests(userId, limit);
  },

  /**
   * Admin: Get all payment requests.
   */
  async getAllRequests(status?: string, limit = 100): Promise<PaymentRequestRecord[]> {
    return paymentRequestRepository.getAllRequests(status, limit);
  },

  /**
   * Admin: Get dashboard metrics.
   */
  async getMetrics(): Promise<PaymentMetrics> {
    const settings = await adminService.getSettings();
    const resetAt = settings.finance_analytics_reset_at || undefined;
    return paymentRequestRepository.getMetrics(resetAt);
  },

  /**
   * Admin: Approve payment request and grant exact entitlement.
   * Completely decoupled from the old wallet system.
   */
  async approvePayment(
    adminId: string,
    paymentRequestId: string,
    adminNote?: string
  ): Promise<{ payment: PaymentRequestRecord; newBalanceRupees: number; message: string }> {
    const db = getAdapter();
    const now = new Date().toISOString();

    return db.transaction(async txAdapter => {
      // 1. Fetch current payment request within lock
      const payment = await paymentRequestRepository.getById(paymentRequestId, txAdapter);
      if (!payment) {
        const err = new Error('Payment request not found.');
        (err as any).statusCode = 404;
        throw err;
      }

      // Idempotency: If already approved, return current state without double-crediting
      if (payment.status === 'APPROVED') {
        return {
          payment,
          newBalanceRupees: 0,
          message: 'Payment has already been approved.',
        };
      }

      if (payment.status !== 'PENDING') {
        const err = new Error(`Cannot approve payment with status ${payment.status}.`);
        (err as any).statusCode = 400;
        throw err;
      }

      // Check if UTR is already approved for another record
      const otherApproved = await paymentRequestRepository.getApprovedByUtr(payment.utr, txAdapter);
      if (otherApproved && otherApproved.id !== payment.id) {
        const err = new Error(
          `Security Alert: UTR ${payment.utr} has already been approved for another request (${otherApproved.id}). Cannot approve duplicate UTR.`
        );
        (err as any).statusCode = 409;
        throw err;
      }

      // 2. Mark payment request APPROVED
      await paymentRequestRepository.updateStatus(
        payment.id,
        'APPROVED',
        adminId,
        adminNote || 'Verified and approved by admin',
        now,
        txAdapter
      );

      // 3. Grant entitlement based on product_type
      if (payment.product_type === 'SUBSCRIPTION') {
        const plan = (payment.plan_id as SubscriptionPlan) || 'MONTHLY';
        const durationDays = plan === 'YEARLY' ? 365 : (plan === '3_MONTHS' ? 90 : (plan === 'WEEKLY' ? 7 : 30));
        const startDate = now;
        const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const subId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        await subscriptionRepository.createSubscription(
          {
            id: subId,
            userId: payment.user_id,
            plan,
            status: 'ACTIVE',
            amountPaid: Math.round(payment.amount / 100),
            paymentMethod: 'MANUAL_UPI',
            paymentReference: payment.utr,
            adminId,
            adminNote: adminNote || 'Approved via payment request',
            submittedAt: payment.submitted_at,
            activatedAt: now,
            startDate,
            endDate,
          },
          txAdapter
        );

        const updatedPayment = (await paymentRequestRepository.getById(payment.id, txAdapter)) as PaymentRequestRecord;
        return {
          payment: updatedPayment,
          newBalanceRupees: 0,
          message: `Successfully approved VIP subscription (${plan}) until ${new Date(endDate).toLocaleDateString('en-IN')}.`,
        };
      }

      if (payment.product_type === 'WATCH_PASS') {
        const plan = (payment.plan_id as WatchPassPlan) || 'PASS_24H';
        const durationMap: Record<string, number> = {
          PASS_24H: 1,
          PASS_3D: 3,
          PASS_7D: 7,
          PASS_15D: 15,
          PASS_30D: 30,
        };
        const durationDays = durationMap[plan] || 1;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const passId = `wpass_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        await watchPassRepository.createPass(
          {
            id: passId,
            userId: payment.user_id,
            contentId: payment.content_id || null,
            plan,
            durationDays,
            amountPaid: Math.round(payment.amount / 100),
            status: 'ACTIVE',
            paymentMethod: 'MANUAL_UPI',
            paymentReference: payment.utr,
            adminId,
            adminNote: adminNote || 'Approved via payment request',
            submittedAt: payment.submitted_at,
            activatedAt: now,
            expiresAt,
          },
          txAdapter
        );

        const updatedPayment = (await paymentRequestRepository.getById(payment.id, txAdapter)) as PaymentRequestRecord;
        return {
          payment: updatedPayment,
          newBalanceRupees: 0,
          message: `Successfully approved Watch Pass (${plan}) until ${new Date(expiresAt).toLocaleString('en-IN')}.`,
        };
      }

      // MOVIE or SERIES: 30-day ownership in purchases table
      const purchaseId = `pur_upi_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const contentId = payment.content_id || 'winter-signal-2024';

      await purchaseRepository.createPurchase(
        {
          id: purchaseId,
          userId: payment.user_id,
          contentId,
          amountPaid: payment.amount,
          status: 'COMPLETED',
          purchasedAt: now,
          expiresAt,
        },
        txAdapter
      );

      const updatedPayment = (await paymentRequestRepository.getById(payment.id, txAdapter)) as PaymentRequestRecord;
      return {
        payment: updatedPayment,
        newBalanceRupees: 0,
        message: `Successfully approved ${payment.product_type || 'content'} purchase and granted 30-day ownership.`,
      };
    });
  },

  /**
   * Admin: Reject payment request. Zero wallet credit.
   */
  async rejectPayment(
    adminId: string,
    paymentRequestId: string,
    adminNote: string
  ): Promise<PaymentRequestRecord> {
    const payment = await paymentRequestRepository.getById(paymentRequestId);
    if (!payment) {
      const err = new Error('Payment request not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (payment.status !== 'PENDING') {
      const err = new Error(`Cannot reject payment with status ${payment.status}.`);
      (err as any).statusCode = 400;
      throw err;
    }

    const note = (adminNote || '').trim() || 'UTR could not be verified.';
    const now = new Date().toISOString();

    await paymentRequestRepository.updateStatus(
      payment.id,
      'REJECTED',
      adminId,
      note,
      now
    );

    const updated = await paymentRequestRepository.getById(payment.id);
    return updated!;
  },
};
