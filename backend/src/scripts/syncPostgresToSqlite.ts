import { getAdapter } from '../db/adapter.js';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

async function queryWithRetry(db: any, sql: string, params: any[] = [], maxRetries = 4): Promise<any[]> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await db.query(sql, params);
      return res.rows;
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      console.warn(`  [Retry ${attempt}/${maxRetries}] transient TLS/DB error: ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 750 * attempt));
    }
  }
  return [];
}

async function syncToSqlite() {
  const pgDb = getAdapter();
  const sqlitePath = path.resolve('backend/data/flopshow.db');
  console.log(`=== SYNCING POSTGRES DATA TO SQLITE (${sqlitePath}) ===`);

  // 1. Fetch all genres
  console.log('Fetching genres from Postgres...');
  const genres = await queryWithRetry(pgDb, 'SELECT * FROM genres;');

  // 2. Fetch all content
  console.log('Fetching content from Postgres...');
  const content = await queryWithRetry(pgDb, 'SELECT * FROM content;');

  // 3. Fetch all content_genres
  console.log('Fetching content_genres from Postgres...');
  const contentGenres = await queryWithRetry(pgDb, 'SELECT * FROM content_genres;');

  // 4. Fetch all seasons
  console.log('Fetching seasons from Postgres...');
  const seasons = await queryWithRetry(pgDb, 'SELECT * FROM seasons;');

  // 5. Fetch all episodes per series with retry
  console.log('Fetching episodes from Postgres across all series...');
  const allEpisodes: any[] = [];
  const seriesList = content.filter(c => c.type === 'SERIES' || c.type === 'series');

  for (let i = 0; i < seriesList.length; i++) {
    const s = seriesList[i];
    const eps = await queryWithRetry(
      pgDb,
      "SELECT id, season_id, episode_number, title, description, thumbnail, duration, duration_seconds, video_url, created_at, updated_at FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE content_id = $1);",
      [s.id]
    );
    allEpisodes.push(...eps);
    if ((i + 1) % 30 === 0 || i === seriesList.length - 1) {
      console.log(`  [${i + 1}/${seriesList.length}] Total episodes collected: ${allEpisodes.length}`);
    }
  }

  console.log(`\nAll Postgres data in memory:
    Genres: ${genres.length}
    Content: ${content.length}
    Content_Genres: ${contentGenres.length}
    Seasons: ${seasons.length}
    Episodes: ${allEpisodes.length}
  `);

  // 6. Write cleanly to SQLite
  console.log('Opening SQLite and writing database atomically...');
  const sqlite = new DatabaseSync(sqlitePath);
  sqlite.exec('PRAGMA foreign_keys = OFF;');

  try {
    sqlite.exec('BEGIN IMMEDIATE;');
    sqlite.exec('DELETE FROM episodes;');
    sqlite.exec('DELETE FROM seasons;');
    sqlite.exec('DELETE FROM content_genres;');
    sqlite.exec('DELETE FROM content;');
    sqlite.exec('DELETE FROM genres;');

    // Insert Genres
    const insertGenre = sqlite.prepare('INSERT OR REPLACE INTO genres (id, name, slug) VALUES (?, ?, ?);');
    for (const g of genres) {
      insertGenre.run(g.id, g.name, g.slug);
    }

    // Insert Content
    const insertContent = sqlite.prepare(`
      INSERT OR REPLACE INTO content (
        id, type, title, slug, description, poster, backdrop, trailer_url, video_url,
        price, language, release_year, duration, age_rating, status, featured,
        category_label, tagline, about, rating, director, cast_json, created_at,
        updated_at, trending_position, display_priority, is_hero
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      );
    `);

    for (const c of content) {
      insertContent.run(
        c.id,
        c.type,
        c.title,
        c.slug || c.id,
        c.description || '',
        c.poster || '',
        c.backdrop || '',
        c.trailer_url || null,
        c.video_url || null,
        c.price ?? 0,
        c.language || 'Hindi',
        c.release_year || 2024,
        c.duration || null,
        c.age_rating || 'U/A 13+',
        c.status || 'PUBLISHED',
        c.featured ? 1 : 0,
        c.category_label || null,
        c.tagline || null,
        c.about || null,
        c.rating ?? 8.0,
        c.director || null,
        typeof c.cast_json === 'string' ? c.cast_json : JSON.stringify(c.cast_json || []),
        c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
        c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString(),
        c.trending_position ?? null,
        c.display_priority ?? 0,
        c.is_hero ? 1 : 0
      );
    }

    // Insert Content Genres
    const insertContentGenre = sqlite.prepare('INSERT OR REPLACE INTO content_genres (content_id, genre_id) VALUES (?, ?);');
    for (const cg of contentGenres) {
      insertContentGenre.run(cg.content_id, cg.genre_id);
    }

    // Insert Seasons
    const insertSeason = sqlite.prepare(`
      INSERT OR REPLACE INTO seasons (id, content_id, season_number, title, created_at)
      VALUES (?, ?, ?, ?, ?);
    `);
    for (const sn of seasons) {
      insertSeason.run(
        sn.id,
        sn.content_id,
        sn.season_number,
        sn.title,
        sn.created_at ? new Date(sn.created_at).toISOString() : new Date().toISOString()
      );
    }

    // Insert Episodes
    console.log(`Writing ${allEpisodes.length} episodes into SQLite...`);
    const insertEp = sqlite.prepare(`
      INSERT OR REPLACE INTO episodes (
        id, season_id, episode_number, title, description, thumbnail,
        duration, duration_seconds, video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    let epCount = 0;
    for (const ep of allEpisodes) {
      insertEp.run(
        ep.id,
        ep.season_id,
        ep.episode_number,
        ep.title || `Episode ${ep.episode_number}`,
        ep.description || '',
        ep.thumbnail || '',
        ep.duration || '45m',
        ep.duration_seconds ?? 2700,
        ep.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        ep.created_at ? new Date(ep.created_at).toISOString() : new Date().toISOString(),
        ep.updated_at ? new Date(ep.updated_at).toISOString() : new Date().toISOString()
      );
      epCount++;
    }

    sqlite.exec('COMMIT;');
    console.log(`\nSUCCESS! Synced ${content.length} titles, ${seasons.length} seasons, and ${epCount} episodes to SQLite!`);
  } catch (err) {
    try {
      sqlite.exec('ROLLBACK;');
    } catch (_) {}
    console.error('Sync failed:', err);
    throw err;
  } finally {
    sqlite.exec('PRAGMA foreign_keys = ON;');
    sqlite.close();
    await pgDb.close();
  }
}

syncToSqlite().catch(console.error);
