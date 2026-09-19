import { getAdapter, DbAdapter } from '../db/adapter.js';

export interface PurchaseRecord {
  id: string;
  user_id: string;
  content_id: string;
  amount_paid: number;
  status: 'COMPLETED' | 'REFUNDED' | 'FAILED';
  purchased_at: string;
  expires_at?: string | null;
  is_expired?: boolean;
  days_remaining?: number;
  title?: string;
  poster?: string;
  type?: string;
  slug?: string;
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
      expiresAt?: string | null;
    },
    adapter?: DbAdapter
  ): Promise<void> {
    const db = adapter || getAdapter();
    const status = purchase.status || 'COMPLETED';

    // Resolve to primary key content.id in case slug was passed
    const { rows: contentRows } = await db.query(
      `SELECT id FROM content WHERE id = ? OR slug = ? LIMIT 1;`,
      [purchase.contentId, purchase.contentId]
    );
    const targetContentId = contentRows[0] ? (contentRows[0] as { id: string }).id : purchase.contentId;

    // Check if an existing purchase row exists for this user and content (to handle repurchase after expiration)
    const { rows: existingRows } = await db.query(
      `SELECT id FROM purchases WHERE user_id = ? AND (content_id = ? OR content_id = ?) LIMIT 1;`,
      [purchase.userId, targetContentId, purchase.contentId]
    );

    if (existingRows.length > 0) {
      // Update existing purchase with new validity and amount
      await db.run(
        `UPDATE purchases
         SET amount_paid = ?, status = ?, purchased_at = ?, expires_at = ?, content_id = ?
         WHERE id = ?;`,
        [
          purchase.amountPaid,
          status,
          purchase.purchasedAt,
          purchase.expiresAt || null,
          targetContentId,
          (existingRows[0] as any).id,
        ]
      );
    } else {
      await db.run(
        `INSERT INTO purchases (id, user_id, content_id, amount_paid, status, purchased_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, content_id) DO UPDATE SET
           amount_paid = EXCLUDED.amount_paid,
           status = EXCLUDED.status,
           purchased_at = EXCLUDED.purchased_at,
           expires_at = EXCLUDED.expires_at;`,
        [
          purchase.id,
          purchase.userId,
          targetContentId,
          purchase.amountPaid,
          status,
          purchase.purchasedAt,
          purchase.expiresAt || null,
        ]
      );
    }
  },

  /**
   * Server-side entitlement check:
   * Purchase is active strictly if status is COMPLETED and expires_at > CURRENT_TIMESTAMP.
   * No permanent purchases are permitted.
   */
  async isOwned(userId: string, contentId: string, adapter?: DbAdapter): Promise<boolean> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();
    const { rows } = await db.query(
      `SELECT 1 FROM purchases p
       LEFT JOIN content c ON (p.content_id = c.id OR p.content_id = c.slug)
       WHERE p.user_id = ?
         AND (p.content_id = ? OR c.id = ? OR c.slug = ?)
         AND p.status = 'COMPLETED'
         AND p.expires_at IS NOT NULL
         AND p.expires_at > ?
       LIMIT 1;`,
      [userId, contentId, contentId, contentId, now]
    );
    return rows.length > 0;
  },

  /**
   * Get all user purchases with expiry details and active status.
   */
  async getPurchasesByUser(userId: string): Promise<PurchaseRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT p.*, c.title, c.poster, c.type, c.slug
       FROM purchases p
       JOIN content c ON (p.content_id = c.id OR p.content_id = c.slug)
       WHERE p.user_id = ? AND p.status = 'COMPLETED'
       ORDER BY p.purchased_at DESC;`,
      [userId]
    );

    const now = Date.now();
    return (rows as any[]).map(p => {
      const expiresAt = p.expires_at || (p.purchased_at ? new Date(new Date(p.purchased_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null);
      const isExpired = expiresAt ? new Date(expiresAt).getTime() <= now : true;
      const daysRemaining = expiresAt
        ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        ...p,
        expires_at: expiresAt,
        is_expired: isExpired,
        days_remaining: daysRemaining,
      };
    });
  },
};
