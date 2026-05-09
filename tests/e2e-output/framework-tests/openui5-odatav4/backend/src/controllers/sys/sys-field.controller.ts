/**
 * SysField OData Controller
 *
 * Exposes sys_field as an OData entity set.
 * Critical for runtime UI layout configuration.
 * seq_no controls form field order, seq_no_grid controls table column order.
 *
 * Generated: 2026-02-09T13:00:26.930Z
 */

import type { Knex } from "knex";
import { ODataController, odata } from "odata-v4-server";
import { v4 as uuidv4 } from "uuid";
import { getKnex } from "../../database/connection";

interface SysField {
  id: string;
  tab_id: string | null;
  column_id: string;
  table_name: string;
  column_name: string;
  display_name: string;
  description: string | null;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_readonly: boolean;
  is_mandatory: boolean;
  field_length: number | null;
  display_length: number | null;
  field_group: string | null;
  default_value: string | null;
  reference_id: string | null;
  reference_table: string | null;
  reference_key: string | null;
  reference_display: string | null;
  val_rule_id: string | null;
  data_type: string;
  is_active: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export class SysFieldController extends ODataController {
  /**
   * GET /SysFields
   * Returns all sys_field records with OData query support
   */
  @odata.GET
  async getFields(
    @odata.query query: any
  ): Promise<SysField[]> {
    let qb = getKnex()('sys_field')
      .where('is_deleted', false);

    // Apply $filter
    if (query.$filter) {
      qb = this.applyFilter(qb, query.$filter);
    }

    // Apply $orderby (default to seq_no)
    if (query.$orderby) {
      qb = this.applyOrderBy(qb, query.$orderby);
    } else {
      qb = qb.orderBy('seq_no');
    }

    // Apply $top and $skip
    if (query.$top) {
      qb = qb.limit(parseInt(query.$top, 10));
    }
    if (query.$skip) {
      qb = qb.offset(parseInt(query.$skip, 10));
    }

    // Apply $select
    if (query.$select) {
      const columns = query.$select.split(',').map((c: string) => c.trim());
      qb = qb.select(columns);
    }

    return qb;
  }

  /**
   * GET /SysFields(:id)
   * Returns a single sys_field record by ID
   */
  @odata.GET
  async getField(
    @odata.key key: string
  ): Promise<SysField | null> {
    const field = await getKnex()('sys_field')
      .where('id', key)
      .where('is_deleted', false)
      .first();

    return field || null;
  }

  /**
   * POST /SysFields
   * Creates a new sys_field record
   */
  @odata.POST
  async createField(
    @odata.body body: Partial<SysField>
  ): Promise<SysField> {
    const id = uuidv4();
    const now = new Date();

    // Get max seq_no for the table to auto-assign
    const maxSeq = await getKnex()('sys_field')
      .where('table_name', body.table_name)
      .max('seq_no as max')
      .first();

    const nextSeq = ((maxSeq?.max as number) || 0) + 10;

    const record = {
      id,
      tab_id: body.tab_id || null,
      column_id: body.column_id,
      table_name: body.table_name,
      column_name: body.column_name,
      display_name: body.display_name || body.column_name,
      description: body.description || null,
      seq_no: body.seq_no || nextSeq,
      seq_no_grid: body.seq_no_grid || nextSeq,
      is_displayed: body.is_displayed !== false,
      is_displayed_grid: body.is_displayed_grid !== false,
      is_readonly: body.is_readonly === true,
      is_mandatory: body.is_mandatory === true,
      field_length: body.field_length || null,
      display_length: body.display_length || null,
      field_group: body.field_group || 'general',
      default_value: body.default_value || null,
      reference_id: body.reference_id || null,
      reference_table: body.reference_table || null,
      reference_key: body.reference_key || null,
      reference_display: body.reference_display || null,
      val_rule_id: body.val_rule_id || null,
      data_type: body.data_type || 'string',
      is_active: body.is_active !== false,
      version: 1,
      created_at: now,
      updated_at: now,
      is_deleted: false
    };

    await getKnex()('sys_field').insert(record);
    return record as SysField;
  }

  /**
   * PATCH /SysFields(:id)
   * Updates an existing sys_field record
   * Used for runtime UI layout modification (changing seq_no)
   */
  @odata.PATCH
  async updateField(
    @odata.key key: string,
    @odata.body body: Partial<SysField>
  ): Promise<SysField | null> {
    const existing = await getKnex()("sys_field")
      .where("id", key)
      .where("is_deleted", false)
      .first();

    if (!existing) {
      return null;
    }

    // Check ETag for concurrency
    if (body.version !== undefined && body.version !== existing.version) {
      throw new Error("Concurrency conflict: record has been modified");
    }

    const updates = {
      ...body,
      version: existing.version + 1,
      updated_at: new Date(),
    };

    delete updates.id;
    delete updates.created_at;

    await getKnex()("sys_field").where("id", key).update(updates);

    return { ...existing, ...updates };
  }

  /**
   * DELETE /SysFields(:id)
   * Soft deletes a sys_field record
   */
  @odata.DELETE
  async deleteField(
    @odata.key key: string
  ): Promise<void> {
    await getKnex()('sys_field')
      .where('id', key)
      .update({
        is_deleted: true,
        updated_at: new Date()
      });
  }

  /**
   * Batch update field sequence numbers
   * POST /SysFields/BatchUpdateSeq
   */
  async batchUpdateSequence(
    updates: Array<{ id: string; seq_no?: number; seq_no_grid?: number }>
  ): Promise<void> {
    const trx = await getKnex().transaction();

    try {
      for (const update of updates) {
        const setClause: any = {
          updated_at: new Date(),
        };

        if (update.seq_no !== undefined) {
          setClause.seq_no = update.seq_no;
        }
        if (update.seq_no_grid !== undefined) {
          setClause.seq_no_grid = update.seq_no_grid;
        }

        await trx("sys_field").where("id", update.id).update(setClause);
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Apply OData $filter to query builder
   */
  private applyFilter(qb: Knex.QueryBuilder, filter: string): Knex.QueryBuilder {
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

  /**
   * Apply OData $orderby to query builder
   */
  private applyOrderBy(qb: Knex.QueryBuilder, orderby: string): Knex.QueryBuilder {
    const parts = orderby.split(",");
    for (const part of parts) {
      const [column, direction] = part.trim().split(/\s+/);
      qb = qb.orderBy(column, direction?.toLowerCase() === "desc" ? "desc" : "asc");
    }
    return qb;
  }
}
