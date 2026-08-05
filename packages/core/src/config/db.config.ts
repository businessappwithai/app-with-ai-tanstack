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
 *   PGSSLMODE      disable | require | verify-full — overrides what the URL says
 *
 * Hosted Postgres (Neon, Supabase, RDS) requires TLS and will refuse the
 * connection outright without it, so `sslConfig` below decides when to ask for
 * it. See the note there about why `sslmode` in the URL is not enough.
 */

import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./db.types.js";

export type { Database };

/** Loopback, where TLS is pointless and usually unavailable. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * Whether a host is somewhere TLS is worth asking for.
 *
 * A hosted database is always a public DNS name, and one thing every public
 * name has that a private one does not is a dot. Container and compose
 * hostnames are single labels — `postgres`, `db`, `drug-discovery-db` — and
 * those servers usually have no certificate at all, so asking for TLS there
 * does not degrade, it fails the connection outright.
 */
function looksRemote(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.toLowerCase();
  if (LOOPBACK.has(name)) return false;
  return name.includes(".");
}

/**
 * The `ssl` value for a connection, or undefined to leave it off.
 *
 * `pg` reads `sslmode` from a connection string, but only far enough to turn
 * TLS on — for `require` it also demands a CA it can chain to, and Neon's
 * certificate is signed by a root that is not in every image's trust store.
 * The result is a `SELF_SIGNED_CERT_IN_CHAIN` failure on a string that works
 * fine in psql. So the decision is made here instead:
 *
 *   verify-full → verify the chain, as asked
 *   require     → encrypt without demanding a verifiable chain (what psql does)
 *   disable     → no TLS
 *
 * With nothing specified, a remote host gets `require` and a local one gets
 * nothing, which is the right default in both directions.
 */
function sslConfig(host: string | undefined, urlMode?: string): pg.PoolConfig["ssl"] {
  const mode = (process.env.PGSSLMODE ?? urlMode ?? "").toLowerCase();

  if (mode === "disable") return undefined;
  if (mode === "verify-full" || mode === "verify-ca") return { rejectUnauthorized: true };
  if (mode) return { rejectUnauthorized: false };

  return looksRemote(host) ? { rejectUnauthorized: false } : undefined;
}

function buildPoolConfig(): pg.PoolConfig {
  const url = process.env.DATABASE_URL;

  if (url && (url.startsWith("postgresql://") || url.startsWith("postgres://"))) {
    // A malformed URL should fail when pg dials it, with pg's message, rather
    // than here while we are only trying to read the host off it.
    let host: string | undefined;
    let urlMode: string | undefined;
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
      urlMode = parsed.searchParams.get("sslmode") ?? undefined;
    } catch {
      /* leave both unset — the defaults below are safe */
    }

    const ssl = sslConfig(host, urlMode);
    return ssl ? { connectionString: url, max: 10, ssl } : { connectionString: url, max: 10 };
  }

  const host = process.env.PGHOST ?? "localhost";
  const ssl = sslConfig(host);

  return {
    host,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD ?? "",
    database: process.env.PGDATABASE ?? "erdwithai",
    max: 10,
    ...(ssl ? { ssl } : {}),
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
