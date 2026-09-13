import { getAdapter, DbAdapter } from '../db/adapter.js';

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
  async createPurchase(
    purchase: {
      id: string;
      userId: string;
      contentId: string;
      amountPaid: number;
      status?: 'COMPLETED' | 'REFUNDED' | 'FAILED';
      purchasedAt: string;
    },
    adapter?: DbAdapter
  ): Promise<void> {
    const db = adapter || getAdapter();
    await db.run(
      `INSERT INTO purchases (id, user_id, content_id, amount_paid, status, purchased_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        purchase.id,
        purchase.userId,
        purchase.contentId,
        purchase.amountPaid,
        purchase.status || 'COMPLETED',
        purchase.purchasedAt,
      ]
    );
  },

  async isOwned(userId: string, contentId: string, adapter?: DbAdapter): Promise<boolean> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT 1 FROM purchases WHERE user_id = ? AND content_id = ? AND status = 'COMPLETED';`,
      [userId, contentId]
    );
    return rows.length > 0;
  },

  async getPurchasesByUser(userId: string): Promise<PurchaseRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT p.*, c.title, c.poster, c.type
       FROM purchases p
       JOIN content c ON p.content_id = c.id
       WHERE p.user_id = ? AND p.status = 'COMPLETED'
       ORDER BY p.purchased_at DESC;`,
      [userId]
    );
    return rows as PurchaseRecord[];
  },
};
