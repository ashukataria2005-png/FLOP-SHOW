-- ==============================================================================
-- MISSION FLOPSHOW — 010_hybrid_plans_system.sql
-- Hybrid Plans: 1-Month Per-Content Ownership & Catalog-Wide Watch Passes
-- ==============================================================================

-- 1. Add expires_at to purchases table for 1-month validity (legacy purchases remain NULL = permanent)
ALTER TABLE purchases ADD COLUMN expires_at TEXT DEFAULT NULL;

-- 2. Update watch_passes table to allow catalog-wide access (nullable content_id) and PASS_15D
CREATE TABLE IF NOT EXISTS watch_passes_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT,
  plan TEXT NOT NULL CHECK(plan IN ('PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D', 'PASS_30D')),
  duration_days REAL NOT NULL DEFAULT 1,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED')) DEFAULT 'PENDING',
  payment_method TEXT NOT NULL DEFAULT 'MANUAL_UPI' CHECK(payment_method IN ('MANUAL_UPI', 'ADMIN_GRANT', 'GATEWAY')),
  payment_reference TEXT,
  admin_id TEXT,
  admin_note TEXT,
  submitted_at TEXT NOT NULL,
  activated_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

INSERT INTO watch_passes_new (
  id, user_id, content_id, plan, duration_days, amount_paid, status,
  payment_method, payment_reference, admin_id, admin_note, submitted_at,
  activated_at, expires_at, created_at, updated_at
)
SELECT
  id, user_id, content_id, plan, duration_days, amount_paid, status,
  payment_method, payment_reference, admin_id, admin_note, submitted_at,
  activated_at, expires_at, created_at, updated_at
FROM watch_passes;

DROP TABLE watch_passes;
ALTER TABLE watch_passes_new RENAME TO watch_passes;

CREATE INDEX IF NOT EXISTS idx_watch_passes_user_status ON watch_passes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watch_passes_content ON watch_passes(content_id);
CREATE INDEX IF NOT EXISTS idx_watch_passes_status ON watch_passes(status);
CREATE INDEX IF NOT EXISTS idx_watch_passes_expires_at ON watch_passes(expires_at);
CREATE INDEX IF NOT EXISTS idx_watch_passes_payment_ref ON watch_passes(payment_reference);

-- 3. Seed updated hybrid prices in app_settings
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('watch_pass_price_24h', '19', datetime('now')),
  ('watch_pass_price_3d', '29', datetime('now')),
  ('watch_pass_price_7d', '44', datetime('now')),
  ('watch_pass_price_15d', '69', datetime('now')),
  ('per_movie_price', '30', datetime('now')),
  ('per_series_price', '35', datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;

DELETE FROM app_settings WHERE key = 'watch_pass_price_30d';
