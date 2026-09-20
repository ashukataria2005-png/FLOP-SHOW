-- Migration 016: Content Provider Mappings for CinePro / OMSS and External Providers
-- Maps FLOPSHOW internal content IDs to external provider identifiers (e.g. TMDB IDs)

CREATE TABLE IF NOT EXISTS content_provider_mappings (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT uq_content_provider UNIQUE (content_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_cpm_content ON content_provider_mappings(content_id);
CREATE INDEX IF NOT EXISTS idx_cpm_provider_ext ON content_provider_mappings(provider, external_id);
