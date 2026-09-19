-- ==============================================================================
-- MISSION FLOPSHOW — 011_subscription_plans_update.sql
-- Update Subscription Plans: Monthly (₹89), 3 Months (₹189), 12 Months (₹449)
-- ==============================================================================

-- 1. Seed updated subscription prices in app_settings
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('subscription_price_monthly', '89', datetime('now')),
  ('subscription_price_3_months', '189', datetime('now')),
  ('subscription_price_yearly', '449', datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;

DELETE FROM app_settings WHERE key = 'subscription_price_weekly';
