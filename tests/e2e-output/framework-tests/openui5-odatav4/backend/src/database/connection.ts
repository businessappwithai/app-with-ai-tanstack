/**
 * Database Connection
 *
 * Configures Knex.js for sqlite database.
 * Supports SQLite for development and PostgreSQL for production.
 *
 * Generated: 2026-02-09T13:00:26.927Z
 */

import knex, { type Knex } from "knex";
import path from "path";

let db: Knex | null = null;

export async function initializeDatabase(): Promise<Knex> {
  if (db) {
    return db;
  }

  const config: Knex.Config = {
    client: "better-sqlite3",
    connection: {
      filename:
        process.env.DATABASE_PATH ||
        path.join(process.cwd(), "data", "openui5-odatav4-test-app.db"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(process.cwd(), "migrations"),
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(process.cwd(), "seeds"),
    },
  };

  db = knex(config);

  // Test connection
  try {
    await db.raw("SELECT 1");
    console.log("Database connection established");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }

  return db;
}

export function getKnex(): Knex {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
    console.log("Database connection closed");
  }
}

export default { initializeDatabase, getKnex, closeDatabase };
