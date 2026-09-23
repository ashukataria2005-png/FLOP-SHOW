import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getAdapter } from './adapter.js';
import { config } from '../config/env.js';
import { adminAccountService } from '../services/adminAccountService.js';

export interface SeedReport {
  genresCount: number;
  contentCount: number;
  seasonsCount: number;
  episodesCount: number;
  adminCreated: boolean;
  adminEmail?: string;
  adminGeneratedPassword?: string;
}

/**
 * Clean Database Seeder:
 * Seeds standard taxonomy genres and ensures administrator account exists.
 * Does NOT insert any hardcoded sample/testing movies or series.
 * Catalog content is exclusively added by administrator via Admin Panel / Quick Add.
 *
 * Works with both SQLite (local) and PostgreSQL (production) via the unified adapter.
 */
export async function seedDatabase(): Promise<SeedReport> {
  const db = getAdapter();
  const now = new Date().toISOString();

  let adminCreated = false;
  let adminEmail: string | undefined;
  let adminGeneratedPassword: string | undefined;

  await db.transaction(async txDb => {
    // ------------------------------------------------------------------------
    // 1. SEED STANDARD GENRES TAXONOMY
    // ------------------------------------------------------------------------
    const genres = [
      { id: 'genre-drama', name: 'Drama', slug: 'drama' },
      { id: 'genre-indie', name: 'Indie', slug: 'indie' },
      { id: 'genre-mystery', name: 'Mystery', slug: 'mystery' },
      { id: 'genre-thriller', name: 'Thriller', slug: 'thriller' },
      { id: 'genre-crime', name: 'Crime', slug: 'crime' },
      { id: 'genre-scifi', name: 'Sci-Fi', slug: 'sci-fi' },
      { id: 'genre-documentary', name: 'Documentary', slug: 'documentary' },
      { id: 'genre-nature', name: 'Nature', slug: 'nature' },
      { id: 'genre-action', name: 'Action', slug: 'action' },
      { id: 'genre-romance', name: 'Romance', slug: 'romance' },
      { id: 'genre-comedy', name: 'Comedy', slug: 'comedy' },
      { id: 'genre-adventure', name: 'Adventure', slug: 'adventure' },
      { id: 'genre-biography', name: 'Biography', slug: 'biography' },
      { id: 'genre-history', name: 'History', slug: 'history' },
    ];

    for (const g of genres) {
      await txDb.run(
        `INSERT INTO genres (id, name, slug) VALUES (?, ?, ?)
         ON CONFLICT (id) DO NOTHING;`,
        [g.id, g.name, g.slug]
      );
    }

    // ------------------------------------------------------------------------
    // 2. ENSURE CANONICAL ADMINISTRATOR (Preserves intended administrator)
    // ------------------------------------------------------------------------
    const cleanupRes = await adminAccountService.ensureSingleAdminAccount();
    adminCreated = true;
    adminEmail = cleanupRes.adminEmail;
  });



  // Query counts to verify
  const { rows: gcRows } = await db.query('SELECT COUNT(*) as c FROM genres');
  const { rows: ccRows } = await db.query('SELECT COUNT(*) as c FROM content');
  const { rows: scRows } = await db.query('SELECT COUNT(*) as c FROM seasons');
  const { rows: ecRows } = await db.query('SELECT COUNT(*) as c FROM episodes');

  const getCount = (row: any) => Number(row?.c ?? row?.count ?? 0);

  return {
    genresCount: getCount(gcRows[0]),
    contentCount: getCount(ccRows[0]),
    seasonsCount: getCount(scRows[0]),
    episodesCount: getCount(ecRows[0]),
    adminCreated,
    adminEmail: config.devAdminEmail,
    adminGeneratedPassword,
  };
}

// Allow direct CLI execution: tsx backend/src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(report => {
      console.log('✓ Database initialized successfully (without sample catalog):');
      console.log(`  - Genres: ${report.genresCount}`);
      console.log(`  - Content: ${report.contentCount}`);
      console.log(`  - Seasons: ${report.seasonsCount}`);
      console.log(`  - Episodes: ${report.episodesCount}`);
      console.log(`  - Admin user ready: ${report.adminCreated} (${report.adminEmail})`);
      if (report.adminGeneratedPassword) {
        console.log(`  - Temporary admin password: ${report.adminGeneratedPassword}`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Database seeding failed:', err);
      process.exit(1);
    });
}
