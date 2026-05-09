/**
 * Business Tables Migration
 * Creates all business entity tables
 *
 * Generated: 2026-03-20T16:41:26.582Z
 */

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ==========================================================================
  // Customer (bus_customer)
  // ==========================================================================
  await knex.schema.createTable("bus_customer", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // name: string (required)
    table.string("name", 255).notNullable();
    // email: string (required) (unique)
    table.string("email", 255).notNullable().unique();
    // phone: string (required)
    table.string("phone", 255).notNullable();
    // city: string (required)
    table.string("city", 255).notNullable();
    // status: string (required)
    table.string("status", 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
    table.index(["name"]);
    table.index(["email"]);
  });

  // ==========================================================================
  // Order (bus_order)
  // ==========================================================================
  await knex.schema.createTable("bus_order", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // customer_id: string (required)
    table.string("customer_id", 255).notNullable();
    // order_date: date (required)
    table.date("order_date").notNullable();
    // total_amount: decimal (required)
    table.decimal("total_amount", 18, 6).notNullable();
    // status: string (required)
    table.string("status", 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
  });

  // ==========================================================================
  // Order Item (bus_order_item)
  // ==========================================================================
  await knex.schema.createTable("bus_order_item", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // order_id: string (required)
    table.string("order_id", 255).notNullable();
    // product_id: string (required)
    table.string("product_id", 255).notNullable();
    // quantity: integer (required)
    table.integer("quantity").notNullable();
    // unit_price: decimal (required)
    table.decimal("unit_price", 18, 6).notNullable();
    // line_total: decimal (required)
    table.decimal("line_total", 18, 6).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
  });

  // ==========================================================================
  // Product (bus_product)
  // ==========================================================================
  await knex.schema.createTable("bus_product", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // name: string (required)
    table.string("name", 255).notNullable();
    // description: string (required)
    table.string("description", 255).notNullable();
    // price: decimal (required)
    table.decimal("price", 18, 6).notNullable();
    // stock_quantity: integer (required)
    table.integer("stock_quantity").notNullable();
    // category: string (required)
    table.string("category", 255).notNullable();
    // is_active: boolean (required)
    table.boolean("is_active").notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
    table.index(["name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("bus_customer");
  await knex.schema.dropTableIfExists("bus_order");
  await knex.schema.dropTableIfExists("bus_order_item");
  await knex.schema.dropTableIfExists("bus_product");
}
