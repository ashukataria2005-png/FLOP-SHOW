-- ==============================================================================
-- MISSION FLOPSHOW — 008_monetization_subscriptions.sql
-- Subscriptions & Admin-Controlled Monetization System
-- ==============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REJECTED')) DEFAULT 'PENDING',
  amount_paid INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'MANUAL_UPI' CHECK(payment_method IN ('MANUAL_UPI', 'GATEWAY', 'ADMIN_GRANT')),
  payment_reference TEXT,
  admin_id TEXT,
  admin_note TEXT,
  submitted_at TEXT NOT NULL,
  activated_at TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_ref ON subscriptions(payment_reference);

-- Seed initial sensible defaults for monetization settings if not already present
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('monetization_mode', 'PER_CONTENT', datetime('now')),
  ('subscription_price_weekly', '49', datetime('now')),
  ('subscription_price_monthly', '149', datetime('now')),
  ('subscription_price_yearly', '999', datetime('now'));
