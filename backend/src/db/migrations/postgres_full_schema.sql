-- ==============================================================================
-- MISSION FLOPSHOW — PostgreSQL Full Schema
-- Complete schema for PostgreSQL production deployments
-- Equivalent to migrations 001-004 combined, PostgreSQL-compatible
-- ==============================================================================

-- ==============================================================================
-- 1. USERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================================================
-- 2. WALLETS (One-to-One with Users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================================================
-- 3. WALLET TRANSACTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('RECHARGE', 'PURCHASE', 'REFUND', 'ADJUSTMENT')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at DESC);

-- ==============================================================================
-- 4. CONTENT (Central Catalog for Movies and Series)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('MOVIE', 'SERIES')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  poster TEXT NOT NULL,
  backdrop TEXT NOT NULL,
  trailer_url TEXT,
  video_url TEXT,
  price INTEGER NOT NULL DEFAULT 0 CHECK(price >= 0),
  language TEXT NOT NULL DEFAULT 'Hindi',
  release_year INTEGER NOT NULL,
  duration TEXT,
  age_rating TEXT DEFAULT 'U/A 13+',
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0, 1)),
  trending_position INTEGER DEFAULT NULL,
  display_priority INTEGER DEFAULT 0,
  category_label TEXT,
  tagline TEXT,
  about TEXT,
  rating DOUBLE PRECISION DEFAULT 8.0,
  director TEXT,
  cast_json TEXT DEFAULT '[]',
  is_hero INTEGER DEFAULT 0,
  vcdn_video_id TEXT DEFAULT NULL,
  vcdn_status TEXT DEFAULT NULL,
  vcdn_playback_url TEXT DEFAULT NULL,
  vcdn_embed_url TEXT DEFAULT NULL,
  vcdn_thumbnail_url TEXT DEFAULT NULL,
  media_provider TEXT DEFAULT 'LOCAL',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT uq_content_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_content_status_featured ON content(status, featured);
CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);
CREATE INDEX IF NOT EXISTS idx_content_release_year ON content(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_content_trending ON content(trending_position);
CREATE INDEX IF NOT EXISTS idx_content_vcdn_id ON content(vcdn_video_id);

-- Partial unique indexes (PostgreSQL supports these natively)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_trending_unique_1
  ON content (trending_position)
  WHERE trending_position = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_hero_unique_1
  ON content (is_hero)
  WHERE is_hero = 1;

-- ==============================================================================
-- 5. GENRES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  CONSTRAINT uq_genres_name UNIQUE (name),
  CONSTRAINT uq_genres_slug UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_genres_name_lower ON genres(LOWER(name));

-- ==============================================================================
-- 6. CONTENT_GENRES (Many-to-Many)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content_genres (
  content_id TEXT NOT NULL,
  genre_id TEXT NOT NULL,
  PRIMARY KEY (content_id, genre_id),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);

-- ==============================================================================
-- 7. SEASONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT uq_season_content_number UNIQUE (content_id, season_number)
);

CREATE INDEX IF NOT EXISTS idx_seasons_content ON seasons(content_id);

-- ==============================================================================
-- 8. EPISODES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  duration TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  video_url TEXT NOT NULL,
  vcdn_video_id TEXT DEFAULT NULL,
  vcdn_status TEXT DEFAULT NULL,
  vcdn_playback_url TEXT DEFAULT NULL,
  vcdn_embed_url TEXT DEFAULT NULL,
  vcdn_thumbnail_url TEXT DEFAULT NULL,
  media_provider TEXT DEFAULT 'LOCAL',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  CONSTRAINT uq_episode_season_number UNIQUE (season_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);
CREATE INDEX IF NOT EXISTS idx_episodes_vcdn_id ON episodes(vcdn_video_id);

-- ==============================================================================
-- 9. PURCHASES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'REFUNDED', 'FAILED')),
  purchased_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT uq_purchases_user_content UNIQUE (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_content ON purchases(content_id);

-- ==============================================================================
-- 10. WATCH PROGRESS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS watch_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  episode_id TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
  current_time_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

-- Partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_progress_movie_unique
  ON watch_progress (user_id, content_id)
  WHERE episode_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_progress_episode_unique
  ON watch_progress (user_id, content_id, episode_id)
  WHERE episode_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id);

-- ==============================================================================
-- 11. MY LIST (Bookmarks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS my_list (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT uq_my_list_user_content UNIQUE (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_my_list_user ON my_list(user_id);

-- ==============================================================================
-- 12. WATCH HISTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS watch_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  episode_id TEXT,
  watched_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched ON watch_history(user_id, watched_at DESC);

-- ==============================================================================
-- 13. MEDIA TABLE
-- ==============================================================================
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
  vcdn_video_id TEXT DEFAULT NULL,
  vcdn_status TEXT DEFAULT NULL,
  vcdn_playback_url TEXT DEFAULT NULL,
  vcdn_embed_url TEXT DEFAULT NULL,
  vcdn_thumbnail_url TEXT DEFAULT NULL,
  media_provider TEXT DEFAULT 'LOCAL',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_content ON media(content_id);
CREATE INDEX IF NOT EXISTS idx_media_episode ON media(episode_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_media_active ON media(is_active);
CREATE INDEX IF NOT EXISTS idx_media_vcdn_id ON media(vcdn_video_id);

-- ==============================================================================
-- 14. APP SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('platform_name', 'FLOPSHOW', NOW()::TEXT),
  ('platform_tagline', 'Stream the Unstreamable', NOW()::TEXT),
  ('currency_symbol', '₹', NOW()::TEXT),
  ('default_resolution', '1080p', NOW()::TEXT),
  ('support_email', 'support@flopshow.tv', NOW()::TEXT),
  ('maintenance_mode', 'false', NOW()::TEXT),
  ('allow_guest_browsing', 'true', NOW()::TEXT),
  ('app_theme', 'flopshow-gold', NOW()::TEXT),
  ('home_hero_id', '', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 15. UPI PAYMENT REQUESTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS upi_payment_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  amount INTEGER NOT NULL CHECK(amount > 0),
  upi_id_snapshot TEXT NOT NULL,
  utr TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_id TEXT,
  admin_note TEXT,
  submitted_at TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_upi_payment_status ON upi_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_upi_payment_user ON upi_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upi_payment_utr ON upi_payment_requests(utr);
CREATE UNIQUE INDEX IF NOT EXISTS uq_upi_approved_utr ON upi_payment_requests(utr) WHERE status = 'APPROVED';

INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('payment_upi_id', 'flopshow@upi', NOW()::TEXT),
  ('payment_upi_enabled', 'true', NOW()::TEXT),
  ('payment_upi_merchant_name', 'FLOPSHOW', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 16. MIGRATION TRACKING TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

