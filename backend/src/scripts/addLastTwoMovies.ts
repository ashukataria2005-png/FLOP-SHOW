import { metadataImportService } from '../services/metadataImportService.js';
import { getAdapter } from '../db/adapter.js';

async function addTwo() {
  const db = getAdapter();

  const twoMovies = [
    {
      title: 'Spider-Man: Into the Spider-Verse',
      year: 2018,
      type: 'MOVIE' as const,
      category: 'WORLD MOVIES',
      language: 'English',
      genres: ['Animation', 'Action', 'Adventure', 'Sci-Fi'],
      rating: 8.4,
      description: 'Teen Miles Morales becomes the new Spider-Man and joins other Spider-Heroes from parallel dimensions to stop a menace to all reality.',
      poster: 'https://m.media-amazon.com/images/M/MV5BMjMwNDkxMTgyNV5BMl5BanBnXkFtZTgwNjkwNTM0NzM@._V1_SX700.jpg',
      backdrop: 'https://images.metahub.space/background/medium/tt4633694/img',
      duration: '1h 57m',
      director: 'Bob Persichetti, Peter Ramsey, Rodney Rothman',
      cast: ['Shameik Moore', 'Jake Johnson', 'Hailee Steinfeld'],
      priceRupees: 10,
      status: 'PUBLISHED' as const
    },
    {
      title: 'Joker',
      year: 2019,
      type: 'MOVIE' as const,
      category: 'WORLD MOVIES',
      language: 'English',
      genres: ['Crime', 'Drama', 'Thriller'],
      rating: 8.4,
      description: 'During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City while becoming an infamous psychopathic crime figure.',
      poster: 'https://m.media-amazon.com/images/M/MV5BNzY3OWQ5NDEtNWQ2OC00ZjdlLThkMmItMDhhNDk3NTFiZGU4XkEyXkFqcGc@._V1_SX700.jpg',
      backdrop: 'https://images.metahub.space/background/medium/tt7286456/img',
      duration: '2h 2m',
      director: 'Todd Phillips',
      cast: ['Joaquin Phoenix', 'Robert De Niro', 'Zazie Beetz'],
      priceRupees: 10,
      status: 'PUBLISHED' as const
    }
  ];

  for (const m of twoMovies) {
    const res = await metadataImportService.importContent({
      ...m,
      releaseYear: m.year
    });
    await db.query('UPDATE content SET category_label = ? WHERE id = ?', ['WORLD MOVIES', res.contentId]);
    console.log(`[ADDED] ${m.title}`);
  }

  const { rows: counts } = await db.query(
    'SELECT category_label, count(*) as count FROM content GROUP BY category_label ORDER BY category_label;'
  );
  console.log('\n=== FINAL CATALOG SUMMARY ===');
  console.table(counts);

  const { rows: total } = await db.query('SELECT count(*) as total FROM content;');
  console.log(`TOTAL CONTENT COUNT: ${total[0].total}`);

  process.exit(0);
}

addTwo().catch(err => {
  console.error(err);
  process.exit(1);
});
