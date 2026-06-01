import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getDbPath } from "../utils/paths.js";
import { ensureSchema, getSchemaVersion, CURRENT_SCHEMA_VERSION } from "./schema.js";

let _db: Database.Database | null = null;

export interface ConnectionOptions {
  readonly?: boolean;
  dbPath?: string;
}

export function getDb(options: ConnectionOptions = {}): Database.Database {
  if (_db && !_db.open) {
    _db = null;
  }
  if (_db) return _db;

  const dbPath = options.dbPath || getDbPath();
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath, {
    readonly: options.readonly ?? false,
  });

  // Match claude-mem's PRAGMAs
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("busy_timeout = 5000");

  if (!options.readonly) {
    ensureSchema(_db);
  }

  // Warn if schema is newer than expected
  const version = getSchemaVersion(_db);
  if (version > CURRENT_SCHEMA_VERSION) {
    console.warn(
      `[copilot-mem] DB schema v${version} is newer than supported v${CURRENT_SCHEMA_VERSION}. Some features may not work correctly.`,
    );
  }

  return _db;
}

export function closeDb(): void {
  if (_db?.open) {
    _db.close();
  }
  _db = null;
}

/**
 * Create an independent DB connection (not cached).
 * Caller is responsible for closing it.
 */
export function createDb(options: ConnectionOptions = {}): Database.Database {
  const dbPath = options.dbPath || getDbPath();
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath, {
    readonly: options.readonly ?? false,
  });

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (!options.readonly) {
    ensureSchema(db);
  }

  return db;
}
