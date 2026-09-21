-- ==============================================================================
-- MISSION FLOPSHOW — 019_promo_redemption_audit.sql
-- Promo Redemption Audit: Item Type, Title, Original Price, Discount, Amount Paid, Status
-- Payment Requests: Promo Code, Original Amount, Discount Percent
-- ==============================================================================

-- 1. Recreate promo_redemptions table with audit columns & relaxed content_id constraint
CREATE TABLE IF NOT EXISTS promo_redemptions_v2 (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  promo_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content_id TEXT,
  redeemed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  item_type TEXT DEFAULT 'MOVIE',
  item_title TEXT,
  original_price REAL DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'APPROVED',
  payment_request_id TEXT DEFAULT NULL,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy any existing redemptions if table existed
INSERT OR IGNORE INTO promo_redemptions_v2 (
  id, promo_code_id, promo_code, user_id, content_id, redeemed_at, expires_at, created_at,
  item_type, item_title, original_price, discount_percent, amount_paid, status, payment_request_id
)
SELECT 
  id, promo_code_id, promo_code, user_id, content_id, redeemed_at, expires_at, created_at,
  'MOVIE', NULL, 0, 0, 0, 'APPROVED', NULL
FROM promo_redemptions;

DROP TABLE IF EXISTS promo_redemptions;
ALTER TABLE promo_redemptions_v2 RENAME TO promo_redemptions;

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_created ON promo_redemptions(created_at);

-- 2. Add promo audit tracking columns to upi_payment_requests
ALTER TABLE upi_payment_requests ADD COLUMN promo_code TEXT DEFAULT NULL;
ALTER TABLE upi_payment_requests ADD COLUMN original_amount INTEGER DEFAULT NULL;
ALTER TABLE upi_payment_requests ADD COLUMN discount_percent INTEGER DEFAULT NULL;
