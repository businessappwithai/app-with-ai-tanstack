import type { FieldMetadata } from '@/hooks/use-entities';

function field(
  column_name: string,
  name: string,
  sys_reference_id: number,
  opts: Partial<FieldMetadata> = {}
): FieldMetadata {
  return {
    sys_field_id: `ad-${column_name}`,
    column_name,
    name,
    sys_reference_id,
    is_mandatory: false,
    is_displayed: true,
    is_displayed_grid: true,
    is_read_only: false,
    seq_no: 0,
    seq_no_grid: 0,
    ...opts,
  };
}

const REF = {
  STRING: 10,
  INTEGER: 11,
  AMOUNT: 12,
  ID: 13,
  TEXT: 14,
  DATE: 15,
  DATETIME: 16,
  LIST: 17,
  TABLE: 18,
  TABLE_DIRECT: 19,
  YES_NO: 20,
  URL: 24,
};

// ============================================================================
// sys_table
// ============================================================================

export const SYS_TABLE_FORM_FIELDS: FieldMetadata[] = [
  field('table_name', 'DB Table Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 20, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 30 }),
  field('icon', 'Icon', REF.STRING, { seq_no: 40, field_length: 100 }),
  field('access_level', 'Access Level', REF.STRING, { seq_no: 50, field_length: 2 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 60 }),
  field('is_view', 'View', REF.YES_NO, { seq_no: 70 }),
  field('is_document', 'Document', REF.YES_NO, { seq_no: 80 }),
  field('is_high_volume', 'High Volume', REF.YES_NO, { seq_no: 90 }),
  field('is_changelog', 'Maintain Change Log', REF.YES_NO, { seq_no: 100 }),
  field('entity_type', 'Entity Type', REF.STRING, { seq_no: 110, field_length: 40, is_read_only: true }),
];

export const SYS_TABLE_GRID_FIELDS: FieldMetadata[] = [
  field('table_name', 'DB Table Name', REF.STRING, { seq_no_grid: 10 }),
  field('name', 'Name', REF.STRING, { seq_no_grid: 20 }),
  field('description', 'Description', REF.STRING, { seq_no_grid: 30 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 40 }),
];

// ============================================================================
// sys_column
// ============================================================================

export const SYS_COLUMN_FORM_FIELDS: FieldMetadata[] = [
  field('column_name', 'DB Column Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 20, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 30 }),
  field('sys_reference_id', 'Reference', REF.INTEGER, { is_mandatory: true, seq_no: 40 }),
  field('field_length', 'Length', REF.INTEGER, { seq_no: 50 }),
  field('default_value', 'Default Value', REF.STRING, { seq_no: 60, field_length: 255 }),
  field('is_key', 'Key', REF.YES_NO, { seq_no: 70 }),
  field('is_parent', 'Parent Link', REF.YES_NO, { seq_no: 80 }),
  field('is_mandatory', 'Mandatory', REF.YES_NO, { seq_no: 90 }),
  field('is_updateable', 'Updateable', REF.YES_NO, { seq_no: 100 }),
  field('is_identifier', 'Identifier', REF.YES_NO, { seq_no: 110 }),
  field('is_selection_column', 'Selection Column', REF.YES_NO, { seq_no: 120 }),
  field('is_encrypted', 'Encrypted', REF.YES_NO, { seq_no: 130 }),
  field('seq_no', 'Sequence', REF.INTEGER, { seq_no: 140 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 150 }),
];

export const SYS_COLUMN_GRID_FIELDS: FieldMetadata[] = [
  field('column_name', 'DB Column Name', REF.STRING, { seq_no_grid: 10 }),
  field('name', 'Name', REF.STRING, { seq_no_grid: 20 }),
  field('sys_reference_id', 'Reference', REF.INTEGER, { seq_no_grid: 30 }),
  field('is_mandatory', 'Mandatory', REF.YES_NO, { seq_no_grid: 40 }),
  field('is_key', 'Key', REF.YES_NO, { seq_no_grid: 50 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 60 }),
];

// ============================================================================
// sys_window
// ============================================================================

export const SYS_WINDOW_FORM_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 20 }),
  field('help', 'Help', REF.TEXT, { seq_no: 30 }),
  field('window_type', 'Window Type', REF.STRING, { seq_no: 40, field_length: 1 }),
  field('is_sales_transaction', 'Sales Transaction', REF.YES_NO, { seq_no: 50 }),
  field('is_default', 'Default', REF.YES_NO, { seq_no: 60 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 70 }),
  field('entity_type', 'Entity Type', REF.STRING, { seq_no: 80, field_length: 40, is_read_only: true }),
];

export const SYS_WINDOW_GRID_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { seq_no_grid: 10 }),
  field('description', 'Description', REF.STRING, { seq_no_grid: 20 }),
  field('window_type', 'Type', REF.STRING, { seq_no_grid: 30 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 40 }),
];

// ============================================================================
// sys_tab
// ============================================================================

export const SYS_TAB_FORM_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 20 }),
  field('help', 'Help', REF.TEXT, { seq_no: 30 }),
  field('tab_level', 'Tab Level', REF.INTEGER, { seq_no: 40 }),
  field('seq_no', 'Sequence', REF.INTEGER, { seq_no: 50 }),
  field('is_single_row', 'Single Row', REF.YES_NO, { seq_no: 60 }),
  field('is_translation_tab', 'Translation Tab', REF.YES_NO, { seq_no: 70 }),
  field('is_read_only', 'Read Only', REF.YES_NO, { seq_no: 80 }),
  field('is_insert_record', 'Insert Record', REF.YES_NO, { seq_no: 90 }),
  field('is_advanced_tab', 'Advanced Tab', REF.YES_NO, { seq_no: 100 }),
  field('order_by_clause', 'Order By', REF.STRING, { seq_no: 110, field_length: 255 }),
  field('where_clause', 'Where Clause', REF.TEXT, { seq_no: 120 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 130 }),
];

export const SYS_TAB_GRID_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { seq_no_grid: 10 }),
  field('tab_level', 'Level', REF.INTEGER, { seq_no_grid: 20 }),
  field('seq_no', 'Sequence', REF.INTEGER, { seq_no_grid: 30 }),
  field('is_read_only', 'Read Only', REF.YES_NO, { seq_no_grid: 40 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 50 }),
];

// ============================================================================
// sys_field
// ============================================================================

export const SYS_FIELD_FORM_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 20 }),
  field('help', 'Help', REF.TEXT, { seq_no: 30 }),
  field('seq_no', 'Sequence', REF.INTEGER, { seq_no: 40 }),
  field('seq_no_grid', 'Grid Sequence', REF.INTEGER, { seq_no: 50 }),
  field('display_length', 'Display Length', REF.INTEGER, { seq_no: 60 }),
  field('column_span', 'Column Span', REF.INTEGER, { seq_no: 70 }),
  field('is_displayed', 'Displayed', REF.YES_NO, { seq_no: 80 }),
  field('is_displayed_grid', 'Displayed in Grid', REF.YES_NO, { seq_no: 90 }),
  field('is_read_only', 'Read Only', REF.YES_NO, { seq_no: 100 }),
  field('is_same_line', 'Same Line', REF.YES_NO, { seq_no: 110 }),
  field('is_heading', 'Heading', REF.YES_NO, { seq_no: 120 }),
  field('default_value', 'Default Value', REF.STRING, { seq_no: 130, field_length: 255 }),
  field('sort_no', 'Sort Number', REF.INTEGER, { seq_no: 140 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 150 }),
];

export const SYS_FIELD_GRID_FIELDS: FieldMetadata[] = [
  field('name', 'Name', REF.STRING, { seq_no_grid: 10 }),
  field('seq_no', 'Sequence', REF.INTEGER, { seq_no_grid: 20 }),
  field('is_displayed', 'Displayed', REF.YES_NO, { seq_no_grid: 30 }),
  field('is_read_only', 'Read Only', REF.YES_NO, { seq_no_grid: 40 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 50 }),
];

// ============================================================================
// sys_reference
// ============================================================================

export const SYS_REFERENCE_FORM_FIELDS: FieldMetadata[] = [
  field('sys_reference_id', 'Reference ID', REF.INTEGER, { is_mandatory: true, seq_no: 10, is_read_only: true }),
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 20, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 30 }),
  field('validation_type', 'Validation Type', REF.STRING, { seq_no: 40, field_length: 1 }),
  field('vformat', 'Value Format', REF.STRING, { seq_no: 50, field_length: 40 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 60 }),
  field('entity_type', 'Entity Type', REF.STRING, { seq_no: 70, field_length: 40, is_read_only: true }),
];

export const SYS_REFERENCE_GRID_FIELDS: FieldMetadata[] = [
  field('sys_reference_id', 'ID', REF.INTEGER, { seq_no_grid: 10 }),
  field('name', 'Name', REF.STRING, { seq_no_grid: 20 }),
  field('description', 'Description', REF.STRING, { seq_no_grid: 30 }),
  field('validation_type', 'Type', REF.STRING, { seq_no_grid: 40 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 50 }),
];

// ============================================================================
// sys_element (stub - no backend table yet)
// ============================================================================

export const SYS_ELEMENT_FORM_FIELDS: FieldMetadata[] = [
  field('column_name', 'DB Column Name', REF.STRING, { is_mandatory: true, seq_no: 10, field_length: 100 }),
  field('name', 'Name', REF.STRING, { is_mandatory: true, seq_no: 20, field_length: 100 }),
  field('print_name', 'Print Name', REF.STRING, { seq_no: 30, field_length: 100 }),
  field('description', 'Description', REF.TEXT, { seq_no: 40 }),
  field('help', 'Help / Comment', REF.TEXT, { seq_no: 50 }),
  field('po_name', 'PO Name', REF.STRING, { seq_no: 60, field_length: 100 }),
  field('po_print_name', 'PO Print Name', REF.STRING, { seq_no: 70, field_length: 100 }),
  field('po_description', 'PO Description', REF.TEXT, { seq_no: 80 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no: 90 }),
];

export const SYS_ELEMENT_GRID_FIELDS: FieldMetadata[] = [
  field('column_name', 'DB Column Name', REF.STRING, { seq_no_grid: 10 }),
  field('name', 'Name', REF.STRING, { seq_no_grid: 20 }),
  field('print_name', 'Print Name', REF.STRING, { seq_no_grid: 30 }),
  field('description', 'Description', REF.STRING, { seq_no_grid: 40 }),
  field('is_active', 'Active', REF.YES_NO, { seq_no_grid: 50 }),
];
