-- ==============================================================================
-- MISSION FLOPSHOW — 017_promo_bonus_system.sql
-- Promo & Welcome Bonus System: Admin-managed promo codes & 1-time user redemptions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  validity_hours INTEGER NOT NULL DEFAULT 720,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'DISABLED')) DEFAULT 'ACTIVE',
  perk_type TEXT NOT NULL DEFAULT 'FREE_CONTENT_PASS',
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  promo_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code_id);

-- Initial default welcome promo code (1-time free access to any 1 movie/series)
INSERT OR IGNORE INTO promo_codes (id, code, description, validity_hours, status, perk_type, times_used, expires_at, created_at, updated_at)
VALUES (
  'promo-welcome-bonus',
  'WELCOMEBONUS',
  'New User Welcome Bonus: Unlock any 1 Movie or Web Series completely free for 30 days!',
  720,
  'ACTIVE',
  'FREE_CONTENT_PASS',
  0,
  NULL,
  datetime('now'),
  datetime('now')
);
