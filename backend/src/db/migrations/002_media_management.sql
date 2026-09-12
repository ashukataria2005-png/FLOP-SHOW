-- ==============================================================================
-- MISSION FLOPSHOW — 002_media_management.sql
-- Media Management & Dynamic Trending #1 Ranking System
-- ==============================================================================

-- 1. ADD TRENDING & DISPLAY PRIORITY COLUMNS TO CONTENT
ALTER TABLE content ADD COLUMN trending_position INTEGER DEFAULT NULL;
ALTER TABLE content ADD COLUMN display_priority INTEGER DEFAULT 0;

-- Guarantee at database level that only ONE row can ever have trending_position = 1
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_trending_unique_1 
  ON content (trending_position) 
  WHERE trending_position = 1;

CREATE INDEX IF NOT EXISTS idx_content_trending ON content (trending_position);

-- 2. MEDIA TABLE
-- Stores media configurations for movies and series episodes
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  content_id TEXT,
  episode_id TEXT,
  media_type TEXT NOT NULL CHECK(media_type IN ('MAIN', 'TRAILER')),
  source_type TEXT NOT NULL CHECK(source_type IN ('UPLOAD', 'DIRECT_URL', 'YOUTUBE')),
  url TEXT NOT NULL,
  mime_type TEXT,
  duration TEXT,
  duration_seconds INTEGER DEFAULT 0,
  thumbnail TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_content ON media (content_id);
CREATE INDEX IF NOT EXISTS idx_media_episode ON media (episode_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media (media_type);
CREATE INDEX IF NOT EXISTS idx_media_active ON media (is_active);
