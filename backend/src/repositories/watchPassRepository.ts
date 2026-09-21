import { getAdapter } from '../db/adapter.js';

export type WatchPassPlan = 'PASS_24H' | 'PASS_3D' | 'PASS_7D' | 'PASS_15D' | 'PASS_30D';
export type WatchPassStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
export type WatchPassPaymentMethod = 'MANUAL_UPI' | 'ADMIN_GRANT' | 'GATEWAY';

export interface WatchPassRecord {
  id: string;
  user_id: string;
  content_id: string | null;
  plan: WatchPassPlan;
  duration_days: number;
  amount_paid: number;
  status: WatchPassStatus;
  payment_method: WatchPassPaymentMethod;
  payment_reference: string | null;
  admin_id: string | null;
  admin_note: string | null;
  submitted_at: string;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for UI convenience
  content_title?: string;
  content_poster?: string;
  content_type?: string;
  user_name?: string;
  user_email?: string;
}

export const watchPassRepository = {
  /**
   * Automatically transition active passes that have passed their expires_at date to EXPIRED.
   * Server-side authority.
   */
  async markExpiredPasses(): Promise<number> {
    const db = getAdapter();
    const now = new Date().toISOString();
    const res = await db.query(
      `UPDATE watch_passes
       SET status = 'EXPIRED', updated_at = ?
       WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at < ?`,
      [now, now]
    );
    return res.rowCount || 0;
  },

  /**
   * Check if user has an active, unexpired watch pass.
   * Catalog-wide temporary access — unlocks all eligible paid content.
   */
  async hasActivePass(userId: string, _contentId?: string): Promise<boolean> {
    if (!userId) return false;
    await this.markExpiredPasses();
    const db = getAdapter();
    const now = new Date().toISOString();

    const { rows } = await db.query(
      `SELECT id FROM watch_passes
       WHERE user_id = ? AND status = 'ACTIVE'
         AND (expires_at IS NULL OR expires_at > ?)
       LIMIT 1`,
      [userId, now]
    );

    return rows.length > 0;
  },

  /**
   * Get the active watch pass record for a user.
   */
  async getUserActivePass(userId: string, _contentId?: string): Promise<WatchPassRecord | null> {
    await this.markExpiredPasses();
    const db = getAdapter();
    const now = new Date().toISOString();

    const { rows } = await db.query(
      `SELECT wp.*, c.title as content_title, c.poster as content_poster, c.type as content_type
       FROM watch_passes wp
       LEFT JOIN content c ON wp.content_id = c.id
       WHERE wp.user_id = ? AND wp.status = 'ACTIVE'
         AND (wp.expires_at IS NULL OR wp.expires_at > ?)
       ORDER BY wp.expires_at DESC
       LIMIT 1`,
      [userId, now]
    );

    return (rows[0] as WatchPassRecord) || null;
  },

  /**
   * Get latest pending or active pass record for user.
   */
  async getUserLatestPass(userId: string, _contentId?: string): Promise<WatchPassRecord | null> {
    await this.markExpiredPasses();
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wp.*, c.title as content_title, c.poster as content_poster, c.type as content_type
       FROM watch_passes wp
       LEFT JOIN content c ON wp.content_id = c.id
       WHERE wp.user_id = ?
       ORDER BY wp.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return (rows[0] as WatchPassRecord) || null;
  },

  /**
   * Find pass by payment reference / UTR.
   */
  async getByPaymentReference(paymentReference: string): Promise<WatchPassRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM watch_passes WHERE payment_reference = ? LIMIT 1`,
      [paymentReference]
    );
    return (rows[0] as WatchPassRecord) || null;
  },

  /**
   * Get pass by primary ID.
   */
  async getById(passId: string): Promise<WatchPassRecord | null> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wp.*, c.title as content_title, c.poster as content_poster, c.type as content_type,
              u.name as user_name, u.email as user_email
       FROM watch_passes wp
       LEFT JOIN content c ON wp.content_id = c.id
       JOIN users u ON wp.user_id = u.id
       WHERE wp.id = ? LIMIT 1`,
      [passId]
    );
    return (rows[0] as WatchPassRecord) || null;
  },

  /**
   * Create a new watch pass (initial status PENDING or ACTIVE for admin grants).
   */
  async createPass(data: {
    id: string;
    userId: string;
    contentId?: string | null;
    plan: WatchPassPlan;
    durationDays: number;
    amountPaid: number;
    status: WatchPassStatus;
    paymentMethod: WatchPassPaymentMethod;
    paymentReference?: string | null;
    adminId?: string | null;
    adminNote?: string | null;
    submittedAt: string;
    activatedAt?: string | null;
    expiresAt?: string | null;
  }, adapter?: any): Promise<WatchPassRecord> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO watch_passes (
        id, user_id, content_id, plan, duration_days, amount_paid, status,
        payment_method, payment_reference, admin_id, admin_note,
        submitted_at, activated_at, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.userId,
        data.contentId || null,
        data.plan,
        data.durationDays,
        data.amountPaid,
        data.status,
        data.paymentMethod,
        data.paymentReference || null,
        data.adminId || null,
        data.adminNote || null,
        data.submittedAt,
        data.activatedAt || null,
        data.expiresAt || null,
        now,
        now
      ]
    );

    const created = await this.getById(data.id);
    return created!;
  },

  /**
   * Update watch pass status, activation and expiration timestamps.
   */
  async updateStatus(
    passId: string,
    status: WatchPassStatus,
    options?: {
      adminId?: string | null;
      adminNote?: string | null;
      activatedAt?: string | null;
      expiresAt?: string | null;
    }
  ): Promise<WatchPassRecord> {
    const db = getAdapter();
    const now = new Date().toISOString();

    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: any[] = [status, now];

    if (options?.adminId !== undefined) {
      updates.push('admin_id = ?');
      values.push(options.adminId);
    }
    if (options?.adminNote !== undefined) {
      updates.push('admin_note = ?');
      values.push(options.adminNote);
    }
    if (options?.activatedAt !== undefined) {
      updates.push('activated_at = ?');
      values.push(options.activatedAt);
    }
    if (options?.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(options.expiresAt);
    }

    values.push(passId);

    await db.query(
      `UPDATE watch_passes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getById(passId);
    return updated!;
  },

  /**
   * Get all passes for a given user (separated into active and past).
   */
  async getUserPasses(userId: string): Promise<WatchPassRecord[]> {
    await this.markExpiredPasses();
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT wp.*, c.title as content_title, c.poster as content_poster, c.type as content_type
       FROM watch_passes wp
       LEFT JOIN content c ON wp.content_id = c.id
       WHERE wp.user_id = ?
       ORDER BY wp.created_at DESC`,
      [userId]
    );
    return rows as WatchPassRecord[];
  },

  /**
   * Admin: list all watch pass requests with optional status filter.
   */
  async getAllPasses(statusFilter?: WatchPassStatus, limit = 100): Promise<WatchPassRecord[]> {
    await this.markExpiredPasses();
    const db = getAdapter();

    let sql = `
      SELECT wp.*, c.title as content_title, c.poster as content_poster, c.type as content_type,
             u.name as user_name, u.email as user_email
      FROM watch_passes wp
      LEFT JOIN content c ON wp.content_id = c.id
      JOIN users u ON wp.user_id = u.id
    `;
    const params: any[] = [];

    if (statusFilter) {
      sql += ` WHERE wp.status = ?`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY wp.created_at DESC LIMIT ?`;
    params.push(limit);

    const { rows } = await db.query(sql, params);
    return rows as WatchPassRecord[];
  },

  /**
   * Admin metrics: strictly separated watch pass analytics.
   */
  async getMetrics(): Promise<{
    totalPasses: number;
    activePasses: number;
    expiredPasses: number;
    pendingPasses: number;
    rejectedPasses: number;
    totalRevenueRupees: number;
    durationBreakdown: Record<string, number>;
    revenueByPlan: Record<string, number>;
    activeByPlan: Record<string, number>;
    planMetrics: {
      PASS_24H: { sales: number; revenueRupees: number; active: number };
      PASS_3D: { sales: number; revenueRupees: number; active: number };
      PASS_7D: { sales: number; revenueRupees: number; active: number };
      PASS_15D: { sales: number; revenueRupees: number; active: number };
    };
    averageRevenueRupees: number;
    topDuration: string;
  }> {
    await this.markExpiredPasses();
    const db = getAdapter();

    const { rows: countRows } = await db.query(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status IN ('ACTIVE', 'EXPIRED') THEN amount_paid ELSE 0 END) as total_rev
      FROM watch_passes
    `);

    const stats = countRows[0] as any;

    const { rows: planRows } = await db.query(`
      SELECT plan,
             COUNT(*) as count,
             SUM(amount_paid) as plan_rev,
             SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_in_plan
      FROM watch_passes
      WHERE status IN ('ACTIVE', 'EXPIRED')
      GROUP BY plan
    `);

    const durationBreakdown: Record<string, number> = {
      PASS_24H: 0,
      PASS_3D: 0,
      PASS_7D: 0,
      PASS_15D: 0,
    };

    const revenueByPlan: Record<string, number> = {
      PASS_24H: 0,
      PASS_3D: 0,
      PASS_7D: 0,
      PASS_15D: 0,
    };

    const activeByPlan: Record<string, number> = {
      PASS_24H: 0,
      PASS_3D: 0,
      PASS_7D: 0,
      PASS_15D: 0,
    };

    for (const row of planRows as any[]) {
      const p = row.plan;
      if (p in durationBreakdown) {
        durationBreakdown[p] = Number(row.count) || 0;
        revenueByPlan[p] = Number(row.plan_rev) || 0;
        activeByPlan[p] = Number(row.active_in_plan) || 0;
      }
    }

    const planMetrics = {
      PASS_24H: {
        sales: durationBreakdown.PASS_24H || 0,
        revenueRupees: revenueByPlan.PASS_24H || 0,
        active: activeByPlan.PASS_24H || 0,
      },
      PASS_3D: {
        sales: durationBreakdown.PASS_3D || 0,
        revenueRupees: revenueByPlan.PASS_3D || 0,
        active: activeByPlan.PASS_3D || 0,
      },
      PASS_7D: {
        sales: durationBreakdown.PASS_7D || 0,
        revenueRupees: revenueByPlan.PASS_7D || 0,
        active: activeByPlan.PASS_7D || 0,
      },
      PASS_15D: {
        sales: durationBreakdown.PASS_15D || 0,
        revenueRupees: revenueByPlan.PASS_15D || 0,
        active: activeByPlan.PASS_15D || 0,
      },
    };

    const totalRevenueRupees = Number(stats?.total_rev || 0);
    const completedPurchases = Number(stats?.active_count || 0) + Number(stats?.expired_count || 0);
    const averageRevenueRupees = completedPurchases > 0 ? Math.round(totalRevenueRupees / completedPurchases) : 0;

    let topDuration = 'PASS_7D';
    let maxSales = -1;
    for (const [key, count] of Object.entries(durationBreakdown)) {
      if (count > maxSales) {
        maxSales = count;
        topDuration = key;
      }
    }

    return {
      totalPasses: Number(stats?.total_count || 0),
      activePasses: Number(stats?.active_count || 0),
      expiredPasses: Number(stats?.expired_count || 0),
      pendingPasses: Number(stats?.pending_count || 0),
      rejectedPasses: Number(stats?.rejected_count || 0),
      totalRevenueRupees,
      durationBreakdown,
      revenueByPlan,
      activeByPlan,
      planMetrics,
      averageRevenueRupees,
      topDuration,
    };
  }
};
