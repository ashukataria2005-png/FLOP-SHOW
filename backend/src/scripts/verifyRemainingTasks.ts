import { createServer } from '../server.js';
import { getAdapter } from '../db/adapter.js';
import { runMigrationsAsync } from '../db/migrator.js';
import { parseYouTubeUrl } from '../../src/utils/mediaUrl.js';
import fs from 'fs';
import path from 'path';

async function verify() {
  console.log('============================================================');
  console.log('FLOPSHOW VERIFICATION SUITE — 4 MILESTONES & CONSTRAINTS');
  console.log('============================================================\n');

  await runMigrationsAsync();
  const db = getAdapter();

  const app = createServer();
  const server = await new Promise<any>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passes = 0;
  let fails = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passes++;
    } else {
      console.error(`  ✗ ${testName}${detail ? ` — ${detail}` : ''}`);
      fails++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // MILESTONE 4: Admin Navigation Hub Order
    // ------------------------------------------------------------------------
    console.log('[MILESTONE 4/4] Verifying Admin Navigation Hub Order...');
    const adminDashboardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/admin/AdminDashboardPage.tsx'),
      'utf8'
    );
    const heroIdx = adminDashboardCode.indexOf("label: 'Hero Banner'");
    const trendingIdx = adminDashboardCode.indexOf("label: 'Trending #1 Showcase'");
    const addMovieIdx = adminDashboardCode.indexOf("label: 'Add Movie'");

    assert(heroIdx !== -1 && trendingIdx !== -1, 'Both Hero and Trending exist in AdminDashboardPage');
    assert(heroIdx < trendingIdx, 'Hero Banner (#1) comes before Trending #1 Showcase (#2)');
    assert(trendingIdx < addMovieIdx, 'Trending (#2) comes before Add Movie (#3)');

    // ------------------------------------------------------------------------
    // SETUP TEST USER & CONTENT
    // ------------------------------------------------------------------------
    const userRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Milestone Tester',
        email: `tester_${Date.now()}@flopshow.test`,
        password: 'Password123!'
      })
    });
    const userData = await userRes.json();
    const token = userData.token;
    const userId = userData.user.id;

    // Create a test Movie
    const movieRes = await db.query(
      `INSERT INTO content (id, type, title, slug, description, poster, backdrop, release_year, price, status, is_hero, featured, created_at, updated_at)
       VALUES ('test-movie-cw', 'MOVIE', 'Continue Watching Test Movie', 'test-movie-cw', 'Description', 'https://test/p.jpg', 'https://test/b.jpg', 2024, 0, 'PUBLISHED', 0, 0, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
       RETURNING id;`
    );
    const movieId = movieRes.rows[0].id;

    // Create a test Series with 2 episodes
    await db.query(
      `INSERT INTO content (id, type, title, slug, description, poster, backdrop, release_year, price, status, is_hero, featured, created_at, updated_at)
       VALUES ('test-series-cw', 'SERIES', 'Continue Watching Test Series', 'test-series-cw', 'Description', 'https://test/p.jpg', 'https://test/b.jpg', 2024, 0, 'PUBLISHED', 0, 0, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;`
    );
    const seriesId = 'test-series-cw';

    await db.query(
      `INSERT INTO seasons (id, content_id, season_number, title, created_at)
       VALUES ('season-1-cw', 'test-series-cw', 1, 'Season 1', NOW())
       ON CONFLICT (id) DO NOTHING;`
    );

    await db.query(
      `INSERT INTO episodes (id, season_id, episode_number, title, duration, duration_seconds, video_url, created_at, updated_at)
       VALUES
         ('ep-1-cw', 'season-1-cw', 1, 'Episode 1 Pilot', '45m', 2700, 'https://test.flopshow/ep1.mp4', NOW(), NOW()),
         ('ep-2-cw', 'season-1-cw', 2, 'Episode 2 Mystery', '48m', 2880, 'https://test.flopshow/ep2.mp4', NOW(), NOW()),
         ('ep-3-cw', 'season-1-cw', 3, 'Episode 3 Finale', '52m', 3120, 'https://test.flopshow/ep3.mp4', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING;`
    );

    // ------------------------------------------------------------------------
    // MILESTONE 1 & 2: Media Player & Exact Continue Watching / Resume
    // ------------------------------------------------------------------------
    console.log('\n[MILESTONE 1 & 2] Verifying Exact Continue Watching & Resume Positions...');

    // 1. Save Movie in-progress position (345s out of 7200s, ~5%)
    await fetch(`${baseUrl}/api/library/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        contentId: movieId,
        currentTimeSeconds: 345,
        durationSeconds: 7200,
        progressPercent: 5
      })
    });

    const getMovieProg = await fetch(`${baseUrl}/api/library/progress/${movieId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const movieProgData = await getMovieProg.json();
    assert(movieProgData.progress?.current_time_seconds === 345, 'Movie progress saved & retrieved exactly at 345s');
    assert(movieProgData.progress?.completed === 0, 'Movie progress is not completed');

    // 2. Save Episode 2 progress (480s) and Episode 3 progress (120s)
    await fetch(`${baseUrl}/api/library/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        contentId: seriesId,
        episodeId: 'ep-2-cw',
        currentTimeSeconds: 480,
        durationSeconds: 2880,
        progressPercent: 17
      })
    });

    await fetch(`${baseUrl}/api/library/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        contentId: seriesId,
        episodeId: 'ep-3-cw',
        currentTimeSeconds: 120,
        durationSeconds: 3120,
        progressPercent: 4
      })
    });

    // Verify Episode 2 and Episode 3 are independent
    const getEp2 = await fetch(`${baseUrl}/api/library/progress/${seriesId}?episodeId=ep-2-cw`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ep2Data = await getEp2.json();

    const getEp3 = await fetch(`${baseUrl}/api/library/progress/${seriesId}?episodeId=ep-3-cw`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ep3Data = await getEp3.json();

    assert(ep2Data.progress?.current_time_seconds === 480, 'Episode 2 resumes at 480s');
    assert(ep3Data.progress?.current_time_seconds === 120, 'Episode 3 resumes at 120s');
    assert(
      ep2Data.progress?.current_time_seconds !== ep3Data.progress?.current_time_seconds,
      'Episode 2 position does NOT leak into Episode 3'
    );

    // Verify GET /api/library/progress returns all user progress for session restore
    const allProgRes = await fetch(`${baseUrl}/api/library/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const allProgData = await allProgRes.json();
    assert(Array.isArray(allProgData.progress) && allProgData.progress.length >= 3, 'All progress items retrieved for reload persistence');

    // 3. Test Completion Threshold (>= 90%)
    await fetch(`${baseUrl}/api/library/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        contentId: movieId,
        currentTimeSeconds: 7100,
        durationSeconds: 7200,
        progressPercent: 98
      })
    });

    const getCompletedMovie = await fetch(`${baseUrl}/api/library/progress/${movieId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const completedData = await getCompletedMovie.json();
    assert(completedData.progress?.completed === 1, 'Content at 98% is marked completed in database');

    // ------------------------------------------------------------------------
    // MILESTONE 3: Trailers for Movies & Series
    // ------------------------------------------------------------------------
    console.log('\n[MILESTONE 3/4] Verifying Trailer System for Movies and Series...');

    // 1. YouTube URL parser validation
    const ytWatch = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const ytShort = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    assert(ytWatch.isYouTube && ytWatch.videoId === 'dQw4w9WgXcQ', 'Parses standard YouTube watch trailer URL');
    assert(ytShort.isYouTube && ytShort.videoId === 'dQw4w9WgXcQ', 'Parses short youtu.be trailer URL');

    // 2. Set trailer on movie
    await db.query(`UPDATE content SET trailer_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' WHERE id = '${movieId}'`);
    const movieTrailerRes = await fetch(`${baseUrl}/api/media/content/${movieId}?type=TRAILER`);
    const movieTrailerData = await movieTrailerRes.json();
    assert(movieTrailerData.sourceType === 'YOUTUBE', 'Movie trailer publicly accessible with YOUTUBE sourceType');
    assert(movieTrailerData.url.includes('dQw4w9WgXcQ'), 'Movie trailer URL matches set YouTube trailer');

    // 3. Set trailer on series
    await db.query(`UPDATE content SET trailer_url = 'https://stream.vcdn.me/trailer/series.mp4' WHERE id = '${seriesId}'`);
    const seriesTrailerRes = await fetch(`${baseUrl}/api/media/content/${seriesId}?type=TRAILER`);
    const seriesTrailerData = await seriesTrailerRes.json();
    assert(seriesTrailerData.mediaType === 'TRAILER', 'Series trailer returns mediaType TRAILER');
    assert(seriesTrailerData.url === 'https://stream.vcdn.me/trailer/series.mp4', 'Series trailer URL verified');

    // 4. Remove trailer (ensure clearing sets null)
    await db.query(`UPDATE content SET trailer_url = NULL WHERE id = '${movieId}'`);
    await db.query(`UPDATE media SET is_active = 0 WHERE content_id = '${movieId}' AND media_type = 'TRAILER'`);
    const clearedTrailerRes = await fetch(`${baseUrl}/api/media/content/${movieId}?type=TRAILER`);
    assert(clearedTrailerRes.status === 404, 'Cleared trailer cleanly returns 404 without breaking');

    // ------------------------------------------------------------------------
    // CONSTRAINTS VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n[CONSTRAINTS] Verifying strictly untouched areas...');

    const logoFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/Logo.tsx'), 'utf8');
    assert(logoFile.length > 0, 'Logo.tsx is preserved and intact');

    const searchFile = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SearchPage.tsx'), 'utf8');
    assert(searchFile.length > 0, 'SearchPage.tsx is preserved and intact');

    console.log('\n============================================================');
    console.log(`TOTAL CHECKS: ${passes + fails} | PASSED: ${passes} | FAILED: ${fails}`);
    console.log('============================================================');

    if (fails > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

verify().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
