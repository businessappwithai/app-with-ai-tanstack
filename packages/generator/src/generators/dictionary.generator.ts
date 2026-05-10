/**
 * Dictionary Generator
 *
 * Generates Application Dictionary metadata for sys_ tables.
 * Creates sys_table, sys_column, sys_window, sys_tab, sys_field entries
 * for each business entity, plus sys_reference seed data.
 *
 * This is shared infrastructure used by both stack options.
 */

import {
  attributeToBusAttribute,
  type BusEntity,
  type BusEntityAttribute,
  type DictionaryGenerationConfig,
  defaultDictionaryConfig,
  type Entity,
  entityToBusEntity,
  generateSysFieldGroups,
  generateSysFields,
  generateSysTab,
  generateSysTable,
  generateSysWindow,
  ReferenceType,
  type Relationship,
  type SysColumn,
  type SysField,
  type SysFieldGroup,
  type SysTab,
  type SysTable,
  type SysWindow,
} from "@erdwithai/core/types";

export interface DictionaryGeneratorOptions {
  databaseType: "postgresql" | "mysql" | "sqlite";
  includeRbac: boolean;
  randomizeFieldOrder: boolean;
}

export interface DictionaryContext {
  entities: BusEntity[];
  busAttributes: Map<string, BusEntityAttribute[]>;
  sysTables: Array<
    Omit<SysTable, "sys_table_id" | "created_at" | "updated_at"> & { _tempId: string }
  >;
  sysColumns: Array<
    Omit<SysColumn, "sys_column_id" | "created_at" | "updated_at"> & {
      _tempId: string;
      _tableRef: string;
    }
  >;
  sysWindows: Array<
    Omit<SysWindow, "sys_window_id" | "created_at" | "updated_at"> & {
      _tempId: string;
      _tableRef: string;
    }
  >;
  sysTabs: Array<
    Omit<SysTab, "sys_tab_id" | "created_at" | "updated_at"> & {
      _tempId: string;
      _windowRef: string;
      _tableRef: string;
    }
  >;
  sysFields: Array<
    Omit<SysField, "sys_field_id" | "created_at" | "updated_at"> & {
      _tempId: string;
      _tabRef: string;
      _columnRef: string;
    }
  >;
  sysFieldGroups: Array<
    Omit<SysFieldGroup, "sys_field_group_id" | "created_at" | "updated_at"> & { _tempId: string }
  >;
  references: typeof ReferenceType;
  relationships: Relationship[];
}

/**
 * Generates complete Application Dictionary metadata for all entities.
 * This class is used by both Option 1 (TanStack Start-NestJS) and Option 2 (OpenUI5-OData).
 */
export class DictionaryGenerator {
  private config: DictionaryGenerationConfig;

  constructor(options: DictionaryGeneratorOptions) {
    this.config = {
      ...defaultDictionaryConfig,
      randomizeFieldOrder: options.randomizeFieldOrder,
    };
  }

  /**
   * Generate complete dictionary context from entities and relationships
   */
  generateDictionaryContext(entities: Entity[], relationships: Relationship[]): DictionaryContext {
    const busEntities: BusEntity[] = [];
    const busAttributesMap = new Map<string, BusEntityAttribute[]>();
    const sysTables: DictionaryContext["sysTables"] = [];
    const sysColumns: DictionaryContext["sysColumns"] = [];
    const sysWindows: DictionaryContext["sysWindows"] = [];
    const sysTabs: DictionaryContext["sysTabs"] = [];
    const sysFields: DictionaryContext["sysFields"] = [];
    const sysFieldGroups: DictionaryContext["sysFieldGroups"] = [];

    let tableCounter = 0;
    let columnCounter = 0;
    let windowCounter = 0;
    let tabCounter = 0;
    let fieldCounter = 0;
    let fieldGroupCounter = 0;

    // Generate dictionary entries for each entity
    for (const entity of entities) {
      const busEntity = entityToBusEntity(entity);
      busEntities.push(busEntity);

      // Generate bus_ attributes
      const busAttrs = entity.attributes.map((attr, index) => attributeToBusAttribute(attr, index));
      busAttributesMap.set(busEntity.tableName, busAttrs);

      // Generate sys_table entry
      const tableId = `table_${++tableCounter}`;
      const sysTable = {
        ...generateSysTable(busEntity, this.config),
        _tempId: tableId,
      };
      sysTables.push(sysTable);

      // Generate sys_column entries
      const columnEntries = busAttrs.map((attr, _index) => {
        const colId = `col_${++columnCounter}`;
        return {
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
          is_key: attr.name === entity.primaryKey,
          is_parent: false,
          is_mandatory: attr.required,
          is_updateable: attr.name !== entity.primaryKey,
          is_identifier: attr.name === entity.primaryKey || attr.name === "name",
          is_selection_column:
            ["name", "email", "title", "description", "status"].includes(attr.name) ||
            attr.unique === true,
          is_translated: false,
          is_encrypted: false,
          is_allow_logging: true,
          is_allow_copy: attr.name !== entity.primaryKey,
          seq_no: attr.seqNo,
          callout: undefined,
          read_only_logic: undefined,
          mandatory_logic: undefined,
          format_pattern: undefined,
          entity_type: this.config.defaultEntityType,
          is_active: true,
          created_by: this.config.createdBy,
          updated_by: this.config.createdBy,
          _tempId: colId,
          _tableRef: tableId,
        };
      });
      sysColumns.push(...columnEntries);

      // Generate sys_window
      const windowId = `win_${++windowCounter}`;
      const sysWindow = {
        ...generateSysWindow(busEntity, this.config),
        _tempId: windowId,
        _tableRef: tableId,
      };
      sysWindows.push(sysWindow);

      // Generate sys_tab
      const tabId = `tab_${++tabCounter}`;
      const sysTab = {
        ...generateSysTab(windowId, tableId, busEntity, 0, this.config),
        _tempId: tabId,
        _windowRef: windowId,
        _tableRef: tableId,
      };
      sysTabs.push(sysTab);

      // Generate sys_field_group entries
      const groups = generateSysFieldGroups(busEntity.displayName, this.config);
      const groupEntries = groups.map((group) => ({
        ...group,
        _tempId: `fg_${++fieldGroupCounter}`,
      }));
      sysFieldGroups.push(...groupEntries);

      // Generate sys_field entries
      const columnRefs = columnEntries.map((col) => ({
        sys_column_id: col._tempId,
        column_name: col.column_name,
        name: col.name,
      }));
      const fields = generateSysFields(tabId, columnRefs, this.config);
      const fieldEntries = fields.map((field, idx) => ({
        ...field,
        _tempId: `field_${++fieldCounter}`,
        _tabRef: tabId,
        _columnRef: columnEntries[idx]?._tempId ?? "",
      }));
      sysFields.push(...fieldEntries);
    }

    return {
      entities: busEntities,
      busAttributes: busAttributesMap,
      sysTables,
      sysColumns,
      sysWindows,
      sysTabs,
      sysFields,
      sysFieldGroups,
      references: ReferenceType,
      relationships,
    };
  }

  /**
   * Get standard system table names for sys_ tables
   */
  getSystemTableNames(): string[] {
    return [
      "sys_table",
      "sys_column",
      "sys_window",
      "sys_tab",
      "sys_field",
      "sys_field_group",
      "sys_reference",
      "sys_ref_list",
      "sys_ref_table",
      "sys_val_rule",
      "sys_user",
      "sys_role",
      "sys_user_roles",
      "sys_access",
    ];
  }

  /**
   * Get standard reference types for seeding
   */
  getStandardReferences(): Array<{ id: number; name: string; description: string }> {
    return [
      { id: ReferenceType.STRING, name: "String", description: "String/Varchar field" },
      { id: ReferenceType.INTEGER, name: "Integer", description: "Integer number" },
      { id: ReferenceType.AMOUNT, name: "Amount", description: "Decimal/Amount" },
      { id: ReferenceType.ID, name: "ID", description: "Identifier (UUID)" },
      { id: ReferenceType.TEXT, name: "Text", description: "Long text/memo" },
      { id: ReferenceType.DATE, name: "Date", description: "Date only" },
      { id: ReferenceType.DATETIME, name: "DateTime", description: "Date and time" },
      { id: ReferenceType.LIST, name: "List", description: "Dropdown list" },
      { id: ReferenceType.TABLE, name: "Table", description: "Table reference" },
      {
        id: ReferenceType.TABLE_DIRECT,
        name: "Table Direct",
        description: "Direct table reference",
      },
      { id: ReferenceType.YES_NO, name: "Yes-No", description: "Boolean (Yes/No)" },
      { id: ReferenceType.LOCATION, name: "Location", description: "Location/Address" },
      { id: ReferenceType.LOCATOR, name: "Locator", description: "Warehouse locator" },
      { id: ReferenceType.ACCOUNT, name: "Account", description: "Account reference" },
      { id: ReferenceType.URL, name: "URL", description: "URL/Web address" },
      { id: ReferenceType.IMAGE, name: "Image", description: "Image file" },
      { id: ReferenceType.FILE, name: "File", description: "File attachment" },
      { id: ReferenceType.COLOR, name: "Color", description: "Color picker" },
      { id: ReferenceType.JSON, name: "JSON", description: "JSON data" },
      { id: ReferenceType.PASSWORD, name: "Password", description: "Masked password" },
      { id: ReferenceType.EMAIL, name: "Email", description: "Email address" },
      { id: ReferenceType.PHONE, name: "Phone", description: "Phone number" },
    ];
  }
}
