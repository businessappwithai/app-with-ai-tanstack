/**
 * System Dictionary Seed
 * Populates sys_ tables with metadata for business entities
 *
 * Generated: 2026-02-09T13:00:26.953Z
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
  // C U S T O M E R (bus_customer)
  // --------------------------------------------------------------------------
  const cUSTOMERTableId = uuidv4();
  const cUSTOMERWindowId = uuidv4();
  const cUSTOMERTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: cUSTOMERWindowId,
    name: "C U S T O M E R",
    description: "Maintain C U S T O M E R records",
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
    sys_table_id: cUSTOMERTableId,
    table_name: "bus_customer",
    name: "C U S T O M E R",
    description: "CUSTOMER entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: cUSTOMERWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: cUSTOMERTabId,
    sys_window_id: cUSTOMERWindowId,
    sys_table_id: cUSTOMERTableId,
    name: "C U S T O M E R",
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
  const cUSTOMERColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let cUSTOMERColumnSeqNo = 10;
  const cUSTOMER_id_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_id_columnId,
    name: "id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_id_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "id",
    name: "",
    sys_reference_id: typeToReferenceId("string"),
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_name_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_name_columnId,
    name: "name",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_name_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "name",
    name: "",
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_email_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_email_columnId,
    name: "email",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_email_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "email",
    name: "",
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_phone_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_phone_columnId,
    name: "phone",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_phone_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "phone",
    name: "",
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_city_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_city_columnId,
    name: "city",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_city_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "city",
    name: "",
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_status_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_status_columnId,
    name: "status",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_status_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "status",
    name: "",
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;
  const cUSTOMER_createdAt_columnId = uuidv4();
  cUSTOMERColumns.push({
    id: cUSTOMER_createdAt_columnId,
    name: "created_at",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: cUSTOMER_createdAt_columnId,
    sys_table_id: cUSTOMERTableId,
    column_name: "created_at",
    name: "",
    sys_reference_id: typeToReferenceId("date"),
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
    seq_no: cUSTOMERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  cUSTOMERColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const cUSTOMERSeqNumbers = generateRandomSeqNumbers(cUSTOMERColumns.length);

  for (let i = 0; i < cUSTOMERColumns.length; i++) {
    const col = cUSTOMERColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: cUSTOMERTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: cUSTOMERSeqNumbers[i],
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
    sys_role_id: adminRoleId,
    sys_table_id: cUSTOMERTableId,
    sys_window_id: cUSTOMERWindowId,
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
    sys_role_id: userRoleId,
    sys_table_id: cUSTOMERTableId,
    sys_window_id: cUSTOMERWindowId,
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

  console.log("✓ Created dictionary entries for C U S T O M E R");

  // --------------------------------------------------------------------------
  // O R D E R (bus_order)
  // --------------------------------------------------------------------------
  const oRDERTableId = uuidv4();
  const oRDERWindowId = uuidv4();
  const oRDERTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: oRDERWindowId,
    name: "O R D E R",
    description: "Maintain O R D E R records",
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
    sys_table_id: oRDERTableId,
    table_name: "bus_order",
    name: "O R D E R",
    description: "ORDER entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: oRDERWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: oRDERTabId,
    sys_window_id: oRDERWindowId,
    sys_table_id: oRDERTableId,
    name: "O R D E R",
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
  const oRDERColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let oRDERColumnSeqNo = 10;
  const oRDER_id_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_id_columnId,
    name: "id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_id_columnId,
    sys_table_id: oRDERTableId,
    column_name: "id",
    name: "",
    sys_reference_id: typeToReferenceId("string"),
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;
  const oRDER_customerId_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_customerId_columnId,
    name: "customer_id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_customerId_columnId,
    sys_table_id: oRDERTableId,
    column_name: "customer_id",
    name: "",
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;
  const oRDER_orderDate_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_orderDate_columnId,
    name: "order_date",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_orderDate_columnId,
    sys_table_id: oRDERTableId,
    column_name: "order_date",
    name: "",
    sys_reference_id: typeToReferenceId("date"),
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;
  const oRDER_totalAmount_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_totalAmount_columnId,
    name: "total_amount",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_totalAmount_columnId,
    sys_table_id: oRDERTableId,
    column_name: "total_amount",
    name: "",
    sys_reference_id: typeToReferenceId("decimal"),
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;
  const oRDER_status_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_status_columnId,
    name: "status",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_status_columnId,
    sys_table_id: oRDERTableId,
    column_name: "status",
    name: "",
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;
  const oRDER_createdAt_columnId = uuidv4();
  oRDERColumns.push({
    id: oRDER_createdAt_columnId,
    name: "created_at",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDER_createdAt_columnId,
    sys_table_id: oRDERTableId,
    column_name: "created_at",
    name: "",
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
    seq_no: oRDERColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const oRDERSeqNumbers = generateRandomSeqNumbers(oRDERColumns.length);

  for (let i = 0; i < oRDERColumns.length; i++) {
    const col = oRDERColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: oRDERTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: oRDERSeqNumbers[i],
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
    sys_role_id: adminRoleId,
    sys_table_id: oRDERTableId,
    sys_window_id: oRDERWindowId,
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
    sys_role_id: userRoleId,
    sys_table_id: oRDERTableId,
    sys_window_id: oRDERWindowId,
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

  console.log("✓ Created dictionary entries for O R D E R");

  // --------------------------------------------------------------------------
  // O R D E R  I T E M (bus_order_item)
  // --------------------------------------------------------------------------
  const oRDERITEMTableId = uuidv4();
  const oRDERITEMWindowId = uuidv4();
  const oRDERITEMTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: oRDERITEMWindowId,
    name: "O R D E R  I T E M",
    description: "Maintain O R D E R  I T E M records",
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
    sys_table_id: oRDERITEMTableId,
    table_name: "bus_order_item",
    name: "O R D E R  I T E M",
    description: "ORDER_ITEM entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: oRDERITEMWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: oRDERITEMTabId,
    sys_window_id: oRDERITEMWindowId,
    sys_table_id: oRDERITEMTableId,
    name: "O R D E R  I T E M",
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
  const oRDERITEMColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let oRDERITEMColumnSeqNo = 10;
  const oRDERITEM_id_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_id_columnId,
    name: "id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_id_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "id",
    name: "",
    sys_reference_id: typeToReferenceId("string"),
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;
  const oRDERITEM_orderId_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_orderId_columnId,
    name: "order_id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_orderId_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "order_id",
    name: "",
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;
  const oRDERITEM_productId_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_productId_columnId,
    name: "product_id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_productId_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "product_id",
    name: "",
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;
  const oRDERITEM_quantity_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_quantity_columnId,
    name: "quantity",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_quantity_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "quantity",
    name: "",
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;
  const oRDERITEM_unitPrice_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_unitPrice_columnId,
    name: "unit_price",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_unitPrice_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "unit_price",
    name: "",
    sys_reference_id: typeToReferenceId("decimal"),
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;
  const oRDERITEM_lineTotal_columnId = uuidv4();
  oRDERITEMColumns.push({
    id: oRDERITEM_lineTotal_columnId,
    name: "line_total",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: oRDERITEM_lineTotal_columnId,
    sys_table_id: oRDERITEMTableId,
    column_name: "line_total",
    name: "",
    sys_reference_id: typeToReferenceId("decimal"),
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
    seq_no: oRDERITEMColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  oRDERITEMColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const oRDERITEMSeqNumbers = generateRandomSeqNumbers(oRDERITEMColumns.length);

  for (let i = 0; i < oRDERITEMColumns.length; i++) {
    const col = oRDERITEMColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: oRDERITEMTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: oRDERITEMSeqNumbers[i],
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
    sys_role_id: adminRoleId,
    sys_table_id: oRDERITEMTableId,
    sys_window_id: oRDERITEMWindowId,
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
    sys_role_id: userRoleId,
    sys_table_id: oRDERITEMTableId,
    sys_window_id: oRDERITEMWindowId,
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

  console.log("✓ Created dictionary entries for O R D E R  I T E M");

  // --------------------------------------------------------------------------
  // P R O D U C T (bus_product)
  // --------------------------------------------------------------------------
  const pRODUCTTableId = uuidv4();
  const pRODUCTWindowId = uuidv4();
  const pRODUCTTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex("sys_window").insert({
    sys_window_id: pRODUCTWindowId,
    name: "P R O D U C T",
    description: "Maintain P R O D U C T records",
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
    sys_table_id: pRODUCTTableId,
    table_name: "bus_product",
    name: "P R O D U C T",
    description: "PRODUCT entity",
    access_level: "A",
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: pRODUCTWindowId,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex("sys_tab").insert({
    sys_tab_id: pRODUCTTabId,
    sys_window_id: pRODUCTWindowId,
    sys_table_id: pRODUCTTableId,
    name: "P R O D U C T",
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
  const pRODUCTColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let pRODUCTColumnSeqNo = 10;
  const pRODUCT_id_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_id_columnId,
    name: "id",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_id_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "id",
    name: "",
    sys_reference_id: typeToReferenceId("string"),
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_name_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_name_columnId,
    name: "name",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_name_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "name",
    name: "",
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_description_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_description_columnId,
    name: "description",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_description_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "description",
    name: "",
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_price_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_price_columnId,
    name: "price",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_price_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "price",
    name: "",
    sys_reference_id: typeToReferenceId("decimal"),
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_stockQuantity_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_stockQuantity_columnId,
    name: "stock_quantity",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_stockQuantity_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "stock_quantity",
    name: "",
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_category_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_category_columnId,
    name: "category",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_category_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "category",
    name: "",
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;
  const pRODUCT_isActive_columnId = uuidv4();
  pRODUCTColumns.push({
    id: pRODUCT_isActive_columnId,
    name: "is_active",
    displayName: "",
  });

  await knex("sys_column").insert({
    sys_column_id: pRODUCT_isActive_columnId,
    sys_table_id: pRODUCTTableId,
    column_name: "is_active",
    name: "",
    sys_reference_id: typeToReferenceId("boolean"),
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
    seq_no: pRODUCTColumnSeqNo,
    entity_type: "U",
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pRODUCTColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const pRODUCTSeqNumbers = generateRandomSeqNumbers(pRODUCTColumns.length);

  for (let i = 0; i < pRODUCTColumns.length; i++) {
    const col = pRODUCTColumns[i];
    await knex("sys_field").insert({
      sys_field_id: uuidv4(),
      sys_tab_id: pRODUCTTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: pRODUCTSeqNumbers[i],
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
    sys_role_id: adminRoleId,
    sys_table_id: pRODUCTTableId,
    sys_window_id: pRODUCTWindowId,
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
    sys_role_id: userRoleId,
    sys_table_id: pRODUCTTableId,
    sys_window_id: pRODUCTWindowId,
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

  console.log("✓ Created dictionary entries for P R O D U C T");

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("");
  console.log("Dictionary seed complete:");
  console.log("  - 4 business entities");
  console.log("  - 2 default roles (Administrator, User)");
  console.log("  - 1 admin user (admin@localhost)");
  console.log("  - 3 field groups");
  console.log("");
  console.log("NOTE: Field seq_no values are randomized to demonstrate");
  console.log("      runtime UI modification capability. Administrators can");
  console.log("      reorder fields via the admin interface.");
}
