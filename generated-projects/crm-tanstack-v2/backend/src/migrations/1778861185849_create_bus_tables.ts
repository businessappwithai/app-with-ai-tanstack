/**
 * Business Tables Migration - SQLite Version
 * Creates all business entity tables
 * SQLite-compatible with TEXT UUIDs and TIMESTAMP handling
 *
 * Generated: 2026-05-15T16:06:25.854Z
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ==========================================================================
  // Account (bus_account)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_account (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , email VARCHAR(255) NOT NULL
      , phone VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_id ON bus_account (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_name ON bus_account (name)`.execute(db);

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_contact (
      id TEXT PRIMARY KEY
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , email VARCHAR(255) NOT NULL
      , phone VARCHAR(255) NOT NULL
      , account_id INTEGER NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_id ON bus_contact (id)`.execute(db);

  // ==========================================================================
  // Opportunity (bus_opportunity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_opportunity (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , amount REAL NOT NULL
      , stage VARCHAR(255) NOT NULL
      , account_id INTEGER NOT NULL
      , close_date TIMESTAMP NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_id ON bus_opportunity (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_name ON bus_opportunity (name)`.execute(db);

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_activity (
      id TEXT PRIMARY KEY
      , type VARCHAR(255) NOT NULL
      , description VARCHAR(255) NOT NULL
      , contact_id INTEGER NOT NULL
      , opportunity_id INTEGER NOT NULL
      , activity_date TIMESTAMP NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_id ON bus_activity (id)`.execute(db);


  // ============================================================================
  // Create indices for better query performance
  // ============================================================================
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_created_at ON bus_account(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_deleted_at ON bus_account(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_created_at ON bus_contact(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_deleted_at ON bus_contact(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_created_at ON bus_opportunity(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_deleted_at ON bus_opportunity(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_created_at ON bus_activity(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_deleted_at ON bus_activity(deleted_at)`.execute(db);

  // ============================================================================
  // Enable foreign key constraints (SQLite requires explicit enabling)
  // ============================================================================
  await sql`PRAGMA foreign_keys = ON`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables (SQLite will handle CASCADE through foreign key constraints if enabled)
  await sql`DROP TABLE IF EXISTS bus_account`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_contact`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_opportunity`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_activity`.execute(db);
}
