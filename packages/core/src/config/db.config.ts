/**
 * DATABASE CONFIGURATION — single place to change DB connection.
 *
 * Supported env vars:
 *   DATABASE_URL   postgresql://user:pass@host:5432/dbname  (takes precedence)
 *   PGHOST         default: localhost
 *   PGPORT         default: 5432
 *   PGUSER         default: current OS user
 *   PGPASSWORD     default: (empty)
 *   PGDATABASE     default: erdwithai
 */

import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./db.types.js";

export type { Database };

function buildPoolConfig(): pg.PoolConfig {
  const url = process.env.DATABASE_URL;

  if (url && (url.startsWith("postgresql://") || url.startsWith("postgres://"))) {
    return { connectionString: url, max: 10 };
  }

  return {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD ?? "",
    database: process.env.PGDATABASE ?? "erdwithai",
    max: 10,
  };
}

let _db: Kysely<Database> | null = null;

/**
 * Returns the shared Kysely<Database> instance (lazy singleton).
 */
export function getDb(): Kysely<Database> {
  if (!_db) {
    _db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new pg.Pool(buildPoolConfig()),
      }),
    });
  }
  return _db;
}

/**
 * Destroy the connection pool (use in tests or graceful shutdown).
 */
export async function destroyDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}
