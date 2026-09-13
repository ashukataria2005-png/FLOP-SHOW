/**
 * FLOPSHOW Direct SQLite → PostgreSQL Data Migrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrates all data from local SQLite directly into a PostgreSQL target
 * without requiring the external `psql` command-line utility.
 *
 * USAGE:
 *   DATABASE_URL="postgresql://user:pass@host/db" npx tsx backend/src/scripts/migrateDataToPostgres.ts
 *   Add --dry-run to test and preview without modifying the PostgreSQL target:
 *   npx tsx backend/src/scripts/migrateDataToPostgres.ts --dry-run
 *
 * SAFETY:
 *   - Completely read-only on the source SQLite database.
 *   - Uses ON CONFLICT DO NOTHING — safe to re-run anytime.
 *   - Preserves all IDs, relationships, and timestamps.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import pg from 'pg';
import { config } from '../config/env.js';
import { getPostgresSslConfig } from '../db/adapter.js';
import { runMigrationsAsync } from '../db/migrator.js';

const TABLES_IN_ORDER = [
  'schema_migrations',
  'genres',
  'app_settings',
  'users',
  'wallets',
  'wallet_transactions',
  'content',
  'content_genres',
  'seasons',
  'episodes',
  'purchases',
  'my_list',
  'watch_progress',
  'watch_history',
  'media',
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('============================================================');
  console.log('FLOPSHOW SQLite → PostgreSQL Data Migration');
  console.log('============================================================');
  if (isDryRun) {
    console.log('[MODE] DRY-RUN ONLY — no changes will be made to PostgreSQL.');
  }

  // 1. Verify SQLite source
  const sqlitePath = config.databasePath;
  if (!fs.existsSync(sqlitePath)) {
    console.error(`[ERROR] Source SQLite database not found at: ${sqlitePath}`);
    process.exit(1);
  }
  console.log(`[Source] SQLite: ${sqlitePath}`);

  // 2. Verify PostgreSQL target
  const targetUrl = config.databaseUrl;
  if (!targetUrl || (!targetUrl.startsWith('postgres://') && !targetUrl.startsWith('postgresql://'))) {
    console.error('[ERROR] DATABASE_URL is not configured with a valid PostgreSQL URL.');
    console.error('        Example: DATABASE_URL="postgresql://user:pass@host/db"');
    process.exit(1);
  }
  // Mask credentials for safe logging
  const maskedUrl = targetUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Target] PostgreSQL: ${maskedUrl}`);
  console.log('------------------------------------------------------------');

  const sqliteDb = new DatabaseSync(sqlitePath);

  const pool = new pg.Pool({
    connectionString: targetUrl,
    ssl: getPostgresSslConfig(targetUrl, config.isProd),
    max: 5,
    connectionTimeoutMillis: 10_000,
  });

  const pgClient = await pool.connect();

  try {
    // 3. Ensure schema exists on PostgreSQL
    console.log('Ensuring PostgreSQL schema is initialized...');
    if (!isDryRun) {
      await runMigrationsAsync();
    }
    console.log('✓ Schema ready.\n');

    let totalMigrated = 0;

    for (const table of TABLES_IN_ORDER) {
      let rows: any[] = [];
      try {
        rows = sqliteDb.prepare(`SELECT * FROM "${table}"`).all() as any[];
      } catch {
        console.log(`  [SKIP] Table "${table}" does not exist in SQLite.`);
        continue;
      }

      if (rows.length === 0) {
        console.log(`  Table "${table}": 0 rows (empty)`);
        continue;
      }

      console.log(`  Migrating "${table}": ${rows.length} rows...`);

      if (!isDryRun) {
        // Insert rows in batches of 50
        const batchSize = 50;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          for (const row of batch) {
            const cols = Object.keys(row);
            const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
            const values = Object.values(row);
            const query = `
              INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING;
            `;
            await pgClient.query(query, values);
          }
        }
      }

      totalMigrated += rows.length;
      console.log(`  ✓ Table "${table}" completed.`);
    }

    console.log('------------------------------------------------------------');
    console.log(`✓ Migration finished: ${totalMigrated} total rows processed across ${TABLES_IN_ORDER.length} tables.`);
    if (isDryRun) {
      console.log('[DRY-RUN] No rows were written. Remove --dry-run to apply.');
    }
  } finally {
    sqliteDb.close();
    pgClient.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n[FATAL] Migration failed:', err);
  process.exit(1);
});
