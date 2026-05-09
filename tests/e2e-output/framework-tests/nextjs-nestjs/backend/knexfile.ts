/**
 * Knex Configuration
 * Generated: 2026-03-20T16:41:26.598Z
 */

const dotenv = require("dotenv");
dotenv.config();

const config = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.DB_FILE || "./data/nextjs-nestjs-test-app.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
      loadExtensions: [".ts"],
    },
    seeds: {
      directory: "./seeds",
    },
  },

  production: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.DB_FILE || "./data/nextjs-nestjs-test-app.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./dist/migrations",
      tableName: "knex_migrations",
      loadExtensions: [".js"],
    },
    seeds: {
      directory: "./seeds",
    },
  },
};

module.exports = config;
