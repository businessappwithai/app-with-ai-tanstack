/**
 * System Tables Migration (sys_ prefix) - SQLite Version
 * Application Dictionary tables following Compiere pattern
 * SQLite-compatible with TEXT UUIDs and TIMESTAMP handling
 *
 * Generated: 2026-05-12T10:27:31.174Z
 */

import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ============================================================================
  // sys_reference - Reference/Data Types
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_reference (
      sys_reference_id INTEGER PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      validation_type VARCHAR(1) NOT NULL DEFAULT 'S',
      vformat VARCHAR(40),
      entity_type VARCHAR(40) NOT NULL DEFAULT 'U',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // sys_ref_list - Reference List Values
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_ref_list (
      sys_ref_list_id TEXT PRIMARY KEY,
      sys_reference_id INTEGER NOT NULL REFERENCES sys_reference(sys_reference_id) ON DELETE CASCADE,
      value VARCHAR(40) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      valid_from DATE,
      valid_to DATE,
      entity_type VARCHAR(40) NOT NULL DEFAULT 'U',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (sys_reference_id, value)
    )
  `.execute(db);

  // ============================================================================
  // sys_val_rule - Validation Rules
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_val_rule (
      sys_val_rule_id TEXT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      type VARCHAR(1) NOT NULL DEFAULT 'S',
      code TEXT NOT NULL,
      error_msg TEXT,
      entity_type VARCHAR(40) NOT NULL DEFAULT 'U',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // sys_table - Table Metadata
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_table (
      sys_table_id TEXT PRIMARY KEY,
      table_name VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      module_name VARCHAR(100),
      entity_type VARCHAR(40) NOT NULL DEFAULT 'U',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // sys_column - Column Metadata
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_column (
      sys_column_id TEXT PRIMARY KEY,
      sys_table_id TEXT NOT NULL REFERENCES sys_table(sys_table_id) ON DELETE CASCADE,
      column_name VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      column_type VARCHAR(40) NOT NULL,
      is_key BOOLEAN NOT NULL DEFAULT false,
      is_mandatory BOOLEAN NOT NULL DEFAULT false,
      is_updateable BOOLEAN NOT NULL DEFAULT true,
      max_length INTEGER,
      sys_reference_id INTEGER REFERENCES sys_reference(sys_reference_id),
      seq_no INTEGER NOT NULL DEFAULT 0,
      entity_type VARCHAR(40) NOT NULL DEFAULT 'U',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (sys_table_id, column_name)
    )
  `.execute(db);

  // ============================================================================
  // sys_window - Form/View Metadata
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_window (
      sys_window_id TEXT PRIMARY KEY,
      sys_table_id TEXT NOT NULL REFERENCES sys_table(sys_table_id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      window_type VARCHAR(1) NOT NULL DEFAULT 'T',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // sys_tab - Form Tab Metadata
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_tab (
      sys_tab_id TEXT PRIMARY KEY,
      sys_window_id TEXT NOT NULL REFERENCES sys_window(sys_window_id) ON DELETE CASCADE,
      sys_table_id TEXT NOT NULL REFERENCES sys_table(sys_table_id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      seq_no INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // sys_field - Field Metadata (UI Layout)
  // ============================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS sys_field (
      sys_field_id TEXT PRIMARY KEY,
      sys_tab_id TEXT NOT NULL REFERENCES sys_tab(sys_tab_id) ON DELETE CASCADE,
      sys_column_id TEXT NOT NULL REFERENCES sys_column(sys_column_id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      label VARCHAR(100),
      seq_no INTEGER NOT NULL DEFAULT 0,
      seq_no_grid INTEGER,
      is_displayed BOOLEAN NOT NULL DEFAULT true,
      is_displayed_grid BOOLEAN NOT NULL DEFAULT true,
      is_mandatory BOOLEAN NOT NULL DEFAULT false,
      is_read_only BOOLEAN NOT NULL DEFAULT false,
      field_type VARCHAR(40) NOT NULL DEFAULT 'TextField',
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_by VARCHAR(100) NOT NULL,
      updated_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  // ============================================================================
  // Create indices for better query performance
  // ============================================================================
  await sql`CREATE INDEX IF NOT EXISTS idx_sys_column_table ON sys_column(sys_table_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_sys_window_table ON sys_window(sys_table_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_sys_tab_window ON sys_tab(sys_window_id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_sys_field_tab ON sys_field(sys_tab_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order of dependencies
  await db.schema.dropTable('sys_field').ifExists().execute();
  await db.schema.dropTable('sys_tab').ifExists().execute();
  await db.schema.dropTable('sys_window').ifExists().execute();
  await db.schema.dropTable('sys_column').ifExists().execute();
  await db.schema.dropTable('sys_table').ifExists().execute();
  await db.schema.dropTable('sys_val_rule').ifExists().execute();
  await db.schema.dropTable('sys_ref_list').ifExists().execute();
  await db.schema.dropTable('sys_reference').ifExists().execute();
}
