/**
 * P R O D U C T OData Controller
 * Table: bus_product
 *
 * Generated OData V4 controller for business entity CRUD operations.
 * Supports $filter, $orderby, $select, $expand, $top, $skip
 * with ETag-based optimistic concurrency control.
 *
 * Generated: 2026-02-09T13:00:26.939Z
 */

import { ODataController, type ODataHttpContext, odata } from "odata-v4-server";
import { v4 as uuidv4 } from "uuid";
import { getKnex } from "../../database/connection";
import type { BaseEntity, ODataResult } from "../base.controller";

// ============================================================================
// P R O D U C T Entity Interface
// ============================================================================

export interface PRODUCT extends BaseEntity {
  bus_product_id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: string;
  is_active: boolean;
}

// ============================================================================
// P R O D U C T OData Controller
// ============================================================================

export class PRODUCTController extends ODataController {
  protected static tableName = "bus_product";
  protected static primaryKey = "bus_product_id";

  /**
   * GET /odata/PRODUCTs
   * List all P R O D U C T records with OData query support
   */
  @odata.GET
  async getAll(
    @odata.query query: any = {},
    @odata.context ctx: ODataHttpContext
  ): Promise<ODataResult<PRODUCT>> {
    // Handle null query parameter passed by odata-v4-server
    const q = query || {};

    let dbQuery = getKnex()(PRODUCTController.tableName).whereNull("deleted_at");

    // Apply $filter
    if (q.$filter) {
      dbQuery = this.applyFilter(dbQuery, q.$filter);
    }

    // Get total count if $count=true
    let count: number | undefined;
    if (q.$count) {
      const [{ totalCount }] = await dbQuery.clone().count("* as totalCount");
      count = parseInt(totalCount as string, 10);
    }

    // Apply $orderby
    if (q.$orderby) {
      const orderParts = q.$orderby.split(",").map((part: string) => {
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
    if (q.$skip) {
      dbQuery = dbQuery.offset(parseInt(q.$skip, 10));
    }
    if (q.$top) {
      dbQuery = dbQuery.limit(parseInt(q.$top, 10));
    }

    // Apply $select
    if (q.$select) {
      const columns = q.$select.split(",").map((col: string) => col.trim());
      dbQuery = dbQuery.select(columns);
    }

    const results = await dbQuery;

    // Set OData response headers
    ctx.response.setHeader("OData-Version", "4.0");

    return {
      ...(count !== undefined && { "@odata.count": count }),
      value: results as PRODUCT[],
    };
  }

  /**
   * GET /odata/PRODUCTs(:key)
   * Get a single P R O D U C T by ID
   */
  @odata.GET
  async getOne(
    @odata.key key: string,
    @odata.query query: any = {},
    @odata.context ctx: ODataHttpContext
  ): Promise<PRODUCT | null> {
    let dbQuery = getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .whereNull("deleted_at");

    // Apply $select
    if (query && query.$select) {
      const columns = query.$select.split(",").map((col: string) => col.trim());
      dbQuery = dbQuery.select(columns);
    }

    const result = await dbQuery.first();

    if (!result) {
      ctx.response.status(404);
      return null;
    }

    return result as PRODUCT;
  }

  /**
   * POST /odata/PRODUCTs
   * Create a new P R O D U C T
   */
  @odata.POST
  async create(
    @odata.body body: Partial<PRODUCT>,
    @odata.context ctx: ODataHttpContext
  ): Promise<PRODUCT> {
    // Generate ID if not provided
    const recordBody = body as Record<string, unknown>;
    if (!recordBody[PRODUCTController.primaryKey]) {
      recordBody[PRODUCTController.primaryKey] = uuidv4();
    }

    const now = new Date();
    const newRecord = {
      ...body,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    await getKnex()(PRODUCTController.tableName).insert(newRecord);

    // Return the created record
    const recordId = (newRecord as Record<string, unknown>)[PRODUCTController.primaryKey] as string;
    const result = (await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, recordId)
      .first()) as Promise<PRODUCT>;

    ctx.response.status(201);
    return result;
  }

  /**
   * PUT /odata/PRODUCTs(:key)
   * Full update of a P R O D U C T
   */
  @odata.PUT
  async fullUpdate(
    @odata.key key: string,
    @odata.body body: Partial<PRODUCT>,
    @odata.context ctx: ODataHttpContext
  ): Promise<PRODUCT> {
    const existing = await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      return null as any;
    }

    // Check ETag for concurrency
    if (body.version !== undefined && body.version !== existing.version) {
      ctx.response.status(412);
      ctx.response.setHeader("ETag", `W/"${existing.version}"`);
      throw new Error("Concurrency conflict: record has been modified");
    }

    const now = new Date();
    const updated = {
      ...body,
      version: existing.version + 1,
      updated_at: now,
    };

    await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .update(updated);

    const result = (await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .first()) as Promise<PRODUCT>;

    ctx.response.setHeader("ETag", `W/"${updated.version}"`);
    return result;
  }

  /**
   * PATCH /odata/PRODUCTs(:key)
   * Partial update of a P R O D U C T
   */
  @odata.PATCH
  async partialUpdate(
    @odata.key key: string,
    @odata.body delta: Partial<PRODUCT>,
    @odata.context ctx: ODataHttpContext
  ): Promise<PRODUCT> {
    const existing = await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      return null as any;
    }

    // Check ETag for concurrency
    if (delta.version !== undefined && delta.version !== existing.version) {
      ctx.response.status(412);
      ctx.response.setHeader("ETag", `W/"${existing.version}"`);
      throw new Error("Concurrency conflict: record has been modified");
    }

    const now = new Date();
    const updated = {
      ...delta,
      version: existing.version + 1,
      updated_at: now,
    };

    await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .update(updated);

    const result = (await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .first()) as Promise<PRODUCT>;

    ctx.response.setHeader("ETag", `W/"${updated.version}"`);
    return result;
  }

  /**
   * DELETE /odata/PRODUCTs(:key)
   * Soft delete a P R O D U C T
   */
  @odata.DELETE
  async remove(@odata.key key: string, @odata.context ctx: ODataHttpContext): Promise<void> {
    const existing = await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      ctx.response.status(404);
      return;
    }

    await getKnex()(PRODUCTController.tableName)
      .where(PRODUCTController.primaryKey, key)
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
        version: existing.version + 1,
      });

    ctx.response.status(204);
  }

  /**
   * Apply OData $filter to query builder
   */
  private applyFilter(qb: any, filter: string): any {
    // Parse multiple conditions joined by 'and'
    const conditions = filter.split(/\s+and\s+/i);

    for (const condition of conditions) {
      const eqMatch = condition.match(/(\w+)\s+eq\s+'([^']+)'/);
      if (eqMatch) {
        qb = qb.where(eqMatch[1], eqMatch[2]);
        continue;
      }

      const neMatch = condition.match(/(\w+)\s+ne\s+'([^']+)'/);
      if (neMatch) {
        qb = qb.whereNot(neMatch[1], neMatch[2]);
        continue;
      }

      const containsMatch = condition.match(/contains\((\w+),\s*'([^']+)'\)/);
      if (containsMatch) {
        qb = qb.where(containsMatch[1], "like", `%${containsMatch[2]}%`);
        continue;
      }

      const boolMatch = condition.match(/(\w+)\s+eq\s+(true|false)/);
      if (boolMatch) {
        qb = qb.where(boolMatch[1], boolMatch[2] === "true");
      }
    }

    return qb;
  }
}
