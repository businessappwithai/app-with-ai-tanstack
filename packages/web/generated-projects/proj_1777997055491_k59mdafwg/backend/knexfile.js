const path = require("path");

/**
 * Knex Configuration
 * Supports both PostgreSQL (production) and SQLite (development)
 * Generated: 2026-05-06T11:42:08.750Z
 */
const dbType = process.env.DB_TYPE || "sqlite";

module.exports = {
  client: dbType === "postgresql" ? "pg" : "sqlite3",
  connection:
    dbType === "postgresql"
      ? {
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "5432", 10),
          database: process.env.DB_NAME || "q_a _test _project",
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
    directory: path.join(__dirname, "migrations"),
    loadExtensions: [".js", ".ts"],
  },
  seeds: {
    directory: path.join(__dirname, "seeds"),
    loadExtensions: [".js", ".ts"],
  },
};
