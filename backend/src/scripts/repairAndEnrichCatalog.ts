import { getAdapter } from '../db/adapter.js';
import { POPULAR_SERIES_CATALOG } from '../../../src/data/series.ts';

function cleanStr(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
}

async function repairCatalog() {
  const db = getAdapter();
  console.log('=== STARTING COMPLETE METADATA AUDIT & EPISODE REPAIR ===');

  const { rows: allSeries } = await db.query("SELECT id, title, release_year, poster, backdrop FROM content WHERE UPPER(type) = 'SERIES' ORDER BY title;");
  console.log(`Total series in Postgres: ${allSeries.length}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: Sync from POPULAR_SERIES_CATALOG (Panchayat S1-S3, Mirzapur S1-S3, etc.)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- PHASE 1: Syncing from POPULAR_SERIES_CATALOG ---');
  let syncedFromStatic = 0;

  for (const feSeries of POPULAR_SERIES_CATALOG) {
    const cleanFe = cleanStr(feSeries.title);
    // Find matching series in Postgres
    const pgMatch = allSeries.find(p => p.id === feSeries.id || cleanStr(p.title) === cleanFe);
    if (!pgMatch) continue;

    const contentId = pgMatch.id;

    // Check existing episode count in DB
    const { rows: existingEps } = await db.query(
      "SELECT count(*) as count FROM episodes e JOIN seasons sn ON e.season_id = sn.id WHERE sn.content_id = $1;",
      [contentId]
    );
    const existingCount = parseInt(existingEps[0]?.count || '0');
    const feTotalEps = (feSeries.seasons || []).reduce((acc, sn) => acc + (sn.episodes || []).length, 0);

    // If DB has fewer episodes than static catalog (or <= 2 episodes), replace with full canonical data
    if (existingCount < feTotalEps || existingCount <= 2) {
      console.log(`[Static Sync] Updating "${pgMatch.title}" (${contentId}): DB has ${existingCount} eps, series.ts has ${feTotalEps} eps across ${feSeries.seasons?.length} seasons`);

      // Clear any test watch_progress for this series to avoid ON DELETE SET NULL index collisions
      await db.query("DELETE FROM watch_progress WHERE content_id = $1;", [contentId]);

      // Delete existing episodes and seasons for this series to re-insert clean canonical tree
      await db.query("DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE content_id = $1);", [contentId]);
      await db.query("DELETE FROM seasons WHERE content_id = $1;", [contentId]);

      // Re-insert seasons and episodes
      for (const season of (feSeries.seasons || [])) {
        const seasonId = `${contentId}-s${season.seasonNumber}`;
        const seasonTitle = season.title || `Season ${season.seasonNumber}`;

        await db.query(
          "INSERT INTO seasons (id, content_id, season_number, title, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET title = $4;",
          [seasonId, contentId, season.seasonNumber, seasonTitle]
        );

        for (const ep of (season.episodes || [])) {
          const epId = ep.id || `${seasonId}-e${ep.episodeNumber}`;
          const durationStr = ep.duration || '45m';
          const durationSecs = ep.durationSeconds || 2700;
          const stillUrl = ep.stillUrl || ep.thumbnailUrl || pgMatch.backdrop || pgMatch.poster;
          const desc = ep.description || ep.overview || ep.synopsis || `Episode ${ep.episodeNumber} of ${seasonTitle}.`;
          const videoUrl = ep.videoUrl || ep.streamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

          await db.query(
            `INSERT INTO episodes (id, season_id, episode_number, title, description, thumbnail, duration, duration_seconds, video_url, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET 
               title = $4, description = $5, thumbnail = $6, duration = $7, duration_seconds = $8, video_url = $9, updated_at = NOW();`,
            [epId, seasonId, ep.episodeNumber, ep.title, desc, stillUrl, durationStr, durationSecs, videoUrl]
          );
        }
      }
      syncedFromStatic++;
    }
  }
  console.log(`Phase 1 complete: Synced ${syncedFromStatic} series with complete multi-season episodes.`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: Fetch and Repair any Series that Still Have <= 2 Episodes via TVMaze
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- PHASE 2: Fetching Canonical Episodes from TVMaze for remaining shows ---');
  let fetchedFromTvMaze = 0;

  for (const s of allSeries) {
    const { rows: epCheck } = await db.query(
      "SELECT count(*) as count FROM episodes e JOIN seasons sn ON e.season_id = sn.id WHERE sn.content_id = $1;",
      [s.id]
    );
    const epCount = parseInt(epCheck[0]?.count || '0');

    // Only process if series has 0 or <= 2 episodes
    if (epCount <= 2) {
      console.log(`[TVMaze Fetch] "${s.title}" (${s.id}) currently has ${epCount} episodes. Querying TVMaze...`);

      // Clean search title: remove year suffix like "-2018" or "(Series)"
      let searchTitle = s.title.replace(/\(\w+\)/g, '').replace(/-\s*\d{4}/g, '').trim();
      if (s.id === 'breaking-bad') searchTitle = 'Breaking Bad';
      if (s.id === 'suits-2011') searchTitle = 'Suits';
      if (s.id === 'yellowstone-2018') searchTitle = 'Yellowstone';

      try {
        const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(searchTitle)}&embed=episodes`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
          console.warn(`  TVMaze returned ${res.status} for "${searchTitle}"`);
          continue;
        }

        const data = await res.json() as any;
        const episodes = data._embedded?.episodes || [];
        if (episodes.length === 0) {
          console.warn(`  No episodes found in TVMaze payload for "${searchTitle}"`);
          continue;
        }

        console.log(`  Found ${episodes.length} episodes on TVMaze for "${data.name}"`);

        // Group by season
        const seasonsMap = new Map<number, any[]>();
        for (const ep of episodes) {
          if (!seasonsMap.has(ep.season)) {
            seasonsMap.set(ep.season, []);
          }
          seasonsMap.get(ep.season)!.push(ep);
        }

        // Clean out existing placeholder/stub episodes
        await db.query("DELETE FROM watch_progress WHERE content_id = $1;", [s.id]);
        await db.query("DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE content_id = $1);", [s.id]);
        await db.query("DELETE FROM seasons WHERE content_id = $1;", [s.id]);

        // Insert seasons and episodes
        for (const [seasonNum, epList] of seasonsMap.entries()) {
          const seasonId = `${s.id}-s${seasonNum}`;
          const seasonTitle = `Season ${seasonNum}`;

          await db.query(
            "INSERT INTO seasons (id, content_id, season_number, title, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (id) DO UPDATE SET title = $4;",
            [seasonId, s.id, seasonNum, seasonTitle]
          );

          for (const ep of epList) {
            const epId = `${seasonId}-e${ep.number}`;
            const epTitle = ep.name || `Episode ${ep.number}`;
            const summary = stripHtml(ep.summary) || `Episode ${ep.number} of ${s.title} Season ${seasonNum}.`;
            const durationMins = ep.runtime || 45;
            const durationStr = `${durationMins}m`;
            const durationSecs = durationMins * 60;
            const stillUrl = ep.image?.original || ep.image?.medium || s.backdrop || s.poster;
            const streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

            await db.query(
              `INSERT INTO episodes (id, season_id, episode_number, title, description, thumbnail, duration, duration_seconds, video_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
               ON CONFLICT (id) DO UPDATE SET
                 title = $4, description = $5, thumbnail = $6, duration = $7, duration_seconds = $8, video_url = $9, updated_at = NOW();`,
              [epId, seasonId, ep.number, epTitle, summary, stillUrl, durationStr, durationSecs, streamUrl]
            );
          }
        }

        // If poster or backdrop was missing or low-res, update with TVMaze original artwork
        if (data.image?.original) {
          await db.query("UPDATE content SET poster = $1 WHERE id = $2 AND (poster IS NULL OR poster LIKE '%placeholder%');", [data.image.original, s.id]);
        }

        fetchedFromTvMaze++;
        // Small 250ms breathing room for API polite usage
        await new Promise(r => setTimeout(r, 250));
      } catch (err: any) {
        console.error(`  Error fetching "${searchTitle}" from TVMaze:`, err.message);
      }
    }
  }
  console.log(`Phase 2 complete: Enriched ${fetchedFromTvMaze} series with full TVMaze episodes.`);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: Audit & Check Zero Episode Series in Postgres
  // ─────────────────────────────────────────────────────────────────────────────
  const { rows: remainingZero } = await db.query(`
    SELECT c.id, c.title, c.release_year, count(e.id) as ep_count
    FROM content c
    LEFT JOIN seasons sn ON sn.content_id = c.id
    LEFT JOIN episodes e ON e.season_id = sn.id
    WHERE UPPER(c.type) = 'SERIES'
    GROUP BY c.id, c.title, c.release_year
    HAVING count(e.id) = 0;
  `);

  console.log(`\nRemaining series with 0 episodes in Postgres: ${remainingZero.length}`);
  if (remainingZero.length > 0) {
    console.table(remainingZero);
  }

  const { rows: totalEps } = await db.query("SELECT count(*) as count FROM episodes;");
  console.log(`Total episodes in Postgres now: ${totalEps[0]?.count}`);

  await db.close();
}

repairCatalog().catch(console.error);
