/**
 * Business Tables Migration - SQLite Version
 * Creates all business entity tables
 * SQLite-compatible with TEXT UUIDs and TIMESTAMP handling
 *
 * Generated: 2026-05-12T11:38:40.029Z
 */

import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ==========================================================================
  // Company (bus_company)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_company (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , industry VARCHAR(255)
      , website VARCHAR(255)
      , phone VARCHAR(255)
      , email VARCHAR(255)
      , employee_count INTEGER
      , annual_revenue REAL
      , status VARCHAR(255) NOT NULL
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_id ON bus_company (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_name ON bus_company (name)`.execute(db);

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_contact (
      id TEXT PRIMARY KEY
      , company_id VARCHAR(255)
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , email VARCHAR(255) NOT NULL UNIQUE
      , phone VARCHAR(255)
      , mobile VARCHAR(255)
      , job_title VARCHAR(255)
      , department VARCHAR(255)
      , status VARCHAR(255) NOT NULL
      , lead_source VARCHAR(255)
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_id ON bus_contact (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_email ON bus_contact (email)`.execute(db);

  // ==========================================================================
  // Deal (bus_deal)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_deal (
      id TEXT PRIMARY KEY
      , company_id VARCHAR(255)
      , contact_id VARCHAR(255)
      , name VARCHAR(255) NOT NULL
      , amount REAL
      , currency VARCHAR(255) NOT NULL
      , stage VARCHAR(255) NOT NULL
      , probability INTEGER
      , expected_close_date DATE
      , actual_close_date DATE
      , status VARCHAR(255) NOT NULL
      , description TEXT
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_id ON bus_deal (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_name ON bus_deal (name)`.execute(db);

  // ==========================================================================
  // Deal Stage (bus_deal_stage)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_deal_stage (
      id TEXT PRIMARY KEY
      , pipeline_id VARCHAR(255) NOT NULL
      , name VARCHAR(255) NOT NULL
      , sort_order INTEGER NOT NULL
      , default_probability INTEGER NOT NULL
      , is_won BOOLEAN NOT NULL
      , is_lost BOOLEAN NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_id ON bus_deal_stage (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_name ON bus_deal_stage (name)`.execute(db);

  // ==========================================================================
  // Pipeline (bus_pipeline)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_pipeline (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , is_default BOOLEAN NOT NULL
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_id ON bus_pipeline (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_name ON bus_pipeline (name)`.execute(db);

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_activity (
      id TEXT PRIMARY KEY
      , contact_id VARCHAR(255)
      , company_id VARCHAR(255)
      , deal_id VARCHAR(255)
      , activity_type VARCHAR(255) NOT NULL
      , subject VARCHAR(255) NOT NULL
      , description TEXT
      , scheduled_at TIMESTAMP
      , completed_at TIMESTAMP
      , duration_minutes INTEGER
      , status VARCHAR(255) NOT NULL
      , owner_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_id ON bus_activity (id)`.execute(db);

  // ==========================================================================
  // Note (bus_note)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_note (
      id TEXT PRIMARY KEY
      , contact_id VARCHAR(255)
      , company_id VARCHAR(255)
      , deal_id VARCHAR(255)
      , content TEXT NOT NULL
      , is_pinned BOOLEAN NOT NULL
      , author_id VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_note_id ON bus_note (id)`.execute(db);

  // ==========================================================================
  // Task (bus_task)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_task (
      id TEXT PRIMARY KEY
      , contact_id VARCHAR(255)
      , company_id VARCHAR(255)
      , deal_id VARCHAR(255)
      , title VARCHAR(255) NOT NULL
      , description TEXT
      , priority VARCHAR(255) NOT NULL
      , status VARCHAR(255) NOT NULL
      , due_date DATE
      , completed_at TIMESTAMP
      , assigned_to VARCHAR(255) NOT NULL
      , created_by VARCHAR(255) NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_task_id ON bus_task (id)`.execute(db);

  // ==========================================================================
  // Email Message (bus_email_message)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_email_message (
      id TEXT PRIMARY KEY
      , contact_id VARCHAR(255)
      , deal_id VARCHAR(255)
      , thread_id VARCHAR(255)
      , subject VARCHAR(255) NOT NULL
      , body_text TEXT
      , body_html TEXT
      , direction VARCHAR(255) NOT NULL
      , sent_at TIMESTAMP
      , received_at TIMESTAMP
      , opened_at TIMESTAMP
      , open_count INTEGER NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_message_id ON bus_email_message (id)`.execute(db);

  // ==========================================================================
  // Email Template (bus_email_template)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_email_template (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , subject VARCHAR(255) NOT NULL
      , body_html TEXT NOT NULL
      , body_text TEXT
      , category VARCHAR(255)
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_id ON bus_email_template (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_name ON bus_email_template (name)`.execute(db);

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_product (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , sku VARCHAR(255) NOT NULL UNIQUE
      , description TEXT
      , unit_price REAL NOT NULL
      , currency VARCHAR(255) NOT NULL
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_id ON bus_product (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_name ON bus_product (name)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_sku ON bus_product (sku)`.execute(db);

  // ==========================================================================
  // Quote (bus_quote)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote (
      id TEXT PRIMARY KEY
      , deal_id VARCHAR(255) NOT NULL
      , quote_number VARCHAR(255) NOT NULL UNIQUE
      , status VARCHAR(255) NOT NULL
      , valid_until DATE
      , subtotal REAL NOT NULL
      , discount_amount REAL NOT NULL
      , tax_amount REAL NOT NULL
      , total_amount REAL NOT NULL
      , terms TEXT
      , notes TEXT
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_id ON bus_quote (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_quote_number ON bus_quote (quote_number)`.execute(db);

  // ==========================================================================
  // Quote Item (bus_quote_item)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote_item (
      id TEXT PRIMARY KEY
      , quote_id VARCHAR(255) NOT NULL
      , product_id VARCHAR(255) NOT NULL
      , description VARCHAR(255)
      , quantity INTEGER NOT NULL
      , unit_price REAL NOT NULL
      , discount_percent REAL NOT NULL
      , total_price REAL NOT NULL
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_item_id ON bus_quote_item (id)`.execute(db);

  // ==========================================================================
  // User (bus_user)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_user (
      id TEXT PRIMARY KEY
      , email VARCHAR(255) NOT NULL UNIQUE
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , role VARCHAR(255) NOT NULL
      , team_id VARCHAR(255)
      , is_active BOOLEAN NOT NULL
      , last_login TIMESTAMP
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_id ON bus_user (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_email ON bus_user (email)`.execute(db);

  // ==========================================================================
  // Team (bus_team)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_team (
      id TEXT PRIMARY KEY
      , name VARCHAR(255) NOT NULL
      , manager_id VARCHAR(255)
      , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      , deleted_at TIMESTAMP
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_id ON bus_team (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_name ON bus_team (name)`.execute(db);


  // ============================================================================
  // Create indices for better query performance
  // ============================================================================
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_created_at ON bus_company(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_company_deleted_at ON bus_company(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_created_at ON bus_contact(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_deleted_at ON bus_contact(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_created_at ON bus_deal(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_deleted_at ON bus_deal(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_created_at ON bus_deal_stage(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_deal_stage_deleted_at ON bus_deal_stage(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_created_at ON bus_pipeline(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_pipeline_deleted_at ON bus_pipeline(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_created_at ON bus_activity(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_deleted_at ON bus_activity(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_note_created_at ON bus_note(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_note_deleted_at ON bus_note(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_task_created_at ON bus_task(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_task_deleted_at ON bus_task(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_message_created_at ON bus_email_message(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_message_deleted_at ON bus_email_message(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_created_at ON bus_email_template(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_email_template_deleted_at ON bus_email_template(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_created_at ON bus_product(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_deleted_at ON bus_product(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_created_at ON bus_quote(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_deleted_at ON bus_quote(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_item_created_at ON bus_quote_item(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_item_deleted_at ON bus_quote_item(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_created_at ON bus_user(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_user_deleted_at ON bus_user(deleted_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_created_at ON bus_team(created_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_deleted_at ON bus_team(deleted_at)`.execute(db);

  // ============================================================================
  // Enable foreign key constraints (SQLite requires explicit enabling)
  // ============================================================================
  await sql`PRAGMA foreign_keys = ON`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables (SQLite will handle CASCADE through foreign key constraints if enabled)
  await sql`DROP TABLE IF EXISTS bus_company`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_contact`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_deal`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_deal_stage`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_pipeline`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_activity`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_note`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_task`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_email_message`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_email_template`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_product`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote_item`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_user`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_team`.execute(db);
}
