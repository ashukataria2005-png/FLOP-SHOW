import crypto from 'crypto';
import { purchaseRepository, PurchaseRecord } from '../repositories/purchaseRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { getAdapter } from '../db/adapter.js';

export interface PurchaseResult {
  success: boolean;
  purchase: PurchaseRecord;
  remainingBalanceRupees: number;
  message: string;
}

export const purchaseService = {
  /**
   * ATOMIC PURCHASE FLOW:
   * 1. Validate content exists and is published
   * 2. Check if already owned -> if yes, reject with 409 Conflict
   * 3. Read REAL price from database (ignore any client price)
   * 4. If price == 0 (free content), record purchase with 0 charge
   * 5. If price > 0, verify wallet balance >= price in an atomic transaction
   * 6. Deduct balance, insert purchase record, insert transaction audit ledger atomically
   */
  async purchaseContent(userId: string, contentId: string): Promise<PurchaseResult> {
    // 1. Fetch content from database
    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) {
      const err = new Error('Content not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    if (content.status !== 'PUBLISHED') {
      const err = new Error('Content is not currently available for purchase.');
      (err as any).statusCode = 400;
      throw err;
    }

    // 2. Check active ownership
    const alreadyOwned = await purchaseRepository.isOwned(userId, content.id);
    if (alreadyOwned) {
      const err = new Error('You already have active ownership of this title.');
      (err as any).statusCode = 409;
      throw err;
    }

    // 3. Obtain HYBRID price from database/business rules (in paise)
    // Free content is 0 paise. Paid movies are ₹30 (3000 paise). Paid series are ₹35 (3500 paise).
    let realPricePaise = 0;
    let expiresAt: string | null = null;
    const now = new Date().toISOString();

    if (content.price > 0) {
      realPricePaise = content.type === 'SERIES' ? 3500 : 3000;
      // 1 Month / 30 Days validity for new purchases
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const realPriceRupees = realPricePaise / 100;
    const purchaseId = `pur-${crypto.randomUUID()}`;
    const db = getAdapter();

    return db.transaction(async txAdapter => {
      // Re-verify inside atomic lock to prevent race conditions
      if (await purchaseRepository.isOwned(userId, content.id, txAdapter)) {
        const err = new Error('You already have active ownership of this title.');
        (err as any).statusCode = 409;
        throw err;
      }

      const currentBalance = await walletRepository.getBalance(userId, txAdapter);

      if (currentBalance < realPricePaise) {
        const balanceRupees = currentBalance / 100;
        const err = new Error(
          `Insufficient wallet balance. You have ₹${balanceRupees.toFixed(0)}, need ₹${realPriceRupees.toFixed(0)}.`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      // Deduct balance
      const newBalance = currentBalance - realPricePaise;
      await walletRepository.updateBalance(userId, newBalance, now, txAdapter);

      // Create or renew purchase record
      await purchaseRepository.createPurchase(
        {
          id: purchaseId,
          userId,
          contentId: content.id,
          amountPaid: realPricePaise,
          status: 'COMPLETED',
          purchasedAt: now,
          expiresAt,
        },
        txAdapter
      );

      // Create wallet transaction ledger entry if not free
      if (realPricePaise > 0) {
        await walletRepository.addTransaction(
          {
            id: `tx-${crypto.randomUUID()}`,
            userId,
            type: 'PURCHASE',
            amount: realPricePaise,
            balanceAfter: newBalance,
            description: `Purchased 1-Month Access: ${content.title}`,
            referenceId: content.id,
            createdAt: now,
          },
          txAdapter
        );
      }

      const purchaseRecord: PurchaseRecord = {
        id: purchaseId,
        user_id: userId,
        content_id: content.id,
        amount_paid: realPricePaise,
        status: 'COMPLETED',
        purchased_at: now,
        expires_at: expiresAt,
        is_expired: false,
        days_remaining: expiresAt ? 30 : undefined,
        title: content.title,
        poster: content.poster,
        type: content.type,
      };

      return {
        success: true,
        purchase: purchaseRecord,
        remainingBalanceRupees: newBalance / 100,
        message: expiresAt
          ? `Successfully acquired "${content.title}" for 1 month.`
          : `Successfully unlocked "${content.title}".`,
      };
    });
  },

  async checkOwnership(userId: string, contentId: string): Promise<boolean> {
    const content = await contentRepository.findByIdOrSlug(contentId);
    if (!content) return false;

    // Free content is accessible to all authenticated users
    if (content.price === 0) return true;

    return purchaseRepository.isOwned(userId, content.id);
  },
};
