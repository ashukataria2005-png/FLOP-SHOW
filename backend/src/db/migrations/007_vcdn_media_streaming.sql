-- ==============================================================================
-- MISSION FLOPSHOW — 007_vcdn_media_streaming.sql
-- VCDN Primary Media Storage & HLS Video Streaming Integration
-- ==============================================================================

-- 1. EXTEND MEDIA TABLE WITH VCDN STREAMING FIELDS
ALTER TABLE media ADD COLUMN vcdn_video_id TEXT DEFAULT NULL;
ALTER TABLE media ADD COLUMN vcdn_status TEXT DEFAULT NULL;
ALTER TABLE media ADD COLUMN vcdn_playback_url TEXT DEFAULT NULL;
ALTER TABLE media ADD COLUMN vcdn_embed_url TEXT DEFAULT NULL;
ALTER TABLE media ADD COLUMN vcdn_thumbnail_url TEXT DEFAULT NULL;
ALTER TABLE media ADD COLUMN media_provider TEXT DEFAULT 'LOCAL';

-- 2. EXTEND CONTENT (MOVIES & SERIES) TABLE
ALTER TABLE content ADD COLUMN vcdn_video_id TEXT DEFAULT NULL;
ALTER TABLE content ADD COLUMN vcdn_status TEXT DEFAULT NULL;
ALTER TABLE content ADD COLUMN vcdn_playback_url TEXT DEFAULT NULL;
ALTER TABLE content ADD COLUMN vcdn_embed_url TEXT DEFAULT NULL;
ALTER TABLE content ADD COLUMN vcdn_thumbnail_url TEXT DEFAULT NULL;
ALTER TABLE content ADD COLUMN media_provider TEXT DEFAULT 'LOCAL';

-- 3. EXTEND EPISODES TABLE
ALTER TABLE episodes ADD COLUMN vcdn_video_id TEXT DEFAULT NULL;
ALTER TABLE episodes ADD COLUMN vcdn_status TEXT DEFAULT NULL;
ALTER TABLE episodes ADD COLUMN vcdn_playback_url TEXT DEFAULT NULL;
ALTER TABLE episodes ADD COLUMN vcdn_embed_url TEXT DEFAULT NULL;
ALTER TABLE episodes ADD COLUMN vcdn_thumbnail_url TEXT DEFAULT NULL;
ALTER TABLE episodes ADD COLUMN media_provider TEXT DEFAULT 'LOCAL';

-- 4. PERFORMANCE & REFERENTIAL INTEGRITY INDEXES
CREATE INDEX IF NOT EXISTS idx_media_vcdn_id ON media(vcdn_video_id);
CREATE INDEX IF NOT EXISTS idx_content_vcdn_id ON content(vcdn_video_id);
CREATE INDEX IF NOT EXISTS idx_episodes_vcdn_id ON episodes(vcdn_video_id);
