import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { config } from '../config/env.js';
import { getDatabase, runTransaction } from './connection.js';
import { getPostgresSslConfig } from './adapter.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared migration record type
// ─────────────────────────────────────────────────────────────────────────────
interface MigrationResult {
  applied: string[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLite migrator — uses node:sqlite DatabaseSync directly
// ─────────────────────────────────────────────────────────────────────────────
function runSqliteMigrations(): MigrationResult {
  const db: DatabaseSync = getDatabase();

  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(currentDir, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  // Only process numeric SQLite migration files (001_*.sql … etc.)
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && /^\d+_/.test(f))
    .sort();

  const stmt = db.prepare('SELECT version FROM schema_migrations');
  const appliedRows = stmt.all() as { version: string }[];
  const appliedSet = new Set(appliedRows.map(r => r.version));

  const appliedNow: string[] = [];

  for (const file of migrationFiles) {
    const version = file.split('_')[0];
    if (!appliedSet.has(version)) {
      console.log(`[SQLite] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      runTransaction(txDb => {
        txDb.exec(sql);
        txDb.prepare(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);'
        ).run(version, file, new Date().toISOString());
      });

      appliedNow.push(file);
      console.log(`✓ [SQLite] Migration applied: ${file}`);
    }
  }

  if (appliedNow.length === 0) {
    console.log('[SQLite] Schema is already up to date. No new migrations.');
  }

  return { applied: appliedNow, total: migrationFiles.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL migrator — uses pg Pool
// ─────────────────────────────────────────────────────────────────────────────
async function runPostgresMigrations(): Promise<MigrationResult> {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: getPostgresSslConfig(config.databaseUrl, config.isProd),
  });

  const client = await pool.connect();

  try {
    // Ensure migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationsDir = path.join(currentDir, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    // On a fresh PostgreSQL DB, apply the single full schema file.
    // Track version 'pg_full' to avoid re-applying on subsequent restarts.
    const { rows: appliedRows } = await client.query(
      'SELECT version FROM schema_migrations'
    );
    const appliedSet = new Set((appliedRows as { version: string }[]).map(r => r.version));

    const appliedNow: string[] = [];

    const fullSchemaFile = 'postgres_full_schema.sql';
    const fullSchemaVersion = 'pg_full';
    const fullSchemaPath = path.join(migrationsDir, fullSchemaFile);

    if (!appliedSet.has(fullSchemaVersion) && fs.existsSync(fullSchemaPath)) {
      console.log(`[PostgreSQL] Applying full schema: ${fullSchemaFile}...`);
      const sql = fs.readFileSync(fullSchemaPath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3) ON CONFLICT (version) DO NOTHING;',
          [fullSchemaVersion, fullSchemaFile, new Date().toISOString()]
        );
        await client.query('COMMIT');
        appliedNow.push(fullSchemaFile);
        console.log('✓ [PostgreSQL] Full schema applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    } else {
      console.log('[PostgreSQL] Schema is already up to date. No new migrations.');
    }

    return { applied: appliedNow, total: 1 };
  } finally {
    client.release();
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — auto-selects SQLite or PostgreSQL based on config
// ─────────────────────────────────────────────────────────────────────────────

/** Synchronous migration entry point — only valid for SQLite */
export function runMigrations(): { applied: string[]; total: number } {
  if (config.isPostgres) {
    throw new Error(
      '[Migrator] Call runMigrationsAsync() when DATABASE_URL is set for PostgreSQL.'
    );
  }
  return runSqliteMigrations();
}

/** Async migration entry point — works for both SQLite and PostgreSQL */
export async function runMigrationsAsync(): Promise<{ applied: string[]; total: number }> {
  if (config.isPostgres) {
    return runPostgresMigrations();
  }
  return runSqliteMigrations();
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct CLI execution: tsx backend/src/db/migrator.ts
// ─────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('migrator.ts')) {
  runMigrationsAsync()
    .then(result => {
      console.log(`Migrations complete. Applied: ${result.applied.length}/${result.total}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
