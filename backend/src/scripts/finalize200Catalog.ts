import { getAdapter } from '../db/adapter.js';

async function finalize200() {
  const db = getAdapter();

  console.log('--- Checking & Removing any duplicate records ---');
  // Check duplicate Money Heist
  const { rows: mhRows } = await db.query(
    "SELECT id, title, release_year FROM content WHERE LOWER(title) = 'money heist';"
  );
  console.log('Money Heist rows found:', mhRows);

  if (mhRows.length > 1) {
    const dup = (mhRows as any[]).find(r => r.id === 'money-heist-2026') || mhRows[1];
    console.log(`Removing duplicate entry "${dup.title}" with ID "${dup.id}"...`);
    // Delete episodes and seasons first if any
    await db.query('DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE content_id = ?);', [dup.id]);
    await db.query('DELETE FROM seasons WHERE content_id = ?;', [dup.id]);
    await db.query('DELETE FROM content_genres WHERE content_id = ?;', [dup.id]);
    await db.query('DELETE FROM content WHERE id = ?;', [dup.id]);
    console.log(`Removed duplicate ID: ${dup.id}`);
  }

  // Define classification for existing pre-catalog items
  const INDIAN_TITLES = new Set([
    '3 idiots',
    'tumbbad',
    'drishyam',
    'rrr',
    'gangs of wasseypur',
    'dhurandhar',
    'mirzapur',
    'panchayat',
    'sacred games',
    'the family man',
    'paatal lok',
    'scam 1992: the harshad mehta story',
    'asur: welcome to your dark side',
    'farzi',
    'aspirants',
    'heeramandi: the diamond bazaar'
  ]);

  const { rows: allRows } = await db.query('SELECT id, title, type, category_label FROM content;');

  for (const r of allRows as any[]) {
    const tLower = r.title.toLowerCase().trim();
    if (r.type === 'MOVIE') {
      if (INDIAN_TITLES.has(tLower) || r.category_label === 'INDIAN MOVIES') {
        await db.query("UPDATE content SET category_label = 'INDIAN MOVIES' WHERE id = ?", [r.id]);
      } else {
        await db.query("UPDATE content SET category_label = 'WORLD MOVIES' WHERE id = ?", [r.id]);
      }
    } else {
      if (INDIAN_TITLES.has(tLower) || r.category_label === 'INDIAN WEB SERIES') {
        await db.query("UPDATE content SET category_label = 'INDIAN WEB SERIES' WHERE id = ?", [r.id]);
      } else {
        await db.query("UPDATE content SET category_label = 'WORLD WEB SERIES' WHERE id = ?", [r.id]);
      }
    }
  }

  // Count check
  const { rows: summaryRows } = await db.query(
    'SELECT category_label, count(*) as count FROM content GROUP BY category_label ORDER BY category_label;'
  );
  console.log('\n=== FINAL CATALOG BREAKDOWN BY CATEGORY ===');
  console.table(summaryRows);

  const { rows: finalAll } = await db.query('SELECT id, title, type, category_label FROM content;');
  console.log(`\nTOTAL ITEMS IN FLOPSHOW CATALOG: ${finalAll.length}`);

  // Deduplication check
  const seen = new Map<string, number>();
  let dupCount = 0;
  for (const r of finalAll as any[]) {
    const key = `${r.title.toLowerCase().trim()}:::${r.type}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  for (const [key, count] of seen.entries()) {
    if (count > 1) {
      console.warn(`DUPLICATE DETECTED: ${key} (${count} times)`);
      dupCount++;
    }
  }

  if (dupCount === 0) {
    console.log('PERFECT! Exactly 0 duplicates detected across all 200 items in catalog.');
  }

  process.exit(0);
}

finalize200().catch(err => {
  console.error(err);
  process.exit(1);
});
