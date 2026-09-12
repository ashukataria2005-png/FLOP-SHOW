import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

let dbInstance: DatabaseSync | null = null;

/**
 * Get or initialize the SQLite database connection.
 * Enables foreign keys and WAL mode for high performance and strict relational integrity.
 */
export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(config.databasePath);
    
    // Enable strict relational constraints and WAL concurrency
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }

  return dbInstance;
}

/**
 * Execute an atomic transaction using IMMEDIATE mode to prevent concurrent write collisions.
 */
export function runTransaction<T>(operation: (db: DatabaseSync) => T): T {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = operation(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

/**
 * Close database connection if open (useful for test tear-down).
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
