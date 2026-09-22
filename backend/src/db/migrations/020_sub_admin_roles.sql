-- ==============================================================================
-- MISSION FLOPSHOW — 020_sub_admin_roles.sql
-- Sub-Admin and Role-Based Access Control (RBAC) Management
-- ==============================================================================

-- 1. Add is_super_admin, permissions, and last_login_at columns to users table
ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- 2. Flag the root Super Admin account (ashukataria2005@gmail.com and any existing ADMIN)
-- with is_super_admin = 1 and full module permissions
UPDATE users 
SET is_super_admin = 1, 
    permissions = '["analytics","monetization","promos","payments","catalog","users","settings"]'
WHERE role = 'ADMIN' OR LOWER(email) = 'ashukataria2005@gmail.com';
