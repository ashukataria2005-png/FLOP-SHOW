import { getDatabase } from '../db/connection.js';
import { DatabaseSync } from 'node:sqlite';

export interface PurchaseRecord {
  id: string;
  user_id: string;
  content_id: string;
  amount_paid: number;
  status: 'COMPLETED' | 'REFUNDED' | 'FAILED';
  purchased_at: string;
  title?: string;
  poster?: string;
  type?: string;
}

export const purchaseRepository = {
  createPurchase(
    purchase: {
      id: string;
      userId: string;
      contentId: string;
      amountPaid: number;
      status?: 'COMPLETED' | 'REFUNDED' | 'FAILED';
      purchasedAt: string;
    },
    customDb?: DatabaseSync
  ): void {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      INSERT INTO purchases (id, user_id, content_id, amount_paid, status, purchased_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `);
    stmt.run(
      purchase.id,
      purchase.userId,
      purchase.contentId,
      purchase.amountPaid,
      purchase.status || 'COMPLETED',
      purchase.purchasedAt
    );
  },

  isOwned(userId: string, contentId: string, customDb?: DatabaseSync): boolean {
    const db = customDb || getDatabase();
    const stmt = db.prepare(`
      SELECT 1 FROM purchases
      WHERE user_id = ? AND content_id = ? AND status = 'COMPLETED';
    `);
    const row = stmt.get(userId, contentId);
    return !!row;
  },

  getPurchasesByUser(userId: string): PurchaseRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT p.*, c.title, c.poster, c.type
      FROM purchases p
      JOIN content c ON p.content_id = c.id
      WHERE p.user_id = ? AND p.status = 'COMPLETED'
      ORDER BY p.purchased_at DESC;
    `);
    return stmt.all(userId) as PurchaseRecord[];
  }
};
