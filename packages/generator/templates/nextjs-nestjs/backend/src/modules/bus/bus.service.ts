/**
 * Business Entity Service
 *
 * Dynamic service for all bus_ prefixed tables.
 * Validates data against Application Dictionary metadata.
 *
 * Generated: 2026-01-26T15:23:31.873Z
 */

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Knex } from "knex";
import { KNEX_CONNECTION } from "../../database/database.constants";
import type {
  DatabaseService,
  PaginatedResult,
  PaginationOptions,
} from "../../database/database.service";
import {
  executeAfterCreateHooks,
  executeAfterDeleteHooks,
  executeAfterListHooks,
  executeAfterReadHooks,
  executeAfterUpdateHooks,
  executeBeforeCreateHooks,
  executeBeforeDeleteHooks,
  executeBeforeListHooks,
  executeBeforeReadHooks,
  executeBeforeUpdateHooks,
} from "../hooks/hooks";

export interface FieldMetadata {
  sys_field_id: string;
  name: string;
  column_name: string;
  sys_reference_id: number;
  is_mandatory: boolean;
  is_updateable: boolean;
  field_length?: number;
  default_value?: string;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_read_only: boolean;
  // Group and styling properties
  sys_field_group_id?: string;
  group_name?: string;
  group_description?: string;
  group_columns?: number;
  group_layout_type?: string;
  col_span?: number;
  row_span?: number;
  color?: string;
  font_weight?: string;
  font_style?: string;
}

export interface FieldGroup {
  sys_field_group_id: string;
  sys_tab_id: string;
  name: string;
  description?: string;
  seq_no: number;
  columns: number;
  layout_type: string;
  is_collapsed_by_default: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EntityMetadata {
  table: {
    sys_table_id: string;
    table_name: string;
    name: string;
    description?: string;
  };
  columns: FieldMetadata[];
  window?: {
    sys_window_id: string;
    name: string;
  };
}

@Injectable()
export class BusService {
  private metadataCache: Map<string, EntityMetadata> = new Map();

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Get the bus_ prefixed table name for an entity
   */
  private getTableName(entity: string): string {
    const normalized = entity.toLowerCase().replace(/-/g, "_");
    return normalized.startsWith("bus_") ? normalized : `bus_${normalized}`;
  }

  /**
   * Transform database record to API response format
   * Adds a consistent 'id' field from the table's primary key
   */
  private transformRecord(record: any, tableName: string): any {
    if (!record) return record;
    // The primary key column is always 'id' in the database schema
    return {
      id: record.id,
      ...record,
    };
  }

  /**
   * Transform multiple records
   */
  private transformRecords(records: any[], tableName: string): any[] {
    return records.map((record) => this.transformRecord(record, tableName));
  }

  /**
   * Find all records with pagination and filtering
   */
  async findAll(
    entity: string,
    options: PaginationOptions = {},
    filters: Record<string, any> = {}
  ): Promise<PaginatedResult<any>> {
    const tableName = this.getTableName(entity);

    // Verify table exists in dictionary
    await this.verifyEntity(entity);

    // Execute beforeList hooks
    const processedOptions = await executeBeforeListHooks(entity, { options, filters });

    const result = await this.db.findAll(
      tableName,
      processedOptions.options,
      processedOptions.filters
    );

    // Execute afterList hooks
    await executeAfterListHooks(entity, result.data);

    // Transform records to include consistent 'id' field
    const transformedData = this.transformRecords(result.data, tableName);

    return {
      ...result,
      data: transformedData,
    };
  }

  /**
   * Find a single record by ID
   */
  async findById(entity: string, id: string): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeRead hooks
    const processedId = await executeBeforeReadHooks(entity, { id });

    const result = await this.db.findByIdOrFail(tableName, processedId.id || id);

    // Execute afterRead hooks
    await executeAfterReadHooks(entity, result);

    // Transform record to include consistent 'id' field
    return this.transformRecord(result, tableName);
  }

  /**
   * Create a new record
   */
  async create(entity: string, data: Record<string, any>): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Apply default values from dictionary
    const metadata = await this.getEntityMetadata(entity);
    const dataWithDefaults = { ...data };

    for (const column of metadata.columns) {
      if (column.default_value && dataWithDefaults[column.column_name] === undefined) {
        dataWithDefaults[column.column_name] = this.parseDefaultValue(
          column.default_value,
          column.sys_reference_id
        );
      }
    }

    // Execute beforeCreate hooks
    const processedData = await executeBeforeCreateHooks(entity, dataWithDefaults);

    const result = await this.db.create(tableName, processedData);

    // Execute afterCreate hooks
    await executeAfterCreateHooks(entity, result);

    // Transform record to include consistent 'id' field
    return this.transformRecord(result, tableName);
  }

  /**
   * Update an existing record
   */
  async update(
    entity: string,
    id: string,
    data: Record<string, any>,
    expectedVersion?: number
  ): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeUpdate hooks
    const processedData = await executeBeforeUpdateHooks(entity, data);

    const result = await this.db.update(tableName, id, processedData, expectedVersion);

    // Execute afterUpdate hooks
    await executeAfterUpdateHooks(entity, result);

    // Transform record to include consistent 'id' field
    return this.transformRecord(result, tableName);
  }

  /**
   * Soft delete a record
   */
  async softDelete(entity: string, id: string): Promise<boolean> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeDelete hooks (can prevent deletion)
    const canDelete = await executeBeforeDeleteHooks(entity, id);
    if (!canDelete) {
      throw new BadRequestException(`Cannot delete ${entity}: still referenced`);
    }

    const result = await this.db.softDelete(tableName, id);

    // Execute afterDelete hooks
    await executeAfterDeleteHooks(entity, result);

    return result;
  }

  /**
   * Verify entity exists in the Application Dictionary
   */
  private async verifyEntity(entity: string): Promise<void> {
    const tableName = this.getTableName(entity);

    const tableRecord = await this.knex("sys_table")
      .where("table_name", tableName)
      .where("is_active", true)
      .first();

    if (!tableRecord) {
      throw new NotFoundException(`Entity '${entity}' not found in Application Dictionary`);
    }
  }

  /**
   * Get entity metadata from Application Dictionary
   */
  async getEntityMetadata(entity: string): Promise<EntityMetadata> {
    const tableName = this.getTableName(entity);

    // Check cache
    if (this.metadataCache.has(tableName)) {
      return this.metadataCache.get(tableName)!;
    }

    // Get table info
    const table = await this.knex("sys_table")
      .where("table_name", tableName)
      .where("is_active", true)
      .first();

    if (!table) {
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    // Get window info
    const window = table.sys_window_id
      ? await this.knex("sys_window").where("sys_window_id", table.sys_window_id).first()
      : undefined;

    // Get columns with field metadata
    const columns = await this.knex("sys_column")
      .select(
        "sys_column.*",
        "sys_field.sys_field_id",
        "sys_field.seq_no",
        "sys_field.seq_no_grid",
        "sys_field.is_displayed",
        "sys_field.is_displayed_grid",
        "sys_field.is_read_only as field_is_read_only",
        "sys_field.display_logic"
      )
      .leftJoin("sys_tab", "sys_column.sys_table_id", "sys_tab.sys_table_id")
      .leftJoin("sys_field", function () {
        this.on("sys_field.sys_column_id", "=", "sys_column.sys_column_id").andOn(
          "sys_field.sys_tab_id",
          "=",
          "sys_tab.sys_tab_id"
        );
      })
      .where("sys_column.sys_table_id", table.sys_table_id)
      .where("sys_column.is_active", true)
      .orderBy("sys_column.seq_no", "asc");

    const metadata: EntityMetadata = {
      table: {
        sys_table_id: table.sys_table_id,
        table_name: table.table_name,
        name: table.name,
        description: table.description,
      },
      columns: columns.map((col) => ({
        sys_field_id: col.sys_field_id,
        name: col.name,
        column_name: col.column_name,
        sys_reference_id: col.sys_reference_id,
        is_mandatory: col.is_mandatory,
        is_updateable: col.is_updateable,
        field_length: col.field_length,
        default_value: col.default_value,
        seq_no: col.seq_no || 0,
        seq_no_grid: col.seq_no_grid || 0,
        is_displayed: col.is_displayed === 1 || col.is_displayed === true,
        is_displayed_grid: col.is_displayed_grid === 1 || col.is_displayed_grid === true,
        is_read_only: col.field_is_read_only || false,
      })),
      window: window
        ? {
            sys_window_id: window.sys_window_id,
            name: window.name,
          }
        : undefined,
    };

    // Cache metadata
    this.metadataCache.set(tableName, metadata);

    return metadata;
  }

  /**
   * Get fields for form display (ordered by seq_no)
   */
  async getFormFields(entity: string): Promise<FieldMetadata[]> {
    const metadata = await this.getEntityMetadata(entity);
    return metadata.columns.filter((col) => col.is_displayed).sort((a, b) => a.seq_no - b.seq_no);
  }

  /**
   * Get ALL form fields (including hidden ones) for the layout editor
   */
  async getAllFormFields(entity: string): Promise<FieldMetadata[]> {
    const tableName = this.getTableName(entity);

    // Get table info
    const table = await this.knex("sys_table")
      .where("table_name", tableName)
      .where("is_active", true)
      .first();

    if (!table) {
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    // Get columns with field metadata and group information
    const columns = await this.knex("sys_column")
      .select(
        "sys_column.*",
        "sys_field.sys_field_id",
        "sys_field.seq_no",
        "sys_field.seq_no_grid",
        "sys_field.is_displayed",
        "sys_field.is_displayed_grid",
        "sys_field.is_read_only as field_is_read_only",
        "sys_field.sys_field_group_id",
        "sys_field.col_span",
        "sys_field.row_span",
        "sys_field.color",
        "sys_field.font_weight",
        "sys_field.font_style",
        "sys_field_group.name as group_name",
        "sys_field_group.description as group_description",
        "sys_field_group.columns as group_columns",
        "sys_field_group.layout_type as group_layout_type"
      )
      .leftJoin("sys_tab", "sys_column.sys_table_id", "sys_tab.sys_table_id")
      .leftJoin("sys_field", function () {
        this.on("sys_field.sys_column_id", "=", "sys_column.sys_column_id").andOn(
          "sys_field.sys_tab_id",
          "=",
          "sys_tab.sys_tab_id"
        );
      })
      .leftJoin(
        "sys_field_group as sys_field_group",
        "sys_field.sys_field_group_id",
        "sys_field_group.sys_field_group_id"
      )
      .where("sys_column.sys_table_id", table.sys_table_id)
      .where("sys_column.is_active", true)
      .orderBy("sys_field_group.seq_no")
      .orderBy("sys_field.seq_no");

    const metadata: FieldMetadata[] = columns.map((col: any) => ({
      sys_field_id: col.sys_field_id,
      name: col.name,
      column_name: col.column_name,
      sys_reference_id: col.sys_reference_id,
      is_mandatory: col.is_mandatory,
      is_updateable: col.is_updateable,
      field_length: col.field_length,
      default_value: col.default_value,
      seq_no: col.seq_no || 0,
      seq_no_grid: col.seq_no_grid || 0,
      is_displayed: col.is_displayed === 1 || col.is_displayed === true,
      is_displayed_grid: col.is_displayed_grid === 1 || col.is_displayed_grid === true,
      is_read_only: col.field_is_read_only || false,
      // Group and styling
      sys_field_group_id: col.sys_field_group_id,
      group_name: col.group_name,
      group_description: col.group_description,
      group_columns: col.group_columns,
      group_layout_type: col.group_layout_type,
      col_span: col.col_span || 1,
      row_span: col.row_span || 1,
      color: col.color || "contrast",
      font_weight: col.font_weight || "normal",
      font_style: col.font_style || "normal",
    }));

    return metadata;
  }

  /**
   * Get fields for grid display (ordered by seq_no_grid)
   */
  async getGridFields(entity: string): Promise<FieldMetadata[]> {
    const metadata = await this.getEntityMetadata(entity);
    return metadata.columns
      .filter((col) => col.is_displayed_grid)
      .sort((a, b) => a.seq_no_grid - b.seq_no_grid);
  }

  /**
   * Get ALL grid fields (including hidden ones) for the layout editor
   */
  async getAllGridFields(entity: string): Promise<FieldMetadata[]> {
    const metadata = await this.getEntityMetadata(entity);
    return metadata.columns.sort((a, b) => a.seq_no_grid - b.seq_no_grid);
  }

  /**
   * Get all field groups for an entity
   */
  async getFieldGroups(entity: string): Promise<FieldGroup[]> {
    const tableName = this.getTableName(entity);

    // Get tab info (sys_tab, not sys_table, since field groups are tied to tabs)
    const tab = await this.knex("sys_tab")
      .innerJoin("sys_table", "sys_tab.sys_table_id", "sys_table.sys_table_id")
      .where("sys_table.table_name", tableName)
      .where("sys_tab.is_active", true)
      .select("sys_tab.sys_tab_id", "sys_tab.*")
      .first();

    if (!tab) {
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    const groups = await this.knex("sys_field_group")
      .where("sys_tab_id", tab.sys_tab_id)
      .where("is_active", true)
      .orderBy("seq_no");

    return groups.map((g: any) => ({
      sys_field_group_id: g.sys_field_group_id,
      sys_tab_id: g.sys_tab_id,
      name: g.name,
      description: g.description,
      seq_no: g.seq_no,
      columns: g.columns || 1,
      layout_type: g.layout_type || "single",
      is_collapsed_by_default:
        g.is_collapsed_by_default === 1 || g.is_collapsed_by_default === true,
    }));
  }

  /**
   * Create a new field group
   */
  async createFieldGroup(
    entity: string,
    groupData: {
      name: string;
      description?: string;
      seq_no?: number;
      columns?: number;
      layout_type?: string;
    }
  ): Promise<FieldGroup> {
    const tableName = this.getTableName(entity);

    // Get tab info
    const tab = await this.knex("sys_tab")
      .innerJoin("sys_table", "sys_tab.sys_table_id", "sys_table.sys_table_id")
      .where("sys_table.table_name", tableName)
      .where("sys_tab.is_active", true)
      .select("sys_tab.sys_tab_id", "sys_tab.*")
      .first();

    if (!tab) {
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    // Get the next seq_no
    const maxSeqNo = await this.knex("sys_field_group")
      .where("sys_tab_id", tab.sys_tab_id)
      .max("seq_no as max_seq_no")
      .first();

    const sys_field_group_id = this.generateUUID();

    const group: FieldGroup = {
      sys_field_group_id,
      sys_tab_id: tab.sys_tab_id,
      name: groupData.name,
      description: groupData.description || undefined,
      seq_no: groupData.seq_no || (maxSeqNo?.max_seq_no || 0) + 10,
      columns: groupData.columns || 1,
      layout_type: groupData.layout_type || "single",
      is_collapsed_by_default: false,
      created_by: "system",
      updated_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.knex("sys_field_group").insert(group);

    // Clear metadata cache
    this.clearMetadataCache(entity);

    return group;
  }

  /**
   * Update a field group
   */
  async updateFieldGroup(
    entity: string,
    groupId: string,
    updates: Partial<FieldGroup>
  ): Promise<FieldGroup> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: "system",
    };

    await this.knex("sys_field_group").where("sys_field_group_id", groupId).update(updateData);

    // Clear metadata cache
    this.clearMetadataCache(entity);

    return this.knex("sys_field_group").where("sys_field_group_id", groupId).first();
  }

  /**
   * Delete a field group
   */
  async deleteFieldGroup(entity: string, groupId: string): Promise<void> {
    // Unassign fields from this group
    await this.knex("sys_field")
      .where("sys_field_group_id", groupId)
      .update({ sys_field_group_id: null });

    // Delete the group
    await this.knex("sys_field_group").where("sys_field_group_id", groupId).del();

    // Clear metadata cache
    this.clearMetadataCache(entity);
  }

  /**
   * Assign field to a group
   */
  async assignFieldToGroup(entity: string, fieldId: string, groupId: string | null): Promise<void> {
    await this.knex("sys_field").where("sys_field_id", fieldId).update({
      sys_field_group_id: groupId,
      updated_at: new Date().toISOString(),
    });

    // Clear metadata cache
    this.clearMetadataCache(entity);
  }

  /**
   * Update field styling (color, col_span, etc.)
   */
  async updateFieldStyle(
    entity: string,
    fieldId: string,
    style: {
      color?: string;
      col_span?: number;
      row_span?: number;
      font_weight?: string;
      font_style?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      ...style,
      updated_at: new Date().toISOString(),
    };

    await this.knex("sys_field").where("sys_field_id", fieldId).update(updateData);

    // Clear metadata cache
    this.clearMetadataCache(entity);
  }

  /**
   * Generate a UUID for new records
   */
  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validate data against dictionary metadata
   */
  async validateData(
    entity: string,
    data: Record<string, any>,
    mode: "create" | "update" | "patch"
  ): Promise<void> {
    const metadata = await this.getEntityMetadata(entity);
    const errors: string[] = [];

    for (const column of metadata.columns) {
      const value = data[column.column_name];

      // Check mandatory fields (only for create and full update)
      if (mode !== "patch" && column.is_mandatory && !column.default_value) {
        if (value === undefined || value === null || value === "") {
          errors.push(`Field '${column.name}' (${column.column_name}) is required`);
        }
      }

      // Check field length
      if (value && column.field_length && typeof value === "string") {
        if (value.length > column.field_length) {
          errors.push(`Field '${column.name}' exceeds maximum length of ${column.field_length}`);
        }
      }

      // Check updateability (for update/patch)
      if ((mode === "update" || mode === "patch") && !column.is_updateable) {
        if (value !== undefined && column.column_name !== "id") {
          // Allow if value hasn't changed (would need to fetch current record)
          // For now, just warn in errors
          errors.push(`Field '${column.name}' is not updateable`);
        }
      }

      // Type validation based on reference type
      if (value !== undefined && value !== null) {
        const typeError = this.validateType(value, column.sys_reference_id, column.name);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: "Validation failed",
        errors,
      });
    }
  }

  /**
   * Validate value type based on sys_reference_id
   */
  private validateType(value: any, referenceId: number, fieldName: string): string | null {
    switch (referenceId) {
      case 10: // String
      case 14: // Text
      case 24: // URL
      case 30: // Email
      case 31: // Phone
        if (typeof value !== "string") {
          return `Field '${fieldName}' must be a string`;
        }
        break;

      case 11: // Integer
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return `Field '${fieldName}' must be an integer`;
        }
        break;

      case 12: // Amount/Decimal
        if (typeof value !== "number") {
          return `Field '${fieldName}' must be a number`;
        }
        break;

      case 20: // Boolean
        if (typeof value !== "boolean") {
          return `Field '${fieldName}' must be a boolean`;
        }
        break;

      case 15: // Date
      case 16: // DateTime
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          return `Field '${fieldName}' must be a valid date`;
        }
        break;

      case 13: // UUID
      case 18: // Table reference
      case 19: {
        // Table direct
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof value !== "string" || !uuidRegex.test(value)) {
          return `Field '${fieldName}' must be a valid UUID`;
        }
        break;
      }

      case 28: // JSON
        if (typeof value !== "object") {
          return `Field '${fieldName}' must be a JSON object`;
        }
        break;
    }

    return null;
  }

  /**
   * Parse default value based on reference type
   */
  private parseDefaultValue(defaultValue: string, referenceId: number): any {
    switch (referenceId) {
      case 11: // Integer
        return parseInt(defaultValue, 10);
      case 12: // Decimal
        return parseFloat(defaultValue);
      case 20: // Boolean
        return defaultValue.toLowerCase() === "true" || defaultValue === "Y";
      case 28: // JSON
        try {
          return JSON.parse(defaultValue);
        } catch {
          return {};
        }
      default:
        return defaultValue;
    }
  }

  /**
   * Clear metadata cache (useful after dictionary changes)
   */
  clearMetadataCache(entityName?: string): void {
    if (entityName) {
      const tableName = this.getTableName(entityName);
      this.metadataCache.delete(tableName);
    } else {
      this.metadataCache.clear();
    }
  }
}
