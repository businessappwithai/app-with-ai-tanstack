/**
 * Database Connection
 *
 * Configures Knex.js for sqlite database.
 * Supports SQLite for development and PostgreSQL for production.
 *
 * Generated: 2026-05-06T11:42:08.716Z
 */

import knex, { type Knex } from "knex";
import path from "path";

let db: Knex | null = null;

export async function initializeDatabase(): Promise<Knex> {
  if (db) {
    return db;
  }

  const dbType = process.env.DB_TYPE || "sqlite";

  const config: Knex.Config = {
    client: dbType === "postgresql" ? "pg" : "sqlite3",
    connection:
      dbType === "postgresql"
        ? {
            host: process.env.DB_HOST || "localhost",
            port: parseInt(process.env.DB_PORT || "5432", 10),
            database: process.env.DB_NAME || "q-a-test-project",
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD || "postgres",
          }
        : {
            filename: process.env.DB_NAME || "./data/q-a-test-project.db",
          },
    useNullAsDefault: true, // Required for SQLite
    pool: {
      min: 2,
      max: 10,
    },
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
    console.log(`Database connection established (${dbType})`);
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
