-- ==============================================================================
-- MISSION FLOPSHOW — 005_spotlight_selection.sql
-- Multiple Cinematic Spotlight Admin Configuration
-- ==============================================================================

-- ENSURE APP_SETTINGS HAS CINEMATIC_SPOTLIGHT_IDS AND CINEMATIC_SPOTLIGHT_ID
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('cinematic_spotlight_ids', '[]', datetime('now')),
  ('cinematic_spotlight_id', '', datetime('now'));
