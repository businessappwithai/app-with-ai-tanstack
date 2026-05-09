/**
 * System Service (Application Dictionary)
 *
 * Provides data access for all sys_ tables.
 * The field operations are critical for runtime UI modification.
 *
 * Generated: 2026-03-20T16:41:26.575Z
 */

import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseService } from "../../database/database.service";

interface PaginationOptions {
  page?: number;
  limit?: number;
  prefix?: string; // Filter by table_name prefix (e.g., 'bus_')
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable()
export class SysService {
  private fieldCache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get a cached value or execute the factory function and cache the result.
   * Used to avoid repeated sys_field database queries on every form/grid render.
   */
  private async getCached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.fieldCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }

    const data = await factory();
    this.fieldCache.set(key, { data, expiry: Date.now() + this.CACHE_TTL_MS });
    return data;
  }

  /**
   * Invalidate all cached entries for a given table name, or all entries if no key given.
   */
  private invalidateFieldCache(tableName?: string) {
    if (tableName) {
      for (const key of this.fieldCache.keys()) {
        if (key.includes(tableName)) {
          this.fieldCache.delete(key);
        }
      }
    } else {
      this.fieldCache.clear();
    }
  }

  // ============================================================================
  // SYS_TABLE Operations
  // ============================================================================

  async findAllTables(options: PaginationOptions & { search?: string } = {}) {
    const { page = 1, limit = 100, search, prefix } = options;
    const offset = (page - 1) * limit;

    let query = this.db.knex("sys_table").where("is_active", true);

    if (prefix) {
      query = query.where("table_name", "like", `${prefix}%`);
    }

    if (search) {
      query = query.where("name", "like", `%${search}%`);
    }

    const [data, countResult] = await Promise.all([
      query.clone().orderBy("name").limit(limit).offset(offset),
      query.clone().clearSelect().count("* as count").first(),
    ]);

    return {
      data,
      meta: {
        total: Number(countResult?.count || 0),
        page,
        pageSize: limit,
      },
    };
  }

  async findTableById(id: string) {
    const table = await this.db.knex("sys_table").where("sys_table_id", id).first();
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }
    return table;
  }

  async findTableByName(tableName: string) {
    const table = await this.db.knex("sys_table").where("table_name", tableName).first();
    if (!table) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }
    return table;
  }

  // ============================================================================
  // SYS_COLUMN Operations
  // ============================================================================

  async findAllColumns(options: PaginationOptions & { tableId?: string } = {}) {
    const { page = 1, limit = 100, tableId } = options;
    const offset = (page - 1) * limit;

    let query = this.db.knex("sys_column").where("is_active", true);

    if (tableId) {
      query = query.where("sys_table_id", tableId);
    }

    const [data, countResult] = await Promise.all([
      query.clone().orderBy("seq_no").limit(limit).offset(offset),
      query.clone().clearSelect().count("* as count").first(),
    ]);

    return {
      data,
      meta: {
        total: Number(countResult?.count || 0),
        page,
        pageSize: limit,
      },
    };
  }

  async findColumnById(id: string) {
    const column = await this.db.knex("sys_column").where("sys_column_id", id).first();
    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }
    return column;
  }

  // ============================================================================
  // SYS_FIELD Operations (Critical for Runtime UI Modification)
  // ============================================================================

  async findAllFields(
    options: PaginationOptions & { tabId?: string; tableId?: string; view?: "form" | "grid" } = {}
  ) {
    const { page = 1, limit = 100, tabId, tableId, view } = options;
    const offset = (page - 1) * limit;

    let query = this.db
      .knex("sys_field")
      .select("sys_field.*", "sys_column.column_name", "sys_column.name as column_display_name")
      .leftJoin("sys_column", "sys_field.sys_column_id", "sys_column.sys_column_id")
      .where("sys_field.is_active", true);

    if (tabId) {
      query = query.where("sys_field.sys_tab_id", tabId);
    }

    if (tableId) {
      query = query.where("sys_column.sys_table_id", tableId);
    }

    // Filter by visibility based on view type
    if (view === "form") {
      query = query.where("sys_field.is_displayed", true);
    } else if (view === "grid") {
      query = query.where("sys_field.is_displayed_grid", true);
    }

    // Order by appropriate seq_no
    const orderBy = view === "grid" ? "sys_field.seq_no_grid" : "sys_field.seq_no";

    const [data, countResult] = await Promise.all([
      query.clone().orderBy(orderBy).limit(limit).offset(offset),
      query.clone().clearSelect().count("* as count").first(),
    ]);

    return {
      data,
      meta: {
        total: Number(countResult?.count || 0),
        page,
        pageSize: limit,
      },
    };
  }

  async findFieldById(id: string) {
    const field = await this.db.knex("sys_field").where("sys_field_id", id).first();
    if (!field) {
      throw new NotFoundException(`Field with ID ${id} not found`);
    }
    return field;
  }

  async updateField(id: string, data: Record<string, unknown>, version?: number) {
    const field = await this.findFieldById(id);

    // Optimistic locking check
    if (version !== undefined && field.version !== version) {
      throw new ConflictException("Field was modified by another user");
    }

    const updateData = {
      ...data,
      version: (field.version || 0) + 1,
      updated: new Date().toISOString(),
    };

    await this.db.knex("sys_field").where("sys_field_id", id).update(updateData);

    // Invalidate field cache since field metadata changed
    this.invalidateFieldCache();

    return this.findFieldById(id);
  }

  async batchReorderFields(fields: Array<{ id: string; seq_no: number }>) {
    await this.db.knex.transaction(async (trx) => {
      for (const { id, seq_no } of fields) {
        await trx("sys_field")
          .where("sys_field_id", id)
          .update({ seq_no, updated: new Date().toISOString() });
      }
    });

    // Invalidate field cache since field order changed
    this.invalidateFieldCache();

    return { success: true, updated: fields.length };
  }

  // ============================================================================
  // SYS_REFERENCE Operations
  // ============================================================================

  async findAllReferences(options: PaginationOptions = {}) {
    const { page = 1, limit = 100 } = options;
    const offset = (page - 1) * limit;

    const query = this.db.knex("sys_reference").where("is_active", true);

    const [data, countResult] = await Promise.all([
      query.clone().orderBy("name").limit(limit).offset(offset),
      query.clone().clearSelect().count("* as count").first(),
    ]);

    return {
      data,
      meta: {
        total: Number(countResult?.count || 0),
        page,
        pageSize: limit,
      },
    };
  }

  async findReferenceById(id: string) {
    const ref = await this.db.knex("sys_reference").where("sys_reference_id", id).first();
    if (!ref) {
      throw new NotFoundException(`Reference with ID ${id} not found`);
    }
    return ref;
  }

  // ============================================================================
  // Dictionary Helper Methods
  // ============================================================================

  /**
   * Get complete entity metadata from Application Dictionary
   */
  async getEntityMetadata(tableName: string) {
    const table = await this.findTableByName(tableName);

    const [columns, fields] = await Promise.all([
      this.db
        .knex("sys_column")
        .where("sys_table_id", table.sys_table_id)
        .where("is_active", true)
        .orderBy("seq_no"),
      this.db
        .knex("sys_field")
        .select("sys_field.*", "sys_column.column_name")
        .leftJoin("sys_column", "sys_field.sys_column_id", "sys_column.sys_column_id")
        .where("sys_column.sys_table_id", table.sys_table_id)
        .where("sys_field.is_active", true)
        .orderBy("sys_field.seq_no"),
    ]);

    return {
      table,
      columns,
      fields,
    };
  }

  /**
   * Get fields for form display (ordered by seq_no).
   * Results are cached for 5 minutes and invalidated on field updates.
   * Includes reference table information for table reference fields.
   */
  async getFormFields(tableName: string) {
    return this.getCached(`form_fields:${tableName}`, async () => {
      const table = await this.findTableByName(tableName);

      return this.db
        .knex("sys_field")
        .select(
          "sys_field.*",
          "sys_column.column_name",
          "sys_column.name as display_name",
          "sys_column.is_mandatory",
          "sys_column.field_length",
          "sys_reference.name as reference_name",
          "sys_ref_table.sys_table_id as ref_table_id",
          "ref_table.table_name as ref_table_name",
          "key_column.column_name as ref_key_column",
          "display_column.column_name as ref_display_column"
        )
        .leftJoin("sys_column", "sys_field.sys_column_id", "sys_column.sys_column_id")
        .leftJoin("sys_reference", "sys_column.sys_reference_id", "sys_reference.sys_reference_id")
        .leftJoin("sys_ref_table", "sys_column.sys_reference_id", "sys_ref_table.sys_reference_id")
        .leftJoin("sys_table as ref_table", "sys_ref_table.sys_table_id", "ref_table.sys_table_id")
        .leftJoin(
          "sys_column as key_column",
          "sys_ref_table.key_column_id",
          "key_column.sys_column_id"
        )
        .leftJoin(
          "sys_column as display_column",
          "sys_ref_table.display_column_id",
          "display_column.sys_column_id"
        )
        .where("sys_column.sys_table_id", table.sys_table_id)
        .where("sys_field.is_active", true)
        .where("sys_field.is_displayed", true)
        .orderBy("sys_field.seq_no");
    });
  }

  /**
   * Get fields for grid display (ordered by seq_no_grid).
   * Results are cached for 5 minutes and invalidated on field updates.
   * Includes reference table information for table reference fields.
   */
  async getGridFields(tableName: string) {
    return this.getCached(`grid_fields:${tableName}`, async () => {
      const table = await this.findTableByName(tableName);

      return this.db
        .knex("sys_field")
        .select(
          "sys_field.*",
          "sys_column.column_name",
          "sys_column.name as display_name",
          "sys_reference.name as reference_name",
          "sys_ref_table.sys_table_id as ref_table_id",
          "ref_table.table_name as ref_table_name",
          "key_column.column_name as ref_key_column",
          "display_column.column_name as ref_display_column"
        )
        .leftJoin("sys_column", "sys_field.sys_column_id", "sys_column.sys_column_id")
        .leftJoin("sys_reference", "sys_column.sys_reference_id", "sys_reference.sys_reference_id")
        .leftJoin("sys_ref_table", "sys_column.sys_reference_id", "sys_ref_table.sys_reference_id")
        .leftJoin("sys_table as ref_table", "sys_ref_table.sys_table_id", "ref_table.sys_table_id")
        .leftJoin(
          "sys_column as key_column",
          "sys_ref_table.key_column_id",
          "key_column.sys_column_id"
        )
        .leftJoin(
          "sys_column as display_column",
          "sys_ref_table.display_column_id",
          "display_column.sys_column_id"
        )
        .where("sys_column.sys_table_id", table.sys_table_id)
        .where("sys_field.is_active", true)
        .where("sys_field.is_displayed_grid", true)
        .orderBy("sys_field.seq_no_grid");
    });
  }
}
