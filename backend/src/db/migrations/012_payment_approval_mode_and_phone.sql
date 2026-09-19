-- ==============================================================================
-- MISSION FLOPSHOW — Migration 012: Payment Approval Mode & Phone Signup Support
-- ==============================================================================

-- 1. Extend users table with phone column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Seed payment_approval_mode in app_settings ('MANUAL' default, or 'AUTOMATIC')
INSERT INTO app_settings (key, value, updated_at)
VALUES ('payment_approval_mode', 'MANUAL', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;
