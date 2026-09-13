/**
 * FLOPSHOW Unified Database Adapter
 *
 * Provides a single, consistent query interface for both:
 *   - SQLite  (local development, via node:sqlite)
 *   - PostgreSQL (production, via pg Pool)
 *
 * The adapter normalises:
 *   - Placeholder syntax:  SQLite uses `?`, PostgreSQL uses `$1, $2, ...`
 *   - Result shape:        Both return `{ rows: any[], rowCount: number }`
 */

import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { config } from '../config/env.js';
import { getDatabase, closeDatabase } from './connection.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface DbAdapter {
  /** Execute a query and return all matching rows */
  query(sql: string, params?: any[]): Promise<QueryResult>;
  /** Run a write statement (INSERT/UPDATE/DELETE); returns affected row count */
  run(sql: string, params?: any[]): Promise<number>;
  /** Execute raw SQL (DDL, PRAGMAs, multi-statement blocks) */
  exec(sql: string): Promise<void>;
  /** Run multiple operations in a single atomic transaction */
  transaction<T>(fn: (adapter: DbAdapter) => Promise<T>): Promise<T>;
  /** Gracefully close the connection / pool */
  close(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resilient SSL configuration for PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
export function getPostgresSslConfig(url: string, isProd: boolean): { rejectUnauthorized: boolean } | undefined {
  if (!url) return undefined;
  const lower = url.toLowerCase();
  const isLocal = lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('::1');
  if (lower.includes('sslmode=disable')) {
    return undefined;
  }
  if (
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify') ||
    lower.includes('ssl=true') ||
    (isProd && !isLocal)
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convert `?` placeholders to `$1 $2 ...` for PostgreSQL (quote-safe)
// ─────────────────────────────────────────────────────────────────────────────
export function toPostgresPlaceholders(sql: string): string {
  let inString = false;
  let idx = 0;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      // Escaped quote in SQL ('')
      if (inString && sql[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      inString = !inString;
      result += char;
    } else if (char === '?' && !inString) {
      idx++;
      result += `$${idx}`;
    } else {
      result += char;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLite Adapter  (wraps node:sqlite DatabaseSync in async-compatible API)
// ─────────────────────────────────────────────────────────────────────────────
class SqliteAdapter implements DbAdapter {
  private db: DatabaseSync;

  constructor() {
    this.db = getDatabase();
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(sql);
    const rows = params.length > 0 ? (stmt.all(...params) as any[]) : (stmt.all() as any[]);
    return { rows, rowCount: rows.length };
  }

  async run(sql: string, params: any[] = []): Promise<number> {
    const stmt = this.db.prepare(sql);
    const info = params.length > 0 ? stmt.run(...params) : stmt.run();
    return (info as any).changes ?? 0;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(fn: (adapter: DbAdapter) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async close(): Promise<void> {
    closeDatabase();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL Adapter  (wraps pg.Pool)
// ─────────────────────────────────────────────────────────────────────────────
class PostgresAdapter implements DbAdapter {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: getPostgresSslConfig(config.databaseUrl, config.isProd),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    this.pool.on('error', (err) => {
      console.error('[PostgresAdapter] Unexpected pool error:', err);
    });
  }

  /** Translate `?` → `$N` and run query on the pool */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const pgSql = toPostgresPlaceholders(sql);
    const result = await this.pool.query(pgSql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  }

  async run(sql: string, params: any[] = []): Promise<number> {
    const pgSql = toPostgresPlaceholders(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rowCount ?? 0;
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(fn: (adapter: DbAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Provide a thin DbAdapter wrapping the single client for the transaction
      const txAdapter: DbAdapter = {
        async query(sql, params = []) {
          const pgSql = toPostgresPlaceholders(sql);
          const res = await client.query(pgSql, params);
          return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
        },
        async run(sql, params = []) {
          const pgSql = toPostgresPlaceholders(sql);
          const res = await client.query(pgSql, params);
          return res.rowCount ?? 0;
        },
        async exec(sql) {
          await client.query(sql);
        },
        async transaction<U>(innerFn: (a: DbAdapter) => Promise<U>) {
          // Postgres doesn't nest true transactions; just run inline
          return innerFn(txAdapter);
        },
        async close() { /* no-op inside transaction */ },
      };

      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton factory – returns the correct adapter based on env config
// ─────────────────────────────────────────────────────────────────────────────
let _adapter: DbAdapter | null = null;

export function getAdapter(): DbAdapter {
  if (!_adapter) {
    if (config.isPostgres) {
      console.log('[DB] Using PostgreSQL adapter');
      _adapter = new PostgresAdapter();
    } else {
      console.log('[DB] Using SQLite adapter');
      _adapter = new SqliteAdapter();
    }
  }
  return _adapter;
}

/** Reset adapter singleton (useful for tests) */
export function resetAdapter(): void {
  _adapter = null;
}
