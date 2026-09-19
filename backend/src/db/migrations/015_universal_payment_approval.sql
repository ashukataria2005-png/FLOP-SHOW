-- Migration 015: Universal Payment Approval for All Products (Movie, Series, Watch Pass, Subscription)
-- and Removal of Permanent Entitlements from Purchases

-- 1. Add product_type, plan_id, and plan_name to upi_payment_requests
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS product_type VARCHAR(32) NOT NULL DEFAULT 'MOVIE';
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL;
ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT NULL;

-- 2. Indexes for fast filtering and metrics
CREATE INDEX IF NOT EXISTS idx_upi_payment_product_type ON upi_payment_requests(product_type);
CREATE INDEX IF NOT EXISTS idx_upi_payment_plan_id ON upi_payment_requests(plan_id);

-- 3. Populate existing records if any
UPDATE upi_payment_requests
SET product_type = CASE
  WHEN content_id IS NOT NULL THEN (SELECT COALESCE(type, 'MOVIE') FROM content WHERE id = upi_payment_requests.content_id LIMIT 1)
  ELSE 'MOVIE'
END
WHERE product_type = 'MOVIE' AND content_id IS NOT NULL;

-- 4. Bound any legacy purchases where expires_at IS NULL to 30 days from purchased_at
-- This ensures no permanent entitlements exist in the database.
UPDATE purchases
SET expires_at = (purchased_at::TIMESTAMPTZ + INTERVAL '30 days')::TEXT
WHERE expires_at IS NULL AND purchased_at IS NOT NULL;
