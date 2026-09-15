-- ==============================================================================
-- MISSION FLOPSHOW — 006_upi_payment_requests.sql
-- Real Manual UPI Payment & UTR Verification System
-- ==============================================================================

-- 1. UPI PAYMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS upi_payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  amount INTEGER NOT NULL CHECK(amount > 0),
  upi_id_snapshot TEXT NOT NULL,
  utr TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_id TEXT,
  admin_note TEXT,
  submitted_at TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upi_payment_status ON upi_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_upi_payment_user ON upi_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upi_payment_utr ON upi_payment_requests(utr);

-- Database-level protection: A UTR that has been APPROVED cannot be approved again
CREATE UNIQUE INDEX IF NOT EXISTS uq_upi_approved_utr ON upi_payment_requests(utr) WHERE status = 'APPROVED';

-- 2. SEED DEFAULT PAYMENT SETTINGS IN APP_SETTINGS
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('payment_upi_id', 'flopshow@upi', datetime('now')),
  ('payment_upi_enabled', 'true', datetime('now')),
  ('payment_upi_merchant_name', 'FLOPSHOW', datetime('now'));
