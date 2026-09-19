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
      console.log('[PostgreSQL] Full schema already applied. Checking incremental migrations...');
    }

    // Apply incremental 006_upi_payment_requests for PostgreSQL if not already applied
    const upiMigrationVersion = '006_upi_payment_requests';
    if (!appliedSet.has(upiMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 006_upi_payment_requests...');
      await client.query('BEGIN');
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS upi_payment_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_name TEXT,
            user_email TEXT,
            amount INTEGER NOT NULL CHECK(amount > 0),
            upi_id_snapshot TEXT NOT NULL,
            utr TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
            admin_id TEXT,
            admin_note TEXT,
            submitted_at TEXT NOT NULL,
            processed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_upi_payment_status ON upi_payment_requests(status);
          CREATE INDEX IF NOT EXISTS idx_upi_payment_user ON upi_payment_requests(user_id);
          CREATE INDEX IF NOT EXISTS idx_upi_payment_utr ON upi_payment_requests(utr);
          CREATE UNIQUE INDEX IF NOT EXISTS uq_upi_approved_utr ON upi_payment_requests(utr) WHERE status = 'APPROVED';

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('payment_upi_id', 'flopshow@upi', NOW()::TEXT),
            ('payment_upi_enabled', 'true', NOW()::TEXT),
            ('payment_upi_merchant_name', 'FLOPSHOW', NOW()::TEXT)
          ON CONFLICT (key) DO NOTHING;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${upiMigrationVersion}', '006_upi_payment_requests.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('006_upi_payment_requests.sql');
        console.log('✓ [PostgreSQL] Migration 006_upi_payment_requests applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 007_vcdn_media_streaming for PostgreSQL if not already applied
    const vcdnMigrationVersion = '007_vcdn_media_streaming';
    if (!appliedSet.has(vcdnMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 007_vcdn_media_streaming...');
      await client.query('BEGIN');
      try {
        await client.query(`
          -- 1. Extend media table
          ALTER TABLE media ADD COLUMN IF NOT EXISTS vcdn_video_id TEXT DEFAULT NULL;
          ALTER TABLE media ADD COLUMN IF NOT EXISTS vcdn_status TEXT DEFAULT NULL;
          ALTER TABLE media ADD COLUMN IF NOT EXISTS vcdn_playback_url TEXT DEFAULT NULL;
          ALTER TABLE media ADD COLUMN IF NOT EXISTS vcdn_embed_url TEXT DEFAULT NULL;
          ALTER TABLE media ADD COLUMN IF NOT EXISTS vcdn_thumbnail_url TEXT DEFAULT NULL;
          ALTER TABLE media ADD COLUMN IF NOT EXISTS media_provider TEXT DEFAULT 'LOCAL';

          -- 2. Extend content table
          ALTER TABLE content ADD COLUMN IF NOT EXISTS vcdn_video_id TEXT DEFAULT NULL;
          ALTER TABLE content ADD COLUMN IF NOT EXISTS vcdn_status TEXT DEFAULT NULL;
          ALTER TABLE content ADD COLUMN IF NOT EXISTS vcdn_playback_url TEXT DEFAULT NULL;
          ALTER TABLE content ADD COLUMN IF NOT EXISTS vcdn_embed_url TEXT DEFAULT NULL;
          ALTER TABLE content ADD COLUMN IF NOT EXISTS vcdn_thumbnail_url TEXT DEFAULT NULL;
          ALTER TABLE content ADD COLUMN IF NOT EXISTS media_provider TEXT DEFAULT 'LOCAL';

          -- 3. Extend episodes table
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS vcdn_video_id TEXT DEFAULT NULL;
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS vcdn_status TEXT DEFAULT NULL;
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS vcdn_playback_url TEXT DEFAULT NULL;
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS vcdn_embed_url TEXT DEFAULT NULL;
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS vcdn_thumbnail_url TEXT DEFAULT NULL;
          ALTER TABLE episodes ADD COLUMN IF NOT EXISTS media_provider TEXT DEFAULT 'LOCAL';

          CREATE INDEX IF NOT EXISTS idx_media_vcdn_id ON media(vcdn_video_id);
          CREATE INDEX IF NOT EXISTS idx_content_vcdn_id ON content(vcdn_video_id);
          CREATE INDEX IF NOT EXISTS idx_episodes_vcdn_id ON episodes(vcdn_video_id);

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${vcdnMigrationVersion}', '007_vcdn_media_streaming.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('007_vcdn_media_streaming.sql');
        console.log('✓ [PostgreSQL] Migration 007_vcdn_media_streaming applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 008_monetization_subscriptions for PostgreSQL if not already applied
    const subMigrationVersion = '008_monetization_subscriptions';
    if (!appliedSet.has(subMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 008_monetization_subscriptions...');
      await client.query('BEGIN');
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL CHECK(plan IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
            status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REJECTED')) DEFAULT 'PENDING',
            amount_paid INTEGER NOT NULL DEFAULT 0,
            payment_method TEXT NOT NULL DEFAULT 'MANUAL_UPI' CHECK(payment_method IN ('MANUAL_UPI', 'GATEWAY', 'ADMIN_GRANT')),
            payment_reference TEXT,
            admin_id TEXT,
            admin_note TEXT,
            submitted_at TEXT NOT NULL,
            activated_at TEXT,
            start_date TEXT,
            end_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_ref ON subscriptions(payment_reference);

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('monetization_mode', 'PER_CONTENT', NOW()::TEXT),
            ('subscription_price_weekly', '49', NOW()::TEXT),
            ('subscription_price_monthly', '149', NOW()::TEXT),
            ('subscription_price_yearly', '999', NOW()::TEXT)
          ON CONFLICT (key) DO NOTHING;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${subMigrationVersion}', '008_monetization_subscriptions.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('008_monetization_subscriptions.sql');
        console.log('✓ [PostgreSQL] Migration 008_monetization_subscriptions applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 009_watch_pass_system for PostgreSQL if not already applied
    const watchPassMigrationVersion = '009_watch_pass_system';
    if (!appliedSet.has(watchPassMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 009_watch_pass_system...');
      await client.query('BEGIN');
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS watch_passes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content_id TEXT NOT NULL,
            plan TEXT NOT NULL CHECK(plan IN ('PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_30D')),
            duration_days REAL NOT NULL DEFAULT 1,
            amount_paid INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED')) DEFAULT 'PENDING',
            payment_method TEXT NOT NULL DEFAULT 'MANUAL_UPI' CHECK(payment_method IN ('MANUAL_UPI', 'ADMIN_GRANT', 'GATEWAY')),
            payment_reference TEXT,
            admin_id TEXT,
            admin_note TEXT,
            submitted_at TEXT NOT NULL,
            activated_at TEXT,
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_watch_passes_user_content ON watch_passes(user_id, content_id, status);
          CREATE INDEX IF NOT EXISTS idx_watch_passes_content ON watch_passes(content_id);
          CREATE INDEX IF NOT EXISTS idx_watch_passes_status ON watch_passes(status);
          CREATE INDEX IF NOT EXISTS idx_watch_passes_expires_at ON watch_passes(expires_at);
          CREATE INDEX IF NOT EXISTS idx_watch_passes_payment_ref ON watch_passes(payment_reference);

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('watch_pass_price_24h', '29', NOW()::TEXT),
            ('watch_pass_price_3d', '49', NOW()::TEXT),
            ('watch_pass_price_7d', '79', NOW()::TEXT),
            ('watch_pass_price_30d', '149', NOW()::TEXT)
          ON CONFLICT (key) DO NOTHING;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${watchPassMigrationVersion}', '009_watch_pass_system.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('009_watch_pass_system.sql');
        console.log('✓ [PostgreSQL] Migration 009_watch_pass_system applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 010_hybrid_plans_system for PostgreSQL if not already applied
    const hybridMigrationVersion = '010_hybrid_plans_system';
    if (!appliedSet.has(hybridMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 010_hybrid_plans_system...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expires_at TEXT DEFAULT NULL;

          ALTER TABLE watch_passes ALTER COLUMN content_id DROP NOT NULL;

          ALTER TABLE watch_passes DROP CONSTRAINT IF EXISTS watch_passes_plan_check;
          ALTER TABLE watch_passes ADD CONSTRAINT watch_passes_plan_check CHECK(plan IN ('PASS_24H', 'PASS_3D', 'PASS_7D', 'PASS_15D', 'PASS_30D'));

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('watch_pass_price_24h', '19', NOW()::TEXT),
            ('watch_pass_price_3d', '29', NOW()::TEXT),
            ('watch_pass_price_7d', '44', NOW()::TEXT),
            ('watch_pass_price_15d', '69', NOW()::TEXT),
            ('per_movie_price', '30', NOW()::TEXT),
            ('per_series_price', '35', NOW()::TEXT)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at;

          DELETE FROM app_settings WHERE key = 'watch_pass_price_30d';

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${hybridMigrationVersion}', '010_hybrid_plans_system.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('010_hybrid_plans_system.sql');
        console.log('✓ [PostgreSQL] Migration 010_hybrid_plans_system applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 011_subscription_plans_update for PostgreSQL if not already applied
    const subUpdateMigrationVersion = '011_subscription_plans_update';
    if (!appliedSet.has(subUpdateMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 011_subscription_plans_update...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
          ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK(plan IN ('WEEKLY', 'MONTHLY', '3_MONTHS', 'YEARLY'));

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('subscription_price_monthly', '89', NOW()::TEXT),
            ('subscription_price_3_months', '189', NOW()::TEXT),
            ('subscription_price_yearly', '449', NOW()::TEXT)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at;

          DELETE FROM app_settings WHERE key = 'subscription_price_weekly';

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${subUpdateMigrationVersion}', '011_subscription_plans_update.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('011_subscription_plans_update.sql');
        console.log('✓ [PostgreSQL] Migration 011_subscription_plans_update applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 012_payment_approval_mode_and_phone for PostgreSQL if not already applied
    const approvalModeMigrationVersion = '012_payment_approval_mode_and_phone';
    if (!appliedSet.has(approvalModeMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 012_payment_approval_mode_and_phone...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NULL;
          CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

          INSERT INTO app_settings (key, value, updated_at)
          VALUES ('payment_approval_mode', 'MANUAL', NOW()::TEXT)
          ON CONFLICT (key) DO NOTHING;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${approvalModeMigrationVersion}', '012_payment_approval_mode_and_phone.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('012_payment_approval_mode_and_phone.sql');
        console.log('✓ [PostgreSQL] Migration 012_payment_approval_mode_and_phone applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 013_add_content_id_to_upi_requests for PostgreSQL if not already applied
    const contentIdMigrationVersion = '013_add_content_id_to_upi_requests';
    if (!appliedSet.has(contentIdMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 013_add_content_id_to_upi_requests...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS content_id TEXT DEFAULT NULL REFERENCES content(id) ON DELETE SET NULL;
          CREATE INDEX IF NOT EXISTS idx_upi_payment_requests_content_id ON upi_payment_requests(content_id);

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${contentIdMigrationVersion}', '013_add_content_id_to_upi_requests.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('013_add_content_id_to_upi_requests.sql');
        console.log('✓ [PostgreSQL] Migration 013_add_content_id_to_upi_requests applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 014_content_custom_pricing for PostgreSQL if not already applied
    const customPricingMigrationVersion = '014_content_custom_pricing';
    if (!appliedSet.has(customPricingMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 014_content_custom_pricing...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE content ADD COLUMN IF NOT EXISTS custom_price INTEGER DEFAULT NULL;

          UPDATE content SET price = 3000 WHERE type = 'MOVIE' AND price = 1000 AND custom_price IS NULL;
          UPDATE content SET price = 3500 WHERE type = 'SERIES' AND price = 2000 AND custom_price IS NULL;

          INSERT INTO app_settings (key, value, updated_at)
          VALUES
            ('per_movie_price', '30', NOW()::TEXT),
            ('per_series_price', '35', NOW()::TEXT)
          ON CONFLICT (key) DO NOTHING;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${customPricingMigrationVersion}', '014_content_custom_pricing.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('014_content_custom_pricing.sql');
        console.log('✓ [PostgreSQL] Migration 014_content_custom_pricing applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Apply incremental 015_universal_payment_approval for PostgreSQL if not already applied
    const universalApprovalMigrationVersion = '015_universal_payment_approval';
    if (!appliedSet.has(universalApprovalMigrationVersion)) {
      console.log('[PostgreSQL] Applying migration: 015_universal_payment_approval...');
      await client.query('BEGIN');
      try {
        await client.query(`
          ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS product_type VARCHAR(32) NOT NULL DEFAULT 'MOVIE';
          ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL;
          ALTER TABLE upi_payment_requests ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT NULL;

          CREATE INDEX IF NOT EXISTS idx_upi_payment_product_type ON upi_payment_requests(product_type);
          CREATE INDEX IF NOT EXISTS idx_upi_payment_plan_id ON upi_payment_requests(plan_id);

          UPDATE upi_payment_requests
          SET product_type = CASE
            WHEN content_id IS NOT NULL THEN (SELECT COALESCE(type, 'MOVIE') FROM content WHERE id = upi_payment_requests.content_id LIMIT 1)
            ELSE 'MOVIE'
          END
          WHERE product_type = 'MOVIE' AND content_id IS NOT NULL;

          UPDATE purchases
          SET expires_at = (purchased_at::TIMESTAMPTZ + INTERVAL '30 days')::TEXT
          WHERE expires_at IS NULL AND purchased_at IS NOT NULL;

          INSERT INTO schema_migrations (version, name, applied_at)
          VALUES ('${universalApprovalMigrationVersion}', '015_universal_payment_approval.sql', NOW()::TEXT)
          ON CONFLICT (version) DO NOTHING;
        `);
        await client.query('COMMIT');
        appliedNow.push('015_universal_payment_approval.sql');
        console.log('✓ [PostgreSQL] Migration 015_universal_payment_approval applied.');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return { applied: appliedNow, total: 11 };
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
if (process.argv[1] && (process.argv[1].endsWith('migrator.ts') || process.argv[1].includes('migrator'))) {
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
