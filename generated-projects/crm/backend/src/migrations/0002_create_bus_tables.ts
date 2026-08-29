/**
 * Business Tables Migration
 * Creates all business entity tables
 *
 * Generated: 2026-08-29T04:45:21.777Z
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ==========================================================================
  // User (bus_user)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_user (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , email VARCHAR(255) NOT NULL UNIQUE
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , role VARCHAR(255) NOT NULL
      , job_title VARCHAR(255)
      , phone VARCHAR(255)
      , team_id UUID
      , quota_annual DECIMAL(18,6)
      , is_active BOOLEAN NOT NULL
      , last_login TIMESTAMPTZ
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_user_email ON bus_user (email)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_user_id ON bus_user (id)`.execute(db);

  // ==========================================================================
  // Team (bus_team)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_team (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , name VARCHAR(255) NOT NULL
      , manager_id UUID
      , region VARCHAR(255)
      , quota_annual DECIMAL(18,6)
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_team_id ON bus_team (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_team_name ON bus_team (name)`.execute(db);

  // ==========================================================================
  // Territory (bus_territory)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_territory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , name VARCHAR(255) NOT NULL
      , region VARCHAR(255) NOT NULL
      , country_code VARCHAR(255)
      , manager_id UUID
      , employee_count_floor INTEGER
      , employee_count_ceiling INTEGER
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_territory_id ON bus_territory (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_territory_name ON bus_territory (name)`.execute(db);

  // ==========================================================================
  // Account (bus_account)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_account (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , name VARCHAR(255) NOT NULL
      , account_number VARCHAR(255) UNIQUE
      , account_type VARCHAR(255) NOT NULL
      , tier VARCHAR(255)
      , industry VARCHAR(255)
      , website VARCHAR(255)
      , phone VARCHAR(255)
      , billing_street VARCHAR(255)
      , billing_city VARCHAR(255)
      , billing_postal_code VARCHAR(255)
      , billing_country VARCHAR(255)
      , employee_count INTEGER
      , annual_revenue DECIMAL(18,6)
      , health_score INTEGER
      , territory_id UUID
      , sla_policy_id UUID
      , status VARCHAR(255) NOT NULL
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_account_account_number ON bus_account (account_number)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_territory_id_status ON bus_account (territory_id, status)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_account_id ON bus_account (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_account_name ON bus_account (name)`.execute(db);

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_contact (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , account_id UUID
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , email VARCHAR(255) NOT NULL UNIQUE
      , phone VARCHAR(255)
      , mobile VARCHAR(255)
      , job_title VARCHAR(255)
      , department VARCHAR(255)
      , lead_source VARCHAR(255)
      , is_primary BOOLEAN NOT NULL
      , email_opt_out BOOLEAN NOT NULL
      , do_not_call BOOLEAN NOT NULL
      , status VARCHAR(255) NOT NULL
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_contact_email ON bus_contact (email)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contact_account_id_status ON bus_contact (account_id, status)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_contact_id ON bus_contact (id)`.execute(db);

  // ==========================================================================
  // Lead (bus_lead)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_lead (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , first_name VARCHAR(255) NOT NULL
      , last_name VARCHAR(255) NOT NULL
      , company_name VARCHAR(255) NOT NULL
      , email VARCHAR(255) NOT NULL
      , phone VARCHAR(255)
      , job_title VARCHAR(255)
      , industry VARCHAR(255)
      , employee_count INTEGER
      , annual_revenue DECIMAL(18,6)
      , lead_source VARCHAR(255) NOT NULL
      , rating VARCHAR(255)
      , score INTEGER
      , campaign_id UUID
      , status VARCHAR(255) NOT NULL
      , owner_id UUID NOT NULL
      , converted_at TIMESTAMPTZ
      , disqualification_reason VARCHAR(255)
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_lead_status_score ON bus_lead (status, score)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_lead_owner_id_status ON bus_lead (owner_id, status)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_lead_id ON bus_lead (id)`.execute(db);

  // ==========================================================================
  // Campaign (bus_campaign)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_campaign (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , name VARCHAR(255) NOT NULL
      , campaign_type VARCHAR(255) NOT NULL
      , status VARCHAR(255) NOT NULL
      , start_date DATE NOT NULL
      , end_date DATE
      , budgeted_cost DECIMAL(18,6)
      , actual_cost DECIMAL(18,6)
      , expected_revenue DECIMAL(18,6)
      , expected_response_count INTEGER
      , target_audience VARCHAR(255)
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_campaign_id ON bus_campaign (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_campaign_name ON bus_campaign (name)`.execute(db);

  // ==========================================================================
  // Campaign Member (bus_campaign_member)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_campaign_member (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , campaign_id UUID NOT NULL
      , lead_id UUID
      , contact_id UUID
      , member_status VARCHAR(255) NOT NULL
      , responded_at TIMESTAMPTZ
      , has_responded BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_campaign_member_campaign_id_member_status ON bus_campaign_member (campaign_id, member_status)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_campaign_member_id ON bus_campaign_member (id)`.execute(db);

  // ==========================================================================
  // Opportunity (bus_opportunity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_opportunity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , account_id UUID NOT NULL
      , contact_id UUID
      , campaign_id UUID
      , name VARCHAR(255) NOT NULL
      , description TEXT
      , amount DECIMAL(18,6)
      , currency_code VARCHAR(255) NOT NULL
      , stage VARCHAR(255) NOT NULL
      , probability INTEGER
      , forecast_category VARCHAR(255)
      , expected_close_date DATE
      , actual_close_date DATE
      , lead_source VARCHAR(255)
      , next_step VARCHAR(255)
      , loss_reason VARCHAR(255)
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_account_id_stage ON bus_opportunity (account_id, stage)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_owner_id_expected_close_date ON bus_opportunity (owner_id, expected_close_date)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_opportunity_id ON bus_opportunity (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_opportunity_name ON bus_opportunity (name)`.execute(db);

  // ==========================================================================
  // Opportunity Line Item (bus_opportunity_line_item)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_opportunity_line_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , opportunity_id UUID NOT NULL
      , product_id UUID NOT NULL
      , quantity DECIMAL(18,6) NOT NULL
      , unit_price DECIMAL(18,6) NOT NULL
      , discount_percent DECIMAL(18,6)
      , line_total DECIMAL(18,6) NOT NULL
      , line_description VARCHAR(255)
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_opportunity_line_item_id ON bus_opportunity_line_item (id)`.execute(db);

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_product (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , product_code VARCHAR(255) NOT NULL UNIQUE
      , name VARCHAR(255) NOT NULL
      , description TEXT
      , family VARCHAR(255) NOT NULL
      , list_price DECIMAL(18,6) NOT NULL
      , unit_cost DECIMAL(18,6)
      , billing_frequency VARCHAR(255)
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_product_product_code ON bus_product (product_code)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_product_id ON bus_product (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_product_name ON bus_product (name)`.execute(db);

  // ==========================================================================
  // Quote (bus_quote)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , quote_number VARCHAR(255) UNIQUE
      , opportunity_id UUID NOT NULL
      , account_id UUID NOT NULL
      , name VARCHAR(255) NOT NULL
      , status VARCHAR(255) NOT NULL
      , version_number INTEGER NOT NULL
      , valid_until DATE
      , subtotal DECIMAL(18,6) NOT NULL
      , discount_percent DECIMAL(18,6)
      , discount_amount DECIMAL(18,6)
      , tax_amount DECIMAL(18,6)
      , grand_total DECIMAL(18,6) NOT NULL
      , approved_by_id UUID
      , approved_at TIMESTAMPTZ
      , approval_notes TEXT
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_quote_quote_number ON bus_quote (quote_number)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_opportunity_id_status ON bus_quote (opportunity_id, status)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_quote_id ON bus_quote (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_quote_name ON bus_quote (name)`.execute(db);

  // ==========================================================================
  // Quote Line Item (bus_quote_line_item)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_quote_line_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , quote_id UUID NOT NULL
      , product_id UUID NOT NULL
      , quantity DECIMAL(18,6) NOT NULL
      , unit_price DECIMAL(18,6) NOT NULL
      , discount_percent DECIMAL(18,6)
      , line_total DECIMAL(18,6) NOT NULL
      , sort_order INTEGER
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_quote_line_item_id ON bus_quote_line_item (id)`.execute(db);

  // ==========================================================================
  // Contract (bus_contract)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_contract (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , contract_number VARCHAR(255) UNIQUE
      , account_id UUID NOT NULL
      , quote_id UUID
      , status VARCHAR(255) NOT NULL
      , start_date DATE
      , end_date DATE
      , term_months INTEGER NOT NULL
      , annual_value DECIMAL(18,6) NOT NULL
      , auto_renew BOOLEAN NOT NULL
      , renewal_notice_days INTEGER
      , signed_by_id UUID
      , signed_at TIMESTAMPTZ
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_contract_contract_number ON bus_contract (contract_number)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_contract_account_id_end_date ON bus_contract (account_id, end_date)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_contract_id ON bus_contract (id)`.execute(db);

  // ==========================================================================
  // Support Case (bus_support_case)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_support_case (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , case_number VARCHAR(255) UNIQUE
      , account_id UUID NOT NULL
      , contact_id UUID
      , sla_policy_id UUID
      , subject VARCHAR(255) NOT NULL
      , description TEXT
      , case_type VARCHAR(255) NOT NULL
      , priority VARCHAR(255) NOT NULL
      , origin VARCHAR(255) NOT NULL
      , status VARCHAR(255) NOT NULL
      , first_response_due_at TIMESTAMPTZ
      , first_response_at TIMESTAMPTZ
      , resolution_due_at TIMESTAMPTZ
      , resolved_at TIMESTAMPTZ
      , is_sla_breached BOOLEAN NOT NULL
      , resolution_notes TEXT
      , satisfaction_score INTEGER
      , escalated_by_id UUID
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_support_case_case_number ON bus_support_case (case_number)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_support_case_account_id_status ON bus_support_case (account_id, status)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_support_case_owner_id_priority ON bus_support_case (owner_id, priority)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_support_case_id ON bus_support_case (id)`.execute(db);

  // ==========================================================================
  // Sla Policy (bus_sla_policy)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_sla_policy (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , name VARCHAR(255) NOT NULL
      , tier VARCHAR(255) NOT NULL
      , first_response_minutes INTEGER NOT NULL
      , resolution_hours INTEGER NOT NULL
      , business_hours_only BOOLEAN NOT NULL
      , is_active BOOLEAN NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_sla_policy_id ON bus_sla_policy (id)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_sla_policy_name ON bus_sla_policy (name)`.execute(db);

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================
  await sql`
    CREATE TABLE IF NOT EXISTS bus_activity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      , activity_type VARCHAR(255) NOT NULL
      , subject VARCHAR(255) NOT NULL
      , description TEXT
      , status VARCHAR(255) NOT NULL
      , priority VARCHAR(255) NOT NULL
      , due_at TIMESTAMPTZ
      , completed_at TIMESTAMPTZ
      , duration_minutes INTEGER
      , account_id UUID
      , contact_id UUID
      , lead_id UUID
      , opportunity_id UUID
      , support_case_id UUID
      , contract_id UUID
      , owner_id UUID NOT NULL
      , created_at TIMESTAMPTZ DEFAULT NOW()
      , updated_at TIMESTAMPTZ DEFAULT NOW()
      , deleted_at TIMESTAMPTZ
      , version INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_owner_id_due_at ON bus_activity (owner_id, due_at)`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_bus_activity_account_id_activity_type ON bus_activity (account_id, activity_type)`.execute(db);
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_activity_id ON bus_activity (id)`.execute(db);


  // Foreign key constraints (added after all tables to avoid ordering issues)
  await sql`
    ALTER TABLE bus_user
    ADD CONSTRAINT fk_bus_user_team_id
      FOREIGN KEY (team_id)
      REFERENCES bus_team(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_territory
    ADD CONSTRAINT fk_bus_territory_team_id
      FOREIGN KEY (team_id)
      REFERENCES bus_team(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_territory
    ADD CONSTRAINT fk_bus_territory_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_account
    ADD CONSTRAINT fk_bus_account_territory_id
      FOREIGN KEY (territory_id)
      REFERENCES bus_territory(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_account
    ADD CONSTRAINT fk_bus_account_sla_policy_id
      FOREIGN KEY (sla_policy_id)
      REFERENCES bus_sla_policy(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_support_case
    ADD CONSTRAINT fk_bus_support_case_sla_policy_id
      FOREIGN KEY (sla_policy_id)
      REFERENCES bus_sla_policy(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_contact
    ADD CONSTRAINT fk_bus_contact_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity
    ADD CONSTRAINT fk_bus_opportunity_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_quote
    ADD CONSTRAINT fk_bus_quote_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_contract
    ADD CONSTRAINT fk_bus_contract_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_support_case
    ADD CONSTRAINT fk_bus_support_case_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_account_id
      FOREIGN KEY (account_id)
      REFERENCES bus_account(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity
    ADD CONSTRAINT fk_bus_opportunity_contact_id
      FOREIGN KEY (contact_id)
      REFERENCES bus_contact(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_support_case
    ADD CONSTRAINT fk_bus_support_case_contact_id
      FOREIGN KEY (contact_id)
      REFERENCES bus_contact(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_campaign_member
    ADD CONSTRAINT fk_bus_campaign_member_contact_id
      FOREIGN KEY (contact_id)
      REFERENCES bus_contact(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_contact_id
      FOREIGN KEY (contact_id)
      REFERENCES bus_contact(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_campaign_member
    ADD CONSTRAINT fk_bus_campaign_member_lead_id
      FOREIGN KEY (lead_id)
      REFERENCES bus_lead(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_lead_id
      FOREIGN KEY (lead_id)
      REFERENCES bus_lead(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_campaign_member
    ADD CONSTRAINT fk_bus_campaign_member_campaign_id
      FOREIGN KEY (campaign_id)
      REFERENCES bus_campaign(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_lead
    ADD CONSTRAINT fk_bus_lead_campaign_id
      FOREIGN KEY (campaign_id)
      REFERENCES bus_campaign(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity
    ADD CONSTRAINT fk_bus_opportunity_campaign_id
      FOREIGN KEY (campaign_id)
      REFERENCES bus_campaign(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity_line_item
    ADD CONSTRAINT fk_bus_opportunity_line_item_opportunity_id
      FOREIGN KEY (opportunity_id)
      REFERENCES bus_opportunity(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_quote
    ADD CONSTRAINT fk_bus_quote_opportunity_id
      FOREIGN KEY (opportunity_id)
      REFERENCES bus_opportunity(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_opportunity_id
      FOREIGN KEY (opportunity_id)
      REFERENCES bus_opportunity(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity_line_item
    ADD CONSTRAINT fk_bus_opportunity_line_item_product_id
      FOREIGN KEY (product_id)
      REFERENCES bus_product(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_quote_line_item
    ADD CONSTRAINT fk_bus_quote_line_item_product_id
      FOREIGN KEY (product_id)
      REFERENCES bus_product(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_quote_line_item
    ADD CONSTRAINT fk_bus_quote_line_item_quote_id
      FOREIGN KEY (quote_id)
      REFERENCES bus_quote(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_contract
    ADD CONSTRAINT fk_bus_contract_quote_id
      FOREIGN KEY (quote_id)
      REFERENCES bus_quote(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_contract_id
      FOREIGN KEY (contract_id)
      REFERENCES bus_contract(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_support_case_id
      FOREIGN KEY (support_case_id)
      REFERENCES bus_support_case(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_account
    ADD CONSTRAINT fk_bus_account_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_contact
    ADD CONSTRAINT fk_bus_contact_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_lead
    ADD CONSTRAINT fk_bus_lead_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_campaign
    ADD CONSTRAINT fk_bus_campaign_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_opportunity
    ADD CONSTRAINT fk_bus_opportunity_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_quote
    ADD CONSTRAINT fk_bus_quote_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_contract
    ADD CONSTRAINT fk_bus_contract_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_support_case
    ADD CONSTRAINT fk_bus_support_case_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
  await sql`
    ALTER TABLE bus_activity
    ADD CONSTRAINT fk_bus_activity_user_id
      FOREIGN KEY (user_id)
      REFERENCES bus_user(id)
      ON DELETE SET NULL ON UPDATE CASCADE
  `.execute(db).catch(() => {});
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS bus_user CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_team CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_territory CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_account CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_contact CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_lead CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_campaign CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_campaign_member CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_opportunity CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_opportunity_line_item CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_product CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_quote_line_item CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_contract CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_support_case CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_sla_policy CASCADE`.execute(db);
  await sql`DROP TABLE IF EXISTS bus_activity CASCADE`.execute(db);
}
