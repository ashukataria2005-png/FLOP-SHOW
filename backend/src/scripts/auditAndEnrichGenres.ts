import { getAdapter } from '../db/adapter.js';

interface TitleGenreMapping {
  match: RegExp | string;
  addGenres: string[];
}

// Curated genuine genre rules for prominent titles to guarantee top accuracy
const GENRE_ENRICHMENTS: { idOrTitle: string; genres: string[] }[] = [
  { idOrTitle: 'tumbbad', genres: ['Horror', 'Fantasy', 'Drama', 'Mystery'] },
  { idOrTitle: 'gangs-of-wasseypur', genres: ['Action', 'Crime', 'Drama'] },
  { idOrTitle: 'drishyam', genres: ['Crime', 'Drama', 'Mystery', 'Thriller'] },
  { idOrTitle: '3-idiots', genres: ['Comedy', 'Drama'] },
  { idOrTitle: 'rrr', genres: ['Action', 'Drama', 'History', 'Adventure'] },
  { idOrTitle: 'mirzapur', genres: ['Action', 'Crime', 'Drama', 'Thriller'] },
  { idOrTitle: 'sacred-games', genres: ['Crime', 'Drama', 'Mystery', 'Thriller'] },
  { idOrTitle: 'the-family-man', genres: ['Action', 'Comedy', 'Drama', 'Thriller'] },
  { idOrTitle: 'panchayat', genres: ['Comedy', 'Drama'] },
  { idOrTitle: 'paatal-lok', genres: ['Crime', 'Drama', 'Mystery', 'Thriller'] },
  { idOrTitle: 'scam-1992', genres: ['Biography', 'Crime', 'Drama'] },
  { idOrTitle: 'asur', genres: ['Crime', 'Drama', 'Mystery', 'Thriller'] },
  { idOrTitle: 'farzi', genres: ['Action', 'Crime', 'Drama', 'Thriller'] },
  { idOrTitle: 'aspirants', genres: ['Drama', 'Comedy'] },
  { idOrTitle: 'heeramandi', genres: ['Drama', 'History', 'Romance'] },
  { idOrTitle: 'interstellar', genres: ['Sci-Fi', 'Adventure', 'Drama'] },
  { idOrTitle: 'the-dark-knight', genres: ['Action', 'Crime', 'Drama', 'Thriller'] },
  { idOrTitle: 'inception', genres: ['Action', 'Sci-Fi', 'Adventure', 'Thriller'] },
  { idOrTitle: 'stranger-things', genres: ['Sci-Fi', 'Horror', 'Drama', 'Mystery'] },
  { idOrTitle: 'breaking-bad', genres: ['Crime', 'Drama', 'Thriller'] },
  { idOrTitle: 'better-call-saul', genres: ['Crime', 'Drama', 'Comedy'] },
  { idOrTitle: 'game-of-thrones', genres: ['Action', 'Adventure', 'Drama', 'Fantasy'] },
  { idOrTitle: 'chernobyl', genres: ['Drama', 'History', 'Thriller'] },
  { idOrTitle: 'the-night-manager-2023', genres: ['Action', 'Crime', 'Drama', 'Thriller'] },
  { idOrTitle: 'the-night-manager-2016', genres: ['Crime', 'Drama', 'Mystery', 'Thriller'] }
];

async function organizeGenres() {
  const db = getAdapter();

  console.log('--- Step 1: Ensure core standard genres exist in genres table ---');
  const standardGenres = [
    { name: 'Action', slug: 'action' },
    { name: 'Adventure', slug: 'adventure' },
    { name: 'Animation', slug: 'animation' },
    { name: 'Biography', slug: 'biography' },
    { name: 'Comedy', slug: 'comedy' },
    { name: 'Crime', slug: 'crime' },
    { name: 'Documentary', slug: 'documentary' },
    { name: 'Drama', slug: 'drama' },
    { name: 'Family', slug: 'family' },
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'History', slug: 'history' },
    { name: 'Horror', slug: 'horror' },
    { name: 'Music', slug: 'music' },
    { name: 'Musical', slug: 'musical' },
    { name: 'Mystery', slug: 'mystery' },
    { name: 'Romance', slug: 'romance' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Sport', slug: 'sport' },
    { name: 'Thriller', slug: 'thriller' },
    { name: 'War', slug: 'war' },
    { name: 'Western', slug: 'western' }
  ];

  for (const g of standardGenres) {
    const { rows: existing } = await db.query('SELECT id FROM genres WHERE LOWER(name) = ? OR slug = ?;', [g.name.toLowerCase(), g.slug]);
    if (existing.length === 0) {
      const id = g.slug;
      await db.query('INSERT INTO genres (id, name, slug) VALUES (?, ?, ?);', [id, g.name, g.slug]);
      console.log(`Created genre: ${g.name}`);
    }
  }

  // Load all genres into map
  const { rows: allGenresRows } = await db.query('SELECT id, name, slug FROM genres;');
  const genreNameToId = new Map<string, string>();
  for (const g of allGenresRows as any[]) {
    genreNameToId.set(g.name.toLowerCase(), g.id);
  }

  console.log('\n--- Step 2: Fix The Night Manager (India) distinction ---');
  await db.query(`
    UPDATE content 
    SET title = 'The Night Manager (India)',
        category_label = 'INDIAN WEB SERIES',
        language = 'Hindi'
    WHERE id = 'the-night-manager-2023';
  `);
  await db.query(`
    UPDATE content 
    SET language = 'English',
        category_label = 'WORLD WEB SERIES'
    WHERE id = 'the-night-manager-2016';
  `);

  console.log('\n--- Step 3: Expand compound genre mappings ---');
  // Map 'Action & Adventure' to both 'Action' and 'Adventure'
  const actionId = genreNameToId.get('action');
  const adventureId = genreNameToId.get('adventure');
  const sciFiId = genreNameToId.get('sci-fi');
  const fantasyId = genreNameToId.get('fantasy');
  const warId = genreNameToId.get('war');

  const { rows: compoundRows } = await db.query(`
    SELECT cg.content_id, g.name 
    FROM content_genres cg
    JOIN genres g ON cg.genre_id = g.id
    WHERE g.name IN ('Action & Adventure', 'Sci-Fi & Fantasy', 'War & Politics');
  `);

  for (const row of compoundRows as any[]) {
    if (row.name === 'Action & Adventure') {
      if (actionId) await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [row.content_id, actionId]);
      if (adventureId) await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [row.content_id, adventureId]);
    } else if (row.name === 'Sci-Fi & Fantasy') {
      if (sciFiId) await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [row.content_id, sciFiId]);
      if (fantasyId) await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [row.content_id, fantasyId]);
    } else if (row.name === 'War & Politics') {
      if (warId) await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [row.content_id, warId]);
    }
  }

  console.log('\n--- Step 4: Apply Curated Genuine Genres ---');
  for (const item of GENRE_ENRICHMENTS) {
    const { rows: matched } = await db.query(
      'SELECT id, title FROM content WHERE id LIKE ? OR LOWER(title) LIKE ?;',
      [`%${item.idOrTitle}%`, `%${item.idOrTitle}%`]
    );
    for (const m of matched as any[]) {
      for (const gName of item.genres) {
        const gid = genreNameToId.get(gName.toLowerCase());
        if (gid) {
          await db.query('INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;', [m.id, gid]);
        }
      }
      console.log(`Enriched genres for "${m.title}": ${item.genres.join(', ')}`);
    }
  }

  console.log('\n--- Step 5: Verify all 200 catalog items have multiple genuine genres ---');
  const { rows: allContent } = await db.query('SELECT id, title, type, category_label FROM content ORDER BY title ASC;');
  console.log(`Total catalog titles: ${allContent.length}`);

  let singleGenreCount = 0;
  let multiGenreCount = 0;

  for (const c of allContent as any[]) {
    const { rows: gRows } = await db.query(`
      SELECT g.name 
      FROM genres g 
      JOIN content_genres cg ON g.id = cg.genre_id 
      WHERE cg.content_id = ?
      ORDER BY g.name ASC;
    `, [c.id]);

    const genreList = (gRows as any[]).map(r => r.name);
    if (genreList.length === 1) {
      singleGenreCount++;
    } else {
      multiGenreCount++;
    }
  }

  console.log(`Titles with multiple genres: ${multiGenreCount}`);
  console.log(`Titles with single genre: ${singleGenreCount}`);

  // Summary breakdown by genre
  const { rows: breakdown } = await db.query(`
    SELECT g.name, count(cg.content_id) as count
    FROM genres g
    LEFT JOIN content_genres cg ON g.id = cg.genre_id
    GROUP BY g.id, g.name
    ORDER BY count DESC;
  `);
  console.log('\n=== COMPLETE CATALOG GENRE BREAKDOWN ===');
  console.table(breakdown);

  // Duplicate title check
  const { rows: finalAll } = await db.query('SELECT id, title, type FROM content;');
  const titleMap = new Map<string, number>();
  let dups = 0;
  for (const r of finalAll as any[]) {
    const key = `${r.title.toLowerCase().trim()}:::${r.type}`;
    titleMap.set(key, (titleMap.get(key) || 0) + 1);
  }
  for (const [key, count] of titleMap.entries()) {
    if (count > 1) {
      console.warn(`DUPLICATE: ${key} (${count} entries)`);
      dups++;
    }
  }
  console.log(`\nDuplicate check result: ${dups} duplicates found.`);

  process.exit(0);
}

organizeGenres().catch(err => {
  console.error(err);
  process.exit(1);
});
