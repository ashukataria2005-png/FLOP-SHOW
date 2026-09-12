import { getDatabase } from '../db/connection.js';
import { DatabaseSync } from 'node:sqlite';

export interface WalletRecord {
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransactionRecord {
  id: string;
  user_id: string;
  type: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export const walletRepository = {
  createWallet(userId: string, initialBalance: number = 0, now: string, customDb?: DatabaseSync): void {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO wallets (user_id, balance, updated_at)
      VALUES (?, ?, ?);
    `);
    stmt.run(userId, initialBalance, now);
  },

  getBalance(userId: string, customDb?: DatabaseSync): number {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      SELECT balance FROM wallets WHERE user_id = ?;
    `);
    const row = stmt.get(userId) as { balance: number } | undefined;
    return row ? row.balance : 0;
  },

  updateBalance(userId: string, newBalance: number, now: string, customDb?: DatabaseSync): void {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      UPDATE wallets
      SET balance = ?, updated_at = ?
      WHERE user_id = ?;
    `);
    stmt.run(newBalance, now, userId);
  },

  addTransaction(
    tx: {
      id: string;
      userId: string;
      type: 'RECHARGE' | 'PURCHASE' | 'REFUND' | 'ADJUSTMENT';
      amount: number;
      balanceAfter: number;
      description: string;
      referenceId?: string | null;
      createdAt: string;
    },
    customDb?: DatabaseSync
  ): void {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, type, amount, balance_after, description, reference_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      tx.id,
      tx.userId,
      tx.type,
      tx.amount,
      tx.balanceAfter,
      tx.description,
      tx.referenceId || null,
      tx.createdAt
    );
  },

  getTransactions(userId: string, limit: number = 50): WalletTransactionRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?;
    `);
    return stmt.all(userId, limit) as WalletTransactionRecord[];
  }
};
