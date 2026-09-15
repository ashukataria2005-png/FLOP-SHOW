import { getAdapter, DbAdapter } from '../db/adapter.js';

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
  async createWallet(userId: string, initialBalance = 0, now: string, adapter?: DbAdapter): Promise<void> {
    const db = adapter || getAdapter();
    await db.run(
      `INSERT INTO wallets (user_id, balance, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO NOTHING;`,
      [userId, initialBalance, now]
    );
  },

  async getBalance(userId: string, adapter?: DbAdapter): Promise<number> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT balance FROM wallets WHERE user_id = ?;`,
      [userId]
    );
    return rows[0] ? (rows[0] as { balance: number }).balance : 0;
  },

  async updateBalance(userId: string, newBalance: number, now: string, adapter?: DbAdapter): Promise<void> {
    const db = adapter || getAdapter();
    await db.run(
      `UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?;`,
      [newBalance, now, userId]
    );
  },

  async addTransaction(
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
    adapter?: DbAdapter
  ): Promise<void> {
    const db = adapter || getAdapter();
    await db.run(
      `INSERT INTO wallet_transactions
         (id, user_id, type, amount, balance_after, description, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tx.id,
        tx.userId,
        tx.type,
        tx.amount,
        tx.balanceAfter,
        tx.description,
        tx.referenceId || null,
        tx.createdAt,
      ]
    );
  },

  async getTransactions(userId: string, limit = 50): Promise<WalletTransactionRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?;`,
      [userId, limit]
    );
    return rows as WalletTransactionRecord[];
  },

  async isReferenceProcessed(referenceId: string, adapter?: DbAdapter): Promise<boolean> {
    if (!referenceId) return false;
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT 1 FROM wallet_transactions WHERE reference_id = ? LIMIT 1;`,
      [referenceId]
    );
    return rows.length > 0;
  },

  async getTransactionByReference(referenceId: string, adapter?: DbAdapter): Promise<WalletTransactionRecord | null> {
    if (!referenceId) return null;
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM wallet_transactions WHERE reference_id = ? LIMIT 1;`,
      [referenceId]
    );
    return rows[0] ? (rows[0] as WalletTransactionRecord) : null;
  },
};
