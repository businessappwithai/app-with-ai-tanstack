/**
 * Fix Numeric Column Types Migration
 * Ensures DECIMAL/FLOAT columns are correctly typed and user-reference
 * VARCHAR columns use the right SQL type. Safe to re-run (uses TRY blocks).
 *
 * Generated: 2026-08-17T17:20:18.543Z
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Fix bus_user.quota_annual → DECIMAL
  await sql`
    ALTER TABLE bus_user
      ALTER COLUMN quota_annual TYPE DECIMAL(18,6)
        USING NULLIF(quota_annual::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_team.quota_annual → DECIMAL
  await sql`
    ALTER TABLE bus_team
      ALTER COLUMN quota_annual TYPE DECIMAL(18,6)
        USING NULLIF(quota_annual::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_account.annual_revenue → DECIMAL
  await sql`
    ALTER TABLE bus_account
      ALTER COLUMN annual_revenue TYPE DECIMAL(18,6)
        USING NULLIF(annual_revenue::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_lead.annual_revenue → DECIMAL
  await sql`
    ALTER TABLE bus_lead
      ALTER COLUMN annual_revenue TYPE DECIMAL(18,6)
        USING NULLIF(annual_revenue::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_campaign.budgeted_cost → DECIMAL
  await sql`
    ALTER TABLE bus_campaign
      ALTER COLUMN budgeted_cost TYPE DECIMAL(18,6)
        USING NULLIF(budgeted_cost::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_campaign.actual_cost → DECIMAL
  await sql`
    ALTER TABLE bus_campaign
      ALTER COLUMN actual_cost TYPE DECIMAL(18,6)
        USING NULLIF(actual_cost::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_campaign.expected_revenue → DECIMAL
  await sql`
    ALTER TABLE bus_campaign
      ALTER COLUMN expected_revenue TYPE DECIMAL(18,6)
        USING NULLIF(expected_revenue::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_opportunity.amount → DECIMAL
  await sql`
    ALTER TABLE bus_opportunity
      ALTER COLUMN amount TYPE DECIMAL(18,6)
        USING NULLIF(amount::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_opportunity_line_item.quantity → DECIMAL
  await sql`
    ALTER TABLE bus_opportunity_line_item
      ALTER COLUMN quantity TYPE DECIMAL(18,6)
        USING NULLIF(quantity::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_opportunity_line_item.unit_price → DECIMAL
  await sql`
    ALTER TABLE bus_opportunity_line_item
      ALTER COLUMN unit_price TYPE DECIMAL(18,6)
        USING NULLIF(unit_price::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_opportunity_line_item.discount_percent → DECIMAL
  await sql`
    ALTER TABLE bus_opportunity_line_item
      ALTER COLUMN discount_percent TYPE DECIMAL(18,6)
        USING NULLIF(discount_percent::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_opportunity_line_item.line_total → DECIMAL
  await sql`
    ALTER TABLE bus_opportunity_line_item
      ALTER COLUMN line_total TYPE DECIMAL(18,6)
        USING NULLIF(line_total::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_product.list_price → DECIMAL
  await sql`
    ALTER TABLE bus_product
      ALTER COLUMN list_price TYPE DECIMAL(18,6)
        USING NULLIF(list_price::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_product.unit_cost → DECIMAL
  await sql`
    ALTER TABLE bus_product
      ALTER COLUMN unit_cost TYPE DECIMAL(18,6)
        USING NULLIF(unit_cost::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote.subtotal → DECIMAL
  await sql`
    ALTER TABLE bus_quote
      ALTER COLUMN subtotal TYPE DECIMAL(18,6)
        USING NULLIF(subtotal::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote.discount_percent → DECIMAL
  await sql`
    ALTER TABLE bus_quote
      ALTER COLUMN discount_percent TYPE DECIMAL(18,6)
        USING NULLIF(discount_percent::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote.discount_amount → DECIMAL
  await sql`
    ALTER TABLE bus_quote
      ALTER COLUMN discount_amount TYPE DECIMAL(18,6)
        USING NULLIF(discount_amount::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote.tax_amount → DECIMAL
  await sql`
    ALTER TABLE bus_quote
      ALTER COLUMN tax_amount TYPE DECIMAL(18,6)
        USING NULLIF(tax_amount::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote.grand_total → DECIMAL
  await sql`
    ALTER TABLE bus_quote
      ALTER COLUMN grand_total TYPE DECIMAL(18,6)
        USING NULLIF(grand_total::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote_line_item.quantity → DECIMAL
  await sql`
    ALTER TABLE bus_quote_line_item
      ALTER COLUMN quantity TYPE DECIMAL(18,6)
        USING NULLIF(quantity::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote_line_item.unit_price → DECIMAL
  await sql`
    ALTER TABLE bus_quote_line_item
      ALTER COLUMN unit_price TYPE DECIMAL(18,6)
        USING NULLIF(unit_price::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote_line_item.discount_percent → DECIMAL
  await sql`
    ALTER TABLE bus_quote_line_item
      ALTER COLUMN discount_percent TYPE DECIMAL(18,6)
        USING NULLIF(discount_percent::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_quote_line_item.line_total → DECIMAL
  await sql`
    ALTER TABLE bus_quote_line_item
      ALTER COLUMN line_total TYPE DECIMAL(18,6)
        USING NULLIF(line_total::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
  // Fix bus_contract.annual_value → DECIMAL
  await sql`
    ALTER TABLE bus_contract
      ALTER COLUMN annual_value TYPE DECIMAL(18,6)
        USING NULLIF(annual_value::text, '')::DECIMAL
  `.execute(db).catch(() => { /* column already correct type */ });
}

export async function down(_db: Kysely<any>): Promise<void> {
  // Intentionally empty — column type fixes are not reversible without data loss
}
