import { getAdapter } from '../db/adapter.js';

// Pre-verified high-res posters for known titles if their URL is broken
const KNOWN_FIXES: Record<string, string> = {
  'the-penguin-2024': 'https://images.metahub.space/poster/medium/tt15435876/img',
  'x-men-97-2024': 'https://images.metahub.space/poster/medium/tt16026746/img',
  'the-sandman-2022': 'https://static.tvmaze.com/uploads/images/original_untouched/418/1046467.jpg',
  'peacemaker-2022': 'https://images.metahub.space/poster/medium/tt13146488/img',
  'the-batman-2022': 'https://images.metahub.space/poster/medium/tt1877830/img',
  'moon-knight-2022': 'https://images.metahub.space/poster/medium/tt10234724/img',
  'the-suicide-squad-2021': 'https://images.metahub.space/poster/medium/tt6334354/img',
  'behind-the-candelabra-2013': 'https://images.metahub.space/poster/medium/tt1291580/img',
  'man-of-steel-2013': 'https://images.metahub.space/poster/medium/tt0770828/img',
  'spider-man-into-the-spider-verse-2018': 'https://images.metahub.space/poster/medium/tt4633694/img',
  'temple-grandin-2010': 'https://images.metahub.space/poster/medium/tt1278469/img',
  'the-normal-heart-2014': 'https://images.metahub.space/poster/medium/tt1684226/img',
  'the-tale-2018': 'https://images.metahub.space/poster/medium/tt4015500/img',
  'watchmen-series-2019': 'https://images.metahub.space/poster/medium/tt7049682/img',
};

async function auditAndFix() {
  const db = getAdapter();
  const { rows: allContent } = await db.query('SELECT id, title, type, release_year, poster FROM content ORDER BY title;');

  console.log(`Starting thorough poster audit across all ${allContent.length} titles...`);

  let fixedCount = 0;
  let healthyCount = 0;
  let unresolvedCount = 0;
  const brokenList: any[] = [];

  // Check in concurrency batches of 10
  const batchSize = 10;
  for (let i = 0; i < allContent.length; i += batchSize) {
    const batch = allContent.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item: any) => {
        let isHealthy = false;

        // Check if known fix exists first
        if (KNOWN_FIXES[item.id]) {
          await db.run('UPDATE content SET poster = ? WHERE id = ?;', [KNOWN_FIXES[item.id], item.id]);
          console.log(`[FIXED] "${item.title}" -> updated with verified poster`);
          fixedCount++;
          return;
        }

        if (item.poster && (item.poster.startsWith('http://') || item.poster.startsWith('https://'))) {
          try {
            const res = await fetch(item.poster, {
              method: 'HEAD',
              signal: AbortSignal.timeout(6000)
            });
            if (res.ok || res.status === 405) {
              isHealthy = true;
            }
          } catch {
            isHealthy = false;
          }
        }

        if (isHealthy) {
          healthyCount++;
        } else {
          // Attempt automatic online fallback
          let fallbackPoster: string | null = null;
          try {
            if (item.type === 'SERIES') {
              const tvRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`, {
                signal: AbortSignal.timeout(5000)
              });
              if (tvRes.ok) {
                const tvData: any = await tvRes.json();
                fallbackPoster = tvData?.image?.original || tvData?.image?.medium || null;
              }
            } else {
              const cineRes = await fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(item.title)}.json`, {
                signal: AbortSignal.timeout(5000)
              });
              if (cineRes.ok) {
                const cineData: any = await cineRes.json();
                const match = cineData?.metas?.[0];
                if (match?.poster) {
                  fallbackPoster = match.poster;
                } else if (match?.id) {
                  fallbackPoster = `https://images.metahub.space/poster/medium/${match.id}/img`;
                }
              }
            }
          } catch {}

          if (fallbackPoster) {
            await db.run('UPDATE content SET poster = ? WHERE id = ?;', [fallbackPoster, item.id]);
            console.log(`[RECOVERED] "${item.title}" (${item.type}) -> Assigned new poster from API`);
            fixedCount++;
          } else {
            console.warn(`[UNRESOLVED] "${item.title}" (${item.type}) -> Poster: ${item.poster}`);
            unresolvedCount++;
            brokenList.push({ id: item.id, title: item.title, poster: item.poster });
          }
        }
      })
    );
  }

  console.log('\n==================================================');
  console.log('POSTER AUDIT & FIX REPORT:');
  console.log(`- Total content checked: ${allContent.length}`);
  console.log(`- Originally healthy posters: ${healthyCount}`);
  console.log(`- Broken posters fixed: ${fixedCount}`);
  console.log(`- Unresolved/broken posters: ${unresolvedCount}`);
  console.log(`- Total content with valid posters: ${healthyCount + fixedCount} / ${allContent.length} (${(((healthyCount + fixedCount)/allContent.length)*100).toFixed(1)}%)`);
  console.log('==================================================');

  process.exit(0);
}

auditAndFix().catch(err => {
  console.error(err);
  process.exit(1);
});
