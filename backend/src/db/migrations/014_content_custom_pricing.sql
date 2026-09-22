-- Migration 014: Add custom_price to content table for individual content override pricing
-- Also normalize any legacy seed content prices from old ₹10/₹20 to the default ₹30/₹35

-- 1. Add custom_price column (NULL means content uses system default movie/series price)
ALTER TABLE content ADD COLUMN custom_price INTEGER DEFAULT NULL;

-- 2. Normalize legacy seed prices (1000 paise -> 3000 paise for movies, 2000 paise -> 3500 paise for series)
UPDATE content SET price = 3000 WHERE type = 'MOVIE' AND price = 1000 AND custom_price IS NULL;
UPDATE content SET price = 3500 WHERE type = 'SERIES' AND price = 2000 AND custom_price IS NULL;

-- 3. Ensure default movie and series prices exist in app_settings
INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('per_movie_price', '30', datetime('now')),
  ('per_series_price', '35', datetime('now'))
ON CONFLICT (key) DO NOTHING;
