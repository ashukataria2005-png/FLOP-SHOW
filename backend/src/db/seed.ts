import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase, runTransaction } from './connection.js';
import { config } from '../config/env.js';

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
 */
export function seedDatabase(): SeedReport {
  const db = getDatabase();
  const now = new Date().toISOString();

  let adminCreated = false;
  let adminGeneratedPassword: string | undefined;

  runTransaction(txDb => {
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
      { id: 'genre-history', name: 'History', slug: 'history' }
    ];

    const insertGenre = txDb.prepare(`
      INSERT OR IGNORE INTO genres (id, name, slug)
      VALUES (?, ?, ?);
    `);

    for (const g of genres) {
      insertGenre.run(g.id, g.name, g.slug);
    }

    // ------------------------------------------------------------------------
    // 2. SEED ADMIN ACCOUNT (SAFE MECHANISM)
    // ------------------------------------------------------------------------
    let adminPassword = config.devAdminPassword;

    if (!adminPassword) {
      // Auto-generate a random secure development password if not specified
      adminGeneratedPassword = crypto.randomBytes(12).toString('base64url') + '!A1';
      adminPassword = adminGeneratedPassword;
      console.log('------------------------------------------------------------');
      console.log('NOTICE: DEV_ADMIN_PASSWORD was not specified.');
      console.log(`Generated development admin password: ${adminGeneratedPassword}`);
      console.log('------------------------------------------------------------');
    }

    const adminSalt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync(adminPassword, adminSalt);
    const adminEmail = config.devAdminEmail.toLowerCase().trim();
    const adminId = 'admin-dev-01';

    const insertAdmin = txDb.prepare(`
      INSERT OR IGNORE INTO users (
        id, name, email, password_hash, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?);
    `);
    insertAdmin.run(adminId, 'FLOPSHOW System Admin', adminEmail, adminPasswordHash, now, now);

    const insertAdminWallet = txDb.prepare(`
      INSERT OR IGNORE INTO wallets (user_id, balance, updated_at)
      VALUES (?, 0, ?);
    `);
    insertAdminWallet.run(adminId, now);

    adminCreated = true;
  });

  // Query counts to verify
  const genresCount = (db.prepare('SELECT COUNT(*) as c FROM genres').get() as { c: number }).c;
  const contentCount = (db.prepare('SELECT COUNT(*) as c FROM content').get() as { c: number }).c;
  const seasonsCount = (db.prepare('SELECT COUNT(*) as c FROM seasons').get() as { c: number }).c;
  const episodesCount = (db.prepare('SELECT COUNT(*) as c FROM episodes').get() as { c: number }).c;

  return {
    genresCount,
    contentCount,
    seasonsCount,
    episodesCount,
    adminCreated,
    adminEmail: config.devAdminEmail,
    adminGeneratedPassword
  };
}

// Allow direct CLI execution: tsx backend/src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  try {
    const report = seedDatabase();
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
  } catch (err) {
    console.error('Database seeding failed:', err);
    process.exit(1);
  }
}
