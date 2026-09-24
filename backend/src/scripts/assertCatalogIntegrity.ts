import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import assert from 'assert';
import { DEMO_CATALOG } from '../../../src/data/catalog.ts';

function runAssertions() {
  console.log('============================================================');
  console.log('CATALOG INTEGRITY & QUALITY GATES VERIFICATION');
  console.log('============================================================');

  // 1. SQLite Assertions
  const db = new DatabaseSync(path.resolve('backend/data/flopshow.db'));

  console.log('\n--- Checking SQLite Database (backend/data/flopshow.db) ---');
  const allContent = db.prepare('SELECT id, title, type, poster, backdrop FROM content;').all() as any[];
  console.log(`✓ Total Content items: ${allContent.length}`);

  const series = allContent.filter(c => c.type === 'SERIES' || c.type === 'series');
  console.log(`✓ Total Series: ${series.length}`);

  let zeroEpSeriesCount = 0;
  for (const s of series) {
    const epCount = (db.prepare(`
      SELECT count(*) as c 
      FROM episodes e 
      JOIN seasons sn ON e.season_id = sn.id 
      WHERE sn.content_id = ?;
    `).get(s.id) as any).c;
    if (epCount === 0) {
      zeroEpSeriesCount++;
      console.error(`  [FAIL] Series "${s.title}" has 0 episodes!`);
    }
  }

  const missingArtwork = allContent.filter(c => 
    !c.poster || c.poster.includes('placeholder') || c.poster.trim() === '' ||
    !c.backdrop || c.backdrop.includes('placeholder') || c.backdrop.trim() === ''
  );

  const episodes = db.prepare('SELECT id, title, thumbnail FROM episodes;').all() as any[];
  console.log(`✓ Total Episodes: ${episodes.length}`);

  const missingThumbnails = episodes.filter(e => 
    !e.thumbnail || e.thumbnail.includes('placeholder') || e.thumbnail.trim() === ''
  );

  console.log(`1. Total series with 0 episodes: ${zeroEpSeriesCount}`);
  assert.strictEqual(zeroEpSeriesCount, 0, 'Total series with 0 episodes must be 0');
  console.log('   ✓ PASS: 0 series with 0 episodes in SQLite');

  console.log(`2. Total movies/series missing posterUrl or bannerUrl: ${missingArtwork.length}`);
  assert.strictEqual(missingArtwork.length, 0, 'Total movies/series missing posterUrl or bannerUrl must be 0');
  console.log('   ✓ PASS: 0 items missing posterUrl or bannerUrl in SQLite');

  console.log(`3. Total episodes missing thumbnail/stillUrl: ${missingThumbnails.length}`);
  assert.strictEqual(missingThumbnails.length, 0, 'Total episodes missing thumbnail/stillUrl must be 0');
  console.log('   ✓ PASS: 0 episodes missing thumbnail/stillUrl in SQLite');

  db.close();

  // 2. Frontend Static Catalog Assertions
  console.log('\n--- Checking Frontend Static Catalog (src/data/catalog.ts) ---');
  console.log(`✓ Total Items in DEMO_CATALOG: ${DEMO_CATALOG.length}`);

  const feSeries = DEMO_CATALOG.filter(c => c.type === 'series');
  console.log(`✓ Total Frontend Series: ${feSeries.length}`);

  let feZeroEpCount = 0;
  let feMissingArtwork = 0;
  let feMissingStill = 0;

  for (const item of DEMO_CATALOG) {
    if (!item.posterUrl || item.posterUrl.includes('placeholder') || !item.backdropUrl || item.backdropUrl.includes('placeholder')) {
      feMissingArtwork++;
    }
    if (item.type === 'series') {
      const eps = (item.seasons || []).flatMap(s => s.episodes || []);
      if (eps.length === 0) feZeroEpCount++;
      for (const ep of eps) {
        if (!ep.thumbnailUrl && !ep.stillUrl) feMissingStill++;
      }
    }
  }

  console.log(`1. Frontend series with 0 episodes: ${feZeroEpCount}`);
  assert.strictEqual(feZeroEpCount, 0, 'Frontend series with 0 episodes must be 0');
  console.log('   ✓ PASS: 0 series with 0 episodes in frontend static catalog');

  console.log(`2. Frontend items missing posterUrl or bannerUrl: ${feMissingArtwork}`);
  assert.strictEqual(feMissingArtwork, 0, 'Frontend items missing posterUrl or bannerUrl must be 0');
  console.log('   ✓ PASS: 0 items missing posterUrl or bannerUrl in frontend static catalog');

  console.log(`3. Frontend episodes missing thumbnail/stillUrl: ${feMissingStill}`);
  assert.strictEqual(feMissingStill, 0, 'Frontend episodes missing thumbnail/stillUrl must be 0');
  console.log('   ✓ PASS: 0 episodes missing thumbnail/stillUrl in frontend static catalog');

  console.log('\n============================================================');
  console.log('ALL CATALOG INTEGRITY GATES PASSED PERFECTLY (0 ERRORS)');
  console.log('============================================================');
}

runAssertions();
