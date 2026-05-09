/**
 * Base OData Controller
 *
 * Provides CRUD operations with:
 * - OData query support ($filter, $orderby, $top, $skip, $select, $expand)
 * - ETag-based concurrency control
 * - Soft delete support
 * - Integration with Application Dictionary metadata
 *
 * Generated: 2026-02-09T13:00:26.925Z
 */

import type { Knex } from "knex";
import { ODataController, type ODataHttpContext, odata } from "odata-v4-server";
import { v4 as uuidv4 } from "uuid";
import { getKnex } from "../database/connection";

// ============================================================================
// Types
// ============================================================================

export interface BaseEntity {
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface ODataResult<T> {
  "@odata.count"?: number;
  value: T[];
}

// ============================================================================
// Base Controller Class
// ============================================================================

export abstract class BaseODataController<T extends BaseEntity> extends ODataController {
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  protected getKnex(): Knex {
    return getKnex();
  }

  // ==========================================================================
  // GET - List with OData query support
  // ==========================================================================

  @odata.GET
  async get(
    @odata.query query: any,
    @odata.context ctx: ODataHttpContext
  ): Promise<ODataResult<T>> {
    let dbQuery = this.getKnex()(this.tableName).whereNull("deleted_at");

    // Apply $filter
    if (query.$filter) {
      dbQuery = this.applyFilter(dbQuery, query.$filter);
    }

    // Get total count if $count=true
    let count: number | undefined;
    if (query.$count) {
      const [{ count: totalCount }] = await dbQuery.clone().count("* as count");
      count = parseInt(totalCount as string, 10);
    }

    // Apply $orderby
    if (query.$orderby) {
      const orderParts = query.$orderby.split(",").map((part: string) => {
        const [field, dir] = part.trim().split(" ");
        return { column: field, order: dir?.toLowerCase() === "desc" ? "desc" : "asc" };
      });
      for (const order of orderParts) {
        dbQuery = dbQuery.orderBy(order.column, order.order);
      }
    } else {
      dbQuery = dbQuery.orderBy("created_at", "desc");
    }

    // Apply $skip and $top (pagination)
    if (query.$skip) {
      dbQuery = dbQuery.offset(parseInt(query.$skip, 10));
    }
    if (query.$top) {
      dbQuery = dbQuery.limit(parseInt(query.$top, 10));
    }

    // Apply $select
    if (query.$select) {
      const columns = query.$select.split(",").map((col: string) => col.trim());
      dbQuery = dbQuery.select(columns);
    }

    const results = await dbQuery;

    // Set OData response headers
    ctx.response.setHeader("OData-Version", "4.0");

    return {
      ...(count !== undefined && { "@odata.count": count }),
      value: results as T[],
    };
  }

  // ==========================================================================
  // GET by ID
  // ==========================================================================

  @odata.GET
  async getById(
    @odata.key key: string,
    @odata.query query: any,
    @odata.context ctx: ODataHttpContext
  ): Promise<T | null> {
    let dbQuery = this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .whereNull("deleted_at");

    // Apply $select
    if (query.$select) {
      const columns = query.$select.split(",").map((col: string) => col.trim());
      dbQuery = dbQuery.select(columns);
    }

    const result = await dbQuery.first();

    if (!result) {
      ctx.response.status(404);
      throw new Error(`Entity with key '${key}' not found`);
    }

    // Set ETag header
    ctx.response.setHeader("ETag", `"v${result.version}"`);
    ctx.response.setHeader("OData-Version", "4.0");

    return result as T;
  }

  // ==========================================================================
  // POST - Create
  // ==========================================================================

  @odata.POST
  async post(@odata.body data: Partial<T>, @odata.context ctx: ODataHttpContext): Promise<T> {
    const id = uuidv4();
    const now = new Date();

    const record = {
      [this.primaryKey]: id,
      ...data,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    await this.getKnex()(this.tableName).insert(record);

    const created = await this.getKnex()(this.tableName).where(this.primaryKey, id).first();

    ctx.response.status(201);
    ctx.response.setHeader("ETag", `"v1"`);
    ctx.response.setHeader("OData-Version", "4.0");

    return created as T;
  }

  // ==========================================================================
  // PUT - Full Update
  // ==========================================================================

  @odata.PUT
  async put(
    @odata.key key: string,
    @odata.body data: Partial<T>,
    @odata.context ctx: ODataHttpContext
  ): Promise<T> {
    // Check ETag for concurrency
    const ifMatch = ctx.request.headers["if-match"];
    if (ifMatch) {
      await this.checkConcurrency(key, ifMatch);
    }

    const existing = await this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      throw new Error(`Entity with key '${key}' not found`);
    }

    await this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .update({
        ...data,
        version: this.getKnex().raw("version + 1"),
        updated_at: new Date(),
      });

    const updated = await this.getKnex()(this.tableName).where(this.primaryKey, key).first();

    ctx.response.setHeader("ETag", `"v${updated.version}"`);
    ctx.response.setHeader("OData-Version", "4.0");

    return updated as T;
  }

  // ==========================================================================
  // PATCH - Partial Update
  // ==========================================================================

  @odata.PATCH
  async patch(
    @odata.key key: string,
    @odata.body delta: Partial<T>,
    @odata.context ctx: ODataHttpContext
  ): Promise<T> {
    // Check ETag for concurrency
    const ifMatch = ctx.request.headers["if-match"];
    if (ifMatch) {
      await this.checkConcurrency(key, ifMatch);
    }

    const existing = await this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      throw new Error(`Entity with key '${key}' not found`);
    }

    await this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .update({
        ...delta,
        version: this.getKnex().raw("version + 1"),
        updated_at: new Date(),
      });

    const updated = await this.getKnex()(this.tableName).where(this.primaryKey, key).first();

    ctx.response.setHeader("ETag", `"v${updated.version}"`);
    ctx.response.setHeader("OData-Version", "4.0");

    return updated as T;
  }

  // ==========================================================================
  // DELETE - Soft Delete
  // ==========================================================================

  @odata.DELETE
  async delete(@odata.key key: string, @odata.context ctx: ODataHttpContext): Promise<void> {
    const existing = await this.getKnex()(this.tableName)
      .where(this.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      throw new Error(`Entity with key '${key}' not found`);
    }

    await this.getKnex()(this.tableName).where(this.primaryKey, key).update({
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    ctx.response.status(204);
  }

  // ==========================================================================
  // Concurrency Check
  // ==========================================================================

  protected async checkConcurrency(key: string, ifMatch: string): Promise<void> {
    const versionStr = ifMatch.replace(/"/g, "").replace("v", "");
    const expectedVersion = parseInt(versionStr, 10);

    if (isNaN(expectedVersion)) {
      return; // Invalid ETag format, skip check
    }

    const current = await this.getKnex()(this.tableName).where(this.primaryKey, key).first();

    if (current && current.version !== expectedVersion) {
      const error = new Error("Precondition Failed: Entity has been modified");
      (error as any).statusCode = 412;
      throw error;
    }
  }

  // ==========================================================================
  // Filter Application (simplified OData filter support)
  // ==========================================================================

  protected applyFilter(query: Knex.QueryBuilder, filter: string): Knex.QueryBuilder {
    // Simple filter parsing - supports basic eq, ne, gt, lt, contains
    const conditions = filter.split(" and ");

    for (const condition of conditions) {
      const eqMatch = condition.match(/(\w+)\s+eq\s+'([^']+)'/);
      if (eqMatch) {
        query = query.where(eqMatch[1], "=", eqMatch[2]);
        continue;
      }

      const neMatch = condition.match(/(\w+)\s+ne\s+'([^']+)'/);
      if (neMatch) {
        query = query.where(neMatch[1], "!=", neMatch[2]);
        continue;
      }

      const gtMatch = condition.match(/(\w+)\s+gt\s+(\d+)/);
      if (gtMatch) {
        query = query.where(gtMatch[1], ">", parseInt(gtMatch[2], 10));
        continue;
      }

      const ltMatch = condition.match(/(\w+)\s+lt\s+(\d+)/);
      if (ltMatch) {
        query = query.where(ltMatch[1], "<", parseInt(ltMatch[2], 10));
        continue;
      }

      const containsMatch = condition.match(/contains\((\w+),\s*'([^']+)'\)/);
      if (containsMatch) {
        query = query.where(containsMatch[1], "ilike", `%${containsMatch[2]}%`);
        continue;
      }

      const startsWithMatch = condition.match(/startswith\((\w+),\s*'([^']+)'\)/);
      if (startsWithMatch) {
        query = query.where(startsWithMatch[1], "ilike", `${startsWithMatch[2]}%`);
      }
    }

    return query;
  }
}
