import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

function exportMovies() {
  const db = new DatabaseSync(path.resolve('backend/data/flopshow.db'));
  const movies = db.prepare(`
    SELECT c.*,
           (SELECT GROUP_CONCAT(g.name, '||')
            FROM genres g
            JOIN content_genres cg ON g.id = cg.genre_id
            WHERE cg.content_id = c.id) as genres_str
    FROM content c
    WHERE UPPER(c.type) = 'MOVIE'
    ORDER BY c.title ASC;
  `).all() as any[];

  console.log(`Found ${movies.length} movies in SQLite.`);

  const frontendMovies = movies.map(m => {
    let cast: string[] = [];
    try {
      cast = JSON.parse(m.cast_json || '[]');
    } catch {
      cast = [];
    }

    const genres = m.genres_str ? m.genres_str.split('||').filter(Boolean) : [];
    const priceRupees = m.price ? Math.round(m.price / 100) : 0;

    return {
      id: m.id,
      title: m.title,
      type: 'movie',
      backdropUrl: m.backdrop,
      bannerUrl: m.backdrop,
      posterUrl: m.poster,
      tagline: m.tagline || undefined,
      description: m.description,
      about: m.about || m.description,
      rating: m.rating ?? 8.0,
      releaseYear: m.release_year ?? 2024,
      runtime: m.duration || '2h 05m',
      language: m.language || 'Hindi',
      genres,
      categories: genres,
      price: priceRupees,
      customPrice: null,
      isNow: true,
      isFree: priceRupees === 0,
      isFeatured: Boolean(m.featured),
      isHero: Boolean(m.is_hero),
      categoryLabel: m.category_label || 'WORLD MOVIES',
      director: m.director || 'Acclaimed Director',
      cast,
      trailerUrl: m.trailer_url || '',
      videoUrl: m.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      trendingPosition: m.trending_position ?? undefined,
      displayPriority: m.display_priority ?? 0,
      status: 'PUBLISHED'
    };
  });

  const fileContent = `import { ContentItem } from '../types/content';

/**
 * FLOPSHOW POPULAR MOVIES CATALOG
 * Complete collection of top Indian and Global cinema with high-res key-art,
 * accurate runtimes, cast, synopsis, and metadata.
 */
export const POPULAR_MOVIES_CATALOG: ContentItem[] = ${JSON.stringify(frontendMovies, null, 2)};
`;

  const targetPath = path.resolve('src/data/movies.ts');
  fs.writeFileSync(targetPath, fileContent, 'utf-8');
  console.log(`Successfully wrote ${frontendMovies.length} movies to ${targetPath}!`);

  db.close();
}

exportMovies();
