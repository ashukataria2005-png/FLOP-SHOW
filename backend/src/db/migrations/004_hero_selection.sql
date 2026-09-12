-- ==============================================================================
-- MISSION FLOPSHOW — 004_hero_selection.sql
-- Home Hero / Featured Premiere Admin Control
-- ==============================================================================

-- 1. ADD IS_HERO COLUMN TO CONTENT TABLE
ALTER TABLE content ADD COLUMN is_hero INTEGER DEFAULT 0;

-- 2. GUARANTEE AT DATABASE LEVEL THAT ONLY ONE TITLE CAN BE HOME HERO
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_hero_unique_1
  ON content (is_hero)
  WHERE is_hero = 1;

-- 3. ENSURE APP_SETTINGS HAS HOME_HERO_ID ENTRY
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('home_hero_id', '', datetime('now'));

