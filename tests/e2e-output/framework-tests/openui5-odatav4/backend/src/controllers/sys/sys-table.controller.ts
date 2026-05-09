/**
 * SysTable OData Controller
 *
 * Exposes sys_table as an OData entity set.
 * Provides metadata about all Application Dictionary tables.
 *
 * Generated: 2026-02-09T13:00:26.930Z
 */

import { ODataController, odata } from "odata-v4-server";
import { v4 as uuidv4 } from "uuid";
import { getKnex } from "../../database/connection";

interface SysTable {
  id: string;
  table_name: string;
  display_name: string;
  description: string | null;
  table_type: string;
  is_active: boolean;
  is_view: boolean;
  access_level: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export class SysTableController extends ODataController {
  /**
   * GET /SysTables
   * Returns all sys_table records with OData query support
   */
  @odata.GET
  async findAll() {
    return await getKnex()("sys_table").where("deleted_at", null).select("*");
  }

  /**
   * GET /SysTables(:id)
   * Returns a single sys_table record by ID
   */
  @odata.GET
  async findOne(@odata.key key: string) {
    const record = await getKnex()('sys_table')
      .where('id', key)
      .where('deleted_at', null)
      .first();

    if (!record) {
      throw new Error(`SysTable with id ${key} not found`);
    }

    return record;
  }

  /**
   * POST /SysTables
   * Creates a new sys_table record
   */
  @odata.POST
  async insert(@odata.body data: Partial<SysTable>) {
    const now = new Date();
    const newRecord = {
      id: uuidv4(),
      ...data,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    await getKnex()('sys_table').insert(newRecord);
    return newRecord;
  }

  /**
   * PATCH /SysTables(:id)
   * Updates an existing sys_table record
   */
  @odata.PATCH
  async update(@odata.key key: string, @odata.body delta: Partial<SysTable>) {
    const now = new Date();
    const updated = {
      ...delta,
      updated_at: now,
      version: getKnex().raw("version + 1"),
    };

    const count = await getKnex()("sys_table")
      .where("id", key)
      .where("deleted_at", null)
      .update(updated);

    if (count === 0) {
      throw new Error(`SysTable with id ${key} not found`);
    }

    return await getKnex()("sys_table").where("id", key).first();
  }

  /**
   * DELETE /SysTables(:id)
   * Soft deletes a sys_table record
   */
  @odata.DELETE
  async remove(@odata.key key: string) {
    const count = await getKnex()('sys_table')
      .where('id', key)
      .where('deleted_at', null)
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    if (count === 0) {
      throw new Error(`SysTable with id ${key} not found`);
    }

    return { deleted: true };
  }
}
