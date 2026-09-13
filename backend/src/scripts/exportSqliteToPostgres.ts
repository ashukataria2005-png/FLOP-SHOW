/**
 * FLOPSHOW SQLite → PostgreSQL Data Migration Script
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE:
 *   Exports ALL production data from a local SQLite database and generates
 *   PostgreSQL-compatible INSERT statements to stdout.
 *
 * USAGE:
 *   1. Run locally (where SQLite DB exists):
 *      npx tsx backend/src/scripts/exportSqliteToPostgres.ts > export.sql
 *
 *   2. Import to your PostgreSQL database:
 *      psql "$DATABASE_URL" < export.sql
 *
 * SAFETY:
 *   - READ-ONLY: never modifies the SQLite database.
 *   - Uses `ON CONFLICT DO NOTHING` — safe to run multiple times.
 *   - Exports tables in correct foreign-key dependency order.
 *
 * TABLES EXPORTED (in dependency order):
 *   schema_migrations → genres → app_settings → users → wallets →
 *   wallet_transactions → content → content_genres → seasons → episodes →
 *   purchases → my_list → watch_progress → watch_history → media
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import { config } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapePostgresString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return escapePostgresString(String(value));
}

function rowToInsert(table: string, row: Record<string, any>): string {
  const cols = Object.keys(row).join(', ');
  const vals = Object.values(row).map(formatValue).join(', ');
  return `INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`;
}

function exportTable(db: DatabaseSync, table: string): string[] {
  let rows: any[];
  try {
    rows = db.prepare(`SELECT * FROM "${table}"`).all() as any[];
  } catch {
    console.error(`[WARN] Table "${table}" not found or could not be read, skipping.`);
    return [];
  }

  if (rows.length === 0) return [];
  return rows.map(row => rowToInsert(table, row));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const dbPath = config.databasePath;

  if (!fs.existsSync(dbPath)) {
    process.stderr.write(`[ERROR] SQLite database not found at: ${dbPath}\n`);
    process.stderr.write(`[HINT]  Set DATABASE_URL="" and SQLITE_PATH or run locally where the DB file exists.\n`);
    process.exit(1);
  }

  process.stderr.write(`[Export] Reading SQLite database: ${dbPath}\n`);
  const db = new DatabaseSync(dbPath);

  // Tables in foreign-key dependency order
  const tables = [
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

  process.stdout.write('-- ============================================================\n');
  process.stdout.write(`-- FLOPSHOW SQLite → PostgreSQL Export\n`);
  process.stdout.write(`-- Generated: ${new Date().toISOString()}\n`);
  process.stdout.write(`-- Source: ${dbPath}\n`);
  process.stdout.write('-- ============================================================\n\n');

  // Temporarily disable trigger checks for clean bulk import
  process.stdout.write('SET session_replication_role = replica;\n\n');

  let totalRows = 0;

  for (const table of tables) {
    const inserts = exportTable(db, table);
    process.stdout.write(`-- Table: ${table} (${inserts.length} rows)\n`);
    for (const stmt of inserts) {
      process.stdout.write(stmt + '\n');
    }
    process.stdout.write('\n');
    totalRows += inserts.length;
  }

  process.stdout.write('-- Re-enable triggers\n');
  process.stdout.write('SET session_replication_role = DEFAULT;\n\n');
  process.stdout.write(`-- Export complete. Total rows: ${totalRows}\n`);

  db.close();

  process.stderr.write(`\n[Export complete] ${totalRows} rows from ${tables.length} tables exported.\n`);
  process.stderr.write(`[Next step]  psql "$DATABASE_URL" < export.sql\n`);
}

main();
