import crypto from 'crypto';
import { walletRepository, WalletTransactionRecord } from '../repositories/walletRepository.js';
import { runTransaction } from '../db/connection.js';

export interface WalletSummary {
  balancePaise: number;
  balanceRupees: number;
  formattedBalance: string;
}

export const walletService = {
  getBalance(userId: string): WalletSummary {
    const balancePaise = walletRepository.getBalance(userId);
    const balanceRupees = balancePaise / 100;
    return {
      balancePaise,
      balanceRupees,
      formattedBalance: `₹${balanceRupees.toFixed(0)}`
    };
  },

  getTransactions(userId: string, limit: number = 50): WalletTransactionRecord[] {
    return walletRepository.getTransactions(userId, limit);
  },

  /**
   * Recharge user wallet.
   * Note: In Phase 2 this executes safe ledger credit. In Phase 3, a payment gateway webhook
   * will invoke this method upon verified payment confirmation.
   */
  recharge(userId: string, amountRupees: number, referenceId?: string): WalletSummary {
    if (amountRupees <= 0) {
      const err = new Error('Recharge amount must be greater than zero.');
      (err as any).statusCode = 400;
      throw err;
    }

    const amountPaise = Math.round(amountRupees * 100);
    const now = new Date().toISOString();

    return runTransaction(txDb => {
      const currentBalance = walletRepository.getBalance(userId, txDb);
      const newBalance = currentBalance + amountPaise;

      walletRepository.updateBalance(userId, newBalance, now, txDb);

      walletRepository.addTransaction(
        {
          id: `tx-${crypto.randomUUID()}`,
          userId,
          type: 'RECHARGE',
          amount: amountPaise,
          balanceAfter: newBalance,
          description: `Wallet Recharge (₹${amountRupees})`,
          referenceId: referenceId || `sim-pay-${Date.now()}`,
          createdAt: now
        },
        txDb
      );

      return {
        balancePaise: newBalance,
        balanceRupees: newBalance / 100,
        formattedBalance: `₹${(newBalance / 100).toFixed(0)}`
      };
    });
  }
};
