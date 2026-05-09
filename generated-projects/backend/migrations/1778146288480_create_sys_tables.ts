/**
 * System Tables Migration (sys_ prefix)
 * Application Dictionary tables following Compiere pattern
 *
 * Generated: 2026-05-07T09:31:28.482Z
 */

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // sys_reference - Reference/Data Types
  // ============================================================================
  await knex.schema.createTable("sys_reference", (table) => {
    table.integer("sys_reference_id").primary();
    table.string("name", 100).notNullable();
    table.text("description");
    table.string("validation_type", 1).notNullable().defaultTo("S");
    table.string("vformat", 40);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);
  });

  // ============================================================================
  // sys_ref_list - Reference List Values
  // ============================================================================
  await knex.schema.createTable("sys_ref_list", (table) => {
    table.uuid("sys_ref_list_id").primary();
    table
      .integer("sys_reference_id")
      .notNullable()
      .references("sys_reference_id")
      .inTable("sys_reference")
      .onDelete("CASCADE");
    table.string("value", 40).notNullable();
    table.string("name", 100).notNullable();
    table.text("description");
    table.date("valid_from");
    table.date("valid_to");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.unique(["sys_reference_id", "value"]);
  });

  // ============================================================================
  // sys_val_rule - Validation Rules
  // ============================================================================
  await knex.schema.createTable("sys_val_rule", (table) => {
    table.uuid("sys_val_rule_id").primary();
    table.string("name", 100).notNullable();
    table.text("description");
    table.string("type", 1).notNullable().defaultTo("S");
    table.text("code").notNullable();
    table.text("error_msg");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);
  });

  // ============================================================================
  // sys_table - Table Metadata
  // ============================================================================
  await knex.schema.createTable("sys_table", (table) => {
    table.uuid("sys_table_id").primary();
    table.string("table_name", 100).notNullable().unique();
    table.string("name", 100).notNullable();
    table.text("description");
    table.string("icon", 100).defaultTo("Table"); // Icon name (lucide-react) or emoji
    table.string("access_level", 2).notNullable().defaultTo("A");
    table.boolean("is_view").notNullable().defaultTo(false);
    table.boolean("is_document").notNullable().defaultTo(false);
    table.boolean("is_high_volume").notNullable().defaultTo(false);
    table.boolean("is_changelog").notNullable().defaultTo(true);
    table.string("replication_type", 40);
    table.uuid("sys_window_id");
    table.uuid("po_window_id");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["table_name"]);
    table.index(["is_active"]);
  });

  // ============================================================================
  // sys_column - Column Metadata
  // ============================================================================
  await knex.schema.createTable("sys_column", (table) => {
    table.uuid("sys_column_id").primary();
    table
      .uuid("sys_table_id")
      .notNullable()
      .references("sys_table_id")
      .inTable("sys_table")
      .onDelete("CASCADE");
    table.string("column_name", 100).notNullable();
    table.string("name", 100).notNullable();
    table.text("description");
    table
      .integer("sys_reference_id")
      .notNullable()
      .references("sys_reference_id")
      .inTable("sys_reference");
    table
      .uuid("sys_val_rule_id")
      .references("sys_val_rule_id")
      .inTable("sys_val_rule")
      .onDelete("SET NULL");
    table.integer("field_length");
    table.string("default_value", 255);
    table.string("value_min", 40);
    table.string("value_max", 40);
    table.boolean("is_key").notNullable().defaultTo(false);
    table.boolean("is_parent").notNullable().defaultTo(false);
    table.boolean("is_mandatory").notNullable().defaultTo(false);
    table.boolean("is_updateable").notNullable().defaultTo(true);
    table.boolean("is_identifier").notNullable().defaultTo(false);
    table.boolean("is_selection_column").notNullable().defaultTo(false);
    table.boolean("is_translated").notNullable().defaultTo(false);
    table.boolean("is_encrypted").notNullable().defaultTo(false);
    table.boolean("is_allow_logging").notNullable().defaultTo(true);
    table.boolean("is_allow_copy").notNullable().defaultTo(true);
    table.integer("seq_no").notNullable().defaultTo(0);
    table.string("callout", 255);
    table.text("read_only_logic");
    table.text("mandatory_logic");
    table.string("format_pattern", 40);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.unique(["sys_table_id", "column_name"]);
    table.index(["sys_table_id"]);
    table.index(["column_name"]);
  });

  // ============================================================================
  // sys_ref_table - Reference Table Configuration
  // ============================================================================
  await knex.schema.createTable("sys_ref_table", (table) => {
    table.uuid("sys_ref_table_id").primary();
    table
      .integer("sys_reference_id")
      .notNullable()
      .references("sys_reference_id")
      .inTable("sys_reference")
      .onDelete("CASCADE");
    table
      .uuid("sys_table_id")
      .notNullable()
      .references("sys_table_id")
      .inTable("sys_table")
      .onDelete("CASCADE");
    table
      .uuid("key_column_id")
      .notNullable()
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("CASCADE");
    table
      .uuid("display_column_id")
      .notNullable()
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("CASCADE");
    table.boolean("is_value_displayed").notNullable().defaultTo(false);
    table.string("order_by_clause", 255);
    table.text("where_clause");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.unique(["sys_reference_id"]);
  });

  // ============================================================================
  // sys_window - Window Metadata
  // ============================================================================
  await knex.schema.createTable("sys_window", (table) => {
    table.uuid("sys_window_id").primary();
    table.string("name", 100).notNullable();
    table.text("description");
    table.text("help");
    table.string("window_type", 1).notNullable().defaultTo("M");
    table.boolean("is_sales_transaction").notNullable().defaultTo(false);
    table.boolean("is_default").notNullable().defaultTo(true);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["name"]);
    table.index(["is_active"]);
  });

  // Add foreign key from sys_table to sys_window
  await knex.schema.alterTable("sys_table", (table) => {
    table
      .foreign("sys_window_id")
      .references("sys_window_id")
      .inTable("sys_window")
      .onDelete("SET NULL");
    table
      .foreign("po_window_id")
      .references("sys_window_id")
      .inTable("sys_window")
      .onDelete("SET NULL");
  });

  // ============================================================================
  // sys_field_group - Field Group Metadata
  // ============================================================================
  await knex.schema.createTable("sys_field_group", (table) => {
    table.uuid("sys_field_group_id").primary();
    table.uuid("sys_tab_id"); // Foreign key added after sys_tab is created
    table.string("name", 100).notNullable();
    table.text("description");
    table.integer("seq_no").notNullable().defaultTo(10);
    table.integer("columns").notNullable().defaultTo(1); // Number of columns (1-4)
    table.string("layout_type", 20).defaultTo("single"); // single, two-column, three-column, four-column
    table.string("field_group_type", 1).notNullable().defaultTo("C");
    table.boolean("is_collapsed_by_default").notNullable().defaultTo(false);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["sys_tab_id"]);
  });

  // ============================================================================
  // sys_tab - Tab Metadata
  // ============================================================================
  await knex.schema.createTable("sys_tab", (table) => {
    table.uuid("sys_tab_id").primary();
    table
      .uuid("sys_window_id")
      .notNullable()
      .references("sys_window_id")
      .inTable("sys_window")
      .onDelete("CASCADE");
    table
      .uuid("sys_table_id")
      .notNullable()
      .references("sys_table_id")
      .inTable("sys_table")
      .onDelete("CASCADE");
    table.string("name", 100).notNullable();
    table.text("description");
    table.text("help");
    table.integer("tab_level").notNullable().defaultTo(0);
    table.integer("seq_no").notNullable().defaultTo(10);
    table.boolean("is_single_row").notNullable().defaultTo(false);
    table.boolean("has_tree").notNullable().defaultTo(false);
    table.boolean("is_info_tab").notNullable().defaultTo(false);
    table.boolean("is_translation_tab").notNullable().defaultTo(false);
    table.boolean("is_read_only").notNullable().defaultTo(false);
    table.boolean("is_insert_record").notNullable().defaultTo(true);
    table.boolean("is_advanced_tab").notNullable().defaultTo(false);
    table
      .uuid("parent_column_id")
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("SET NULL");
    table
      .uuid("link_column_id")
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("SET NULL");
    table.string("order_by_clause", 255);
    table.text("where_clause");
    table.text("display_logic");
    table.text("read_only_logic");
    table.text("commit_warning");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["sys_window_id", "seq_no"]);
    table.index(["sys_table_id"]);
  });

  // Add foreign key from sys_field_group to sys_tab
  await knex.schema.alterTable("sys_field_group", (table) => {
    table.foreign("sys_tab_id").references("sys_tab_id").inTable("sys_tab").onDelete("CASCADE");
  });

  // ============================================================================
  // sys_field - Field Metadata (CRITICAL: seq_no controls UI order)
  // ============================================================================
  await knex.schema.createTable("sys_field", (table) => {
    table.uuid("sys_field_id").primary();
    table
      .uuid("sys_tab_id")
      .notNullable()
      .references("sys_tab_id")
      .inTable("sys_tab")
      .onDelete("CASCADE");
    table
      .uuid("sys_column_id")
      .notNullable()
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("CASCADE");
    table
      .uuid("sys_field_group_id")
      .references("sys_field_group_id")
      .inTable("sys_field_group")
      .onDelete("SET NULL");
    table.string("name", 100).notNullable();
    table.text("description");
    table.text("help");

    // Layout properties - RUNTIME MODIFIABLE BY ADMIN
    table.integer("seq_no").notNullable().defaultTo(0); // Form field order
    table.integer("seq_no_grid").notNullable().defaultTo(0); // Grid column order
    table.integer("display_length");
    table.integer("x_position");
    table.integer("y_position");
    table.integer("column_span");
    table.integer("num_lines");

    // Display properties
    table.boolean("is_displayed").notNullable().defaultTo(true);
    table.boolean("is_displayed_grid").notNullable().defaultTo(true);
    table.boolean("is_read_only").notNullable().defaultTo(false);
    table.boolean("is_encrypted").notNullable().defaultTo(false);
    table.boolean("is_same_line").notNullable().defaultTo(false);
    table.boolean("is_heading").notNullable().defaultTo(false);
    table.boolean("is_field_only").notNullable().defaultTo(false);

    // Dynamic logic
    table.text("display_logic");
    table.text("read_only_logic");
    table.text("mandatory_logic");
    table.string("obscure_type", 40);

    // Related components
    table.uuid("included_tab_id").references("sys_tab_id").inTable("sys_tab").onDelete("SET NULL");
    table.string("default_value", 255);
    table.integer("sort_no");

    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.unique(["sys_tab_id", "sys_column_id"]);
    table.index(["sys_tab_id", "seq_no"]);
    table.index(["sys_tab_id", "seq_no_grid"]);
    table.index(["sys_column_id"]);
  });

  // ============================================================================
  // sys_role - Role Definition
  // ============================================================================
  await knex.schema.createTable("sys_role", (table) => {
    table.uuid("sys_role_id").primary();
    table.string("name", 100).notNullable().unique();
    table.text("description");
    table.string("user_level", 40).notNullable().defaultTo("C");
    table.boolean("is_master_role").notNullable().defaultTo(false);
    table.boolean("is_can_export").notNullable().defaultTo(true);
    table.boolean("is_can_report").notNullable().defaultTo(true);
    table.boolean("is_personal_lock").notNullable().defaultTo(false);
    table.boolean("is_personal_access").notNullable().defaultTo(false);
    table.integer("max_query_records").notNullable().defaultTo(0);
    table.string("connection_profile", 100);
    table.string("preference_type", 40);
    table.boolean("is_show_accounting").notNullable().defaultTo(false);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["name"]);
    table.index(["is_active"]);
  });

  // ============================================================================
  // sys_user - User Account
  // ============================================================================
  await knex.schema.createTable("sys_user", (table) => {
    table.uuid("sys_user_id").primary();
    table.string("name", 100).notNullable();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.text("description");
    table.boolean("is_system_user").notNullable().defaultTo(false);
    table.boolean("is_sales_rep").notNullable().defaultTo(false);
    table.timestamp("login_date");
    table.integer("login_failure_count").notNullable().defaultTo(0);
    table.boolean("is_locked").notNullable().defaultTo(false);
    table.boolean("is_account_verified").notNullable().defaultTo(false);
    table.string("notification_type", 40);
    table.uuid("supervisor_id").references("sys_user_id").inTable("sys_user").onDelete("SET NULL");
    table
      .uuid("default_sys_role_id")
      .references("sys_role_id")
      .inTable("sys_role")
      .onDelete("SET NULL");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["email"]);
    table.index(["is_active"]);
  });

  // ============================================================================
  // sys_user_roles - User-Role Assignment
  // ============================================================================
  await knex.schema.createTable("sys_user_roles", (table) => {
    table.uuid("sys_user_roles_id").primary();
    table
      .uuid("sys_user_id")
      .notNullable()
      .references("sys_user_id")
      .inTable("sys_user")
      .onDelete("CASCADE");
    table
      .uuid("sys_role_id")
      .notNullable()
      .references("sys_role_id")
      .inTable("sys_role")
      .onDelete("CASCADE");
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.unique(["sys_user_id", "sys_role_id"]);
    table.index(["sys_user_id"]);
    table.index(["sys_role_id"]);
  });

  // ============================================================================
  // sys_access - Access Control
  // ============================================================================
  await knex.schema.createTable("sys_access", (table) => {
    table.uuid("sys_access_id").primary();
    table
      .uuid("sys_role_id")
      .notNullable()
      .references("sys_role_id")
      .inTable("sys_role")
      .onDelete("CASCADE");
    table.uuid("sys_table_id").references("sys_table_id").inTable("sys_table").onDelete("CASCADE");
    table
      .uuid("sys_window_id")
      .references("sys_window_id")
      .inTable("sys_window")
      .onDelete("CASCADE");
    table.string("access_type_table", 1).notNullable().defaultTo("R");
    table.boolean("is_read_only").notNullable().defaultTo(false);
    table.boolean("is_exclude").notNullable().defaultTo(false);
    table.string("entity_type", 40).notNullable().defaultTo("U");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.string("created_by", 100).notNullable();
    table.string("updated_by", 100).notNullable();
    table.timestamps(true, true);

    table.index(["sys_role_id"]);
    table.index(["sys_table_id"]);
    table.index(["sys_window_id"]);
  });

  // ============================================================================
  // sys_change_log - Audit Trail
  // ============================================================================
  await knex.schema.createTable("sys_change_log", (table) => {
    table.uuid("sys_change_log_id").primary();
    table
      .uuid("sys_table_id")
      .notNullable()
      .references("sys_table_id")
      .inTable("sys_table")
      .onDelete("CASCADE");
    table
      .uuid("sys_column_id")
      .references("sys_column_id")
      .inTable("sys_column")
      .onDelete("SET NULL");
    table.string("record_id", 36).notNullable();
    table.uuid("sys_user_id").references("sys_user_id").inTable("sys_user").onDelete("SET NULL");
    table.string("event_type", 1).notNullable(); // I=Insert, U=Update, D=Delete
    table.text("old_value");
    table.text("new_value");
    table.text("description");
    table.string("trx_name", 100);
    table.timestamps(true, true);

    table.index(["sys_table_id", "record_id"]);
    table.index(["created_at"]);
  });

  // ============================================================================
  // sys_session - User Session
  // ============================================================================
  await knex.schema.createTable("sys_session", (table) => {
    table.uuid("sys_session_id").primary();
    table
      .uuid("sys_user_id")
      .notNullable()
      .references("sys_user_id")
      .inTable("sys_user")
      .onDelete("CASCADE");
    table.string("web_session", 100);
    table.string("remote_addr", 100);
    table.string("remote_host", 255);
    table.timestamp("login_date").notNullable().defaultTo(knex.fn.now());
    table.timestamp("logout_date");
    table.boolean("is_processed").notNullable().defaultTo(false);
    table.text("description");
    table.timestamps(true, true);

    table.index(["sys_user_id"]);
    table.index(["login_date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order of creation
  await knex.schema.dropTableIfExists("sys_session");
  await knex.schema.dropTableIfExists("sys_change_log");
  await knex.schema.dropTableIfExists("sys_access");
  await knex.schema.dropTableIfExists("sys_user_roles");
  await knex.schema.dropTableIfExists("sys_user");
  await knex.schema.dropTableIfExists("sys_role");
  await knex.schema.dropTableIfExists("sys_field");
  await knex.schema.dropTableIfExists("sys_tab");
  await knex.schema.dropTableIfExists("sys_field_group");

  // Remove foreign keys from sys_table before dropping sys_window
  await knex.schema.alterTable("sys_table", (table) => {
    table.dropForeign(["sys_window_id"]);
    table.dropForeign(["po_window_id"]);
  });

  await knex.schema.dropTableIfExists("sys_window");
  await knex.schema.dropTableIfExists("sys_ref_table");
  await knex.schema.dropTableIfExists("sys_column");
  await knex.schema.dropTableIfExists("sys_table");
  await knex.schema.dropTableIfExists("sys_val_rule");
  await knex.schema.dropTableIfExists("sys_ref_list");
  await knex.schema.dropTableIfExists("sys_reference");
}
