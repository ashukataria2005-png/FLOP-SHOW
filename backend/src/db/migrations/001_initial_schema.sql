-- ==============================================================================
-- MISSION FLOPSHOW — 001_initial_schema.sql
-- Initial Relational Database Schema with Foreign Keys, Constraints, and Indexes
-- ==============================================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')) DEFAULT 'USER',
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING')) DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. WALLETS (One-to-One with Users, balance stored safely in integer paise)
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. WALLET TRANSACTIONS (Audit ledger of financial movements)
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

-- 4. CONTENT (Central Catalog for Movies and Series)
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('MOVIE', 'SERIES')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL COLLATE NOCASE,
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
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')) DEFAULT 'PUBLISHED',
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0, 1)),
  category_label TEXT,
  tagline TEXT,
  about TEXT,
  rating REAL DEFAULT 8.0,
  director TEXT,
  cast_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT uq_content_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_content_status_featured ON content(status, featured);
CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);
CREATE INDEX IF NOT EXISTS idx_content_release_year ON content(release_year DESC);

-- 5. GENRES
CREATE TABLE IF NOT EXISTS genres (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE,
  slug TEXT NOT NULL COLLATE NOCASE,
  CONSTRAINT uq_genres_name UNIQUE (name),
  CONSTRAINT uq_genres_slug UNIQUE (slug)
);

-- 6. CONTENT_GENRES (Many-to-Many Relationship)
CREATE TABLE IF NOT EXISTS content_genres (
  content_id TEXT NOT NULL,
  genre_id TEXT NOT NULL,
  PRIMARY KEY (content_id, genre_id),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);

-- 7. SEASONS
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

-- 8. EPISODES
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  CONSTRAINT uq_episode_season_number UNIQUE (season_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_id);

-- 9. PURCHASES (Ownership records, unique per user + content to prevent duplicate purchases)
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'REFUNDED', 'FAILED')) DEFAULT 'COMPLETED',
  purchased_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  CONSTRAINT uq_purchases_user_content UNIQUE (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_content ON purchases(content_id);

-- 10. WATCH PROGRESS
-- Uses strict partial unique indexes to safely handle movie (episode_id NULL) vs episode progress
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

-- Guarantee exactly one progress record per user per movie
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_progress_movie_unique 
  ON watch_progress (user_id, content_id) 
  WHERE episode_id IS NULL;

-- Guarantee exactly one progress record per user per specific episode
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_progress_episode_unique 
  ON watch_progress (user_id, content_id, episode_id) 
  WHERE episode_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id);

-- 11. MY LIST (Bookmarks, unique per user + content to prevent duplicates)
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

-- 12. WATCH HISTORY
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
