import crypto from 'crypto';
import { getAdapter } from '../db/adapter.js';
import { adminService } from './adminService.js';
import {
  paymentRequestRepository,
  PaymentRequestRecord,
  PaymentMetrics,
} from '../repositories/paymentRequestRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';

export interface PublicPaymentConfig {
  upiId: string;
  upiEnabled: boolean;
  merchantName: string;
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

    return {
      upiId,
      upiEnabled,
      merchantName,
    };
  },

  /**
   * Admin-only configuration update for UPI settings.
   */
  async updatePaymentConfig(data: {
    upiId: string;
    enabled: boolean;
    merchantName?: string;
  }): Promise<PublicPaymentConfig> {
    const cleanUpiId = (data.upiId || '').trim();
    if (!cleanUpiId || !cleanUpiId.includes('@')) {
      const err = new Error('A valid UPI ID is required (e.g. name@upi).');
      (err as any).statusCode = 400;
      throw err;
    }

    const updates: Record<string, string> = {
      payment_upi_id: cleanUpiId,
      payment_upi_enabled: data.enabled ? 'true' : 'false',
    };

    if (data.merchantName && data.merchantName.trim()) {
      updates.payment_upi_merchant_name = data.merchantName.trim();
    }

    await adminService.updateSettings(updates);
    return this.getPublicPaymentConfig();
  },

  /**
   * User submits a manual UPI payment request with UTR.
   */
  async submitPaymentRequest(
    userId: string,
    data: {
      amountRupees: number;
      utr: string;
      userName?: string;
      userEmail?: string;
    }
  ): Promise<PaymentRequestRecord> {
    const { upiId, upiEnabled } = await this.getPublicPaymentConfig();

    if (!upiEnabled) {
      const err = new Error('UPI payments are currently disabled by administrator.');
      (err as any).statusCode = 400;
      throw err;
    }

    const numRupees = Math.round(Number(data.amountRupees));
    if (isNaN(numRupees) || numRupees < 10) {
      const err = new Error('Minimum recharge amount is ₹10.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (numRupees > 10000) {
      const err = new Error('Maximum recharge amount per transaction is ₹10,000.');
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
    });

    const created = await paymentRequestRepository.getById(requestId);
    if (!created) {
      throw new Error('Failed to record payment request.');
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
    return paymentRequestRepository.getMetrics();
  },

  /**
   * Admin: Approve payment request and atomically credit wallet.
   */
  async approvePayment(
    adminId: string,
    paymentRequestId: string,
    adminNote?: string
  ): Promise<{
    payment: PaymentRequestRecord;
    newBalanceRupees: number;
    message: string;
  }> {
    const db = getAdapter();
    const now = new Date().toISOString();

    return db.transaction(async txAdapter => {
      // 1. Fetch record inside transaction
      const payment = await paymentRequestRepository.getById(paymentRequestId, txAdapter);
      if (!payment) {
        const err = new Error('Payment request not found.');
        (err as any).statusCode = 404;
        throw err;
      }

      // Idempotency: If already approved, return current state without double-crediting
      if (payment.status === 'APPROVED') {
        const currentBalancePaise = await walletRepository.getBalance(payment.user_id, txAdapter);
        return {
          payment,
          newBalanceRupees: currentBalancePaise / 100,
          message: 'Payment has already been approved and credited.',
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

      // 3. Atomically credit user wallet balance
      const currentBalancePaise = await walletRepository.getBalance(payment.user_id, txAdapter);
      const newBalancePaise = currentBalancePaise + payment.amount;
      await walletRepository.updateBalance(payment.user_id, newBalancePaise, now, txAdapter);

      // 4. Create transaction ledger audit entry
      await walletRepository.addTransaction(
        {
          id: `tx-${crypto.randomUUID()}`,
          userId: payment.user_id,
          type: 'RECHARGE',
          amount: payment.amount,
          balanceAfter: newBalancePaise,
          description: `UPI Wallet Recharge (UTR: ${payment.utr})`,
          referenceId: payment.utr,
          createdAt: now,
        },
        txAdapter
      );

      const updatedPayment = (await paymentRequestRepository.getById(
        payment.id,
        txAdapter
      )) as PaymentRequestRecord;

      return {
        payment: updatedPayment,
        newBalanceRupees: newBalancePaise / 100,
        message: `Successfully approved payment and credited ₹${(payment.amount / 100).toFixed(0)} to wallet.`,
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
