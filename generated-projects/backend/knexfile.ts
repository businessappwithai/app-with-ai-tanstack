/**
 * Knex Configuration
 * Generated: 2026-05-07T08:59:26.612Z
 */

const dotenv = require('dotenv');
dotenv.config();

const config = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'crm-app',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './dist/migrations',
      tableName: 'knex_migrations',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds',
    },
  },
};

module.exports = config;
