import { getAdapter, DbAdapter } from '../db/adapter.js';

export interface PaymentRequestRecord {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  amount: number; // in paise
  upi_id_snapshot: string;
  utr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_id: string | null;
  admin_note: string | null;
  submitted_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  content_id: string | null; // tracks per-title payments (movie/series)
}

export interface PaymentMetrics {
  pendingCount: number;
  pendingAmountPaise: number;
  approvedCount: number;
  approvedAmountPaise: number;
  rejectedCount: number;
  rejectedAmountPaise: number;
}

export const paymentRequestRepository = {
  async createRequest(
    data: {
      id: string;
      userId: string;
      userName?: string;
      userEmail?: string;
      amountPaise: number;
      upiIdSnapshot: string;
      utr: string;
      submittedAt: string;
      contentId?: string | null;
    },
    adapter?: DbAdapter
  ): Promise<void> {
    const db = adapter || getAdapter();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO upi_payment_requests (
        id, user_id, user_name, user_email, amount, upi_id_snapshot,
        utr, status, admin_id, admin_note, submitted_at, processed_at, content_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, NULL, ?, ?, ?);`,
      [
        data.id,
        data.userId,
        data.userName || null,
        data.userEmail || null,
        data.amountPaise,
        data.upiIdSnapshot,
        data.utr.trim(),
        data.submittedAt,
        data.contentId || null,
        now,
        now,
      ]
    );
  },

  async getById(id: string, adapter?: DbAdapter): Promise<PaymentRequestRecord | null> {
    const db = adapter || getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM upi_payment_requests WHERE id = ? LIMIT 1;`,
      [id]
    );
    return rows[0] ? (rows[0] as PaymentRequestRecord) : null;
  },

  async getApprovedByUtr(utr: string, adapter?: DbAdapter): Promise<PaymentRequestRecord | null> {
    const db = adapter || getAdapter();
    const cleanUtr = utr.trim();
    const { rows } = await db.query(
      `SELECT * FROM upi_payment_requests WHERE utr = ? AND status = 'APPROVED' LIMIT 1;`,
      [cleanUtr]
    );
    return rows[0] ? (rows[0] as PaymentRequestRecord) : null;
  },

  async getPendingByUtrAndUser(utr: string, userId: string): Promise<PaymentRequestRecord | null> {
    const db = getAdapter();
    const cleanUtr = utr.trim();
    const { rows } = await db.query(
      `SELECT * FROM upi_payment_requests WHERE utr = ? AND user_id = ? AND status = 'PENDING' LIMIT 1;`,
      [cleanUtr, userId]
    );
    return rows[0] ? (rows[0] as PaymentRequestRecord) : null;
  },

  async getUserRequests(userId: string, limit = 50): Promise<PaymentRequestRecord[]> {
    const db = getAdapter();
    const { rows } = await db.query(
      `SELECT * FROM upi_payment_requests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT ?;`,
      [userId, limit]
    );
    return rows as PaymentRequestRecord[];
  },

  async getAllRequests(status?: string, limit = 100): Promise<PaymentRequestRecord[]> {
    const db = getAdapter();
    if (status && status !== 'ALL') {
      const { rows } = await db.query(
        `SELECT * FROM upi_payment_requests WHERE status = ? ORDER BY submitted_at DESC LIMIT ?;`,
        [status.toUpperCase(), limit]
      );
      return rows as PaymentRequestRecord[];
    }
    const { rows } = await db.query(
      `SELECT * FROM upi_payment_requests ORDER BY submitted_at DESC LIMIT ?;`,
      [limit]
    );
    return rows as PaymentRequestRecord[];
  },

  async updateStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    adminId: string,
    adminNote: string | null,
    now: string,
    adapter?: DbAdapter
  ): Promise<void> {
    const db = adapter || getAdapter();
    await db.run(
      `UPDATE upi_payment_requests
       SET status = ?, admin_id = ?, admin_note = ?, processed_at = ?, updated_at = ?
       WHERE id = ?;`,
      [status, adminId, adminNote, now, now, id]
    );
  },

  async getMetrics(resetAt?: string): Promise<PaymentMetrics> {
    const db = getAdapter();
    const query = resetAt
      ? `SELECT
           COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
           COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending_amount,
           COUNT(CASE WHEN status = 'APPROVED' AND processed_at >= ? THEN 1 END) AS approved_count,
           COALESCE(SUM(CASE WHEN status = 'APPROVED' AND processed_at >= ? THEN amount ELSE 0 END), 0) AS approved_amount,
           COUNT(CASE WHEN status = 'REJECTED' AND processed_at >= ? THEN 1 END) AS rejected_count,
           COALESCE(SUM(CASE WHEN status = 'REJECTED' AND processed_at >= ? THEN amount ELSE 0 END), 0) AS rejected_amount
         FROM upi_payment_requests;`
      : `SELECT
           COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
           COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending_amount,
           COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved_count,
           COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) AS approved_amount,
           COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) AS rejected_count,
           COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN amount ELSE 0 END), 0) AS rejected_amount
         FROM upi_payment_requests;`;
    const params = resetAt ? [resetAt, resetAt, resetAt, resetAt] : [];
    const { rows } = await db.query(query, params);

    const r = rows[0] || {};
    return {
      pendingCount: Number(r.pending_count || 0),
      pendingAmountPaise: Number(r.pending_amount || 0),
      approvedCount: Number(r.approved_count || 0),
      approvedAmountPaise: Number(r.approved_amount || 0),
      rejectedCount: Number(r.rejected_count || 0),
      rejectedAmountPaise: Number(r.rejected_amount || 0),
    };
  },
};
