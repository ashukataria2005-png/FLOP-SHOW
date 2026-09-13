import crypto from 'crypto';
import { walletRepository, WalletTransactionRecord } from '../repositories/walletRepository.js';
import { getAdapter } from '../db/adapter.js';

export interface WalletSummary {
  balancePaise: number;
  balanceRupees: number;
  formattedBalance: string;
}

export const walletService = {
  async getBalance(userId: string): Promise<WalletSummary> {
    const balancePaise = await walletRepository.getBalance(userId);
    const balanceRupees = balancePaise / 100;
    return {
      balancePaise,
      balanceRupees,
      formattedBalance: `₹${balanceRupees.toFixed(0)}`,
    };
  },

  async getTransactions(userId: string, limit = 50): Promise<WalletTransactionRecord[]> {
    return walletRepository.getTransactions(userId, limit);
  },

  /**
   * Recharge user wallet.
   * Executes an atomic balance credit + ledger transaction.
   */
  async recharge(userId: string, amountRupees: number, referenceId?: string): Promise<WalletSummary> {
    if (amountRupees <= 0) {
      const err = new Error('Recharge amount must be greater than zero.');
      (err as any).statusCode = 400;
      throw err;
    }

    const amountPaise = Math.round(amountRupees * 100);
    const now = new Date().toISOString();
    const db = getAdapter();

    return db.transaction(async txAdapter => {
      const currentBalance = await walletRepository.getBalance(userId, txAdapter);
      const newBalance = currentBalance + amountPaise;

      await walletRepository.updateBalance(userId, newBalance, now, txAdapter);
      await walletRepository.addTransaction(
        {
          id: `tx-${crypto.randomUUID()}`,
          userId,
          type: 'RECHARGE',
          amount: amountPaise,
          balanceAfter: newBalance,
          description: `Wallet Recharge (₹${amountRupees})`,
          referenceId: referenceId || `sim-pay-${Date.now()}`,
          createdAt: now,
        },
        txAdapter
      );

      return {
        balancePaise: newBalance,
        balanceRupees: newBalance / 100,
        formattedBalance: `₹${(newBalance / 100).toFixed(0)}`,
      };
    });
  },
};
