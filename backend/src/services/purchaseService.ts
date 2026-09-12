import crypto from 'crypto';
import { purchaseRepository, PurchaseRecord } from '../repositories/purchaseRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { runTransaction } from '../db/connection.js';

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
  purchaseContent(userId: string, contentId: string): PurchaseResult {
    // 1. Fetch content from database
    const content = contentRepository.findByIdOrSlug(contentId);
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

    // 2. Check ownership
    const alreadyOwned = purchaseRepository.isOwned(userId, content.id);
    if (alreadyOwned) {
      const err = new Error('You already own this title.');
      (err as any).statusCode = 409;
      throw err;
    }

    // 3. Obtain REAL price from database (in paise)
    const realPricePaise = content.price;
    const realPriceRupees = realPricePaise / 100;
    const now = new Date().toISOString();
    const purchaseId = `pur-${crypto.randomUUID()}`;

    return runTransaction(txDb => {
      // Re-verify inside atomic lock to prevent race conditions
      if (purchaseRepository.isOwned(userId, content.id, txDb)) {
        const err = new Error('You already own this title.');
        (err as any).statusCode = 409;
        throw err;
      }

      const currentBalance = walletRepository.getBalance(userId, txDb);

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
      walletRepository.updateBalance(userId, newBalance, now, txDb);

      // Create purchase record
      purchaseRepository.createPurchase(
        {
          id: purchaseId,
          userId,
          contentId: content.id,
          amountPaid: realPricePaise,
          status: 'COMPLETED',
          purchasedAt: now
        },
        txDb
      );

      // Create wallet transaction ledger entry if not free
      if (realPricePaise > 0) {
        walletRepository.addTransaction(
          {
            id: `tx-${crypto.randomUUID()}`,
            userId,
            type: 'PURCHASE',
            amount: realPricePaise,
            balanceAfter: newBalance,
            description: `Purchased: ${content.title}`,
            referenceId: content.id,
            createdAt: now
          },
          txDb
        );
      }

      const purchaseRecord: PurchaseRecord = {
        id: purchaseId,
        user_id: userId,
        content_id: content.id,
        amount_paid: realPricePaise,
        status: 'COMPLETED',
        purchased_at: now,
        title: content.title,
        poster: content.poster,
        type: content.type
      };

      return {
        success: true,
        purchase: purchaseRecord,
        remainingBalanceRupees: newBalance / 100,
        message: `Successfully purchased "${content.title}".`
      };
    });
  },

  checkOwnership(userId: string, contentId: string): boolean {
    const content = contentRepository.findByIdOrSlug(contentId);
    if (!content) return false;

    // Free content is accessible to all authenticated users
    if (content.price === 0) return true;

    return purchaseRepository.isOwned(userId, content.id);
  }
};
