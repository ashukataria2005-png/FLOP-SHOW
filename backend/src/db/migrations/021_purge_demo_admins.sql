-- ==============================================================================
-- MISSION FLOPSHOW — 021_purge_demo_admins.sql
-- Purge Dummy/Demo Admin Records & Reinforce Primary Super Admin
-- ==============================================================================

-- 1. Remove wallets for dummy / demo admin records
DELETE FROM wallets 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE (
    LOWER(email) IN ('admin', 'test_admin', 'demo_admin', 'admin@flopshow.tv', 'demo@flopshow.tv', 'admin@flopshow.com', 'demo@flopshow.com', 'test_admin@flopshow.com', 'admin@test.com')
    OR id IN ('admin', 'test_admin', 'demo_admin', 'admin-dev-01', 'user-demo-01')
    OR (role = 'ADMIN' AND LOWER(name) IN ('admin', 'test admin', 'demo admin', 'test_admin', 'demo_admin'))
  )
  AND LOWER(email) != 'ashukataria2005@gmail.com'
);

-- 2. Purge dummy / demo admin records from users table, preserving only authentic Super Admin
DELETE FROM users 
WHERE (
  LOWER(email) IN ('admin', 'test_admin', 'demo_admin', 'admin@flopshow.tv', 'demo@flopshow.tv', 'admin@flopshow.com', 'demo@flopshow.com', 'test_admin@flopshow.com', 'admin@test.com')
  OR id IN ('admin', 'test_admin', 'demo_admin', 'admin-dev-01', 'user-demo-01')
  OR (role = 'ADMIN' AND LOWER(name) IN ('admin', 'test admin', 'demo admin', 'test_admin', 'demo_admin'))
)
AND LOWER(email) != 'ashukataria2005@gmail.com';

-- 3. Force-update the primary Super Admin record
UPDATE users 
SET status = 'ACTIVE', 
    is_super_admin = 1, 
    role = 'ADMIN',
    permissions = '["analytics","monetization","promos","payments","catalog","users","settings"]'
WHERE LOWER(email) = 'ashukataria2005@gmail.com';
