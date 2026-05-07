/**
 * Business Tables Migration
 * Creates all business entity tables
 *
 * Generated: 2026-05-07T08:59:26.512Z
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ==========================================================================
  // Company (bus_company)
  // ==========================================================================
  await knex.schema.createTable('bus_company', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // name: string (required)
    table.string('name', 255).notNullable();
    // industry: string
    table.string('industry', 255);
    // website: string
    table.string('website', 255);
    // phone: string
    table.string('phone', 255);
    // email: string
    table.string('email', 255);
    // employee_count: integer
    table.integer('employee_count');
    // annual_revenue: decimal
    table.decimal('annual_revenue', 18, 6);
    // status: string (required)
    table.string('status', 255).notNullable();
    // owner_id: string (required)
    table.string('owner_id', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

  // ==========================================================================
  // Contact (bus_contact)
  // ==========================================================================
  await knex.schema.createTable('bus_contact', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // company_id: string
    table.string('company_id', 255);
    // first_name: string (required)
    table.string('first_name', 255).notNullable();
    // last_name: string (required)
    table.string('last_name', 255).notNullable();
    // email: string (required) (unique)
    table.string('email', 255).notNullable().unique();
    // phone: string
    table.string('phone', 255);
    // mobile: string
    table.string('mobile', 255);
    // job_title: string
    table.string('job_title', 255);
    // department: string
    table.string('department', 255);
    // status: string (required)
    table.string('status', 255).notNullable();
    // lead_source: string
    table.string('lead_source', 255);
    // owner_id: string (required)
    table.string('owner_id', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['email']);
  });

  // ==========================================================================
  // Deal (bus_deal)
  // ==========================================================================
  await knex.schema.createTable('bus_deal', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // company_id: string
    table.string('company_id', 255);
    // contact_id: string
    table.string('contact_id', 255);
    // name: string (required)
    table.string('name', 255).notNullable();
    // amount: decimal
    table.decimal('amount', 18, 6);
    // currency: string (required)
    table.string('currency', 255).notNullable();
    // stage: string (required)
    table.string('stage', 255).notNullable();
    // probability: integer
    table.integer('probability');
    // expected_close_date: date
    table.date('expected_close_date');
    // actual_close_date: date
    table.date('actual_close_date');
    // status: string (required)
    table.string('status', 255).notNullable();
    // description: text
    table.text('description');
    // owner_id: string (required)
    table.string('owner_id', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

  // ==========================================================================
  // Deal Stage (bus_deal_stage)
  // ==========================================================================
  await knex.schema.createTable('bus_deal_stage', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // pipeline_id: string (required)
    table.string('pipeline_id', 255).notNullable();
    // name: string (required)
    table.string('name', 255).notNullable();
    // sort_order: integer (required)
    table.integer('sort_order').notNullable();
    // default_probability: integer (required)
    table.integer('default_probability').notNullable();
    // is_won: boolean (required)
    table.boolean('is_won').notNullable();
    // is_lost: boolean (required)
    table.boolean('is_lost').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

  // ==========================================================================
  // Pipeline (bus_pipeline)
  // ==========================================================================
  await knex.schema.createTable('bus_pipeline', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // name: string (required)
    table.string('name', 255).notNullable();
    // is_default: boolean (required)
    table.boolean('is_default').notNullable();
    // is_active: boolean (required)
    table.boolean('is_active').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

  // ==========================================================================
  // Activity (bus_activity)
  // ==========================================================================
  await knex.schema.createTable('bus_activity', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // contact_id: string
    table.string('contact_id', 255);
    // company_id: string
    table.string('company_id', 255);
    // deal_id: string
    table.string('deal_id', 255);
    // activity_type: string (required)
    table.string('activity_type', 255).notNullable();
    // subject: string (required)
    table.string('subject', 255).notNullable();
    // description: text
    table.text('description');
    // scheduled_at: datetime
    table.timestamp('scheduled_at');
    // completed_at: datetime
    table.timestamp('completed_at');
    // duration_minutes: integer
    table.integer('duration_minutes');
    // status: string (required)
    table.string('status', 255).notNullable();
    // owner_id: string (required)
    table.string('owner_id', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
  });

  // ==========================================================================
  // Note (bus_note)
  // ==========================================================================
  await knex.schema.createTable('bus_note', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // contact_id: string
    table.string('contact_id', 255);
    // company_id: string
    table.string('company_id', 255);
    // deal_id: string
    table.string('deal_id', 255);
    // content: text (required)
    table.text('content').notNullable();
    // is_pinned: boolean (required)
    table.boolean('is_pinned').notNullable();
    // author_id: string (required)
    table.string('author_id', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
  });

  // ==========================================================================
  // Task (bus_task)
  // ==========================================================================
  await knex.schema.createTable('bus_task', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // contact_id: string
    table.string('contact_id', 255);
    // company_id: string
    table.string('company_id', 255);
    // deal_id: string
    table.string('deal_id', 255);
    // title: string (required)
    table.string('title', 255).notNullable();
    // description: text
    table.text('description');
    // priority: string (required)
    table.string('priority', 255).notNullable();
    // status: string (required)
    table.string('status', 255).notNullable();
    // due_date: date
    table.date('due_date');
    // completed_at: datetime
    table.timestamp('completed_at');
    // assigned_to: string (required)
    table.string('assigned_to', 255).notNullable();
    // created_by: string (required)
    table.string('created_by', 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
  });

  // ==========================================================================
  // Email Message (bus_email_message)
  // ==========================================================================
  await knex.schema.createTable('bus_email_message', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // contact_id: string
    table.string('contact_id', 255);
    // deal_id: string
    table.string('deal_id', 255);
    // thread_id: string
    table.string('thread_id', 255);
    // subject: string (required)
    table.string('subject', 255).notNullable();
    // body_text: text
    table.text('body_text');
    // body_html: text
    table.text('body_html');
    // direction: string (required)
    table.string('direction', 255).notNullable();
    // sent_at: datetime
    table.timestamp('sent_at');
    // received_at: datetime
    table.timestamp('received_at');
    // opened_at: datetime
    table.timestamp('opened_at');
    // open_count: integer (required)
    table.integer('open_count').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
  });

  // ==========================================================================
  // Email Template (bus_email_template)
  // ==========================================================================
  await knex.schema.createTable('bus_email_template', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // name: string (required)
    table.string('name', 255).notNullable();
    // subject: string (required)
    table.string('subject', 255).notNullable();
    // body_html: text (required)
    table.text('body_html').notNullable();
    // body_text: text
    table.text('body_text');
    // category: string
    table.string('category', 255);
    // is_active: boolean (required)
    table.boolean('is_active').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================
  await knex.schema.createTable('bus_product', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // name: string (required)
    table.string('name', 255).notNullable();
    // sku: string (required) (unique)
    table.string('sku', 255).notNullable().unique();
    // description: text
    table.text('description');
    // unit_price: decimal (required)
    table.decimal('unit_price', 18, 6).notNullable();
    // currency: string (required)
    table.string('currency', 255).notNullable();
    // is_active: boolean (required)
    table.boolean('is_active').notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
    table.index(['sku']);
  });

  // ==========================================================================
  // Quote (bus_quote)
  // ==========================================================================
  await knex.schema.createTable('bus_quote', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // deal_id: string (required)
    table.string('deal_id', 255).notNullable();
    // quote_number: string (required) (unique)
    table.string('quote_number', 255).notNullable().unique();
    // status: string (required)
    table.string('status', 255).notNullable();
    // valid_until: date
    table.date('valid_until');
    // subtotal: decimal (required)
    table.decimal('subtotal', 18, 6).notNullable();
    // discount_amount: decimal (required)
    table.decimal('discount_amount', 18, 6).notNullable();
    // tax_amount: decimal (required)
    table.decimal('tax_amount', 18, 6).notNullable();
    // total_amount: decimal (required)
    table.decimal('total_amount', 18, 6).notNullable();
    // terms: text
    table.text('terms');
    // notes: text
    table.text('notes');

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['quote_number']);
  });

  // ==========================================================================
  // Quote Item (bus_quote_item)
  // ==========================================================================
  await knex.schema.createTable('bus_quote_item', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // quote_id: string (required)
    table.string('quote_id', 255).notNullable();
    // product_id: string (required)
    table.string('product_id', 255).notNullable();
    // description: string
    table.string('description', 255);
    // quantity: integer (required)
    table.integer('quantity').notNullable();
    // unit_price: decimal (required)
    table.decimal('unit_price', 18, 6).notNullable();
    // discount_percent: decimal (required)
    table.decimal('discount_percent', 18, 6).notNullable();
    // total_price: decimal (required)
    table.decimal('total_price', 18, 6).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
  });

  // ==========================================================================
  // User (bus_user)
  // ==========================================================================
  await knex.schema.createTable('bus_user', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // email: string (required) (unique)
    table.string('email', 255).notNullable().unique();
    // first_name: string (required)
    table.string('first_name', 255).notNullable();
    // last_name: string (required)
    table.string('last_name', 255).notNullable();
    // role: string (required)
    table.string('role', 255).notNullable();
    // team_id: string
    table.string('team_id', 255);
    // is_active: boolean (required)
    table.boolean('is_active').notNullable();
    // last_login: datetime
    table.timestamp('last_login');

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['email']);
  });

  // ==========================================================================
  // Team (bus_team)
  // ==========================================================================
  await knex.schema.createTable('bus_team', (table) => {
    // Primary Key
    table.uuid('id').primary();

    // name: string (required)
    table.string('name', 255).notNullable();
    // manager_id: string
    table.string('manager_id', 255);

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp('deleted_at');

    // Optimistic concurrency control (ETag)
    table.integer('version').notNullable().defaultTo(1);


    // Indexes for commonly queried columns
    table.index(['id']);
    table.index(['name']);
  });

}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bus_company');
  await knex.schema.dropTableIfExists('bus_contact');
  await knex.schema.dropTableIfExists('bus_deal');
  await knex.schema.dropTableIfExists('bus_deal_stage');
  await knex.schema.dropTableIfExists('bus_pipeline');
  await knex.schema.dropTableIfExists('bus_activity');
  await knex.schema.dropTableIfExists('bus_note');
  await knex.schema.dropTableIfExists('bus_task');
  await knex.schema.dropTableIfExists('bus_email_message');
  await knex.schema.dropTableIfExists('bus_email_template');
  await knex.schema.dropTableIfExists('bus_product');
  await knex.schema.dropTableIfExists('bus_quote');
  await knex.schema.dropTableIfExists('bus_quote_item');
  await knex.schema.dropTableIfExists('bus_user');
  await knex.schema.dropTableIfExists('bus_team');
}
