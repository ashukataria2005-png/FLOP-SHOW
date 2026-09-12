-- ==============================================================================
-- MISSION FLOPSHOW — 003_app_settings.sql
-- Application Settings Key-Value Store for System Configuration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed initial sensible defaults if not already set
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('platform_name', 'FLOPSHOW', datetime('now')),
  ('platform_tagline', 'Stream the Unstreamable', datetime('now')),
  ('currency_symbol', '₹', datetime('now')),
  ('default_resolution', '1080p', datetime('now')),
  ('support_email', 'support@flopshow.tv', datetime('now')),
  ('maintenance_mode', 'false', datetime('now')),
  ('allow_guest_browsing', 'true', datetime('now'));
