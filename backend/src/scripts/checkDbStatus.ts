/**
 * FLOPSHOW Database Status & Diagnostics Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Inspects whichever database is active (SQLite or PostgreSQL) based on the
 * current environment configuration and reports connection health,
 * schema migration status, and table row counts.
 *
 * USAGE:
 *   npx tsx backend/src/scripts/checkDbStatus.ts
 */

import { config } from '../config/env.js';
import { getAdapter } from '../db/adapter.js';

async function main() {
  console.log('============================================================');
  console.log('FLOPSHOW DATABASE STATUS & DIAGNOSTICS');
  console.log('============================================================');
  console.log(`Configured Mode: ${config.databaseType.toUpperCase()}`);
  console.log(`Environment:     ${config.nodeEnv}`);

  if (config.isPostgres) {
    const maskedUrl = config.databaseUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`PostgreSQL URL:  ${maskedUrl}`);
  } else {
    console.log(`SQLite Path:     ${config.databasePath}`);
  }
  console.log('------------------------------------------------------------');

  const db = getAdapter();

  try {
    // 1. Basic Connectivity Test
    const pingResult = await db.query('SELECT 1 as alive;');
    const isAlive = pingResult.rows.length > 0 && Number(pingResult.rows[0].alive) === 1;
    console.log(`Database Connection: ${isAlive ? '✓ HEALTHY (ONLINE)' : '✗ UNRESPONSIVE'}\n`);

    // 2. Migration Status
    try {
      const { rows: migrations } = await db.query(
        'SELECT version, name, applied_at FROM schema_migrations ORDER BY applied_at ASC;'
      );
      console.log(`Applied Schema Migrations (${migrations.length}):`);
      for (const m of migrations) {
        console.log(`  - [${m.version}] ${m.name} (${m.applied_at})`);
      }
    } catch {
      console.log('  [WARNING] schema_migrations table not found or not initialized.');
    }

    console.log('\nEntity Row Counts:');
    const entities = [
      'users',
      'wallets',
      'wallet_transactions',
      'content',
      'genres',
      'content_genres',
      'seasons',
      'episodes',
      'purchases',
      'watch_progress',
      'my_list',
      'watch_history',
      'media',
      'app_settings',
    ];

    for (const table of entities) {
      try {
        const { rows } = await db.query(`SELECT COUNT(*) as c FROM "${table}";`);
        const count = Number(rows[0]?.c ?? rows[0]?.count ?? 0);
        console.log(`  - ${table.padEnd(22)} : ${count} rows`);
      } catch (err: any) {
        console.log(`  - ${table.padEnd(22)} : [Table missing or query error]`);
      }
    }

    console.log('------------------------------------------------------------');
    console.log('✓ Diagnostic check completed successfully.');
  } catch (err: any) {
    console.error('\n✗ Database check failed:', err.message || err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
