/**
 * Business Entity Types (bus_ prefix)
 * Types for handling business entities generated from ERD
 *
 * Business tables use the bus_ prefix to distinguish them from
 * system/dictionary tables (sys_ prefix)
 */

import { z } from "zod";
import type { Entity, EntityAttribute, Relationship } from "./entity.types";
import {
  AccessLevel,
  BUS_TABLE_PREFIX,
  ReferenceType,
  type SysColumn,
  type SysField,
  type SysFieldGroup,
  type SysTab,
  type SysTable,
  type SysWindow,
  WindowType,
} from "./sys-dictionary.types";

// ============================================================================
// Business Entity Conversion Types
// ============================================================================

/**
 * Converts EntityAttribute type to sys_reference_id
 */
export function attributeTypeToReferenceId(type: EntityAttribute["type"]): number {
  const typeMapping: Record<EntityAttribute["type"], number> = {
    string: ReferenceType.STRING,
    integer: ReferenceType.INTEGER,
    decimal: ReferenceType.AMOUNT,
    boolean: ReferenceType.YES_NO,
    date: ReferenceType.DATE,
    datetime: ReferenceType.DATETIME,
    text: ReferenceType.TEXT,
    json: ReferenceType.JSON,
  };
  return typeMapping[type];
}

/**
 * Converts sys_reference_id back to EntityAttribute type
 */
export function referenceIdToAttributeType(refId: number): EntityAttribute["type"] {
  const reverseMapping: Record<number, EntityAttribute["type"]> = {
    [ReferenceType.STRING]: "string",
    [ReferenceType.INTEGER]: "integer",
    [ReferenceType.AMOUNT]: "decimal",
    [ReferenceType.ID]: "string",
    [ReferenceType.TEXT]: "text",
    [ReferenceType.DATE]: "date",
    [ReferenceType.DATETIME]: "datetime",
    [ReferenceType.YES_NO]: "boolean",
    [ReferenceType.JSON]: "json",
    [ReferenceType.LIST]: "string",
    [ReferenceType.TABLE]: "string",
    [ReferenceType.TABLE_DIRECT]: "string",
    [ReferenceType.URL]: "string",
    [ReferenceType.IMAGE]: "string",
    [ReferenceType.FILE]: "string",
    [ReferenceType.EMAIL]: "string",
    [ReferenceType.PHONE]: "string",
    [ReferenceType.PASSWORD]: "string",
    [ReferenceType.COLOR]: "string",
    [ReferenceType.LOCATION]: "string",
    [ReferenceType.LOCATOR]: "string",
    [ReferenceType.ACCOUNT]: "string",
  };
  return reverseMapping[refId] || "string";
}

// ============================================================================
// Business Entity Interfaces
// ============================================================================

/**
 * Business entity with bus_ prefix applied
 */
export interface BusEntity extends Omit<Entity, "tableName"> {
  tableName: string; // Will have bus_ prefix
  originalName: string; // Original entity name from ERD
  displayName: string; // Human-readable name
}

/**
 * Business entity attribute with additional metadata
 */
export interface BusEntityAttribute extends EntityAttribute {
  columnName: string; // Physical column name
  displayName: string; // Human-readable name
  referenceId: number; // sys_reference_id
  seqNo: number; // Column sequence
}

/**
 * Business relationship with bus_ prefix awareness
 */
export interface BusRelationship extends Relationship {
  sourceTableName: string; // bus_ prefixed
  targetTableName: string; // bus_ prefixed
}

// ============================================================================
// Conversion Functions - Entity to Dictionary
// ============================================================================

/**
 * Converts an Entity to a BusEntity with bus_ prefix
 */
export function entityToBusEntity(entity: Entity): BusEntity {
  const tableName = entity.tableName.startsWith(BUS_TABLE_PREFIX)
    ? entity.tableName
    : `${BUS_TABLE_PREFIX}${entity.tableName}`;

  return {
    ...entity,
    tableName,
    originalName: entity.name,
    displayName: formatDisplayName(entity.name),
    attributes: entity.attributes.map((attr, index) => attributeToBusAttribute(attr, index, entity.primaryKey)),
  };
}

/**
 * Resolves the sys_reference_id for an attribute. The generated physical
 * schema uses UUID primary keys and UUID foreign keys for *_id columns
 * regardless of the scalar type declared in the ERD, so key columns must map
 * to ID/TABLE_DIRECT references rather than the declared type.
 *
 * PK fields (matched by entityPrimaryKey) get ReferenceType.ID so they render
 * as read-only UUID displays, not FK dropdowns.
 */
export function attributeReferenceId(attr: EntityAttribute, entityPrimaryKey?: string): number {
  if (attr.name === "id") return ReferenceType.ID;
  if (entityPrimaryKey && attr.name === entityPrimaryKey) return ReferenceType.ID;
  if (attr.name.endsWith("_id") && attr.isForeignKey) return ReferenceType.TABLE_DIRECT;
  return attributeTypeToReferenceId(attr.type);
}

/**
 * Converts an EntityAttribute to BusEntityAttribute
 */
export function attributeToBusAttribute(attr: EntityAttribute, index: number, entityPrimaryKey?: string): BusEntityAttribute {
  return {
    ...attr,
    columnName: attr.name,
    displayName: formatDisplayName(attr.name),
    referenceId: attributeReferenceId(attr, entityPrimaryKey),
    seqNo: (index + 1) * 10,
  };
}

/**
 * Converts a Relationship to BusRelationship
 */
export function relationshipToBusRelationship(rel: Relationship): BusRelationship {
  return {
    ...rel,
    sourceTableName: `${BUS_TABLE_PREFIX}${rel.sourceEntity.toLowerCase()}`,
    targetTableName: `${BUS_TABLE_PREFIX}${rel.targetEntity.toLowerCase()}`,
  };
}

// ============================================================================
// Dictionary Entry Generation
// ============================================================================

/**
 * Configuration for dictionary entry generation
 */
export interface DictionaryGenerationConfig {
  defaultEntityType: string;
  createdBy: string;
  randomizeFieldOrder: boolean;
  includeFieldGroups: boolean;
  defaultAccessLevel: (typeof AccessLevel)[keyof typeof AccessLevel];
}

export const defaultDictionaryConfig: DictionaryGenerationConfig = {
  defaultEntityType: "U",
  createdBy: "System",
  randomizeFieldOrder: true,
  includeFieldGroups: true,
  defaultAccessLevel: AccessLevel.ALL,
};

/**
 * Get default icon for an entity based on its name pattern
 * Returns lucide-react icon names or emoji
 */
function getEntityIcon(name: string, tableName: string): string {
  const lowerName = name.toLowerCase();
  const lowerTableName = tableName.toLowerCase();

  // Person/Human related
  if (
    lowerName.includes("patient") ||
    lowerName.includes("person") ||
    lowerName.includes("customer")
  ) {
    return "User";
  }
  if (
    lowerName.includes("staff") ||
    lowerName.includes("employee") ||
    lowerName.includes("provider")
  ) {
    return "UserCircle";
  }
  if (lowerName.includes("user") || lowerName.includes("admin")) {
    return "Users";
  }

  // Health/Medical specific
  if (lowerName.includes("appointment") || lowerName.includes("schedule")) {
    return "Calendar";
  }
  if (lowerName.includes("allergy")) {
    return "ShieldAlert";
  }
  if (lowerName.includes("encounter") || lowerName.includes("visit")) {
    return "Stethoscope";
  }
  if (lowerName.includes("insurance")) {
    return "Shield";
  }
  if (lowerName.includes("department") || lowerName.includes("ward")) {
    return "Building2";
  }
  if (lowerName.includes("bed") || lowerName.includes("room")) {
    return "BedDouble";
  }
  if (lowerName.includes("prescription") || lowerName.includes("medication")) {
    return "Pill";
  }
  if (lowerName.includes("diagnosis") || lowerName.includes("condition")) {
    return "Activity";
  }

  // Document/File related
  if (
    lowerName.includes("document") ||
    lowerName.includes("file") ||
    lowerName.includes("attachment")
  ) {
    return "FileText";
  }

  // Time/Date related
  if (lowerName.includes("date") || lowerName.includes("time") || lowerName.includes("shift")) {
    return "Clock";
  }

  // Location/Place related
  if (lowerName.includes("location") || lowerName.includes("address")) {
    return "MapPin";
  }
  if (lowerName.includes("warehouse") || lowerName.includes("inventory")) {
    return "Package";
  }

  // Order/Transaction related
  if (
    lowerName.includes("order") ||
    lowerName.includes("invoice") ||
    lowerName.includes("receipt")
  ) {
    return "Receipt";
  }
  if (lowerName.includes("payment") || lowerName.includes("transaction")) {
    return "CreditCard";
  }
  if (lowerName.includes("quote") || lowerName.includes("proposal")) {
    return "FileText";
  }

  // Product/Item related
  if (lowerName.includes("product") || lowerName.includes("item")) {
    return "Package";
  }
  if (lowerName.includes("category") || lowerName.includes("group")) {
    return "FolderTree";
  }
  if (lowerName.includes("price") || lowerName.includes("cost")) {
    return "DollarSign";
  }

  // Account/Finance related
  if (lowerName.includes("account") || lowerName.includes("ledger")) {
    return "Wallet";
  }
  if (lowerName.includes("budget")) {
    return "PieChart";
  }

  // Communication related
  if (
    lowerName.includes("email") ||
    lowerName.includes("message") ||
    lowerName.includes("notification")
  ) {
    return "Mail";
  }
  if (lowerName.includes("phone") || lowerName.includes("call")) {
    return "Phone";
  }

  // Status/State related
  if (lowerName.includes("status") || lowerName.includes("state")) {
    return "Status";
  }

  // Configuration/Settings related
  if (
    lowerName.includes("config") ||
    lowerName.includes("setting") ||
    lowerName.includes("preference")
  ) {
    return "Settings";
  }

  // Security/Access related
  if (
    lowerName.includes("role") ||
    lowerName.includes("permission") ||
    lowerName.includes("access")
  ) {
    return "Lock";
  }

  // Data/Analytics related
  if (
    lowerName.includes("report") ||
    lowerName.includes("analytics") ||
    lowerName.includes("chart")
  ) {
    return "BarChart";
  }
  if (lowerName.includes("log") || lowerName.includes("audit") || lowerName.includes("history")) {
    return "History";
  }

  // Default icon based on table type
  if (lowerTableName.includes("sys_")) {
    return "Settings"; // System tables
  }

  return "Table"; // Default generic table icon
}

/**
 * Generates sys_table entry from BusEntity
 */
export function generateSysTable(
  entity: BusEntity,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Omit<SysTable, "sys_table_id" | "created_at" | "updated_at"> {
  return {
    table_name: entity.tableName,
    name: entity.displayName,
    description: entity.description,
    icon: getEntityIcon(entity.displayName, entity.tableName),
    access_level: config.defaultAccessLevel,
    is_view: false,
    is_document: false,
    is_high_volume: false,
    is_changelog: true,
    entity_type: config.defaultEntityType,
    is_active: true,
    created_by: config.createdBy,
    updated_by: config.createdBy,
  };
}

/**
 * Generates sys_column entries from BusEntity attributes
 */
export function generateSysColumns(
  tableId: string,
  attributes: BusEntityAttribute[],
  primaryKey: string,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Array<Omit<SysColumn, "sys_column_id" | "created_at" | "updated_at">> {
  return attributes.map((attr, _index) => ({
    sys_table_id: tableId,
    column_name: attr.columnName,
    name: attr.displayName,
    description: undefined,
    sys_reference_id: attr.referenceId,
    sys_val_rule_id: undefined,
    field_length: attr.maxLength,
    default_value: attr.default?.toString(),
    value_min: undefined,
    value_max: undefined,
    is_key: attr.name === primaryKey,
    is_parent: false,
    is_mandatory: attr.required,
    is_updateable: attr.name !== primaryKey,
    is_identifier: attr.name === primaryKey || attr.name === "name",
    is_selection_column: attr.name === "name" || attr.unique === true,
    is_translated: false,
    is_encrypted: false,
    is_allow_logging: true,
    is_allow_copy: attr.name !== primaryKey,
    seq_no: attr.seqNo,
    callout: undefined,
    read_only_logic: undefined,
    mandatory_logic: undefined,
    format_pattern: undefined,
    entity_type: config.defaultEntityType,
    is_active: true,
    created_by: config.createdBy,
    updated_by: config.createdBy,
  }));
}

/**
 * Generates sys_window entry for a BusEntity
 */
export function generateSysWindow(
  entity: BusEntity,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Omit<SysWindow, "sys_window_id" | "created_at" | "updated_at"> {
  return {
    name: entity.displayName,
    description: `Maintain ${entity.displayName} records`,
    help: undefined,
    window_type: WindowType.MAINTAIN,
    is_sales_transaction: false,
    is_default: true,
    entity_type: config.defaultEntityType,
    is_active: true,
    created_by: config.createdBy,
    updated_by: config.createdBy,
  };
}

/**
 * Generates sys_tab entry for a BusEntity
 */
export function generateSysTab(
  windowId: string,
  tableId: string,
  entity: BusEntity,
  tabLevel: number = 0,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Omit<SysTab, "sys_tab_id" | "created_at" | "updated_at"> {
  return {
    sys_window_id: windowId,
    sys_table_id: tableId,
    name: entity.displayName,
    description: undefined,
    help: undefined,
    tab_level: tabLevel,
    seq_no: (tabLevel + 1) * 10,
    is_single_row: tabLevel === 0,
    has_tree: false,
    is_info_tab: false,
    is_translation_tab: false,
    is_read_only: false,
    is_insert_record: true,
    is_advanced_tab: false,
    parent_column_id: undefined,
    link_column_id: undefined,
    order_by_clause: undefined,
    where_clause: undefined,
    display_logic: undefined,
    read_only_logic: undefined,
    commit_warning: undefined,
    entity_type: config.defaultEntityType,
    is_active: true,
    created_by: config.createdBy,
    updated_by: config.createdBy,
  };
}

/**
 * Generates sys_field entries for a BusEntity
 * Field order (seq_no) is randomized by default for runtime modification demo
 */
export function generateSysFields(
  tabId: string,
  columns: Array<{ sys_column_id: string; column_name: string; name: string }>,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Array<Omit<SysField, "sys_field_id" | "created_at" | "updated_at">> {
  // Create base sequence numbers
  const seqNumbers = columns.map((_, index) => (index + 1) * 10);

  // Optionally randomize the order
  if (config.randomizeFieldOrder) {
    shuffleArray(seqNumbers);
  }

  return columns.map((col, index) => ({
    sys_tab_id: tabId,
    sys_column_id: col.sys_column_id,
    sys_field_group_id: undefined,
    name: col.name,
    description: undefined,
    help: undefined,
    seq_no: seqNumbers[index] ?? (index + 1) * 10,
    seq_no_grid: (index + 1) * 10,
    display_length: undefined,
    x_position: undefined,
    y_position: undefined,
    column_span: undefined,
    num_lines: undefined,
    is_displayed: true,
    is_displayed_grid: true,
    is_read_only: false,
    is_encrypted: false,
    is_same_line: false,
    is_heading: false,
    is_field_only: false,
    display_logic: undefined,
    read_only_logic: undefined,
    mandatory_logic: undefined,
    obscure_type: undefined,
    included_tab_id: undefined,
    default_value: undefined,
    sort_no: undefined,
    entity_type: config.defaultEntityType,
    is_active: true,
    created_by: config.createdBy,
    updated_by: config.createdBy,
  }));
}

/**
 * Generates sys_field_group entries for organizing fields
 */
export function generateSysFieldGroups(
  entityName: string,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): Array<Omit<SysFieldGroup, "sys_field_group_id" | "created_at" | "updated_at">> {
  if (!config.includeFieldGroups) {
    return [];
  }

  return [
    {
      name: "General",
      description: `General information for ${entityName}`,
      field_group_type: "C",
      is_collapsed_by_default: false,
      entity_type: config.defaultEntityType,
      is_active: true,
      created_by: config.createdBy,
      updated_by: config.createdBy,
    },
    {
      name: "Details",
      description: `Detailed information for ${entityName}`,
      field_group_type: "C",
      is_collapsed_by_default: true,
      entity_type: config.defaultEntityType,
      is_active: true,
      created_by: config.createdBy,
      updated_by: config.createdBy,
    },
  ];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a name for display (camelCase/snake_case to Title Case)
 */
export function formatDisplayName(name: string): string {
  // If the name is all caps or all lowercase, just capitalize it
  if (/^[A-Z_]+$|^[a-z_]+$/.test(name)) {
    return name
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // For camelCase or mixed case, add space before capital letters
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i] as T;
    array[i] = array[j] as T;
    array[j] = temp;
  }
}

// ============================================================================
// Complete Entity Dictionary Generation
// ============================================================================

/**
 * Complete dictionary metadata for a business entity
 */
export interface EntityDictionaryMetadata {
  table: Omit<SysTable, "sys_table_id" | "created_at" | "updated_at">;
  columns: Array<Omit<SysColumn, "sys_column_id" | "created_at" | "updated_at">>;
  window: Omit<SysWindow, "sys_window_id" | "created_at" | "updated_at">;
  tab: Omit<SysTab, "sys_tab_id" | "created_at" | "updated_at">;
  fields: Array<Omit<SysField, "sys_field_id" | "created_at" | "updated_at">>;
  fieldGroups: Array<Omit<SysFieldGroup, "sys_field_group_id" | "created_at" | "updated_at">>;
}

/**
 * Generates complete dictionary metadata for an entity
 * Note: IDs are placeholders and should be generated at seed time
 */
export function generateEntityDictionary(
  entity: Entity,
  config: DictionaryGenerationConfig = defaultDictionaryConfig
): {
  busEntity: BusEntity;
  busAttributes: BusEntityAttribute[];
  dictionaryPlaceholders: {
    table: ReturnType<typeof generateSysTable>;
    window: ReturnType<typeof generateSysWindow>;
    fieldGroups: ReturnType<typeof generateSysFieldGroups>;
  };
} {
  const busEntity = entityToBusEntity(entity);
  const busAttributes = entity.attributes.map((attr, index) =>
    attributeToBusAttribute(attr, index, entity.primaryKey)
  );

  return {
    busEntity,
    busAttributes,
    dictionaryPlaceholders: {
      table: generateSysTable(busEntity, config),
      window: generateSysWindow(busEntity, config),
      fieldGroups: generateSysFieldGroups(busEntity.displayName, config),
    },
  };
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const BusEntitySchema = z.object({
  name: z.string(),
  tableName: z.string().regex(/^bus_/, "Table name must start with bus_"),
  originalName: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  attributes: z.array(z.any()),
  primaryKey: z.string(),
  timestamps: z.boolean(),
});

export const DictionaryGenerationConfigSchema = z.object({
  defaultEntityType: z.string(),
  createdBy: z.string(),
  randomizeFieldOrder: z.boolean(),
  includeFieldGroups: z.boolean(),
  defaultAccessLevel: z.enum(["S", "C", "O", "CO", "A"]),
});
