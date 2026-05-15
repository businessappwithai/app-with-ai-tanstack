/**
 * System Dictionary Seed
 * Populates sys_ tables with metadata for business entities
 *
 * Generated: 2026-05-15T16:06:25.860Z
 *
 * This seed creates:
 * - sys_table entries for each business entity
 * - sys_column entries for each entity attribute
 * - sys_window entries for entity management
 * - sys_tab entries for window tabs
 * - sys_field entries with randomized seq_no for runtime modification demo
 */

import { Kysely } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

export async function seed(db: Kysely<any>): Promise<void> {
  const now = new Date();
  const createdBy = '';

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
      'string': 10,
      'integer': 11,
      'decimal': 12,
      'boolean': 20,
      'date': 15,
      'datetime': 16,
      'text': 14,
      'json': 28,
    };
    return mapping[type] || 10;
  }

  // ============================================================================
  // Create Default Roles
  // ============================================================================
  const adminRoleId = uuidv4();
  const userRoleId = uuidv4();

  await db.insertInto('sys_role').values([
    {
      sys_role_id: adminRoleId,
      name: 'Administrator',
      description: 'System administrator with full access',
      user_level: 'S',
      is_master_role: true,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 0,
      is_show_accounting: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_role_id: userRoleId,
      name: 'User',
      description: 'Standard user with limited access',
      user_level: 'C',
      is_master_role: false,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 1000,
      is_show_accounting: false,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
  ]).execute();

  // ============================================================================
  // Create Default Admin User
  // ============================================================================
  const adminUserId = uuidv4();

  await db.insertInto('sys_user').values({
    sys_user_id: adminUserId,
    name: 'System Administrator',
    email: 'admin@localhost',
    password_hash: '$2b$10$rIC/7qZmzCi9F4g4OKL8wO4k5XYzJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', // placeholder
    description: 'Default system administrator',
    is_system_user: true,
    is_sales_rep: false,
    login_failure_count: 0,
    is_locked: false,
    is_account_verified: true,
    default_sys_role_id: adminRoleId,
    entity_type: 'D',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Assign admin role to admin user
  await db.insertInto('sys_user_roles').values({
    sys_user_roles_id: uuidv4(),
    sys_user_id: adminUserId,
    sys_role_id: adminRoleId,
    entity_type: 'D',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // ============================================================================
  // Create Default Field Groups
  // ============================================================================
  const fieldGroupGeneral = uuidv4();
  const fieldGroupDetails = uuidv4();
  const fieldGroupSystem = uuidv4();

  await db.insertInto('sys_field_group').values([
    {
      sys_field_group_id: fieldGroupGeneral,
      name: 'General',
      description: 'General information fields',
      field_group_type: 'C',
      is_collapsed_by_default: false,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupDetails,
      name: 'Details',
      description: 'Detailed information fields',
      field_group_type: 'C',
      is_collapsed_by_default: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
    {
      sys_field_group_id: fieldGroupSystem,
      name: 'System',
      description: 'System fields (audit trail)',
      field_group_type: 'C',
      is_collapsed_by_default: true,
      entity_type: 'D',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    },
  ]).execute();

  // ============================================================================
  // Business Entities Dictionary Entries
  // ============================================================================

  // --------------------------------------------------------------------------
  // Account (bus_account)
  // --------------------------------------------------------------------------
  const aCCOUNTTableId = uuidv4();
  const aCCOUNTWindowId = uuidv4();
  const aCCOUNTTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: aCCOUNTWindowId,
    name: 'Account',
    description: 'Maintain Account records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: aCCOUNTTableId,
    table_name: 'bus_account',
    name: 'Account',
    description: 'ACCOUNT entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: aCCOUNTWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: aCCOUNTTabId,
    sys_window_id: aCCOUNTWindowId,
    sys_table_id: aCCOUNTTableId,
    name: 'Account',
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const aCCOUNTColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let aCCOUNTColumnSeqNo = 10;
  const aCCOUNT_id_columnId = uuidv4();
  aCCOUNTColumns.push({
    id: aCCOUNT_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCCOUNT_id_columnId,
    sys_table_id: aCCOUNTTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: aCCOUNTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCCOUNTColumnSeqNo += 10;
  const aCCOUNT_name_columnId = uuidv4();
  aCCOUNTColumns.push({
    id: aCCOUNT_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCCOUNT_name_columnId,
    sys_table_id: aCCOUNTTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: aCCOUNTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCCOUNTColumnSeqNo += 10;
  const aCCOUNT_email_columnId = uuidv4();
  aCCOUNTColumns.push({
    id: aCCOUNT_email_columnId,
    name: 'email',
    displayName: 'Email',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCCOUNT_email_columnId,
    sys_table_id: aCCOUNTTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: aCCOUNTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCCOUNTColumnSeqNo += 10;
  const aCCOUNT_phone_columnId = uuidv4();
  aCCOUNTColumns.push({
    id: aCCOUNT_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCCOUNT_phone_columnId,
    sys_table_id: aCCOUNTTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: aCCOUNTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCCOUNTColumnSeqNo += 10;
  const aCCOUNT_createdAt_columnId = uuidv4();
  aCCOUNTColumns.push({
    id: aCCOUNT_createdAt_columnId,
    name: 'created_at',
    displayName: 'Created At',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCCOUNT_createdAt_columnId,
    sys_table_id: aCCOUNTTableId,
    column_name: 'created_at',
    name: 'Created At',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: aCCOUNTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCCOUNTColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const aCCOUNTSeqNumbers = generateRandomSeqNumbers(aCCOUNTColumns.length);

  for (let i = 0; i < aCCOUNTColumns.length; i++) {
    const col = aCCOUNTColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: aCCOUNTTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: aCCOUNTSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: aCCOUNTTableId,
    sys_window_id: aCCOUNTWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access to user role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: aCCOUNTTableId,
    sys_window_id: aCCOUNTWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  console.log('✓ Created dictionary entries for Account');

  // --------------------------------------------------------------------------
  // Contact (bus_contact)
  // --------------------------------------------------------------------------
  const cONTACTTableId = uuidv4();
  const cONTACTWindowId = uuidv4();
  const cONTACTTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: cONTACTWindowId,
    name: 'Contact',
    description: 'Maintain Contact records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: cONTACTTableId,
    table_name: 'bus_contact',
    name: 'Contact',
    description: 'CONTACT entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: cONTACTWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: cONTACTTabId,
    sys_window_id: cONTACTWindowId,
    sys_table_id: cONTACTTableId,
    name: 'Contact',
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const cONTACTColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let cONTACTColumnSeqNo = 10;
  const cONTACT_id_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_id_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_firstName_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_firstName_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'first_name',
    name: 'First Name',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_lastName_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_lastName_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'last_name',
    name: 'Last Name',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_email_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_email_columnId,
    name: 'email',
    displayName: 'Email',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_email_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_phone_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_phone_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_accountId_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_accountId_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;
  const cONTACT_createdAt_columnId = uuidv4();
  cONTACTColumns.push({
    id: cONTACT_createdAt_columnId,
    name: 'created_at',
    displayName: 'Created At',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: cONTACT_createdAt_columnId,
    sys_table_id: cONTACTTableId,
    column_name: 'created_at',
    name: 'Created At',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: cONTACTColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  cONTACTColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const cONTACTSeqNumbers = generateRandomSeqNumbers(cONTACTColumns.length);

  for (let i = 0; i < cONTACTColumns.length; i++) {
    const col = cONTACTColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: cONTACTTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: cONTACTSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: cONTACTTableId,
    sys_window_id: cONTACTWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access to user role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: cONTACTTableId,
    sys_window_id: cONTACTWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  console.log('✓ Created dictionary entries for Contact');

  // --------------------------------------------------------------------------
  // Opportunity (bus_opportunity)
  // --------------------------------------------------------------------------
  const oPPORTUNITYTableId = uuidv4();
  const oPPORTUNITYWindowId = uuidv4();
  const oPPORTUNITYTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: oPPORTUNITYWindowId,
    name: 'Opportunity',
    description: 'Maintain Opportunity records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: oPPORTUNITYTableId,
    table_name: 'bus_opportunity',
    name: 'Opportunity',
    description: 'OPPORTUNITY entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: oPPORTUNITYWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: oPPORTUNITYTabId,
    sys_window_id: oPPORTUNITYWindowId,
    sys_table_id: oPPORTUNITYTableId,
    name: 'Opportunity',
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const oPPORTUNITYColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let oPPORTUNITYColumnSeqNo = 10;
  const oPPORTUNITY_id_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_id_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_name_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_name_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'name',
    name: 'Name',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_amount_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_amount_columnId,
    name: 'amount',
    displayName: 'Amount',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_amount_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'amount',
    name: 'Amount',
    sys_reference_id: typeToReferenceId('decimal'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_stage_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_stage_columnId,
    name: 'stage',
    displayName: 'Stage',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_stage_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'stage',
    name: 'Stage',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_accountId_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_accountId_columnId,
    name: 'account_id',
    displayName: 'Account Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_accountId_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'account_id',
    name: 'Account Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_closeDate_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_closeDate_columnId,
    name: 'close_date',
    displayName: 'Close Date',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_closeDate_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'close_date',
    name: 'Close Date',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;
  const oPPORTUNITY_createdAt_columnId = uuidv4();
  oPPORTUNITYColumns.push({
    id: oPPORTUNITY_createdAt_columnId,
    name: 'created_at',
    displayName: 'Created At',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: oPPORTUNITY_createdAt_columnId,
    sys_table_id: oPPORTUNITYTableId,
    column_name: 'created_at',
    name: 'Created At',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: oPPORTUNITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  oPPORTUNITYColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const oPPORTUNITYSeqNumbers = generateRandomSeqNumbers(oPPORTUNITYColumns.length);

  for (let i = 0; i < oPPORTUNITYColumns.length; i++) {
    const col = oPPORTUNITYColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: oPPORTUNITYTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: oPPORTUNITYSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: oPPORTUNITYTableId,
    sys_window_id: oPPORTUNITYWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access to user role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: oPPORTUNITYTableId,
    sys_window_id: oPPORTUNITYWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  console.log('✓ Created dictionary entries for Opportunity');

  // --------------------------------------------------------------------------
  // Activity (bus_activity)
  // --------------------------------------------------------------------------
  const aCTIVITYTableId = uuidv4();
  const aCTIVITYWindowId = uuidv4();
  const aCTIVITYTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await db.insertInto('sys_window').values({
    sys_window_id: aCTIVITYWindowId,
    name: 'Activity',
    description: 'Maintain Activity records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_table entry AFTER sys_window
  await db.insertInto('sys_table').values({
    sys_table_id: aCTIVITYTableId,
    table_name: 'bus_activity',
    name: 'Activity',
    description: 'ACTIVITY entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: aCTIVITYWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_tab entry
  await db.insertInto('sys_tab').values({
    sys_tab_id: aCTIVITYTabId,
    sys_window_id: aCTIVITYWindowId,
    sys_table_id: aCTIVITYTableId,
    name: 'Activity',
    tab_level: 0,
    seq_no: 10,
    is_single_row: true,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Create sys_column entries
  const aCTIVITYColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let aCTIVITYColumnSeqNo = 10;
  const aCTIVITY_id_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_id_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_type_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_type_columnId,
    name: 'type',
    displayName: 'Type',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_type_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'type',
    name: 'Type',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_description_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_description_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_contactId_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_contactId_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_opportunityId_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_opportunityId_columnId,
    name: 'opportunity_id',
    displayName: 'Opportunity Id',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_opportunityId_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'opportunity_id',
    name: 'Opportunity Id',
    sys_reference_id: typeToReferenceId('integer'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_activityDate_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_activityDate_columnId,
    name: 'activity_date',
    displayName: 'Activity Date',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_activityDate_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'activity_date',
    name: 'Activity Date',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;
  const aCTIVITY_createdAt_columnId = uuidv4();
  aCTIVITYColumns.push({
    id: aCTIVITY_createdAt_columnId,
    name: 'created_at',
    displayName: 'Created At',
  });

  await db.insertInto('sys_column').values({
    sys_column_id: aCTIVITY_createdAt_columnId,
    sys_table_id: aCTIVITYTableId,
    column_name: 'created_at',
    name: 'Created At',
    sys_reference_id: typeToReferenceId('datetime'),
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
    seq_no: aCTIVITYColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();
  aCTIVITYColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const aCTIVITYSeqNumbers = generateRandomSeqNumbers(aCTIVITYColumns.length);

  for (let i = 0; i < aCTIVITYColumns.length; i++) {
    const col = aCTIVITYColumns[i];
    await db.insertInto('sys_field').values({
      sys_field_id: uuidv4(),
      sys_tab_id: aCTIVITYTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: aCTIVITYSeqNumbers[i],
      seq_no_grid: (i + 1) * 10,
      is_displayed: true,
      is_displayed_grid: i < 8, // Show first 8 columns in grid
      is_read_only: false,
      is_encrypted: false,
      is_same_line: false,
      is_heading: false,
      is_field_only: false,
      entity_type: 'U',
      is_active: true,
      created_by: createdBy,
      updated_by: createdBy,
      created_at: now,
      updated_at: now,
    }).execute();
  }

  // Grant access to admin role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: aCTIVITYTableId,
    sys_window_id: aCTIVITYWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  // Grant read access to user role
  await db.insertInto('sys_access').values({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: aCTIVITYTableId,
    sys_window_id: aCTIVITYWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  }).execute();

  console.log('✓ Created dictionary entries for Activity');


  // ============================================================================
  // Summary
  // ============================================================================
  console.log('');
  console.log('Dictionary seed complete:');
  console.log('  - 4 business entities');
  console.log('  - 2 default roles (Administrator, User)');
  console.log('  - 1 admin user (admin@localhost)');
  console.log('  - 3 field groups');
  console.log('');
  console.log('NOTE: Field seq_no values are randomized to demonstrate');
  console.log('      runtime UI modification capability. Administrators can');
  console.log('      reorder fields via the admin interface.');
}
