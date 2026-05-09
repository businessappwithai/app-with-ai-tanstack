/**
 * System Dictionary Seed
 * Populates sys_ tables with metadata for business entities
 *
 * Generated: 2026-05-06T11:42:08.739Z
 *
 * This seed creates:
 * - sys_table entries for each business entity
 * - sys_column entries for each entity attribute
 * - sys_window entries for entity management
 * - sys_tab entries for window tabs
 * - sys_field entries with randomized seq_no for runtime modification demo
 */

import type { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";

export async function seed(knex: Knex): Promise<void> {
  const now = new Date();
  const createdBy = "";

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Generate randomized sequence numbers for fields
   * This demonstrates runtime modification capability - admins can reorder later
   */
  function generateRandomSeqNumbers(count: number): number[] {
    const seqNumbers = Array.from({ length: count }, (_, i) => (i + 1) * 10);
    // Fisher-Yates shuffle
    for (let i = seqNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seqNumbers[i], seqNumbers[j]] = [seqNumbers[j], seqNumbers[i]];
    }
    return seqNumbers;
  }

  /**
   * Map entity attribute type to sys_reference_id
   */
  function typeToReferenceId(type: string): number {
    const mapping: Record<string, number> = {
      string: 10,
      integer: 11,
      decimal: 12,
      boolean: 20,
      date: 15,
      datetime: 16,
      text: 14,
      json: 28,
    };
    return mapping[type] || 10;
  }

  // ============================================================================
  // Create Default Roles
  // ============================================================================
  const adminRoleId = uuidv4();
  const userRoleId = uuidv4();

  await knex("sys_role").insert([
    {
      sys_role_id: adminRoleId,
      name: "Administrator",
      description: "System administrator with full access",
      user_level: "S",
      is_master_role: true,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 0,
      is_show_accounting: true,
      entity_type: "D",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_role_id: userRoleId,
      name: "User",
      description: "Standard user with limited access",
      user_level: "C",
      is_master_role: false,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 1000,
      is_show_accounting: false,
      entity_type: "D",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ============================================================================
  // Create Default Admin User
  // ============================================================================
  const adminUserId = uuidv4();

  await knex("sys_user").insert({
    sys_user_id: adminUserId,
    name: "System Administrator",
    email: "admin@localhost",
    password_hash: "$2b$10$rIC/7qZmzCi9F4g4OKL8wO4k5XYzJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5", // placeholder
    description: "Default system administrator",
    is_system_user: true,
    is_sales_rep: false,
    login_failure_count: 0,
    is_locked: false,
    is_account_verified: true,
    default_sys_role_id: adminRoleId,
    entity_type: "D",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Assign admin role to admin user
  await knex("sys_user_roles").insert({
    sys_user_roles_id: uuidv4(),
    sys_user_id: adminUserId,
    sys_role_id: adminRoleId,
    entity_type: "D",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // ============================================================================
  // Create Default Field Groups
  // ============================================================================
  const fieldGroupGeneral = uuidv4();
  const fieldGroupDetails = uuidv4();
  const fieldGroupSystem = uuidv4();

  await knex("sys_field_group").insert([
    {
      sys_field_group_id: fieldGroupGeneral,
      name: "General",
      description: "General information fields",
      field_group_type: "C",
      is_collapsed_by_default: false,
      entity_type: "D",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupDetails,
      name: "Details",
      description: "Detailed information fields",
      field_group_type: "C",
      is_collapsed_by_default: true,
      entity_type: "D",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupSystem,
      name: "System",
      description: "System fields (audit trail)",
      field_group_type: "C",
      is_collapsed_by_default: true,
      entity_type: "D",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
  ]);

  // ============================================================================
  // Business Entities Dictionary Entries
  // ============================================================================

  // --------------------------------------------------------------------------
  // Users (bus_users)
  // --------------------------------------------------------------------------
  const uSERSTableId = uuidv4();
  const uSERSWindowId = uuidv4();
  const uSERSTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: uSERSWindowId,
    name: "Users",
    description: "Maintain Users records",
    window_type: "M",
    is_sales_transaction: false,
    is_default: true,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex("sys_table").insert({
    sys_table_id: uSERSTableId,
    table_name: "bus_users",
    name: "Users",
    description: "USERS entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: uSERSWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: uSERSTabId,
    sys_window_id: uSERSWindowId,
    sys_table_id: uSERSTableId,
    name: "Users",
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_column entries
  const uSERSColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let uSERSColumnSeqNo = 10;
  const uSERS_id_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_id_columnId,
    name: "id",
    displayName: "Id",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_id_columnId,
    sys_table_id: uSERSTableId,
    column_name: "id",
    name: "Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;
  const uSERS_username_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_username_columnId,
    name: "username",
    displayName: "Username",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_username_columnId,
    sys_table_id: uSERSTableId,
    column_name: "username",
    name: "Username",
    sys_reference_id: typeToReferenceId("string"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;
  const uSERS_email_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_email_columnId,
    name: "email",
    displayName: "Email",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_email_columnId,
    sys_table_id: uSERSTableId,
    column_name: "email",
    name: "Email",
    sys_reference_id: typeToReferenceId("string"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;
  const uSERS_passwordHash_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_passwordHash_columnId,
    name: "password_hash",
    displayName: "Password Hash",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_passwordHash_columnId,
    sys_table_id: uSERSTableId,
    column_name: "password_hash",
    name: "Password Hash",
    sys_reference_id: typeToReferenceId("string"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;
  const uSERS_createdAt_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_createdAt_columnId,
    name: "created_at",
    displayName: "Created At",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_createdAt_columnId,
    sys_table_id: uSERSTableId,
    column_name: "created_at",
    name: "Created At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;
  const uSERS_updatedAt_columnId = uuidv4();
  uSERSColumns.push({
    id: uSERS_updatedAt_columnId,
    name: "updated_at",
    displayName: "Updated At",
  });

  await knex("sys_column").insert({
    sys_column_id: uSERS_updatedAt_columnId,
    sys_table_id: uSERSTableId,
    column_name: "updated_at",
    name: "Updated At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: uSERSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  uSERSColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const uSERSSeqNumbers = generateRandomSeqNumbers(uSERSColumns.length);

  for (let i = 0; i < uSERSColumns.length; i++) {
    const col = uSERSColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: uSERSTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: uSERSSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: "U",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  // Grant access to admin role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: uSERSTableId,
    sys_window_id: uSERSWindowId,
    access_type_table: "W",
    is_read_only: false,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: uSERSTableId,
    sys_window_id: uSERSWindowId,
    access_type_table: "R",
    is_read_only: true,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log("✓ Created dictionary entries for Users");

  // --------------------------------------------------------------------------
  // Posts (bus_posts)
  // --------------------------------------------------------------------------
  const pOSTSTableId = uuidv4();
  const pOSTSWindowId = uuidv4();
  const pOSTSTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: pOSTSWindowId,
    name: "Posts",
    description: "Maintain Posts records",
    window_type: "M",
    is_sales_transaction: false,
    is_default: true,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex("sys_table").insert({
    sys_table_id: pOSTSTableId,
    table_name: "bus_posts",
    name: "Posts",
    description: "POSTS entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: pOSTSWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: pOSTSTabId,
    sys_window_id: pOSTSWindowId,
    sys_table_id: pOSTSTableId,
    name: "Posts",
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_column entries
  const pOSTSColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let pOSTSColumnSeqNo = 10;
  const pOSTS_id_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_id_columnId,
    name: "id",
    displayName: "Id",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_id_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "id",
    name: "Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;
  const pOSTS_title_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_title_columnId,
    name: "title",
    displayName: "Title",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_title_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "title",
    name: "Title",
    sys_reference_id: typeToReferenceId("string"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;
  const pOSTS_content_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_content_columnId,
    name: "content",
    displayName: "Content",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_content_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "content",
    name: "Content",
    sys_reference_id: typeToReferenceId("text"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;
  const pOSTS_userId_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_userId_columnId,
    name: "user_id",
    displayName: "User Id",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_userId_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "user_id",
    name: "User Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;
  const pOSTS_createdAt_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_createdAt_columnId,
    name: "created_at",
    displayName: "Created At",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_createdAt_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "created_at",
    name: "Created At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;
  const pOSTS_updatedAt_columnId = uuidv4();
  pOSTSColumns.push({
    id: pOSTS_updatedAt_columnId,
    name: "updated_at",
    displayName: "Updated At",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTS_updatedAt_columnId,
    sys_table_id: pOSTSTableId,
    column_name: "updated_at",
    name: "Updated At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTSColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const pOSTSSeqNumbers = generateRandomSeqNumbers(pOSTSColumns.length);

  for (let i = 0; i < pOSTSColumns.length; i++) {
    const col = pOSTSColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: pOSTSTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: pOSTSSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: "U",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  // Grant access to admin role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: pOSTSTableId,
    sys_window_id: pOSTSWindowId,
    access_type_table: "W",
    is_read_only: false,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: pOSTSTableId,
    sys_window_id: pOSTSWindowId,
    access_type_table: "R",
    is_read_only: true,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log("✓ Created dictionary entries for Posts");

  // --------------------------------------------------------------------------
  // Comments (bus_comments)
  // --------------------------------------------------------------------------
  const cOMMENTSTableId = uuidv4();
  const cOMMENTSWindowId = uuidv4();
  const cOMMENTSTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: cOMMENTSWindowId,
    name: "Comments",
    description: "Maintain Comments records",
    window_type: "M",
    is_sales_transaction: false,
    is_default: true,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex("sys_table").insert({
    sys_table_id: cOMMENTSTableId,
    table_name: "bus_comments",
    name: "Comments",
    description: "COMMENTS entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: cOMMENTSWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: cOMMENTSTabId,
    sys_window_id: cOMMENTSWindowId,
    sys_table_id: cOMMENTSTableId,
    name: "Comments",
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_column entries
  const cOMMENTSColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let cOMMENTSColumnSeqNo = 10;
  const cOMMENTS_id_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_id_columnId,
    name: "id",
    displayName: "Id",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_id_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "id",
    name: "Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;
  const cOMMENTS_content_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_content_columnId,
    name: "content",
    displayName: "Content",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_content_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "content",
    name: "Content",
    sys_reference_id: typeToReferenceId("text"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;
  const cOMMENTS_userId_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_userId_columnId,
    name: "user_id",
    displayName: "User Id",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_userId_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "user_id",
    name: "User Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;
  const cOMMENTS_postId_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_postId_columnId,
    name: "post_id",
    displayName: "Post Id",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_postId_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "post_id",
    name: "Post Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;
  const cOMMENTS_createdAt_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_createdAt_columnId,
    name: "created_at",
    displayName: "Created At",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_createdAt_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "created_at",
    name: "Created At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;
  const cOMMENTS_updatedAt_columnId = uuidv4();
  cOMMENTSColumns.push({
    id: cOMMENTS_updatedAt_columnId,
    name: "updated_at",
    displayName: "Updated At",
  });

  await knex("sys_column").insert({
    sys_column_id: cOMMENTS_updatedAt_columnId,
    sys_table_id: cOMMENTSTableId,
    column_name: "updated_at",
    name: "Updated At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: cOMMENTSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cOMMENTSColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const cOMMENTSSeqNumbers = generateRandomSeqNumbers(cOMMENTSColumns.length);

  for (let i = 0; i < cOMMENTSColumns.length; i++) {
    const col = cOMMENTSColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: cOMMENTSTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: cOMMENTSSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: "U",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  // Grant access to admin role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: cOMMENTSTableId,
    sys_window_id: cOMMENTSWindowId,
    access_type_table: "W",
    is_read_only: false,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: cOMMENTSTableId,
    sys_window_id: cOMMENTSWindowId,
    access_type_table: "R",
    is_read_only: true,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log("✓ Created dictionary entries for Comments");

  // --------------------------------------------------------------------------
  // Tags (bus_tags)
  // --------------------------------------------------------------------------
  const tAGSTableId = uuidv4();
  const tAGSWindowId = uuidv4();
  const tAGSTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: tAGSWindowId,
    name: "Tags",
    description: "Maintain Tags records",
    window_type: "M",
    is_sales_transaction: false,
    is_default: true,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex("sys_table").insert({
    sys_table_id: tAGSTableId,
    table_name: "bus_tags",
    name: "Tags",
    description: "TAGS entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: tAGSWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: tAGSTabId,
    sys_window_id: tAGSWindowId,
    sys_table_id: tAGSTableId,
    name: "Tags",
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_column entries
  const tAGSColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let tAGSColumnSeqNo = 10;
  const tAGS_id_columnId = uuidv4();
  tAGSColumns.push({
    id: tAGS_id_columnId,
    name: "id",
    displayName: "Id",
  });

  await knex("sys_column").insert({
    sys_column_id: tAGS_id_columnId,
    sys_table_id: tAGSTableId,
    column_name: "id",
    name: "Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: tAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  tAGSColumnSeqNo += 10;
  const tAGS_name_columnId = uuidv4();
  tAGSColumns.push({
    id: tAGS_name_columnId,
    name: "name",
    displayName: "Name",
  });

  await knex("sys_column").insert({
    sys_column_id: tAGS_name_columnId,
    sys_table_id: tAGSTableId,
    column_name: "name",
    name: "Name",
    sys_reference_id: typeToReferenceId("string"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: tAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  tAGSColumnSeqNo += 10;
  const tAGS_createdAt_columnId = uuidv4();
  tAGSColumns.push({
    id: tAGS_createdAt_columnId,
    name: "created_at",
    displayName: "Created At",
  });

  await knex("sys_column").insert({
    sys_column_id: tAGS_createdAt_columnId,
    sys_table_id: tAGSTableId,
    column_name: "created_at",
    name: "Created At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: tAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  tAGSColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const tAGSSeqNumbers = generateRandomSeqNumbers(tAGSColumns.length);

  for (let i = 0; i < tAGSColumns.length; i++) {
    const col = tAGSColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: tAGSTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: tAGSSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: "U",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  // Grant access to admin role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: tAGSTableId,
    sys_window_id: tAGSWindowId,
    access_type_table: "W",
    is_read_only: false,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: tAGSTableId,
    sys_window_id: tAGSWindowId,
    access_type_table: "R",
    is_read_only: true,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log("✓ Created dictionary entries for Tags");

  // --------------------------------------------------------------------------
  // Post Tags (bus_post_tags)
  // --------------------------------------------------------------------------
  const pOSTTAGSTableId = uuidv4();
  const pOSTTAGSWindowId = uuidv4();
  const pOSTTAGSTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: pOSTTAGSWindowId,
    name: "Post Tags",
    description: "Maintain Post Tags records",
    window_type: "M",
    is_sales_transaction: false,
    is_default: true,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex("sys_table").insert({
    sys_table_id: pOSTTAGSTableId,
    table_name: "bus_post_tags",
    name: "Post Tags",
    description: "POST_TAGS entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: pOSTTAGSWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: pOSTTAGSTabId,
    sys_window_id: pOSTTAGSWindowId,
    sys_table_id: pOSTTAGSTableId,
    name: "Post Tags",
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_column entries
  const pOSTTAGSColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let pOSTTAGSColumnSeqNo = 10;
  const pOSTTAGS_id_columnId = uuidv4();
  pOSTTAGSColumns.push({
    id: pOSTTAGS_id_columnId,
    name: "id",
    displayName: "Id",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTTAGS_id_columnId,
    sys_table_id: pOSTTAGSTableId,
    column_name: "id",
    name: "Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: true,
    is_parent: false,
    is_mandatory: false,
    is_updateable: false,
    is_identifier: true,
    is_selection_column: true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: false,
    seq_no: pOSTTAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTTAGSColumnSeqNo += 10;
  const pOSTTAGS_postId_columnId = uuidv4();
  pOSTTAGSColumns.push({
    id: pOSTTAGS_postId_columnId,
    name: "post_id",
    displayName: "Post Id",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTTAGS_postId_columnId,
    sys_table_id: pOSTTAGSTableId,
    column_name: "post_id",
    name: "Post Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTTAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTTAGSColumnSeqNo += 10;
  const pOSTTAGS_tagId_columnId = uuidv4();
  pOSTTAGSColumns.push({
    id: pOSTTAGS_tagId_columnId,
    name: "tag_id",
    displayName: "Tag Id",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTTAGS_tagId_columnId,
    sys_table_id: pOSTTAGSTableId,
    column_name: "tag_id",
    name: "Tag Id",
    sys_reference_id: typeToReferenceId("integer"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTTAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTTAGSColumnSeqNo += 10;
  const pOSTTAGS_createdAt_columnId = uuidv4();
  pOSTTAGSColumns.push({
    id: pOSTTAGS_createdAt_columnId,
    name: "created_at",
    displayName: "Created At",
  });

  await knex("sys_column").insert({
    sys_column_id: pOSTTAGS_createdAt_columnId,
    sys_table_id: pOSTTAGSTableId,
    column_name: "created_at",
    name: "Created At",
    sys_reference_id: typeToReferenceId("datetime"),
    is_key: false,
    is_parent: false,
    is_mandatory: true,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: pOSTTAGSColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pOSTTAGSColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const pOSTTAGSSeqNumbers = generateRandomSeqNumbers(pOSTTAGSColumns.length);

  for (let i = 0; i < pOSTTAGSColumns.length; i++) {
    const col = pOSTTAGSColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: pOSTTAGSTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: pOSTTAGSSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: "U",
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  // Grant access to admin role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: pOSTTAGSTableId,
    sys_window_id: pOSTTAGSWindowId,
    access_type_table: "W",
    is_read_only: false,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex("sys_access").insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: pOSTTAGSTableId,
    sys_window_id: pOSTTAGSWindowId,
    access_type_table: "R",
    is_read_only: true,
    is_exclude: false,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log("✓ Created dictionary entries for Post Tags");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("");
  console.log("Dictionary seed complete:");
  console.log("  - 5 business entities");
  console.log("  - 2 default roles (Administrator, User)");
  console.log("  - 1 admin user (admin@localhost)");
  console.log("  - 3 field groups");
  console.log("");
  console.log("NOTE: Field seq_no values are randomized to demonstrate");
  console.log("      runtime UI modification capability. Administrators can");
  console.log("      reorder fields via the admin interface.");
}
