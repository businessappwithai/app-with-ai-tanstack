/**
 * Business Tables Migration
 * Creates all business entity tables
 *
 * Generated: 2026-05-06T11:42:08.731Z
 */

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ==========================================================================
  // Users (bus_users)
  // ==========================================================================
  await knex.schema.createTable("bus_users", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // username: string (required) (unique)
    table.string("username", 255).notNullable().unique();
    // email: string (required) (unique)
    table.string("email", 255).notNullable().unique();
    // password_hash: string (required)
    table.string("password_hash", 255).notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
    table.index(["username"]);
    table.index(["email"]);
  });

  // ==========================================================================
  // Posts (bus_posts)
  // ==========================================================================
  await knex.schema.createTable("bus_posts", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // title: string (required)
    table.string("title", 255).notNullable();
    // content: text (required)
    table.text("content").notNullable();
    // user_id: integer (required)
    table.integer("user_id").notNullable();

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
  // Comments (bus_comments)
  // ==========================================================================
  await knex.schema.createTable("bus_comments", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // content: text (required)
    table.text("content").notNullable();
    // user_id: integer (required)
    table.integer("user_id").notNullable();
    // post_id: integer (required)
    table.integer("post_id").notNullable();

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
  // Tags (bus_tags)
  // ==========================================================================
  await knex.schema.createTable("bus_tags", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // name: string (required) (unique)
    table.string("name", 255).notNullable().unique();

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

  // ==========================================================================
  // Post Tags (bus_post_tags)
  // ==========================================================================
  await knex.schema.createTable("bus_post_tags", (table) => {
    // Primary Key
    table.uuid("id").primary();

    // post_id: integer (required)
    table.integer("post_id").notNullable();
    // tag_id: integer (required)
    table.integer("tag_id").notNullable();

    // Timestamps
    table.timestamps(true, true);

    // Soft delete support
    table.timestamp("deleted_at");

    // Optimistic concurrency control (ETag)
    table.integer("version").notNullable().defaultTo(1);

    // Indexes for commonly queried columns
    table.index(["id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("bus_users");
  await knex.schema.dropTableIfExists("bus_posts");
  await knex.schema.dropTableIfExists("bus_comments");
  await knex.schema.dropTableIfExists("bus_tags");
  await knex.schema.dropTableIfExists("bus_post_tags");
}
