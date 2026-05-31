/**
 * System Service (Application Dictionary)
 *
 * Provides data access for all sys_ tables using Kysely.
 *
 * Generated: 2026-05-31T11:58:03.755Z
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../database/database.service';
import type { Kysely } from 'kysely';

interface PaginationOptions {
  page?: number;
  limit?: number;
  prefix?: string;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable()
export class SysService {
  private fieldCache = new Map<string, CacheEntry<unknown>>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly db: DatabaseService) {}

  private async getCached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.fieldCache.get(key);
    if (cached && cached.expiry > Date.now()) return cached.data as T;
    const data = await factory();
    this.fieldCache.set(key, { data, expiry: Date.now() + this.CACHE_TTL_MS });
    return data;
  }

  private invalidateFieldCache(tableName?: string) {
    if (tableName) {
      for (const key of this.fieldCache.keys()) {
        if (key.includes(tableName)) this.fieldCache.delete(key);
      }
    } else {
      this.fieldCache.clear();
    }
  }

  private formatTableName(tableName: string): string {
    return tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private formatColumnName(columnName: string): string {
    return columnName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // ============================================================
  // SYS_TABLE
  // ============================================================

  async findAllTables(options: PaginationOptions & { search?: string } = {}) {
    const { page = 1, limit = 100, search, prefix } = options;
    const offset = (page - 1) * limit;

    let query = this.db.kysely.selectFrom('sys_table').selectAll().where('is_active', '=', true);

    if (prefix) query = query.where('table_name', 'like', `${prefix}%`);
    if (search) query = query.where('name', 'like', `%${search}%`);

    const [data, countRow] = await Promise.all([
      query.orderBy('name').limit(Number(limit)).offset(Number(offset)).execute(),
      query.clearSelect().select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    ]);

    return { data, meta: { total: Number(countRow?.count ?? 0), page, pageSize: limit } };
  }

  async findAllDatabaseTables(options: PaginationOptions & { search?: string } = {}) {
    const { page = 1, limit = 100, search, prefix } = options;
    const offset = (page - 1) * limit;

    const allTables = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ${prefix ? sql`AND table_name LIKE ${prefix + '%'}` : sql``}
      ${search ? sql`AND table_name LIKE ${'%' + search + '%'}` : sql``}
      ORDER BY table_name
    `.execute(this.db.kysely);

    const rows = (allTables as any).rows as { table_name: string }[];
    const count = rows.length;
    const paginatedRows = rows.slice(offset, offset + limit);
    const tableNames = paginatedRows.map(t => t.table_name);

    const sysTableData = tableNames.length > 0
      ? await this.db.kysely.selectFrom('sys_table').selectAll()
          .where('table_name', 'in', tableNames).where('is_active', '=', true).execute()
      : [];

    const data = paginatedRows.map(t => {
      const sysTable = sysTableData.find(st => st.table_name === t.table_name);
      return {
        sys_table_id: sysTable?.sys_table_id ?? null,
        table_name: t.table_name,
        name: sysTable?.name ?? this.formatTableName(t.table_name),
        description: sysTable?.description ?? null,
        is_active: sysTable?.is_active ?? true,
      };
    });

    return { data, meta: { total: count, page, pageSize: limit } };
  }

  async findTableById(id: string) {
    const table = await this.db.kysely.selectFrom('sys_table').selectAll()
      .where('sys_table_id', '=', id).executeTakeFirst();
    if (!table) throw new NotFoundException(`Table with ID ${id} not found`);
    return table;
  }

  async findTableByName(tableName: string) {
    const table = await this.db.kysely.selectFrom('sys_table').selectAll()
      .where('table_name', '=', tableName).executeTakeFirst();
    if (!table) throw new NotFoundException(`Table ${tableName} not found`);
    return table;
  }

  async createTable(data: Record<string, unknown>) {
    const now = new Date().toISOString();
    const [table] = await this.db.kysely.insertInto('sys_table')
      .values({ ...data, created: now, updated: now } as any)
      .returningAll()
      .execute();
    return table;
  }

  async updateTable(id: string, data: Record<string, unknown>) {
    await this.findTableById(id);
    await this.db.kysely.updateTable('sys_table')
      .set({ ...data, updated: new Date().toISOString() } as any)
      .where('sys_table_id', '=', id)
      .execute();
    return this.findTableById(id);
  }

  // ============================================================
  // SYS_COLUMN
  // ============================================================

  async findAllColumns(options: PaginationOptions & { tableId?: string } = {}) {
    const { page = 1, limit = 100, tableId } = options;
    const offset = (page - 1) * limit;

    let query = this.db.kysely.selectFrom('sys_column').selectAll().where('is_active', '=', true);
    if (tableId) query = query.where('sys_table_id', '=', tableId);

    const [data, countRow] = await Promise.all([
      query.orderBy('seq_no').limit(limit).offset(offset).execute(),
      query.clearSelect().select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    ]);

    return { data, meta: { total: Number(countRow?.count ?? 0), page, pageSize: limit } };
  }

  async findColumnById(id: string) {
    const column = await this.db.kysely.selectFrom('sys_column').selectAll()
      .where('sys_column_id', '=', id).executeTakeFirst();
    if (!column) throw new NotFoundException(`Column with ID ${id} not found`);
    return column;
  }

  async updateColumn(id: string, data: Record<string, unknown>) {
    await this.findColumnById(id);
    await this.db.kysely.updateTable('sys_column')
      .set({ ...data, updated: new Date().toISOString() } as any)
      .where('sys_column_id', '=', id)
      .execute();
    return this.findColumnById(id);
  }

  async findColumnsFromSchema(tableName: string) {
    const result = await sql<any>`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `.execute(this.db.kysely);

    const columns = (result as any).rows as any[];
    const data = columns.map(col => ({
      sys_column_id: null,
      column_name: col.column_name,
      name: this.formatColumnName(col.column_name),
      data_type: col.data_type.toUpperCase(),
      field_length: col.character_maximum_length,
      is_mandatory: col.is_nullable === 'NO',
      is_key: false,
      reference_name: null,
      description: null,
    }));

    return { data, meta: { total: data.length } };
  }

  // ============================================================
  // SYS_FIELD
  // ============================================================

  async findAllFields(options: PaginationOptions & { tabId?: string; tableId?: string; view?: 'form' | 'grid' } = {}) {
    const { page = 1, limit = 100, tabId, tableId, view } = options;
    const offset = (page - 1) * limit;

    let query = this.db.kysely
      .selectFrom('sys_field')
      .innerJoin('sys_column', 'sys_column.sys_column_id', 'sys_field.sys_column_id')
      .select([
        'sys_field.sys_field_id',
        'sys_field.sys_tab_id',
        'sys_field.sys_column_id',
        'sys_field.name',
        'sys_field.seq_no',
        'sys_field.seq_no_grid',
        'sys_field.is_displayed',
        'sys_field.is_displayed_grid',
        'sys_field.is_read_only',
        'sys_field.is_active',
        'sys_column.column_name',
        'sys_column.name as column_display_name',
      ])
      .where('sys_field.is_active', '=', true);

    if (tabId) query = query.where('sys_field.sys_tab_id', '=', tabId);
    if (tableId) query = query.where('sys_column.sys_table_id', '=', tableId);
    if (view === 'form') query = query.where('sys_field.is_displayed', '=', true);
    else if (view === 'grid') query = query.where('sys_field.is_displayed_grid', '=', true);

    const orderCol = view === 'grid' ? 'sys_field.seq_no_grid' : 'sys_field.seq_no';

    const [data, countRow] = await Promise.all([
      query.orderBy(orderCol as any).limit(Number(limit)).offset(Number(offset)).execute(),
      query.clearSelect().select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    ]);

    return { data, meta: { total: Number(countRow?.count ?? 0), page, pageSize: limit } };
  }

  async findFieldById(id: string) {
    const field = await this.db.kysely.selectFrom('sys_field').selectAll()
      .where('sys_field_id', '=', id).executeTakeFirst();
    if (!field) throw new NotFoundException(`Field with ID ${id} not found`);
    return field;
  }

  async updateField(id: string, data: Record<string, unknown>, version?: number) {
    const field = await this.findFieldById(id);

    if (version !== undefined && (field as any).version !== version) {
      throw new ConflictException('Field was modified by another user');
    }

    await this.db.kysely.updateTable('sys_field')
      .set({ ...data, version: ((field as any).version || 0) + 1, updated: new Date().toISOString() } as any)
      .where('sys_field_id', '=', id)
      .execute();

    this.invalidateFieldCache();
    return this.findFieldById(id);
  }

  async batchReorderFields(fields: Array<{ id: string; seq_no: number }>) {
    await this.db.kysely.transaction().execute(async (trx) => {
      for (const { id, seq_no } of fields) {
        await trx.updateTable('sys_field')
          .set({ seq_no, updated: new Date().toISOString() } as any)
          .where('sys_field_id', '=', id)
          .execute();
      }
    });

    this.invalidateFieldCache();
    return { success: true, updated: fields.length };
  }

  // ============================================================
  // SYS_FIELD_GROUP
  // ============================================================

  async findAllFieldGroups(tableName?: string) {
    let query = this.db.kysely
      .selectFrom('sys_field_group')
      .selectAll()
      .where('sys_field_group.is_active', '=', true);

    if (tableName) {
      query = (query as any)
        .innerJoin('sys_tab', 'sys_tab.sys_tab_id', 'sys_field_group.sys_tab_id')
        .innerJoin('sys_table', 'sys_table.sys_table_id', 'sys_tab.sys_table_id')
        .where('sys_table.table_name', '=', tableName);
    }

    const groups = await (query as any).orderBy('sys_field_group.name').execute();
    return { data: groups, meta: { total: groups.length } };
  }

  async findFieldGroupById(id: string) {
    const group = await this.db.kysely.selectFrom('sys_field_group').selectAll()
      .where('sys_field_group_id', '=', id).executeTakeFirst();
    if (!group) throw new NotFoundException(`Field group with ID ${id} not found`);
    return group;
  }

  async createFieldGroup(data: Record<string, unknown>) {
    const now = new Date().toISOString();
    const [group] = await this.db.kysely.insertInto('sys_field_group')
      .values({ ...data, created: now, updated: now } as any)
      .returningAll()
      .execute();
    return group;
  }

  async updateFieldGroup(id: string, data: Record<string, unknown>) {
    await this.findFieldGroupById(id);
    await this.db.kysely.updateTable('sys_field_group')
      .set({ ...data, updated: new Date().toISOString() } as any)
      .where('sys_field_group_id', '=', id)
      .execute();
    return this.findFieldGroupById(id);
  }

  async deleteFieldGroup(id: string) {
    await this.findFieldGroupById(id);
    await this.db.kysely.updateTable('sys_field_group')
      .set({ is_active: false, updated: new Date().toISOString() } as any)
      .where('sys_field_group_id', '=', id)
      .execute();
    return { success: true };
  }

  // ============================================================
  // SYS_REFERENCE
  // ============================================================

  async findAllReferences(options: PaginationOptions = {}) {
    const { page = 1, limit = 100 } = options;
    const offset = (page - 1) * limit;

    const query = this.db.kysely.selectFrom('sys_reference').selectAll().where('is_active', '=', true);

    const [data, countRow] = await Promise.all([
      query.orderBy('name').limit(limit).offset(offset).execute(),
      query.clearSelect().select((eb) => eb.fn.countAll().as('count')).executeTakeFirst(),
    ]);

    return { data, meta: { total: Number(countRow?.count ?? 0), page, pageSize: limit } };
  }

  async findReferenceById(id: string) {
    const ref = await this.db.kysely.selectFrom('sys_reference').selectAll()
      .where('sys_reference_id', '=', id).executeTakeFirst();
    if (!ref) throw new NotFoundException(`Reference with ID ${id} not found`);
    return ref;
  }

  async findRefListBySysReferenceId(sysReferenceId: number) {
    const data = await this.db.kysely
      .selectFrom('sys_ref_list')
      .selectAll()
      .where('sys_reference_id', '=', sysReferenceId)
      .orderBy('value')
      .execute();
    return { data };
  }

  // ============================================================
  // Dictionary Helpers
  // ============================================================

  async getEntityMetadata(tableName: string) {
    const table = await this.findTableByName(tableName);

    const [columns, fields] = await Promise.all([
      this.db.kysely.selectFrom('sys_column').selectAll()
        .where('sys_table_id', '=', table.sys_table_id)
        .where('is_active', '=', true)
        .orderBy('seq_no')
        .execute(),
      this.db.kysely.selectFrom('sys_field')
        .innerJoin('sys_column', 'sys_column.sys_column_id', 'sys_field.sys_column_id')
        .select(['sys_field.sys_field_id', 'sys_field.name', 'sys_field.seq_no', 'sys_field.is_displayed', 'sys_column.column_name'])
        .where('sys_column.sys_table_id', '=', table.sys_table_id)
        .where('sys_field.is_active', '=', true)
        .orderBy('sys_field.seq_no')
        .execute(),
    ]);

    return { table, columns, fields };
  }

  async getFormFields(tableName: string) {
    return this.getCached(`form_fields:${tableName}`, async () => {
      const table = await this.findTableByName(tableName);

      return this.db.kysely
        .selectFrom('sys_field')
        .innerJoin('sys_column', 'sys_column.sys_column_id', 'sys_field.sys_column_id')
        .leftJoin('sys_reference', 'sys_reference.sys_reference_id', 'sys_column.sys_reference_id' as any)
        .leftJoin('sys_ref_table', 'sys_ref_table.sys_reference_id', 'sys_column.sys_reference_id' as any)
        .leftJoin('sys_table as ref_table', 'ref_table.sys_table_id', 'sys_ref_table.sys_table_id')
        .leftJoin('sys_column as key_column', 'key_column.sys_column_id', 'sys_ref_table.key_column_id')
        .leftJoin('sys_column as display_column', 'display_column.sys_column_id', 'sys_ref_table.display_column_id')
        .select([
          'sys_field.sys_field_id',
          'sys_field.name',
          'sys_field.seq_no',
          'sys_field.is_displayed',
          'sys_field.is_displayed_grid',
          'sys_field.is_read_only',
          'sys_column.column_name',
          'sys_column.name as display_name',
          'sys_column.is_mandatory',
          'sys_column.field_length',
          'sys_reference.name as reference_name',
          'ref_table.table_name as ref_table_name',
          'key_column.column_name as ref_key_column',
          'display_column.column_name as ref_display_column',
        ])
        .where('sys_column.sys_table_id', '=', table.sys_table_id)
        .where('sys_field.is_active', '=', true)
        .where('sys_field.is_displayed', '=', true)
        .orderBy('sys_field.seq_no')
        .execute();
    });
  }

  async getGridFields(tableName: string) {
    return this.getCached(`grid_fields:${tableName}`, async () => {
      const table = await this.findTableByName(tableName);

      return this.db.kysely
        .selectFrom('sys_field')
        .innerJoin('sys_column', 'sys_column.sys_column_id', 'sys_field.sys_column_id')
        .leftJoin('sys_reference', 'sys_reference.sys_reference_id', 'sys_column.sys_reference_id' as any)
        .leftJoin('sys_ref_table', 'sys_ref_table.sys_reference_id', 'sys_column.sys_reference_id' as any)
        .leftJoin('sys_table as ref_table', 'ref_table.sys_table_id', 'sys_ref_table.sys_table_id')
        .leftJoin('sys_column as key_column', 'key_column.sys_column_id', 'sys_ref_table.key_column_id')
        .leftJoin('sys_column as display_column', 'display_column.sys_column_id', 'sys_ref_table.display_column_id')
        .select([
          'sys_field.sys_field_id',
          'sys_field.name',
          'sys_field.seq_no_grid',
          'sys_field.is_displayed_grid',
          'sys_column.column_name',
          'sys_column.name as display_name',
          'sys_reference.name as reference_name',
          'ref_table.table_name as ref_table_name',
          'key_column.column_name as ref_key_column',
          'display_column.column_name as ref_display_column',
        ])
        .where('sys_column.sys_table_id', '=', table.sys_table_id)
        .where('sys_field.is_active', '=', true)
        .where('sys_field.is_displayed_grid', '=', true)
        .orderBy('sys_field.seq_no_grid')
        .execute();
    });
  }
}
