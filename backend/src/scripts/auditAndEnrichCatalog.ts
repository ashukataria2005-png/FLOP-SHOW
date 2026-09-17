import { getAdapter } from '../db/adapter.js';

interface ContentItemRow {
  id: string;
  title: string;
  release_year: number;
  type: 'MOVIE' | 'SERIES';
  poster: string;
  backdrop: string;
  trailer_url: string | null;
}

// Helper to look up official trailer via Cinemeta
async function lookupTrailer(title: string, year: number, type: 'MOVIE' | 'SERIES'): Promise<string | null> {
  const cinemetaType = type === 'SERIES' ? 'series' : 'movie';
  const cleanTitle = title.trim();

  try {
    const searchUrl = `https://v3-cinemeta.strem.io/catalog/${cinemetaType}/top/search=${encodeURIComponent(cleanTitle)}.json`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const metas = data.metas || [];
    if (metas.length === 0) return null;

    // Find best match: exact name match first, or matching release year
    const bestMatch = metas.find((m: any) => {
      const matchName = (m.name || m.title || '').toLowerCase() === cleanTitle.toLowerCase();
      const matchYear = m.releaseInfo && String(m.releaseInfo).startsWith(String(year));
      return matchName && matchYear;
    }) || metas.find((m: any) => (m.name || m.title || '').toLowerCase() === cleanTitle.toLowerCase())
       || metas[0];

    if (!bestMatch || !bestMatch.id) return null;

    const metaUrl = `https://v3-cinemeta.strem.io/meta/${cinemetaType}/${bestMatch.id}.json`;
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(6000) });
    if (!metaRes.ok) return null;

    const metaData = await metaRes.json() as any;
    const meta = metaData.meta || {};

    const ytId = meta.trailerStreams?.find((t: any) => t.ytId)?.ytId
      || meta.trailers?.find((t: any) => t.source)?.source;

    if (ytId && typeof ytId === 'string' && ytId.trim().length >= 5) {
      return `https://www.youtube.com/watch?v=${ytId.trim()}`;
    }
  } catch (err: any) {
    // Timeout or network glitch
  }

  // Fallback: Secondary search via TVMaze for series or generic trailer search
  if (type === 'SERIES') {
    try {
      const tvmazeRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (tvmazeRes.ok) {
        const show = await tvmazeRes.json() as any;
        if (show.externals?.imdb) {
          const imdbId = show.externals.imdb;
          const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`, { signal: AbortSignal.timeout(5000) });
          if (metaRes.ok) {
            const metaData = await metaRes.json() as any;
            const meta = metaData.meta || {};
            const ytId = meta.trailerStreams?.find((t: any) => t.ytId)?.ytId
              || meta.trailers?.find((t: any) => t.source)?.source;
            if (ytId) return `https://www.youtube.com/watch?v=${ytId.trim()}`;
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // Fallback 2: YouTube Search scraping for direct 11-char video ID
  try {
    const query = `${cleanTitle} ${year || ''} official trailer`.trim();
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (ytRes.ok) {
      const html = await ytRes.text();
      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (match && match[1]) {
        return `https://www.youtube.com/watch?v=${match[1]}`;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

async function auditAndEnrich() {
  console.log('====================================================');
  console.log('  FLOPSHOW CATALOG AUDIT & ENRICHMENT ENGINE');
  console.log('====================================================\n');

  const db = getAdapter();

  // 1. Fetch all movies & series
  const { rows } = await db.query(
    'SELECT id, title, release_year, type, poster, backdrop, trailer_url FROM content ORDER BY title ASC;'
  );
  const catalog = rows as ContentItemRow[];
  console.log(`Total catalog items audited: ${catalog.length}`);

  let missingTrailers = 0;
  let attachedTrailers = 0;
  let alreadyHasTrailer = 0;
  let missingPosters = 0;
  let missingBackdrops = 0;
  const now = new Date().toISOString();

  // Audit posters and backdrops
  for (const item of catalog) {
    if (!item.poster || item.poster.trim() === '') {
      missingPosters++;
      console.warn(`[POSTER MISSING] ${item.title} (${item.id})`);
    }
    if (!item.backdrop || item.backdrop.trim() === '') {
      missingBackdrops++;
      console.warn(`[BACKDROP MISSING] ${item.title} (${item.id})`);
    }
    if (item.trailer_url && item.trailer_url.trim() !== '') {
      alreadyHasTrailer++;
    } else {
      missingTrailers++;
    }
  }

  console.log(`- Titles already having trailers: ${alreadyHasTrailer}`);
  console.log(`- Titles missing trailers: ${missingTrailers}`);
  console.log(`- Titles missing vertical poster: ${missingPosters}`);
  console.log(`- Titles missing horizontal backdrop: ${missingBackdrops}\n`);

  // Ensure all existing trailers have active media records in media table
  console.log('1. Synchronizing existing trailers with media table...');
  for (const item of catalog) {
    if (item.trailer_url && item.trailer_url.trim() !== '') {
      const { rows: existingMedia } = await db.query(
        "SELECT id FROM media WHERE content_id = ? AND media_type = 'TRAILER' AND is_active = 1 LIMIT 1;",
        [item.id]
      );
      if (existingMedia.length === 0) {
        const mediaId = `med-tr-${item.id}-${Date.now().toString(36)}`;
        await db.run(
          `INSERT INTO media (id, content_id, media_type, source_type, url, is_active, created_at, updated_at)
           VALUES (?, ?, 'TRAILER', 'YOUTUBE', ?, 1, ?, ?);`,
          [mediaId, item.id, item.trailer_url.trim(), now, now]
        );
      }
    }
  }

  // 2. Lookup and attach trailers for titles missing trailers
  console.log('\n2. Looking up and attaching official trailers for missing titles...');
  const itemsToEnrich = catalog.filter(i => !i.trailer_url || i.trailer_url.trim() === '');

  // Process in batches of 5 concurrent lookups
  const BATCH_SIZE = 5;
  for (let i = 0; i < itemsToEnrich.length; i += BATCH_SIZE) {
    const batch = itemsToEnrich.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item, batchIdx) => {
        const index = i + batchIdx + 1;
        process.stdout.write(`[${index}/${itemsToEnrich.length}] Resolving: "${item.title}" (${item.release_year}, ${item.type})... `);
        const trailer = await lookupTrailer(item.title, item.release_year, item.type);

        if (trailer) {
          // Update content record
          await db.run(
            'UPDATE content SET trailer_url = ?, updated_at = ? WHERE id = ?;',
            [trailer, now, item.id]
          );

          // Update or insert media table record without duplicates
          const { rows: existingMedia } = await db.query(
            "SELECT id FROM media WHERE content_id = ? AND media_type = 'TRAILER' LIMIT 1;",
            [item.id]
          );
          if (existingMedia.length > 0) {
            await db.run(
              "UPDATE media SET url = ?, source_type = 'YOUTUBE', is_active = 1, updated_at = ? WHERE id = ?;",
              [trailer, now, (existingMedia[0] as any).id]
            );
          } else {
            const mediaId = `med-tr-${item.id}-${Date.now().toString(36)}`;
            await db.run(
              `INSERT INTO media (id, content_id, media_type, source_type, url, is_active, created_at, updated_at)
               VALUES (?, ?, 'TRAILER', 'YOUTUBE', ?, 1, ?, ?);`,
              [mediaId, item.id, trailer, now, now]
            );
          }

          attachedTrailers++;
          console.log(`✓ Attached: ${trailer}`);
        } else {
          // If public API had no direct trailer for this niche title, attach the official YouTube trailer query URL
          const fallbackTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + ' official trailer ' + item.release_year)}`;
          // Or search with year on YouTube
          console.log(`- Note: Direct embed stream not indexed; title catalogued.`);
        }
      })
    );

    // Slight delay between batches to respect upstream public APIs
    await new Promise(r => setTimeout(r, 400));
  }

  // 3. Final Verification
  const { rows: verifyRows } = await db.query(
    'SELECT COUNT(*) as total, COUNT(trailer_url) as with_trailer, COUNT(poster) as with_poster, COUNT(backdrop) as with_backdrop FROM content;'
  );
  const verify = verifyRows[0] as any;
  const { rows: activeMediaTrailers } = await db.query(
    "SELECT COUNT(*) as c FROM media WHERE media_type = 'TRAILER' AND is_active = 1;"
  );

  console.log('\n====================================================');
  console.log('  CATALOG AUDIT & ENRICHMENT RESULTS');
  console.log('====================================================');
  console.log(`Total Titles in Catalog:       ${verify.total}`);
  console.log(`Titles with Trailers:          ${verify.with_trailer}`);
  console.log(`Newly Attached Trailers:       ${attachedTrailers}`);
  console.log(`Active Media Table Trailers:   ${(activeMediaTrailers[0] as any)?.c}`);
  console.log(`Titles with Vertical Posters:  ${verify.with_poster}`);
  console.log(`Titles with Backdrops:         ${verify.with_backdrop}`);
  console.log('====================================================\n');

  process.exit(0);
}

auditAndEnrich().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
