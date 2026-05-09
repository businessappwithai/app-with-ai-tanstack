/**
 * Business Entity Service
 *
 * Dynamic service for all bus_ prefixed tables.
 * Validates data against Application Dictionary metadata.
 *
 * Generated: 2026-05-07T09:31:28.479Z
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
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
  ref_table_name?: string; // Referenced table name for TABLE reference types (sys_reference_id = 18)
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
  private readonly logger = new Logger(BusService.name);
  private metadataCache: Map<string, EntityMetadata> = new Map();

  constructor(
    @Inject(KNEX_CONNECTION) private readonly knex: Knex,
    @Optional() private readonly db?: DatabaseService,
  ) {
    this.logger.log('BusService initialized');
  }

  /**
   * Singularize a word using common English rules.
   * Handles: companies→company, activities→activity, deals→deal, etc.
   */
  private singularize(word: string): string {
    if (word.endsWith("ies")) return word.slice(0, -3) + "y";
    if (
      word.endsWith("ses") ||
      word.endsWith("xes") ||
      word.endsWith("zes") ||
      word.endsWith("ches") ||
      word.endsWith("shes")
    )
      return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  }

  /**
   * Get the bus_ prefixed table name for an entity.
   * Accepts both singular (bus_company) and plural (companies) forms.
   */
  private getTableName(entity: string): string {
    const normalized = entity.toLowerCase().replace(/-/g, "_");
    if (normalized.startsWith("bus_")) return normalized;
    const singular = this.singularize(normalized);
    return `bus_${singular}`;
  }

  /**
   * Find all records with pagination and filtering
   */
  async findAll(
    entity: string,
    options: PaginationOptions = {},
    filters: Record<string, any> = {}
  ): Promise<PaginatedResult<any>> {
    const methodName = "findAll";
    this.logger.debug(
      `[${methodName}] Started - entity: ${entity}, options: ${JSON.stringify(options)}, filters: ${JSON.stringify(filters)}`
    );

    const tableName = this.getTableName(entity);
    this.logger.debug(`[${methodName}] Resolved table name: ${tableName}`);

    // Verify table exists in dictionary
    await this.verifyEntity(entity);

    // Execute beforeList hooks
    const processedOptions = await executeBeforeListHooks(entity, { options, filters });
    if (processedOptions.options || processedOptions.filters !== filters) {
      this.logger.debug(`[${methodName}] Hooks modified options/filters`);
    }

    // Use DatabaseService if available, otherwise use knex directly
    let result;
    if (this.db) {
      result = await this.db.findAll(tableName, processedOptions.options, processedOptions.filters);
    } else {
      // Get total count
      const countQuery = this.knex(tableName)
        .count("* as count")
        .modify((queryBuilder) => {
          // Apply filters to count query
          if (processedOptions.filters && Object.keys(processedOptions.filters).length > 0) {
            Object.entries(processedOptions.filters).forEach(([key, value]) => {
              if (typeof value === "object" && value !== null && "operator" in value) {
                const filterValue = value as { operator: string; value: any };
                queryBuilder.where(key, filterValue.operator, filterValue.value);
              } else {
                queryBuilder.where(key, value);
              }
            });
          }
        });

      const countResult = await countQuery;
      const total = Number(countResult[0]?.count || 0);

      // Get paginated data
      const limit = processedOptions.options?.limit || 10;
      const page = processedOptions.options?.page || 1;
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      const rows = await this.knex(tableName)
        .select("*")
        .modify((queryBuilder) => {
          // Apply filters
          if (processedOptions.filters && Object.keys(processedOptions.filters).length > 0) {
            Object.entries(processedOptions.filters).forEach(([key, value]) => {
              if (typeof value === "object" && value !== null && "operator" in value) {
                const filterValue = value as { operator: string; value: any };
                queryBuilder.where(key, filterValue.operator, filterValue.value);
              } else {
                queryBuilder.where(key, value);
              }
            });
          }
        })
        .limit(limit)
        .offset(offset);

      result = {
        data: rows,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    }

    // Execute afterList hooks
    await executeAfterListHooks(entity, result.data);

    this.logger.log(
      `[${methodName}] Completed - entity: ${entity}, returned ${result.data.length} records (total: ${result.meta.total})`
    );
    return result;
  }

  /**
   * Find a single record by ID
   */
  async findById(entity: string, id: string): Promise<any> {
    const methodName = "findById";
    this.logger.debug(`[${methodName}] Started - entity: ${entity}, id: ${id}`);

    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeRead hooks
    const processedId = await executeBeforeReadHooks(entity, { id });
    if (processedId.id && processedId.id !== id) {
      this.logger.debug(`[${methodName}] Hooks modified ID from ${id} to ${processedId.id}`);
    }

    // Use DatabaseService if available, otherwise use knex directly
    const result = this.db
      ? await this.db.findByIdOrFail(tableName, processedId.id || id)
      : await this.knex(tableName)
          .where("id", processedId.id || id)
          .whereNull("deleted_at")
          .first();

    if (!result) {
      throw new NotFoundException(
        `Record not found in ${tableName} with id: ${processedId.id || id}`
      );
    }

    // Execute afterRead hooks
    await executeAfterReadHooks(entity, result);

    this.logger.log(`[${methodName}] Completed - entity: ${entity}, id: ${id}`);
    return result;
  }

  /**
   * Create a new record
   */
  async create(entity: string, data: Record<string, any>): Promise<any> {
    const methodName = "create";
    this.logger.log(`[${methodName}] Started - entity: ${entity}, data: ${JSON.stringify(data)}`);

    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Apply default values from dictionary
    const metadata = await this.getEntityMetadata(entity);
    const dataWithDefaults = { ...data };

    for (const column of metadata.columns) {
      if (column.default_value && dataWithDefaults[column.column_name] === undefined) {
        const parsedValue = this.parseDefaultValue(column.default_value, column.sys_reference_id);
        dataWithDefaults[column.column_name] = parsedValue;
        this.logger.debug(
          `[${methodName}] Applied default value for ${column.column_name}: ${JSON.stringify(parsedValue)}`
        );
      }
    }

    // Execute beforeCreate hooks
    let processedData = await executeBeforeCreateHooks(entity, dataWithDefaults);
    if (JSON.stringify(processedData) !== JSON.stringify(dataWithDefaults)) {
      this.logger.debug(`[${methodName}] Hooks modified data`);
    }

    // Generate ID if not provided (for tables with UUID primary keys)
    if (!processedData.id) {
      processedData = { ...processedData, id: randomUUID() };
      this.logger.debug(`[${methodName}] Generated UUID for id field`);
    }

    // Use DatabaseService if available, otherwise use knex directly
    let result: any;
    try {
      result = this.db
        ? ((await this.db.create(tableName, processedData)) as any)
        : await this.knex(tableName)
            .insert(processedData)
            .returning("*")
            .then((rows: any[]) => rows[0]);
    } catch (error: any) {
      // Convert unique constraint violations to 409 Conflict
      const msg: string = error?.message ?? "";
      if (
        error?.code === "SQLITE_CONSTRAINT" ||
        error?.code === "23505" ||
        msg.includes("UNIQUE constraint failed") ||
        msg.includes("duplicate key value")
      ) {
        throw new ConflictException("A record with the same unique field value already exists");
      }
      throw error;
    }

    // Execute afterCreate hooks
    await executeAfterCreateHooks(entity, result);

    this.logger.log(
      `[${methodName}] Completed - entity: ${entity}, created record with id: ${result?.id || result?.ID || "unknown"}`
    );
    return result;
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
    const methodName = "update";
    this.logger.log(
      `[${methodName}] Started - entity: ${entity}, id: ${id}, expectedVersion: ${expectedVersion}, data: ${JSON.stringify(data)}`
    );

    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeUpdate hooks
    const processedData = await executeBeforeUpdateHooks(entity, data);
    if (JSON.stringify(processedData) !== JSON.stringify(data)) {
      this.logger.debug(`[${methodName}] Hooks modified data`);
    }

    // Use DatabaseService if available, otherwise use knex directly
    let result: any;
    if (this.db) {
      result = (await this.db.update(tableName, id, processedData, expectedVersion)) as any;
    } else {
      // Check record exists before updating
      const existing = await this.knex(tableName).where("id", id).whereNull("deleted_at").first();
      if (!existing) {
        throw new NotFoundException(`Record not found in ${tableName} with id: ${id}`);
      }
      // Always include timestamp even for empty patches
      const updatePayload =
        Object.keys(processedData).length > 0
          ? { ...processedData, updated_at: new Date() }
          : { updated_at: new Date() };
      await this.knex(tableName).where("id", id).update(updatePayload);
      result = await this.knex(tableName).where("id", id).first();
    }

    if (!result) {
      throw new NotFoundException(`Record not found in ${tableName} with id: ${id}`);
    }

    // Execute afterUpdate hooks
    await executeAfterUpdateHooks(entity, result);

    this.logger.log(
      `[${methodName}] Completed - entity: ${entity}, id: ${id}, version: ${result?.version || result?.VERSION || "unknown"}`
    );
    return result;
  }

  /**
   * Soft delete a record
   */
  async softDelete(entity: string, id: string): Promise<boolean> {
    const methodName = "softDelete";
    this.logger.log(`[${methodName}] Started - entity: ${entity}, id: ${id}`);

    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    // Execute beforeDelete hooks (can prevent deletion)
    const canDelete = await executeBeforeDeleteHooks(entity, id);
    if (!canDelete) {
      this.logger.warn(
        `[${methodName}] Deletion prevented by hooks - entity: ${entity}, id: ${id}`
      );
      throw new BadRequestException(`Cannot delete ${entity}: still referenced`);
    }

    // Use DatabaseService if available, otherwise use knex directly
    let result: boolean;
    if (this.db) {
      result = await this.db.softDelete(tableName, id);
    } else {
      // Check record exists before soft-deleting
      const existing = await this.knex(tableName).where("id", id).whereNull("deleted_at").first();
      if (!existing) {
        throw new NotFoundException(`Record not found in ${tableName} with id: ${id}`);
      }
      // Soft delete: set deleted_at timestamp (no is_deleted column)
      const count = await this.knex(tableName).where("id", id).update({ deleted_at: new Date() });
      result = count > 0;
    }

    // Execute afterDelete hooks
    await executeAfterDeleteHooks(entity, result);

    this.logger.log(`[${methodName}] Completed - entity: ${entity}, id: ${id}, success: ${result}`);
    return result;
  }

  /**
   * Verify entity exists in the Application Dictionary
   */
  private async verifyEntity(entity: string): Promise<void> {
    const methodName = "verifyEntity";
    const tableName = this.getTableName(entity);

    this.logger.debug(
      `[${methodName}] Checking if entity exists - entity: ${entity}, tableName: ${tableName}`
    );

    const tableRecord = await this.knex("sys_table")
      .where("table_name", tableName)
      .where("is_active", true)
      .first();

    if (!tableRecord) {
      this.logger.error(
        `[${methodName}] Entity not found in Application Dictionary - entity: ${entity}, tableName: ${tableName}`
      );
      throw new NotFoundException(`Entity '${entity}' not found in Application Dictionary`);
    }

    this.logger.debug(
      `[${methodName}] Entity verified - entity: ${entity}, tableId: ${tableRecord.sys_table_id}`
    );
  }

  /**
   * Get entity metadata from Application Dictionary
   */
  async getEntityMetadata(entity: string): Promise<EntityMetadata> {
    const methodName = "getEntityMetadata";
    const tableName = this.getTableName(entity);

    this.logger.debug(`[${methodName}] Started - entity: ${entity}, tableName: ${tableName}`);

    // Check cache
    if (this.metadataCache.has(tableName)) {
      this.logger.debug(`[${methodName}] Cache hit for tableName: ${tableName}`);
      return this.metadataCache.get(tableName)!;
    }

    this.logger.debug(
      `[${methodName}] Cache miss for tableName: ${tableName}, fetching from database`
    );

    // Get table info
    const table = await this.knex("sys_table")
      .where("table_name", tableName)
      .where("is_active", true)
      .first();

    if (!table) {
      this.logger.error(
        `[${methodName}] Table not found in sys_table - entity: ${entity}, tableName: ${tableName}`
      );
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    this.logger.debug(
      `[${methodName}] Found table - tableId: ${table.sys_table_id}, name: ${table.name}, hasWindow: ${!!table.sys_window_id}`
    );

    // Get window info
    const window = table.sys_window_id
      ? await this.knex("sys_window").where("sys_window_id", table.sys_window_id).first()
      : undefined;

    if (window) {
      this.logger.debug(
        `[${methodName}] Found window - windowId: ${window.sys_window_id}, name: ${window.name}`
      );
    }

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
        "sys_field.display_logic",
        "sys_field.name as field_name"
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

    this.logger.debug(`[${methodName}] Found ${columns.length} columns for entity: ${entity}`);

    const metadata: EntityMetadata = {
      table: {
        sys_table_id: table.sys_table_id,
        table_name: table.table_name,
        name: table.name,
        description: table.description,
      },
      columns: columns.map((col) => ({
        sys_field_id: col.sys_field_id,
        name: col.field_name || col.name,
        column_name: col.column_name,
        sys_reference_id: col.sys_reference_id,
        is_mandatory: col.is_mandatory,
        is_updateable: col.is_updateable,
        field_length: col.field_length,
        default_value: col.default_value,
        seq_no: col.seq_no || 0,
        seq_no_grid: col.seq_no_grid || 0,
        is_displayed: col.is_displayed !== false,
        is_displayed_grid: col.is_displayed_grid !== false,
        is_read_only: col.field_is_read_only || false,
        ref_table_name: col.ref_table_name || undefined,
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
    this.logger.debug(`[${methodName}] Cached metadata for tableName: ${tableName}`);

    this.logger.log(
      `[${methodName}] Completed - entity: ${entity}, loaded ${metadata.columns.length} columns`
    );
    return metadata;
  }

  /**
   * Get fields for form display (ordered by seq_no)
   */
  async getFormFields(entity: string): Promise<FieldMetadata[]> {
    const methodName = "getFormFields";
    this.logger.debug(`[${methodName}] Started - entity: ${entity}`);

    const metadata = await this.getEntityMetadata(entity);
    const formFields = metadata.columns
      .filter((col) => col.is_displayed)
      .sort((a, b) => a.seq_no - b.seq_no);

    this.logger.debug(
      `[${methodName}] Completed - entity: ${entity}, returned ${formFields.length} form fields`
    );
    return formFields;
  }

  /**
   * Get fields for grid display (ordered by seq_no_grid)
   */
  async getGridFields(entity: string): Promise<FieldMetadata[]> {
    const methodName = "getGridFields";
    this.logger.debug(`[${methodName}] Started - entity: ${entity}`);

    const metadata = await this.getEntityMetadata(entity);
    const gridFields = metadata.columns
      .filter((col) => col.is_displayed_grid)
      .sort((a, b) => a.seq_no_grid - b.seq_no_grid);

    this.logger.debug(
      `[${methodName}] Completed - entity: ${entity}, returned ${gridFields.length} grid fields`
    );
    return gridFields;
  }

  /**
   * Validate data against dictionary metadata
   */
  async validateData(
    entity: string,
    data: Record<string, any>,
    mode: "create" | "update" | "patch"
  ): Promise<void> {
    const methodName = "validateData";
    this.logger.log(`[${methodName}] Started - entity: ${entity}, mode: ${mode}`);
    this.logger.debug(`[${methodName}] Input data: ${JSON.stringify(data)}`);

    const metadata = await this.getEntityMetadata(entity);
    const errors: string[] = [];

    this.logger.debug(
      `[${methodName}] Validating ${metadata.columns.length} columns for entity: ${entity}`
    );

    for (const column of metadata.columns) {
      const value = data[column.column_name];

      // Check mandatory fields (only for create and full update)
      if (mode !== "patch" && column.is_mandatory && !column.default_value) {
        if (value === undefined || value === null || value === "") {
          const error = `Field '${column.name}' (${column.column_name}) is required`;
          this.logger.debug(`[${methodName}] Validation error: ${error}`);
          errors.push(error);
        }
      }

      // Check field length
      if (value && column.field_length && typeof value === "string") {
        if (value.length > column.field_length) {
          const error = `Field '${column.name}' exceeds maximum length of ${column.field_length}`;
          this.logger.debug(`[${methodName}] Validation error: ${error}`);
          errors.push(error);
        }
      }

      // Check updateability (for update/patch)
      if ((mode === "update" || mode === "patch") && !column.is_updateable) {
        if (value !== undefined && column.column_name !== `${this.getTableName(entity)}_id`) {
          const error = `Field '${column.name}' is not updateable`;
          this.logger.debug(`[${methodName}] Validation error: ${error}`);
          errors.push(error);
        }
      }

      // Type validation based on reference type
      if (value !== undefined && value !== null) {
        const typeError = this.validateType(value, column.sys_reference_id, column.name);
        if (typeError) {
          this.logger.debug(`[${methodName}] Type validation error: ${typeError}`);
          errors.push(typeError);
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn(
        `[${methodName}] Validation failed for entity: ${entity} - ${errors.length} errors`
      );
      this.logger.debug(`[${methodName}] Validation errors: ${JSON.stringify(errors)}`);
      throw new BadRequestException({
        message: "Validation failed",
        errors,
      });
    }

    this.logger.log(`[${methodName}] Validation passed for entity: ${entity}, mode: ${mode}`);
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
  clearMetadataCache(): void {
    const methodName = "clearMetadataCache";
    const cacheSize = this.metadataCache.size;
    this.metadataCache.clear();
    this.logger.log(`[${methodName}] Cleared metadata cache - removed ${cacheSize} cached entries`);
  }
}
