import { DbAdapter } from './adapter.js';

export interface DefaultSeedItem {
  id: string;
  type: 'MOVIE' | 'SERIES';
  title: string;
  slug: string;
  description: string;
  tagline?: string;
  poster: string;
  backdrop: string;
  releaseYear: number;
  pricePaise: number; // in paise, e.g. 2900 = ₹29, 0 = free
  rating: number;
  duration?: string;
  director?: string;
  cast: string[];
  genres: string[];
  isHero?: boolean;
  featured?: boolean;
  trailerUrl?: string;
  seasons?: Array<{
    seasonNumber: number;
    title: string;
    episodes: Array<{
      episodeNumber: number;
      title: string;
      description: string;
      duration: string;
      durationSeconds: number;
      thumbnail: string;
    }>;
  }>;
}

export const DEFAULT_CATALOG: DefaultSeedItem[] = [
  {
    id: 'inception-2010',
    type: 'MOVIE',
    title: 'Inception',
    slug: 'inception-2010',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.',
    tagline: 'Your mind is the scene of the crime.',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/YoHD9XEInc0/maxresdefault.jpg',
    releaseYear: 2010,
    pricePaise: 2900,
    rating: 8.8,
    duration: '2h 28m',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy', 'Ken Watanabe', 'Michael Caine'],
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    isHero: true,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0'
  },
  {
    id: 'tumbbad-2018',
    type: 'MOVIE',
    title: 'Tumbbad',
    slug: 'tumbbad-2018',
    description: 'A mythological story about a goddess who created the entire universe. The plot revolves around the consequences when humans build a temple for her first-born monster Hastar to gain limitless wealth.',
    tagline: 'Fear has a new address.',
    poster: 'https://m.media-amazon.com/images/M/MV5BOTY0YzY3MTMtOWQ5Yi00ODY2LThhOGMtMzFlMjhlODcxOGU1XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/sN75MPxgvX8/hqdefault.jpg',
    releaseYear: 2018,
    pricePaise: 2900,
    rating: 8.2,
    duration: '1h 44m',
    director: 'Rahi Anil Barve, Anand Gandhi',
    cast: ['Sohum Shah', 'Jyoti Malshe', 'Anita Date-Kelkar', 'Ronjini Chakraborty'],
    genres: ['Fantasy', 'Horror', 'Drama', 'Mystery'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=sN75MPxgvX8'
  },
  {
    id: 'gangs-of-wasseypur-2012',
    type: 'MOVIE',
    title: 'Gangs of Wasseypur',
    slug: 'gangs-of-wasseypur-2012',
    description: 'A clash between Sultan and Shahid Khan leads to the expulsion of Khan from Wasseypur, and ignites a deadly, multi-generational blood feud spanning over six decades.',
    tagline: 'Vengeance is a full-time job.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQyMmJkYTItNDUyYS00MjgwLWFmYjUtOWQ1NmRjOGZlOTZhXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/j-AkWDkXcZU/hqdefault.jpg',
    releaseYear: 2012,
    pricePaise: 2900,
    rating: 8.2,
    duration: '5h 21m',
    director: 'Anurag Kashyap',
    cast: ['Manoj Bajpayee', 'Nawazuddin Siddiqui', 'Richa Chadha', 'Huma Qureshi', 'Pankaj Tripathi', 'Tigmanshu Dhulia'],
    genres: ['Crime', 'Action', 'Drama'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=j-AkWDkXcZU'
  },
  {
    id: '3-idiots-2009',
    type: 'MOVIE',
    title: '3 Idiots',
    slug: '3-idiots-2009',
    description: 'Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently, even as the rest of the world called them idiots.',
    tagline: 'Chase excellence, and success will follow.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNzc4ZWQ3NmYtODE0Ny00YTQ4LTlkZWItNTBkMGQ0MmUwMmJlXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/K0eDlFX9GMc/maxresdefault.jpg',
    releaseYear: 2009,
    pricePaise: 2900,
    rating: 8.4,
    duration: '2h 50m',
    director: 'Rajkumar Hirani',
    cast: ['Aamir Khan', 'R. Madhavan', 'Sharman Joshi', 'Kareena Kapoor', 'Boman Irani'],
    genres: ['Comedy', 'Drama', 'Romance'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=K0eDlFX9GMc'
  },
  {
    id: 'drishyam-2015',
    type: 'MOVIE',
    title: 'Drishyam',
    slug: 'drishyam-2015',
    description: 'Desperate measures are taken by a man who tries to save his family from the dark side of the law, after they commit an unexpected crime defending their home.',
    tagline: 'Visuals can be deceptive.',
    poster: 'https://m.media-amazon.com/images/M/MV5BYjMzZTU0NzUtZGQ0MC00Y2M4LWI5ZDUtZjY1YmNjMjNmNmI3XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/AuuX2j14NBg/hqdefault.jpg',
    releaseYear: 2015,
    pricePaise: 2900,
    rating: 8.2,
    duration: '2h 43m',
    director: 'Nishikant Kamat',
    cast: ['Ajay Devgn', 'Tabu', 'Shriya Saran', 'Rajat Kapoor', 'Ishita Dutta'],
    genres: ['Crime', 'Drama', 'Mystery', 'Thriller'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=AuuX2j14NBg'
  },
  {
    id: 'rrr-2022',
    type: 'MOVIE',
    title: 'RRR',
    slug: 'rrr-2022',
    description: 'A fearless revolutionary and an officer in the British force, who once shared a deep bond, decide to join forces and chart out an inspiring path of freedom against the despotic rulers.',
    tagline: 'Rise. Roar. Revolt.',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWMwODYyMjQtMTczMi00NTQ1LWFkYjItMGJhMWRkY2E3NDAyXkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/NgBoMJy386M/maxresdefault.jpg',
    releaseYear: 2022,
    pricePaise: 3900,
    rating: 7.8,
    duration: '3h 7m',
    director: 'S.S. Rajamouli',
    cast: ['N.T. Rama Rao Jr.', 'Ram Charan', 'Ajay Devgn', 'Alia Bhatt', 'Shriya Saran'],
    genres: ['Action', 'Drama', 'History'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=NgBoMJy386M'
  },
  {
    id: 'interstellar-2014',
    type: 'MOVIE',
    title: 'Interstellar',
    slug: 'interstellar-2014',
    description: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/zSWdZVtXT7E/maxresdefault.jpg',
    releaseYear: 2014,
    pricePaise: 2900,
    rating: 8.7,
    duration: '2h 49m',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine', 'Matt Damon'],
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E'
  },
  {
    id: 'the-dark-knight-2008',
    type: 'MOVIE',
    title: 'The Dark Knight',
    slug: 'the-dark-knight-2008',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    tagline: 'Why so serious?',
    poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/EXeTwQWrcwY/maxresdefault.jpg',
    releaseYear: 2008,
    pricePaise: 2900,
    rating: 9.0,
    duration: '2h 32m',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine', 'Gary Oldman', 'Morgan Freeman'],
    genres: ['Action', 'Crime', 'Drama'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=EXeTwQWrcwY'
  },
  {
    id: 'oppenheimer-2023',
    type: 'MOVIE',
    title: 'Oppenheimer',
    slug: 'oppenheimer-2023',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    tagline: 'The world forever changes.',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_.jpg',
    backdrop: 'https://img.youtube.com/vi/uYPbbksJxIg/maxresdefault.jpg',
    releaseYear: 2023,
    pricePaise: 3900,
    rating: 8.9,
    duration: '3h 0m',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
    genres: ['Biography', 'Drama', 'History'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg'
  },
  {
    id: 'breaking-bad',
    type: 'SERIES',
    title: 'Breaking Bad',
    slug: 'breaking-bad',
    description: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family’s financial future.',
    tagline: 'Change the equation.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg',
    backdrop: 'https://img.youtube.com/vi/HhesaQXLuRY/maxresdefault.jpg',
    releaseYear: 2008,
    pricePaise: 4900,
    rating: 9.5,
    duration: '5 Seasons',
    director: 'Vince Gilligan',
    cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Dean Norris', 'Betsy Brandt', 'RJ Mitte'],
    genres: ['Crime', 'Drama', 'Thriller'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            episodeNumber: 1,
            title: 'Pilot',
            description: 'Diagnosed with terminal lung cancer, chemistry teacher Walter White teams up with former student Jesse Pinkman to manufacture and sell crystal meth.',
            duration: '58m',
            durationSeconds: 3480,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg'
          },
          {
            episodeNumber: 2,
            title: "Cat's in the Bag...",
            description: 'Walt and Jesse attempt to dispose of two bodies, which turns out to be more difficult than anticipated.',
            duration: '48m',
            durationSeconds: 2880,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg'
          },
          {
            episodeNumber: 3,
            title: "...And the Bag's in the River",
            description: 'Walt is left to deal with Krazy-8 alone while Jesse cleans up the gruesome aftermath in the basement.',
            duration: '48m',
            durationSeconds: 2880,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg'
          }
        ]
      }
    ]
  },
  {
    id: 'mirzapur',
    type: 'SERIES',
    title: 'Mirzapur',
    slug: 'mirzapur',
    description: 'A shocking incident at a wedding procession ignites a series of events entangling two families in the lawless city of Mirzapur, where drugs, guns, and power dictate survival.',
    tagline: 'Bhaukaal barabar bana rahega.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/619/1549499.jpg',
    backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/176/441459.jpg',
    releaseYear: 2018,
    pricePaise: 4900,
    rating: 8.5,
    duration: '3 Seasons',
    director: 'Karan Anshuman, Gurmmeet Singh',
    cast: ['Pankaj Tripathi', 'Ali Fazal', 'Divyenndu', 'Shweta Tripathi', 'Rasika Dugal', 'Harshita Gaur'],
    genres: ['Action', 'Crime', 'Drama'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=ZNeGF-PvRHY',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            episodeNumber: 1,
            title: 'Jhol-Jhaal',
            description: 'Akhandanand Tripathi is a carpet exporter and the mafia don of Mirzapur. His son Munna is an unworthy, power-hungry heir.',
            duration: '46m',
            durationSeconds: 2760,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/619/1549499.jpg'
          },
          {
            episodeNumber: 2,
            title: 'Guddu',
            description: 'Guddu and Bablu make a fateful decision that pulls their entire family into the heart of Mirzapur underworld.',
            duration: '43m',
            durationSeconds: 2580,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/619/1549499.jpg'
          }
        ]
      }
    ]
  },
  {
    id: 'the-family-man',
    type: 'SERIES',
    title: 'The Family Man',
    slug: 'the-family-man',
    description: 'A working class man secretly works as a senior analyst in the National Investigation Agency, while juggling secretive undercover counter-terrorism missions with mundane suburban family life.',
    tagline: 'Middle class guy, world-class spy.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/599/1498893.jpg',
    backdrop: 'https://img.youtube.com/vi/NGf_B81Kr2g/hqdefault.jpg',
    releaseYear: 2019,
    pricePaise: 4900,
    rating: 8.7,
    duration: '2 Seasons',
    director: 'Raj & DK',
    cast: ['Manoj Bajpayee', 'Priyamani', 'Sharib Hashmi', 'Samantha Ruth Prabhu', 'Neeraj Madhav'],
    genres: ['Action', 'Comedy', 'Drama', 'Thriller'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=NGf_B81Kr2g',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            episodeNumber: 1,
            title: 'The Rook',
            description: 'Srikant Tiwari investigates a chemical attack plot while concealing his high-stakes undercover job from his wife and children.',
            duration: '49m',
            durationSeconds: 2940,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/599/1498893.jpg'
          }
        ]
      }
    ]
  },
  {
    id: 'panchayat',
    type: 'SERIES',
    title: 'Panchayat',
    slug: 'panchayat',
    description: 'An engineering graduate, for lack of a better job option, joins as secretary of a Panchayat office in a remote fictional village of Phulera, Uttar Pradesh.',
    tagline: 'Life in Phulera.',
    poster: 'https://static.tvmaze.com/uploads/images/original_untouched/517/1293627.jpg',
    backdrop: 'https://img.youtube.com/vi/mojZJ7oeD_g/maxresdefault.jpg',
    releaseYear: 2020,
    pricePaise: 3900,
    rating: 8.9,
    duration: '3 Seasons',
    director: 'Deepak Kumar Mishra',
    cast: ['Jitendra Kumar', 'Neena Gupta', 'Raghubir Yadav', 'Faisal Malik', 'Chandan Roy'],
    genres: ['Comedy', 'Drama'],
    isHero: false,
    featured: true,
    trailerUrl: 'https://www.youtube.com/watch?v=mojZJ7oeD_g',
    seasons: [
      {
        seasonNumber: 1,
        title: 'Season 1',
        episodes: [
          {
            episodeNumber: 1,
            title: 'Gram Panchayat Phulera',
            description: 'Abhishek Tripathi arrives in Phulera reluctantly, and immediately faces the comical absurdities of village bureaucracy.',
            duration: '35m',
            durationSeconds: 2100,
            thumbnail: 'https://static.tvmaze.com/uploads/images/original_untouched/517/1293627.jpg'
          }
        ]
      }
    ]
  }
];

export async function seedDefaultCatalogIfEmpty(db: DbAdapter): Promise<number> {
  const { rows: countRows } = await db.query('SELECT COUNT(*) as c FROM content');
  const count = Number((countRows[0] as any)?.c ?? (countRows[0] as any)?.count ?? 0);

  if (count > 0) {
    return 0; // Already has content, skip
  }

  console.log('[CatalogSeeder] Fresh/Empty database detected! Seeding premier catalog titles and hero banner...');
  const now = new Date().toISOString();
  let inserted = 0;

  for (const item of DEFAULT_CATALOG) {
    try {
      // 1. Insert content record
      await db.run(
        `INSERT INTO content (
          id, type, title, slug, description, tagline, poster, backdrop,
          release_year, price, rating, duration, director, cast_json,
          status, is_hero, featured, trailer_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING;`,
        [
          item.id,
          item.type,
          item.title,
          item.slug,
          item.description,
          item.tagline || '',
          item.poster,
          item.backdrop,
          item.releaseYear,
          item.pricePaise,
          item.rating,
          item.duration || '',
          item.director || '',
          JSON.stringify(item.cast),
          'PUBLISHED',
          item.isHero ? 1 : 0,
          item.featured ? 1 : 0,
          item.trailerUrl || null,
          now,
          now
        ]
      );

      // 2. Link genres
      for (const gName of item.genres) {
        const slug = gName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let { rows: gRows } = await db.query(
          'SELECT id FROM genres WHERE LOWER(name) = LOWER(?) OR slug = ?',
          [gName, slug]
        );
        let genreId = (gRows[0] as any)?.id;
        if (!genreId) {
          genreId = `genre-${slug}`;
          await db.run(
            'INSERT INTO genres (id, name, slug) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING;',
            [genreId, gName, slug]
          );
        }
        await db.run(
          'INSERT INTO content_genres (content_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING;',
          [item.id, genreId]
        );
      }

      // 3. Attach trailer to media table for universal playback
      if (item.trailerUrl) {
        const mediaId = `med-trailer-${item.id}`;
        await db.run(
          `INSERT INTO media (
            id, content_id, media_type, source_type, url, mime_type,
            title, thumbnail, is_active, media_provider, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING;`,
          [
            mediaId,
            item.id,
            'TRAILER',
            'YOUTUBE',
            item.trailerUrl,
            'video/youtube',
            `${item.title} — Official Trailer`,
            item.backdrop || item.poster,
            1,
            'YOUTUBE',
            now,
            now
          ]
        );
      }

      // 4. Seasons and episodes if series
      if (item.type === 'SERIES' && item.seasons) {
        for (const s of item.seasons) {
          const seasonId = `season-${item.id}-${s.seasonNumber}`;
          await db.run(
            `INSERT INTO seasons (id, content_id, season_number, title, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO NOTHING;`,
            [seasonId, item.id, s.seasonNumber, s.title, now, now]
          );

          for (const ep of s.episodes) {
            const epId = `ep-${item.id}-s${s.seasonNumber}-e${ep.episodeNumber}`;
            await db.run(
              `INSERT INTO episodes (
                id, season_id, episode_number, title, description,
                duration, duration_seconds, thumbnail, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (id) DO NOTHING;`,
              [
                epId,
                seasonId,
                ep.episodeNumber,
                ep.title,
                ep.description,
                ep.duration,
                ep.durationSeconds,
                ep.thumbnail,
                now,
                now
              ]
            );
          }
        }
      }

      inserted++;
    } catch (err: any) {
      console.warn(`[CatalogSeeder] Error seeding "${item.title}":`, err?.message || err);
    }
  }

  // 5. Set default hero banner and spotlights in app_settings
  await db.run(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('home_hero_id', 'inception-2010', ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
    [now]
  );

  const spotlightIds = JSON.stringify(['tumbbad-2018', 'rrr-2022', 'breaking-bad', 'mirzapur']);
  await db.run(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('cinematic_spotlight_ids', ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
    [spotlightIds, now]
  );

  await db.run(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('cinematic_spotlight_id', 'tumbbad-2018', ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;`,
    [now]
  );

  console.log(`[CatalogSeeder] ✓ Successfully populated ${inserted} premier titles into catalog!`);
  return inserted;
}
