import { getAdapter, DbAdapter } from '../db/adapter.js';

export type SubscriptionPlan = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REJECTED';
export type PaymentMethod = 'MANUAL_UPI' | 'GATEWAY' | 'ADMIN_GRANT';

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  admin_id: string | null;
  admin_note: string | null;
  submitted_at: string;
  activated_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const subscriptionRepository = {
  async createSubscription(
    data: {
      id: string;
      userId: string;
      plan: SubscriptionPlan;
      status?: SubscriptionStatus;
      amountPaid: number;
      paymentMethod?: PaymentMethod;
      paymentReference?: string | null;
      adminId?: string | null;
      adminNote?: string | null;
      submittedAt: string;
      activatedAt?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    },
    adapter?: DbAdapter
  ): Promise<SubscriptionRecord> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();
    const status: SubscriptionStatus = data.status || 'PENDING';
    const paymentMethod: PaymentMethod = data.paymentMethod || 'MANUAL_UPI';

    await db.run(
      `INSERT INTO subscriptions (
        id, user_id, plan, status, amount_paid, payment_method, payment_reference,
        admin_id, admin_note, submitted_at, activated_at, start_date, end_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        data.id,
        data.userId,
        data.plan,
        status,
        data.amountPaid,
        paymentMethod,
        data.paymentReference || null,
        data.adminId || null,
        data.adminNote || null,
        data.submittedAt,
        data.activatedAt || null,
        data.startDate || null,
        data.endDate || null,
        now,
        now
      ]
    );

    const created = await this.getById(data.id, adapter);
    if (!created) {
      throw new Error(`Failed to retrieve newly created subscription ${data.id}`);
    }
    return created;
  },

  async getById(id: string, adapter?: DbAdapter): Promise<SubscriptionRecord | null> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?
       LIMIT 1;`,
      [id]
    );
    return (rows[0] as SubscriptionRecord) || null;
  },

  async getByPaymentReference(ref: string, adapter?: DbAdapter): Promise<SubscriptionRecord | null> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.payment_reference = ?
       LIMIT 1;`,
      [ref]
    );
    return (rows[0] as SubscriptionRecord) || null;
  },

  /**
   * Returns the currently active subscription for a user where status is 'ACTIVE'
   * and current time is between start_date and end_date.
   */
  async getUserActiveSubscription(userId: string, adapter?: DbAdapter): Promise<SubscriptionRecord | null> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();

    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?
         AND s.status = 'ACTIVE'
         AND s.start_date IS NOT NULL
         AND s.end_date IS NOT NULL
         AND s.start_date <= ?
         AND s.end_date >= ?
       ORDER BY s.end_date DESC
       LIMIT 1;`,
      [userId, now, now]
    );

    return (rows[0] as SubscriptionRecord) || null;
  },

  /**
   * Returns user's most recent subscription (any status: PENDING, ACTIVE, EXPIRED, etc.)
   */
  async getUserLatestSubscription(userId: string, adapter?: DbAdapter): Promise<SubscriptionRecord | null> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?
       ORDER BY s.submitted_at DESC, s.created_at DESC
       LIMIT 1;`,
      [userId]
    );
    return (rows[0] as SubscriptionRecord) || null;
  },

  /**
   * Returns all subscriptions for a given user.
   */
  async getUserSubscriptions(userId: string, limit = 50, adapter?: DbAdapter): Promise<SubscriptionRecord[]> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC
       LIMIT ?;`,
      [userId, limit]
    );
    return rows as SubscriptionRecord[];
  },

  /**
   * Admin: Get all subscriptions with optional status filter.
   */
  async getAllSubscriptions(statusFilter?: SubscriptionStatus, limit = 100, adapter?: DbAdapter): Promise<SubscriptionRecord[]> {
    const db = adapter || getAdapter();
    if (statusFilter) {
      const { rows } = await db.query(
        `SELECT s.*, u.name as user_name, u.email as user_email
         FROM subscriptions s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.status = ?
         ORDER BY s.created_at DESC
         LIMIT ?;`,
        [statusFilter, limit]
      );
      return rows as SubscriptionRecord[];
    }

    const { rows } = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT ?;`,
      [limit]
    );
    return rows as SubscriptionRecord[];
  },

  /**
   * Updates status and associated administrative / temporal fields.
   */
  async updateStatus(
    id: string,
    status: SubscriptionStatus,
    details?: {
      adminId?: string | null;
      adminNote?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      activatedAt?: string | null;
    },
    adapter?: DbAdapter
  ): Promise<SubscriptionRecord> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE subscriptions
       SET status = ?,
           admin_id = COALESCE(?, admin_id),
           admin_note = COALESCE(?, admin_note),
           start_date = COALESCE(?, start_date),
           end_date = COALESCE(?, end_date),
           activated_at = COALESCE(?, activated_at),
           updated_at = ?
       WHERE id = ?;`,
      [
        status,
        details?.adminId !== undefined ? details.adminId : null,
        details?.adminNote !== undefined ? details.adminNote : null,
        details?.startDate !== undefined ? details.startDate : null,
        details?.endDate !== undefined ? details.endDate : null,
        details?.activatedAt !== undefined ? details.activatedAt : null,
        now,
        id
      ]
    );

    const updated = await this.getById(id, adapter);
    if (!updated) {
      throw new Error(`Subscription ${id} not found after status update.`);
    }
    return updated;
  },

  /**
   * Lazily marks expired subscriptions where end_date < now
   */
  async markExpiredSubscriptions(adapter?: DbAdapter): Promise<number> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();
    return db.run(
      `UPDATE subscriptions
       SET status = 'EXPIRED', updated_at = ?
       WHERE status = 'ACTIVE' AND end_date IS NOT NULL AND end_date < ?;`,
      [now, now]
    );
  }
};
