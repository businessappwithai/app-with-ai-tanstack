/**
 * Knex Configuration
 *
 * Database configuration for migrations and seeds.
 * Generated: 2026-02-09T13:00:26.976Z
 */

import dotenv from "dotenv";

dotenv.config();

const config = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.DB_FILE || "./data/openui5-odatav4-test-app.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  production: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.DB_FILE || "./data/openui5-odatav4-test-app.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};

export default config;
