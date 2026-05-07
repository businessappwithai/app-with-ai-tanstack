/**
 * System Dictionary Seed
 * Populates sys_ tables with metadata for business entities
 *
 * Generated: 2026-05-07T08:59:26.548Z
 *
 * This seed creates:
 * - sys_table entries for each business entity
 * - sys_column entries for each entity attribute
 * - sys_window entries for entity management
 * - sys_tab entries for window tabs
 * - sys_field entries with randomized seq_no for runtime modification demo
 */

import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
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

  await knex('sys_role').insert([
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
  ]);

  // ============================================================================
  // Create Default Admin User
  // ============================================================================
  const adminUserId = uuidv4();

  await knex('sys_user').insert({
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
  });

  // Assign admin role to admin user
  await knex('sys_user_roles').insert({
    sys_user_roles_id: uuidv4(),
    sys_user_id: adminUserId,
    sys_role_id: adminRoleId,
    entity_type: 'D',
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

  await knex('sys_field_group').insert([
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
  ]);

  // ============================================================================
  // Business Entities Dictionary Entries
  // ============================================================================

  // --------------------------------------------------------------------------
  // Company (bus_company)
  // --------------------------------------------------------------------------
  const companyTableId = uuidv4();
  const companyWindowId = uuidv4();
  const companyTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: companyWindowId,
    name: 'Company',
    description: 'Maintain Company records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: companyTableId,
    table_name: 'bus_company',
    name: 'Company',
    description: 'Company entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: companyWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: companyTabId,
    sys_window_id: companyWindowId,
    sys_table_id: companyTableId,
    name: 'Company',
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
  });

  // Create sys_column entries
  const companyColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let companyColumnSeqNo = 10;
  const company_id_columnId = uuidv4();
  companyColumns.push({
    id: company_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: company_id_columnId,
    sys_table_id: companyTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_name_columnId = uuidv4();
  companyColumns.push({
    id: company_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: company_name_columnId,
    sys_table_id: companyTableId,
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
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_industry_columnId = uuidv4();
  companyColumns.push({
    id: company_industry_columnId,
    name: 'industry',
    displayName: 'Industry',
  });

  await knex('sys_column').insert({
    sys_column_id: company_industry_columnId,
    sys_table_id: companyTableId,
    column_name: 'industry',
    name: 'Industry',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_website_columnId = uuidv4();
  companyColumns.push({
    id: company_website_columnId,
    name: 'website',
    displayName: 'Website',
  });

  await knex('sys_column').insert({
    sys_column_id: company_website_columnId,
    sys_table_id: companyTableId,
    column_name: 'website',
    name: 'Website',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_phone_columnId = uuidv4();
  companyColumns.push({
    id: company_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
  });

  await knex('sys_column').insert({
    sys_column_id: company_phone_columnId,
    sys_table_id: companyTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_email_columnId = uuidv4();
  companyColumns.push({
    id: company_email_columnId,
    name: 'email',
    displayName: 'Email',
  });

  await knex('sys_column').insert({
    sys_column_id: company_email_columnId,
    sys_table_id: companyTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_employeeCount_columnId = uuidv4();
  companyColumns.push({
    id: company_employeeCount_columnId,
    name: 'employee_count',
    displayName: 'Employee Count',
  });

  await knex('sys_column').insert({
    sys_column_id: company_employeeCount_columnId,
    sys_table_id: companyTableId,
    column_name: 'employee_count',
    name: 'Employee Count',
    sys_reference_id: typeToReferenceId('integer'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_annualRevenue_columnId = uuidv4();
  companyColumns.push({
    id: company_annualRevenue_columnId,
    name: 'annual_revenue',
    displayName: 'Annual Revenue',
  });

  await knex('sys_column').insert({
    sys_column_id: company_annualRevenue_columnId,
    sys_table_id: companyTableId,
    column_name: 'annual_revenue',
    name: 'Annual Revenue',
    sys_reference_id: typeToReferenceId('decimal'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_status_columnId = uuidv4();
  companyColumns.push({
    id: company_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: company_status_columnId,
    sys_table_id: companyTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;
  const company_ownerId_columnId = uuidv4();
  companyColumns.push({
    id: company_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
  });

  await knex('sys_column').insert({
    sys_column_id: company_ownerId_columnId,
    sys_table_id: companyTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
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
    seq_no: companyColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  companyColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const companySeqNumbers = generateRandomSeqNumbers(companyColumns.length);

  for (let i = 0; i < companyColumns.length; i++) {
    const col = companyColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: companyTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: companySeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: companyTableId,
    sys_window_id: companyWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: companyTableId,
    sys_window_id: companyWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Company');

  // --------------------------------------------------------------------------
  // Contact (bus_contact)
  // --------------------------------------------------------------------------
  const contactTableId = uuidv4();
  const contactWindowId = uuidv4();
  const contactTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: contactWindowId,
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
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: contactTableId,
    table_name: 'bus_contact',
    name: 'Contact',
    description: 'Contact entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: contactWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: contactTabId,
    sys_window_id: contactWindowId,
    sys_table_id: contactTableId,
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
  });

  // Create sys_column entries
  const contactColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let contactColumnSeqNo = 10;
  const contact_id_columnId = uuidv4();
  contactColumns.push({
    id: contact_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_id_columnId,
    sys_table_id: contactTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_companyId_columnId = uuidv4();
  contactColumns.push({
    id: contact_companyId_columnId,
    name: 'company_id',
    displayName: 'Company Id',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_companyId_columnId,
    sys_table_id: contactTableId,
    column_name: 'company_id',
    name: 'Company Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_firstName_columnId = uuidv4();
  contactColumns.push({
    id: contact_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_firstName_columnId,
    sys_table_id: contactTableId,
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_lastName_columnId = uuidv4();
  contactColumns.push({
    id: contact_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_lastName_columnId,
    sys_table_id: contactTableId,
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_email_columnId = uuidv4();
  contactColumns.push({
    id: contact_email_columnId,
    name: 'email',
    displayName: 'Email',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_email_columnId,
    sys_table_id: contactTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_phone_columnId = uuidv4();
  contactColumns.push({
    id: contact_phone_columnId,
    name: 'phone',
    displayName: 'Phone',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_phone_columnId,
    sys_table_id: contactTableId,
    column_name: 'phone',
    name: 'Phone',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_mobile_columnId = uuidv4();
  contactColumns.push({
    id: contact_mobile_columnId,
    name: 'mobile',
    displayName: 'Mobile',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_mobile_columnId,
    sys_table_id: contactTableId,
    column_name: 'mobile',
    name: 'Mobile',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_jobTitle_columnId = uuidv4();
  contactColumns.push({
    id: contact_jobTitle_columnId,
    name: 'job_title',
    displayName: 'Job Title',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_jobTitle_columnId,
    sys_table_id: contactTableId,
    column_name: 'job_title',
    name: 'Job Title',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_department_columnId = uuidv4();
  contactColumns.push({
    id: contact_department_columnId,
    name: 'department',
    displayName: 'Department',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_department_columnId,
    sys_table_id: contactTableId,
    column_name: 'department',
    name: 'Department',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_status_columnId = uuidv4();
  contactColumns.push({
    id: contact_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_status_columnId,
    sys_table_id: contactTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_leadSource_columnId = uuidv4();
  contactColumns.push({
    id: contact_leadSource_columnId,
    name: 'lead_source',
    displayName: 'Lead Source',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_leadSource_columnId,
    sys_table_id: contactTableId,
    column_name: 'lead_source',
    name: 'Lead Source',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;
  const contact_ownerId_columnId = uuidv4();
  contactColumns.push({
    id: contact_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
  });

  await knex('sys_column').insert({
    sys_column_id: contact_ownerId_columnId,
    sys_table_id: contactTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
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
    seq_no: contactColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  contactColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const contactSeqNumbers = generateRandomSeqNumbers(contactColumns.length);

  for (let i = 0; i < contactColumns.length; i++) {
    const col = contactColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: contactTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: contactSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: contactTableId,
    sys_window_id: contactWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: contactTableId,
    sys_window_id: contactWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Contact');

  // --------------------------------------------------------------------------
  // Deal (bus_deal)
  // --------------------------------------------------------------------------
  const dealTableId = uuidv4();
  const dealWindowId = uuidv4();
  const dealTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: dealWindowId,
    name: 'Deal',
    description: 'Maintain Deal records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: dealTableId,
    table_name: 'bus_deal',
    name: 'Deal',
    description: 'Deal entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: dealWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: dealTabId,
    sys_window_id: dealWindowId,
    sys_table_id: dealTableId,
    name: 'Deal',
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
  });

  // Create sys_column entries
  const dealColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let dealColumnSeqNo = 10;
  const deal_id_columnId = uuidv4();
  dealColumns.push({
    id: deal_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_id_columnId,
    sys_table_id: dealTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_companyId_columnId = uuidv4();
  dealColumns.push({
    id: deal_companyId_columnId,
    name: 'company_id',
    displayName: 'Company Id',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_companyId_columnId,
    sys_table_id: dealTableId,
    column_name: 'company_id',
    name: 'Company Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_contactId_columnId = uuidv4();
  dealColumns.push({
    id: deal_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_contactId_columnId,
    sys_table_id: dealTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_name_columnId = uuidv4();
  dealColumns.push({
    id: deal_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_name_columnId,
    sys_table_id: dealTableId,
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_amount_columnId = uuidv4();
  dealColumns.push({
    id: deal_amount_columnId,
    name: 'amount',
    displayName: 'Amount',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_amount_columnId,
    sys_table_id: dealTableId,
    column_name: 'amount',
    name: 'Amount',
    sys_reference_id: typeToReferenceId('decimal'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_currency_columnId = uuidv4();
  dealColumns.push({
    id: deal_currency_columnId,
    name: 'currency',
    displayName: 'Currency',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_currency_columnId,
    sys_table_id: dealTableId,
    column_name: 'currency',
    name: 'Currency',
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_stage_columnId = uuidv4();
  dealColumns.push({
    id: deal_stage_columnId,
    name: 'stage',
    displayName: 'Stage',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_stage_columnId,
    sys_table_id: dealTableId,
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_probability_columnId = uuidv4();
  dealColumns.push({
    id: deal_probability_columnId,
    name: 'probability',
    displayName: 'Probability',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_probability_columnId,
    sys_table_id: dealTableId,
    column_name: 'probability',
    name: 'Probability',
    sys_reference_id: typeToReferenceId('integer'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_expectedCloseDate_columnId = uuidv4();
  dealColumns.push({
    id: deal_expectedCloseDate_columnId,
    name: 'expected_close_date',
    displayName: 'Expected Close Date',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_expectedCloseDate_columnId,
    sys_table_id: dealTableId,
    column_name: 'expected_close_date',
    name: 'Expected Close Date',
    sys_reference_id: typeToReferenceId('date'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_actualCloseDate_columnId = uuidv4();
  dealColumns.push({
    id: deal_actualCloseDate_columnId,
    name: 'actual_close_date',
    displayName: 'Actual Close Date',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_actualCloseDate_columnId,
    sys_table_id: dealTableId,
    column_name: 'actual_close_date',
    name: 'Actual Close Date',
    sys_reference_id: typeToReferenceId('date'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_status_columnId = uuidv4();
  dealColumns.push({
    id: deal_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_status_columnId,
    sys_table_id: dealTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_description_columnId = uuidv4();
  dealColumns.push({
    id: deal_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_description_columnId,
    sys_table_id: dealTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;
  const deal_ownerId_columnId = uuidv4();
  dealColumns.push({
    id: deal_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
  });

  await knex('sys_column').insert({
    sys_column_id: deal_ownerId_columnId,
    sys_table_id: dealTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
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
    seq_no: dealColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const dealSeqNumbers = generateRandomSeqNumbers(dealColumns.length);

  for (let i = 0; i < dealColumns.length; i++) {
    const col = dealColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: dealTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: dealSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: dealTableId,
    sys_window_id: dealWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: dealTableId,
    sys_window_id: dealWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Deal');

  // --------------------------------------------------------------------------
  // Deal Stage (bus_deal_stage)
  // --------------------------------------------------------------------------
  const dealStageTableId = uuidv4();
  const dealStageWindowId = uuidv4();
  const dealStageTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: dealStageWindowId,
    name: 'Deal Stage',
    description: 'Maintain Deal Stage records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: dealStageTableId,
    table_name: 'bus_deal_stage',
    name: 'Deal Stage',
    description: 'DealStage entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: dealStageWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: dealStageTabId,
    sys_window_id: dealStageWindowId,
    sys_table_id: dealStageTableId,
    name: 'Deal Stage',
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
  });

  // Create sys_column entries
  const dealStageColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let dealStageColumnSeqNo = 10;
  const dealStage_id_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_id_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_pipelineId_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_pipelineId_columnId,
    name: 'pipeline_id',
    displayName: 'Pipeline Id',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_pipelineId_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'pipeline_id',
    name: 'Pipeline Id',
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_name_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_name_columnId,
    sys_table_id: dealStageTableId,
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_sortOrder_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_sortOrder_columnId,
    name: 'sort_order',
    displayName: 'Sort Order',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_sortOrder_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'sort_order',
    name: 'Sort Order',
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_defaultProbability_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_defaultProbability_columnId,
    name: 'default_probability',
    displayName: 'Default Probability',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_defaultProbability_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'default_probability',
    name: 'Default Probability',
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_isWon_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_isWon_columnId,
    name: 'is_won',
    displayName: 'Is Won',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_isWon_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'is_won',
    name: 'Is Won',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;
  const dealStage_isLost_columnId = uuidv4();
  dealStageColumns.push({
    id: dealStage_isLost_columnId,
    name: 'is_lost',
    displayName: 'Is Lost',
  });

  await knex('sys_column').insert({
    sys_column_id: dealStage_isLost_columnId,
    sys_table_id: dealStageTableId,
    column_name: 'is_lost',
    name: 'Is Lost',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: dealStageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  dealStageColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const dealStageSeqNumbers = generateRandomSeqNumbers(dealStageColumns.length);

  for (let i = 0; i < dealStageColumns.length; i++) {
    const col = dealStageColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: dealStageTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: dealStageSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: dealStageTableId,
    sys_window_id: dealStageWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: dealStageTableId,
    sys_window_id: dealStageWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Deal Stage');

  // --------------------------------------------------------------------------
  // Pipeline (bus_pipeline)
  // --------------------------------------------------------------------------
  const pipelineTableId = uuidv4();
  const pipelineWindowId = uuidv4();
  const pipelineTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: pipelineWindowId,
    name: 'Pipeline',
    description: 'Maintain Pipeline records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: pipelineTableId,
    table_name: 'bus_pipeline',
    name: 'Pipeline',
    description: 'Pipeline entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: pipelineWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: pipelineTabId,
    sys_window_id: pipelineWindowId,
    sys_table_id: pipelineTableId,
    name: 'Pipeline',
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
  });

  // Create sys_column entries
  const pipelineColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let pipelineColumnSeqNo = 10;
  const pipeline_id_columnId = uuidv4();
  pipelineColumns.push({
    id: pipeline_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: pipeline_id_columnId,
    sys_table_id: pipelineTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: pipelineColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pipelineColumnSeqNo += 10;
  const pipeline_name_columnId = uuidv4();
  pipelineColumns.push({
    id: pipeline_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: pipeline_name_columnId,
    sys_table_id: pipelineTableId,
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
    seq_no: pipelineColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pipelineColumnSeqNo += 10;
  const pipeline_isDefault_columnId = uuidv4();
  pipelineColumns.push({
    id: pipeline_isDefault_columnId,
    name: 'is_default',
    displayName: 'Is Default',
  });

  await knex('sys_column').insert({
    sys_column_id: pipeline_isDefault_columnId,
    sys_table_id: pipelineTableId,
    column_name: 'is_default',
    name: 'Is Default',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: pipelineColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pipelineColumnSeqNo += 10;
  const pipeline_isActive_columnId = uuidv4();
  pipelineColumns.push({
    id: pipeline_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
  });

  await knex('sys_column').insert({
    sys_column_id: pipeline_isActive_columnId,
    sys_table_id: pipelineTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: pipelineColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  pipelineColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const pipelineSeqNumbers = generateRandomSeqNumbers(pipelineColumns.length);

  for (let i = 0; i < pipelineColumns.length; i++) {
    const col = pipelineColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: pipelineTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: pipelineSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: pipelineTableId,
    sys_window_id: pipelineWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: pipelineTableId,
    sys_window_id: pipelineWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Pipeline');

  // --------------------------------------------------------------------------
  // Activity (bus_activity)
  // --------------------------------------------------------------------------
  const activityTableId = uuidv4();
  const activityWindowId = uuidv4();
  const activityTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: activityWindowId,
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
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: activityTableId,
    table_name: 'bus_activity',
    name: 'Activity',
    description: 'Activity entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: activityWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: activityTabId,
    sys_window_id: activityWindowId,
    sys_table_id: activityTableId,
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
  });

  // Create sys_column entries
  const activityColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let activityColumnSeqNo = 10;
  const activity_id_columnId = uuidv4();
  activityColumns.push({
    id: activity_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_id_columnId,
    sys_table_id: activityTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_contactId_columnId = uuidv4();
  activityColumns.push({
    id: activity_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_contactId_columnId,
    sys_table_id: activityTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_companyId_columnId = uuidv4();
  activityColumns.push({
    id: activity_companyId_columnId,
    name: 'company_id',
    displayName: 'Company Id',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_companyId_columnId,
    sys_table_id: activityTableId,
    column_name: 'company_id',
    name: 'Company Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_dealId_columnId = uuidv4();
  activityColumns.push({
    id: activity_dealId_columnId,
    name: 'deal_id',
    displayName: 'Deal Id',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_dealId_columnId,
    sys_table_id: activityTableId,
    column_name: 'deal_id',
    name: 'Deal Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_activityType_columnId = uuidv4();
  activityColumns.push({
    id: activity_activityType_columnId,
    name: 'activity_type',
    displayName: 'Activity Type',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_activityType_columnId,
    sys_table_id: activityTableId,
    column_name: 'activity_type',
    name: 'Activity Type',
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
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_subject_columnId = uuidv4();
  activityColumns.push({
    id: activity_subject_columnId,
    name: 'subject',
    displayName: 'Subject',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_subject_columnId,
    sys_table_id: activityTableId,
    column_name: 'subject',
    name: 'Subject',
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
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_description_columnId = uuidv4();
  activityColumns.push({
    id: activity_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_description_columnId,
    sys_table_id: activityTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_scheduledAt_columnId = uuidv4();
  activityColumns.push({
    id: activity_scheduledAt_columnId,
    name: 'scheduled_at',
    displayName: 'Scheduled At',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_scheduledAt_columnId,
    sys_table_id: activityTableId,
    column_name: 'scheduled_at',
    name: 'Scheduled At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_completedAt_columnId = uuidv4();
  activityColumns.push({
    id: activity_completedAt_columnId,
    name: 'completed_at',
    displayName: 'Completed At',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_completedAt_columnId,
    sys_table_id: activityTableId,
    column_name: 'completed_at',
    name: 'Completed At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_durationMinutes_columnId = uuidv4();
  activityColumns.push({
    id: activity_durationMinutes_columnId,
    name: 'duration_minutes',
    displayName: 'Duration Minutes',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_durationMinutes_columnId,
    sys_table_id: activityTableId,
    column_name: 'duration_minutes',
    name: 'Duration Minutes',
    sys_reference_id: typeToReferenceId('integer'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_status_columnId = uuidv4();
  activityColumns.push({
    id: activity_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_status_columnId,
    sys_table_id: activityTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;
  const activity_ownerId_columnId = uuidv4();
  activityColumns.push({
    id: activity_ownerId_columnId,
    name: 'owner_id',
    displayName: 'Owner Id',
  });

  await knex('sys_column').insert({
    sys_column_id: activity_ownerId_columnId,
    sys_table_id: activityTableId,
    column_name: 'owner_id',
    name: 'Owner Id',
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
    seq_no: activityColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  activityColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const activitySeqNumbers = generateRandomSeqNumbers(activityColumns.length);

  for (let i = 0; i < activityColumns.length; i++) {
    const col = activityColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: activityTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: activitySeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: activityTableId,
    sys_window_id: activityWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: activityTableId,
    sys_window_id: activityWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Activity');

  // --------------------------------------------------------------------------
  // Note (bus_note)
  // --------------------------------------------------------------------------
  const noteTableId = uuidv4();
  const noteWindowId = uuidv4();
  const noteTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: noteWindowId,
    name: 'Note',
    description: 'Maintain Note records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: noteTableId,
    table_name: 'bus_note',
    name: 'Note',
    description: 'Note entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: noteWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: noteTabId,
    sys_window_id: noteWindowId,
    sys_table_id: noteTableId,
    name: 'Note',
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
  });

  // Create sys_column entries
  const noteColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let noteColumnSeqNo = 10;
  const note_id_columnId = uuidv4();
  noteColumns.push({
    id: note_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: note_id_columnId,
    sys_table_id: noteTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_contactId_columnId = uuidv4();
  noteColumns.push({
    id: note_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await knex('sys_column').insert({
    sys_column_id: note_contactId_columnId,
    sys_table_id: noteTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_companyId_columnId = uuidv4();
  noteColumns.push({
    id: note_companyId_columnId,
    name: 'company_id',
    displayName: 'Company Id',
  });

  await knex('sys_column').insert({
    sys_column_id: note_companyId_columnId,
    sys_table_id: noteTableId,
    column_name: 'company_id',
    name: 'Company Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_dealId_columnId = uuidv4();
  noteColumns.push({
    id: note_dealId_columnId,
    name: 'deal_id',
    displayName: 'Deal Id',
  });

  await knex('sys_column').insert({
    sys_column_id: note_dealId_columnId,
    sys_table_id: noteTableId,
    column_name: 'deal_id',
    name: 'Deal Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_content_columnId = uuidv4();
  noteColumns.push({
    id: note_content_columnId,
    name: 'content',
    displayName: 'Content',
  });

  await knex('sys_column').insert({
    sys_column_id: note_content_columnId,
    sys_table_id: noteTableId,
    column_name: 'content',
    name: 'Content',
    sys_reference_id: typeToReferenceId('text'),
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
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_isPinned_columnId = uuidv4();
  noteColumns.push({
    id: note_isPinned_columnId,
    name: 'is_pinned',
    displayName: 'Is Pinned',
  });

  await knex('sys_column').insert({
    sys_column_id: note_isPinned_columnId,
    sys_table_id: noteTableId,
    column_name: 'is_pinned',
    name: 'Is Pinned',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;
  const note_authorId_columnId = uuidv4();
  noteColumns.push({
    id: note_authorId_columnId,
    name: 'author_id',
    displayName: 'Author Id',
  });

  await knex('sys_column').insert({
    sys_column_id: note_authorId_columnId,
    sys_table_id: noteTableId,
    column_name: 'author_id',
    name: 'Author Id',
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
    seq_no: noteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  noteColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const noteSeqNumbers = generateRandomSeqNumbers(noteColumns.length);

  for (let i = 0; i < noteColumns.length; i++) {
    const col = noteColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: noteTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: noteSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: noteTableId,
    sys_window_id: noteWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: noteTableId,
    sys_window_id: noteWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Note');

  // --------------------------------------------------------------------------
  // Task (bus_task)
  // --------------------------------------------------------------------------
  const taskTableId = uuidv4();
  const taskWindowId = uuidv4();
  const taskTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: taskWindowId,
    name: 'Task',
    description: 'Maintain Task records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: taskTableId,
    table_name: 'bus_task',
    name: 'Task',
    description: 'Task entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: taskWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: taskTabId,
    sys_window_id: taskWindowId,
    sys_table_id: taskTableId,
    name: 'Task',
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
  });

  // Create sys_column entries
  const taskColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let taskColumnSeqNo = 10;
  const task_id_columnId = uuidv4();
  taskColumns.push({
    id: task_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: task_id_columnId,
    sys_table_id: taskTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_contactId_columnId = uuidv4();
  taskColumns.push({
    id: task_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await knex('sys_column').insert({
    sys_column_id: task_contactId_columnId,
    sys_table_id: taskTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_companyId_columnId = uuidv4();
  taskColumns.push({
    id: task_companyId_columnId,
    name: 'company_id',
    displayName: 'Company Id',
  });

  await knex('sys_column').insert({
    sys_column_id: task_companyId_columnId,
    sys_table_id: taskTableId,
    column_name: 'company_id',
    name: 'Company Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_dealId_columnId = uuidv4();
  taskColumns.push({
    id: task_dealId_columnId,
    name: 'deal_id',
    displayName: 'Deal Id',
  });

  await knex('sys_column').insert({
    sys_column_id: task_dealId_columnId,
    sys_table_id: taskTableId,
    column_name: 'deal_id',
    name: 'Deal Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_title_columnId = uuidv4();
  taskColumns.push({
    id: task_title_columnId,
    name: 'title',
    displayName: 'Title',
  });

  await knex('sys_column').insert({
    sys_column_id: task_title_columnId,
    sys_table_id: taskTableId,
    column_name: 'title',
    name: 'Title',
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_description_columnId = uuidv4();
  taskColumns.push({
    id: task_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await knex('sys_column').insert({
    sys_column_id: task_description_columnId,
    sys_table_id: taskTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_priority_columnId = uuidv4();
  taskColumns.push({
    id: task_priority_columnId,
    name: 'priority',
    displayName: 'Priority',
  });

  await knex('sys_column').insert({
    sys_column_id: task_priority_columnId,
    sys_table_id: taskTableId,
    column_name: 'priority',
    name: 'Priority',
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_status_columnId = uuidv4();
  taskColumns.push({
    id: task_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: task_status_columnId,
    sys_table_id: taskTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_dueDate_columnId = uuidv4();
  taskColumns.push({
    id: task_dueDate_columnId,
    name: 'due_date',
    displayName: 'Due Date',
  });

  await knex('sys_column').insert({
    sys_column_id: task_dueDate_columnId,
    sys_table_id: taskTableId,
    column_name: 'due_date',
    name: 'Due Date',
    sys_reference_id: typeToReferenceId('date'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_completedAt_columnId = uuidv4();
  taskColumns.push({
    id: task_completedAt_columnId,
    name: 'completed_at',
    displayName: 'Completed At',
  });

  await knex('sys_column').insert({
    sys_column_id: task_completedAt_columnId,
    sys_table_id: taskTableId,
    column_name: 'completed_at',
    name: 'Completed At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_assignedTo_columnId = uuidv4();
  taskColumns.push({
    id: task_assignedTo_columnId,
    name: 'assigned_to',
    displayName: 'Assigned To',
  });

  await knex('sys_column').insert({
    sys_column_id: task_assignedTo_columnId,
    sys_table_id: taskTableId,
    column_name: 'assigned_to',
    name: 'Assigned To',
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;
  const task_createdBy_columnId = uuidv4();
  taskColumns.push({
    id: task_createdBy_columnId,
    name: 'created_by',
    displayName: 'Created By',
  });

  await knex('sys_column').insert({
    sys_column_id: task_createdBy_columnId,
    sys_table_id: taskTableId,
    column_name: 'created_by',
    name: 'Created By',
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
    seq_no: taskColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  taskColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const taskSeqNumbers = generateRandomSeqNumbers(taskColumns.length);

  for (let i = 0; i < taskColumns.length; i++) {
    const col = taskColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: taskTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: taskSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: taskTableId,
    sys_window_id: taskWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: taskTableId,
    sys_window_id: taskWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Task');

  // --------------------------------------------------------------------------
  // Email Message (bus_email_message)
  // --------------------------------------------------------------------------
  const emailMessageTableId = uuidv4();
  const emailMessageWindowId = uuidv4();
  const emailMessageTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: emailMessageWindowId,
    name: 'Email Message',
    description: 'Maintain Email Message records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: emailMessageTableId,
    table_name: 'bus_email_message',
    name: 'Email Message',
    description: 'EmailMessage entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: emailMessageWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: emailMessageTabId,
    sys_window_id: emailMessageWindowId,
    sys_table_id: emailMessageTableId,
    name: 'Email Message',
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
  });

  // Create sys_column entries
  const emailMessageColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let emailMessageColumnSeqNo = 10;
  const emailMessage_id_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_id_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_contactId_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_contactId_columnId,
    name: 'contact_id',
    displayName: 'Contact Id',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_contactId_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'contact_id',
    name: 'Contact Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_dealId_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_dealId_columnId,
    name: 'deal_id',
    displayName: 'Deal Id',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_dealId_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'deal_id',
    name: 'Deal Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_threadId_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_threadId_columnId,
    name: 'thread_id',
    displayName: 'Thread Id',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_threadId_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'thread_id',
    name: 'Thread Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_subject_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_subject_columnId,
    name: 'subject',
    displayName: 'Subject',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_subject_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'subject',
    name: 'Subject',
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
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_bodyText_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_bodyText_columnId,
    name: 'body_text',
    displayName: 'Body Text',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_bodyText_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'body_text',
    name: 'Body Text',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_bodyHtml_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_bodyHtml_columnId,
    name: 'body_html',
    displayName: 'Body Html',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_bodyHtml_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'body_html',
    name: 'Body Html',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_direction_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_direction_columnId,
    name: 'direction',
    displayName: 'Direction',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_direction_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'direction',
    name: 'Direction',
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
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_sentAt_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_sentAt_columnId,
    name: 'sent_at',
    displayName: 'Sent At',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_sentAt_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'sent_at',
    name: 'Sent At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_receivedAt_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_receivedAt_columnId,
    name: 'received_at',
    displayName: 'Received At',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_receivedAt_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'received_at',
    name: 'Received At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_openedAt_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_openedAt_columnId,
    name: 'opened_at',
    displayName: 'Opened At',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_openedAt_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'opened_at',
    name: 'Opened At',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;
  const emailMessage_openCount_columnId = uuidv4();
  emailMessageColumns.push({
    id: emailMessage_openCount_columnId,
    name: 'open_count',
    displayName: 'Open Count',
  });

  await knex('sys_column').insert({
    sys_column_id: emailMessage_openCount_columnId,
    sys_table_id: emailMessageTableId,
    column_name: 'open_count',
    name: 'Open Count',
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
    seq_no: emailMessageColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailMessageColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const emailMessageSeqNumbers = generateRandomSeqNumbers(emailMessageColumns.length);

  for (let i = 0; i < emailMessageColumns.length; i++) {
    const col = emailMessageColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: emailMessageTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: emailMessageSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: emailMessageTableId,
    sys_window_id: emailMessageWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: emailMessageTableId,
    sys_window_id: emailMessageWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Email Message');

  // --------------------------------------------------------------------------
  // Email Template (bus_email_template)
  // --------------------------------------------------------------------------
  const emailTemplateTableId = uuidv4();
  const emailTemplateWindowId = uuidv4();
  const emailTemplateTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: emailTemplateWindowId,
    name: 'Email Template',
    description: 'Maintain Email Template records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: emailTemplateTableId,
    table_name: 'bus_email_template',
    name: 'Email Template',
    description: 'EmailTemplate entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: emailTemplateWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: emailTemplateTabId,
    sys_window_id: emailTemplateWindowId,
    sys_table_id: emailTemplateTableId,
    name: 'Email Template',
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
  });

  // Create sys_column entries
  const emailTemplateColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let emailTemplateColumnSeqNo = 10;
  const emailTemplate_id_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_id_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_name_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_name_columnId,
    sys_table_id: emailTemplateTableId,
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
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_subject_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_subject_columnId,
    name: 'subject',
    displayName: 'Subject',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_subject_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'subject',
    name: 'Subject',
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
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_bodyHtml_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_bodyHtml_columnId,
    name: 'body_html',
    displayName: 'Body Html',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_bodyHtml_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'body_html',
    name: 'Body Html',
    sys_reference_id: typeToReferenceId('text'),
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
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_bodyText_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_bodyText_columnId,
    name: 'body_text',
    displayName: 'Body Text',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_bodyText_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'body_text',
    name: 'Body Text',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_category_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_category_columnId,
    name: 'category',
    displayName: 'Category',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_category_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'category',
    name: 'Category',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;
  const emailTemplate_isActive_columnId = uuidv4();
  emailTemplateColumns.push({
    id: emailTemplate_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
  });

  await knex('sys_column').insert({
    sys_column_id: emailTemplate_isActive_columnId,
    sys_table_id: emailTemplateTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: emailTemplateColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  emailTemplateColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const emailTemplateSeqNumbers = generateRandomSeqNumbers(emailTemplateColumns.length);

  for (let i = 0; i < emailTemplateColumns.length; i++) {
    const col = emailTemplateColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: emailTemplateTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: emailTemplateSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: emailTemplateTableId,
    sys_window_id: emailTemplateWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: emailTemplateTableId,
    sys_window_id: emailTemplateWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Email Template');

  // --------------------------------------------------------------------------
  // Product (bus_product)
  // --------------------------------------------------------------------------
  const productTableId = uuidv4();
  const productWindowId = uuidv4();
  const productTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: productWindowId,
    name: 'Product',
    description: 'Maintain Product records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: productTableId,
    table_name: 'bus_product',
    name: 'Product',
    description: 'Product entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: productWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: productTabId,
    sys_window_id: productWindowId,
    sys_table_id: productTableId,
    name: 'Product',
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
  });

  // Create sys_column entries
  const productColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let productColumnSeqNo = 10;
  const product_id_columnId = uuidv4();
  productColumns.push({
    id: product_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: product_id_columnId,
    sys_table_id: productTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_name_columnId = uuidv4();
  productColumns.push({
    id: product_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: product_name_columnId,
    sys_table_id: productTableId,
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_sku_columnId = uuidv4();
  productColumns.push({
    id: product_sku_columnId,
    name: 'sku',
    displayName: 'Sku',
  });

  await knex('sys_column').insert({
    sys_column_id: product_sku_columnId,
    sys_table_id: productTableId,
    column_name: 'sku',
    name: 'Sku',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_description_columnId = uuidv4();
  productColumns.push({
    id: product_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await knex('sys_column').insert({
    sys_column_id: product_description_columnId,
    sys_table_id: productTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_unitPrice_columnId = uuidv4();
  productColumns.push({
    id: product_unitPrice_columnId,
    name: 'unit_price',
    displayName: 'Unit Price',
  });

  await knex('sys_column').insert({
    sys_column_id: product_unitPrice_columnId,
    sys_table_id: productTableId,
    column_name: 'unit_price',
    name: 'Unit Price',
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_currency_columnId = uuidv4();
  productColumns.push({
    id: product_currency_columnId,
    name: 'currency',
    displayName: 'Currency',
  });

  await knex('sys_column').insert({
    sys_column_id: product_currency_columnId,
    sys_table_id: productTableId,
    column_name: 'currency',
    name: 'Currency',
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;
  const product_isActive_columnId = uuidv4();
  productColumns.push({
    id: product_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
  });

  await knex('sys_column').insert({
    sys_column_id: product_isActive_columnId,
    sys_table_id: productTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: productColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  productColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const productSeqNumbers = generateRandomSeqNumbers(productColumns.length);

  for (let i = 0; i < productColumns.length; i++) {
    const col = productColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: productTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: productSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: productTableId,
    sys_window_id: productWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: productTableId,
    sys_window_id: productWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Product');

  // --------------------------------------------------------------------------
  // Quote (bus_quote)
  // --------------------------------------------------------------------------
  const quoteTableId = uuidv4();
  const quoteWindowId = uuidv4();
  const quoteTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: quoteWindowId,
    name: 'Quote',
    description: 'Maintain Quote records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: quoteTableId,
    table_name: 'bus_quote',
    name: 'Quote',
    description: 'Quote entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: quoteWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: quoteTabId,
    sys_window_id: quoteWindowId,
    sys_table_id: quoteTableId,
    name: 'Quote',
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
  });

  // Create sys_column entries
  const quoteColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let quoteColumnSeqNo = 10;
  const quote_id_columnId = uuidv4();
  quoteColumns.push({
    id: quote_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_id_columnId,
    sys_table_id: quoteTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_dealId_columnId = uuidv4();
  quoteColumns.push({
    id: quote_dealId_columnId,
    name: 'deal_id',
    displayName: 'Deal Id',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_dealId_columnId,
    sys_table_id: quoteTableId,
    column_name: 'deal_id',
    name: 'Deal Id',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_quoteNumber_columnId = uuidv4();
  quoteColumns.push({
    id: quote_quoteNumber_columnId,
    name: 'quote_number',
    displayName: 'Quote Number',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_quoteNumber_columnId,
    sys_table_id: quoteTableId,
    column_name: 'quote_number',
    name: 'Quote Number',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_status_columnId = uuidv4();
  quoteColumns.push({
    id: quote_status_columnId,
    name: 'status',
    displayName: 'Status',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_status_columnId,
    sys_table_id: quoteTableId,
    column_name: 'status',
    name: 'Status',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_validUntil_columnId = uuidv4();
  quoteColumns.push({
    id: quote_validUntil_columnId,
    name: 'valid_until',
    displayName: 'Valid Until',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_validUntil_columnId,
    sys_table_id: quoteTableId,
    column_name: 'valid_until',
    name: 'Valid Until',
    sys_reference_id: typeToReferenceId('date'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_subtotal_columnId = uuidv4();
  quoteColumns.push({
    id: quote_subtotal_columnId,
    name: 'subtotal',
    displayName: 'Subtotal',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_subtotal_columnId,
    sys_table_id: quoteTableId,
    column_name: 'subtotal',
    name: 'Subtotal',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_discountAmount_columnId = uuidv4();
  quoteColumns.push({
    id: quote_discountAmount_columnId,
    name: 'discount_amount',
    displayName: 'Discount Amount',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_discountAmount_columnId,
    sys_table_id: quoteTableId,
    column_name: 'discount_amount',
    name: 'Discount Amount',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_taxAmount_columnId = uuidv4();
  quoteColumns.push({
    id: quote_taxAmount_columnId,
    name: 'tax_amount',
    displayName: 'Tax Amount',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_taxAmount_columnId,
    sys_table_id: quoteTableId,
    column_name: 'tax_amount',
    name: 'Tax Amount',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_totalAmount_columnId = uuidv4();
  quoteColumns.push({
    id: quote_totalAmount_columnId,
    name: 'total_amount',
    displayName: 'Total Amount',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_totalAmount_columnId,
    sys_table_id: quoteTableId,
    column_name: 'total_amount',
    name: 'Total Amount',
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
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_terms_columnId = uuidv4();
  quoteColumns.push({
    id: quote_terms_columnId,
    name: 'terms',
    displayName: 'Terms',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_terms_columnId,
    sys_table_id: quoteTableId,
    column_name: 'terms',
    name: 'Terms',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;
  const quote_notes_columnId = uuidv4();
  quoteColumns.push({
    id: quote_notes_columnId,
    name: 'notes',
    displayName: 'Notes',
  });

  await knex('sys_column').insert({
    sys_column_id: quote_notes_columnId,
    sys_table_id: quoteTableId,
    column_name: 'notes',
    name: 'Notes',
    sys_reference_id: typeToReferenceId('text'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const quoteSeqNumbers = generateRandomSeqNumbers(quoteColumns.length);

  for (let i = 0; i < quoteColumns.length; i++) {
    const col = quoteColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: quoteTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: quoteSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: quoteTableId,
    sys_window_id: quoteWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: quoteTableId,
    sys_window_id: quoteWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Quote');

  // --------------------------------------------------------------------------
  // Quote Item (bus_quote_item)
  // --------------------------------------------------------------------------
  const quoteItemTableId = uuidv4();
  const quoteItemWindowId = uuidv4();
  const quoteItemTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: quoteItemWindowId,
    name: 'Quote Item',
    description: 'Maintain Quote Item records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: quoteItemTableId,
    table_name: 'bus_quote_item',
    name: 'Quote Item',
    description: 'QuoteItem entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: quoteItemWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: quoteItemTabId,
    sys_window_id: quoteItemWindowId,
    sys_table_id: quoteItemTableId,
    name: 'Quote Item',
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
  });

  // Create sys_column entries
  const quoteItemColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let quoteItemColumnSeqNo = 10;
  const quoteItem_id_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_id_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_quoteId_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_quoteId_columnId,
    name: 'quote_id',
    displayName: 'Quote Id',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_quoteId_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'quote_id',
    name: 'Quote Id',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_productId_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_productId_columnId,
    name: 'product_id',
    displayName: 'Product Id',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_productId_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'product_id',
    name: 'Product Id',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_description_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_description_columnId,
    name: 'description',
    displayName: 'Description',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_description_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'description',
    name: 'Description',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_quantity_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_quantity_columnId,
    name: 'quantity',
    displayName: 'Quantity',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_quantity_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'quantity',
    name: 'Quantity',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_unitPrice_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_unitPrice_columnId,
    name: 'unit_price',
    displayName: 'Unit Price',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_unitPrice_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'unit_price',
    name: 'Unit Price',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_discountPercent_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_discountPercent_columnId,
    name: 'discount_percent',
    displayName: 'Discount Percent',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_discountPercent_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'discount_percent',
    name: 'Discount Percent',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;
  const quoteItem_totalPrice_columnId = uuidv4();
  quoteItemColumns.push({
    id: quoteItem_totalPrice_columnId,
    name: 'total_price',
    displayName: 'Total Price',
  });

  await knex('sys_column').insert({
    sys_column_id: quoteItem_totalPrice_columnId,
    sys_table_id: quoteItemTableId,
    column_name: 'total_price',
    name: 'Total Price',
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
    seq_no: quoteItemColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  quoteItemColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const quoteItemSeqNumbers = generateRandomSeqNumbers(quoteItemColumns.length);

  for (let i = 0; i < quoteItemColumns.length; i++) {
    const col = quoteItemColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: quoteItemTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: quoteItemSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: quoteItemTableId,
    sys_window_id: quoteItemWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: quoteItemTableId,
    sys_window_id: quoteItemWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Quote Item');

  // --------------------------------------------------------------------------
  // User (bus_user)
  // --------------------------------------------------------------------------
  const userTableId = uuidv4();
  const userWindowId = uuidv4();
  const userTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: userWindowId,
    name: 'User',
    description: 'Maintain User records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: userTableId,
    table_name: 'bus_user',
    name: 'User',
    description: 'User entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: userWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: userTabId,
    sys_window_id: userWindowId,
    sys_table_id: userTableId,
    name: 'User',
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
  });

  // Create sys_column entries
  const userColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let userColumnSeqNo = 10;
  const user_id_columnId = uuidv4();
  userColumns.push({
    id: user_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: user_id_columnId,
    sys_table_id: userTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_email_columnId = uuidv4();
  userColumns.push({
    id: user_email_columnId,
    name: 'email',
    displayName: 'Email',
  });

  await knex('sys_column').insert({
    sys_column_id: user_email_columnId,
    sys_table_id: userTableId,
    column_name: 'email',
    name: 'Email',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_firstName_columnId = uuidv4();
  userColumns.push({
    id: user_firstName_columnId,
    name: 'first_name',
    displayName: 'First Name',
  });

  await knex('sys_column').insert({
    sys_column_id: user_firstName_columnId,
    sys_table_id: userTableId,
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_lastName_columnId = uuidv4();
  userColumns.push({
    id: user_lastName_columnId,
    name: 'last_name',
    displayName: 'Last Name',
  });

  await knex('sys_column').insert({
    sys_column_id: user_lastName_columnId,
    sys_table_id: userTableId,
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_role_columnId = uuidv4();
  userColumns.push({
    id: user_role_columnId,
    name: 'role',
    displayName: 'Role',
  });

  await knex('sys_column').insert({
    sys_column_id: user_role_columnId,
    sys_table_id: userTableId,
    column_name: 'role',
    name: 'Role',
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_teamId_columnId = uuidv4();
  userColumns.push({
    id: user_teamId_columnId,
    name: 'team_id',
    displayName: 'Team Id',
  });

  await knex('sys_column').insert({
    sys_column_id: user_teamId_columnId,
    sys_table_id: userTableId,
    column_name: 'team_id',
    name: 'Team Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_isActive_columnId = uuidv4();
  userColumns.push({
    id: user_isActive_columnId,
    name: 'is_active',
    displayName: 'Is Active',
  });

  await knex('sys_column').insert({
    sys_column_id: user_isActive_columnId,
    sys_table_id: userTableId,
    column_name: 'is_active',
    name: 'Is Active',
    sys_reference_id: typeToReferenceId('boolean'),
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
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;
  const user_lastLogin_columnId = uuidv4();
  userColumns.push({
    id: user_lastLogin_columnId,
    name: 'last_login',
    displayName: 'Last Login',
  });

  await knex('sys_column').insert({
    sys_column_id: user_lastLogin_columnId,
    sys_table_id: userTableId,
    column_name: 'last_login',
    name: 'Last Login',
    sys_reference_id: typeToReferenceId('datetime'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: userColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  userColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const userSeqNumbers = generateRandomSeqNumbers(userColumns.length);

  for (let i = 0; i < userColumns.length; i++) {
    const col = userColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: userTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: userSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: userTableId,
    sys_window_id: userWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: userTableId,
    sys_window_id: userWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for User');

  // --------------------------------------------------------------------------
  // Team (bus_team)
  // --------------------------------------------------------------------------
  const teamTableId = uuidv4();
  const teamWindowId = uuidv4();
  const teamTabId = uuidv4();

  // Create sys_window entry FIRST (sys_table references it)
  await knex('sys_window').insert({
    sys_window_id: teamWindowId,
    name: 'Team',
    description: 'Maintain Team records',
    window_type: 'M',
    is_sales_transaction: false,
    is_default: true,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_table entry AFTER sys_window
  await knex('sys_table').insert({
    sys_table_id: teamTableId,
    table_name: 'bus_team',
    name: 'Team',
    description: 'Team entity',
    access_level: 'A',
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    sys_window_id: teamWindowId,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Create sys_tab entry
  await knex('sys_tab').insert({
    sys_tab_id: teamTabId,
    sys_window_id: teamWindowId,
    sys_table_id: teamTableId,
    name: 'Team',
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
  });

  // Create sys_column entries
  const teamColumns: Array<{ id: string; name: string; displayName: string }> = [];

  let teamColumnSeqNo = 10;
  const team_id_columnId = uuidv4();
  teamColumns.push({
    id: team_id_columnId,
    name: 'id',
    displayName: 'Id',
  });

  await knex('sys_column').insert({
    sys_column_id: team_id_columnId,
    sys_table_id: teamTableId,
    column_name: 'id',
    name: 'Id',
    sys_reference_id: typeToReferenceId('string'),
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
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  teamColumnSeqNo += 10;
  const team_name_columnId = uuidv4();
  teamColumns.push({
    id: team_name_columnId,
    name: 'name',
    displayName: 'Name',
  });

  await knex('sys_column').insert({
    sys_column_id: team_name_columnId,
    sys_table_id: teamTableId,
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
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  teamColumnSeqNo += 10;
  const team_managerId_columnId = uuidv4();
  teamColumns.push({
    id: team_managerId_columnId,
    name: 'manager_id',
    displayName: 'Manager Id',
  });

  await knex('sys_column').insert({
    sys_column_id: team_managerId_columnId,
    sys_table_id: teamTableId,
    column_name: 'manager_id',
    name: 'Manager Id',
    sys_reference_id: typeToReferenceId('string'),
    is_key: false,
    is_parent: false,
    is_mandatory: false,
    is_updateable: true,
    is_identifier: false,
    is_selection_column: false,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: true,
    seq_no: teamColumnSeqNo,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });
  teamColumnSeqNo += 10;

  // Create sys_field entries with RANDOMIZED seq_no
  // This demonstrates the runtime modification capability
  const teamSeqNumbers = generateRandomSeqNumbers(teamColumns.length);

  for (let i = 0; i < teamColumns.length; i++) {
    const col = teamColumns[i];
    await knex('sys_field').insert({
      sys_field_id: uuidv4(),
      sys_tab_id: teamTabId,
      sys_column_id: col.id,
      sys_field_group_id: i < 3 ? fieldGroupGeneral : fieldGroupDetails,
      name: col.displayName,
      seq_no: teamSeqNumbers[i],
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
    });
  }

  // Grant access to admin role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: adminRoleId,
    sys_table_id: teamTableId,
    sys_window_id: teamWindowId,
    access_type_table: 'W',
    is_read_only: false,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  // Grant read access to user role
  await knex('sys_access').insert({
    sys_access_id: uuidv4(),
    sys_role_id: userRoleId,
    sys_table_id: teamTableId,
    sys_window_id: teamWindowId,
    access_type_table: 'R',
    is_read_only: true,
    is_exclude: false,
    entity_type: 'U',
    is_active: true,
    created_by: createdBy,
    updated_by: createdBy,
    created_at: now,
    updated_at: now,
  });

  console.log('✓ Created dictionary entries for Team');


  // ============================================================================
  // Summary
  // ============================================================================
  console.log('');
  console.log('Dictionary seed complete:');
  console.log('  - 15 business entities');
  console.log('  - 2 default roles (Administrator, User)');
  console.log('  - 1 admin user (admin@localhost)');
  console.log('  - 3 field groups');
  console.log('');
  console.log('NOTE: Field seq_no values are randomized to demonstrate');
  console.log('      runtime UI modification capability. Administrators can');
  console.log('      reorder fields via the admin interface.');
}
