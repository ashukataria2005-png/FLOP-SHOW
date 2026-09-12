import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, runTransaction } from './connection.js';

interface MigrationRecord {
  version: string;
  name: string;
  applied_at: string;
}

/**
 * Migration runner: tracks and applies unapplied SQL migrations.
 */
export function runMigrations(): { applied: string[]; total: number } {
  const db = getDatabase();

  // Ensure migration tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Locate migrations folder
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(currentDir, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  // Fetch already applied migrations
  const stmt = db.prepare('SELECT version FROM schema_migrations');
  const appliedRows = stmt.all() as { version: string }[];
  const appliedSet = new Set(appliedRows.map(row => row.version));

  const appliedNow: string[] = [];

  for (const file of migrationFiles) {
    const version = file.split('_')[0];

    if (!appliedSet.has(version)) {
      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      runTransaction(txDb => {
        txDb.exec(sql);
        const insertStmt = txDb.prepare(`
          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES (?, ?, ?);
        `);
        insertStmt.run(version, file, new Date().toISOString());
      });

      appliedNow.push(file);
      console.log(`✓ Migration applied: ${file}`);
    }
  }

  if (appliedNow.length === 0) {
    console.log('Schema is already up to date. No new migrations.');
  }

  return { applied: appliedNow, total: migrationFiles.length };
}

// Allow direct CLI execution: tsx backend/src/db/migrator.ts
if (process.argv[1] && process.argv[1].endsWith('migrator.ts')) {
  try {
    const result = runMigrations();
    console.log(`Migrations complete. Applied: ${result.applied.length}/${result.total}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
