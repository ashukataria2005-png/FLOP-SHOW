-- ==============================================================================
-- MISSION FLOPSHOW — 009_watch_pass_system.sql
-- Watch Pass System: Temporary Title-Specific Access Passes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS watch_passes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_30D')),
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

CREATE INDEX IF NOT EXISTS idx_watch_passes_user_content ON watch_passes(user_id, content_id, status);
CREATE INDEX IF NOT EXISTS idx_watch_passes_content ON watch_passes(content_id);
CREATE INDEX IF NOT EXISTS idx_watch_passes_status ON watch_passes(status);
CREATE INDEX IF NOT EXISTS idx_watch_passes_expires_at ON watch_passes(expires_at);
CREATE INDEX IF NOT EXISTS idx_watch_passes_payment_ref ON watch_passes(payment_reference);

-- Seed initial sensible defaults for watch pass prices in app_settings if not already present
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('watch_pass_price_24h', '29', datetime('now')),
  ('watch_pass_price_3d', '49', datetime('now')),
  ('watch_pass_price_7d', '79', datetime('now')),
  ('watch_pass_price_30d', '149', datetime('now'));
