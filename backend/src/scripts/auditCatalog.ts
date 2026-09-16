import { getAdapter } from '../db/adapter.js';

async function auditCatalog() {
  const db = getAdapter();
  const { rows } = await db.query(
    'SELECT id, title, type, category_label, release_year, language FROM content ORDER BY type, title;'
  );

  console.log(`Total items in catalog: ${rows.length}`);
  
  const categories: Record<string, any[]> = {
    WORLD_MOVIES: [],
    INDIAN_MOVIES: [],
    WORLD_SERIES: [],
    INDIAN_SERIES: [],
    OTHER: []
  };

  for (const item of rows as any[]) {
    const isMovie = item.type === 'MOVIE';
    const isIndian = ['Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Punjabi', 'Bengali'].includes(item.language) ||
      ['INDIAN MOVIE', 'INDIAN MOVIES', 'INDIAN SERIES', 'INDIAN WEB SERIES'].includes(item.category_label?.toUpperCase());

    if (isMovie) {
      if (isIndian) {
        categories.INDIAN_MOVIES.push(item);
      } else {
        categories.WORLD_MOVIES.push(item);
      }
    } else {
      if (isIndian) {
        categories.INDIAN_SERIES.push(item);
      } else {
        categories.WORLD_SERIES.push(item);
      }
    }
  }

  console.log(`World Movies count: ${categories.WORLD_MOVIES.length}`);
  console.log(`Indian Movies count: ${categories.INDIAN_MOVIES.length}`);
  console.log(`World Series count: ${categories.WORLD_SERIES.length}`);
  console.log(`Indian Series count: ${categories.INDIAN_SERIES.length}`);

  const { rows: dupes } = await db.query(
    'SELECT LOWER(TRIM(title)) as t, type, COUNT(*) as c FROM content GROUP BY LOWER(TRIM(title)), type HAVING COUNT(*) > 1;'
  );
  console.log(`Duplicate records in catalog: ${dupes.length}`);
  if (dupes.length > 0) {
    console.warn('Duplicates:', dupes);
  } else {
    console.log('PASS: 0 duplicate records found in catalog.');
  }

  process.exit(0);
}

auditCatalog().catch(err => {
  console.error(err);
  process.exit(1);
});
