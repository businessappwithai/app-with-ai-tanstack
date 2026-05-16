/**
 * Business Entity Service
 *
 * Dynamic service for all bus_ prefixed tables.
 * Validates data against Application Dictionary metadata.
 *
 * Generated: 2026-05-16T05:41:09.480Z
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { KYSELY_CONNECTION } from '../../database/database.constants';
import { DatabaseService } from '../../database/database.service';
import type { PaginationOptions, PaginatedResult } from '../../database/database.service';
import { executeBeforeCreateHooks, executeAfterCreateHooks, executeBeforeUpdateHooks, executeAfterUpdateHooks, executeBeforeDeleteHooks, executeAfterDeleteHooks, executeBeforeReadHooks, executeAfterReadHooks, executeBeforeListHooks, executeAfterListHooks } from '../hooks/hooks';

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
  ref_table_name?: string;
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
    @Inject(KYSELY_CONNECTION) private readonly kysely: Kysely<any>,
    private readonly db: DatabaseService,
  ) {
    this.logger.log('BusService initialized');
  }

  private singularize(word: string): string {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes') ||
        word.endsWith('ches') || word.endsWith('shes')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  private getTableName(entity: string): string {
    const normalized = entity.toLowerCase().replace(/-/g, '_');
    if (normalized.startsWith('bus_')) return normalized;
    const singular = this.singularize(normalized);
    return `bus_${singular}`;
  }

  async findAll(
    entity: string,
    options: PaginationOptions = {},
    filters: Record<string, any> = {},
  ): Promise<PaginatedResult<any>> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    const processedOptions = await executeBeforeListHooks(entity, { options, filters });
    const result = await this.db.findAll(tableName, processedOptions.options, processedOptions.filters);
    await executeAfterListHooks(entity, result.data);

    this.logger.log(`findAll: entity=${entity}, returned ${result.data.length} records`);
    return result;
  }

  async findById(entity: string, id: string): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    const processedId = await executeBeforeReadHooks(entity, { id });
    const result = await this.db.findByIdOrFail(tableName, processedId.id || id);
    await executeAfterReadHooks(entity, result);

    return result;
  }

  async create(entity: string, data: Record<string, any>): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    const metadata = await this.getEntityMetadata(entity);
    const dataWithDefaults = { ...data };

    for (const column of metadata.columns) {
      if (column.default_value && dataWithDefaults[column.column_name] === undefined) {
        dataWithDefaults[column.column_name] = this.parseDefaultValue(column.default_value, column.sys_reference_id);
      }
    }

    let processedData = await executeBeforeCreateHooks(entity, dataWithDefaults);
    if (!processedData.id) {
      processedData = { ...processedData, id: randomUUID() };
    }

    let result: any;
    try {
      result = await this.db.create(tableName, processedData);
    } catch (error: any) {
      const msg: string = error?.message ?? '';
      if (
        error?.code === 'SQLITE_CONSTRAINT' ||
        error?.code === '23505' ||
        msg.includes('UNIQUE constraint failed') ||
        msg.includes('duplicate key value')
      ) {
        throw new ConflictException('A record with the same unique field value already exists');
      }
      throw error;
    }

    await executeAfterCreateHooks(entity, result);
    this.logger.log(`create: entity=${entity}, id=${result?.id}`);
    return result;
  }

  async update(
    entity: string,
    id: string,
    data: Record<string, any>,
    expectedVersion?: number,
  ): Promise<any> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    const processedData = await executeBeforeUpdateHooks(entity, data);
    const result = await this.db.update(tableName, id, processedData, expectedVersion);

    if (!result) {
      throw new NotFoundException(`Record not found in ${tableName} with id: ${id}`);
    }

    await executeAfterUpdateHooks(entity, result);
    return result;
  }

  async softDelete(entity: string, id: string): Promise<boolean> {
    const tableName = this.getTableName(entity);
    await this.verifyEntity(entity);

    const canDelete = await executeBeforeDeleteHooks(entity, id);
    if (!canDelete) {
      throw new BadRequestException(`Cannot delete ${entity}: still referenced`);
    }

    const result = await this.db.softDelete(tableName, id);
    await executeAfterDeleteHooks(entity, result);
    return result;
  }

  private async verifyEntity(entity: string): Promise<void> {
    const tableName = this.getTableName(entity);

    const tableRecord = await this.kysely
      .selectFrom('sys_table')
      .selectAll()
      .where('table_name', '=', tableName)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!tableRecord) {
      throw new NotFoundException(`Entity '${entity}' not found in Application Dictionary`);
    }
  }

  async getEntityMetadata(entity: string): Promise<EntityMetadata> {
    const tableName = this.getTableName(entity);

    if (this.metadataCache.has(tableName)) {
      return this.metadataCache.get(tableName)!;
    }

    const table = await this.kysely
      .selectFrom('sys_table')
      .selectAll()
      .where('table_name', '=', tableName)
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!table) {
      throw new NotFoundException(`Entity '${entity}' not found`);
    }

    const window = table.sys_window_id
      ? await this.kysely
          .selectFrom('sys_window')
          .selectAll()
          .where('sys_window_id', '=', table.sys_window_id)
          .executeTakeFirst()
      : undefined;

    const columns = await this.kysely
      .selectFrom('sys_column')
      .innerJoin('sys_tab', 'sys_tab.sys_table_id', 'sys_column.sys_table_id')
      .leftJoin('sys_field', (join) =>
        join
          .onRef('sys_field.sys_column_id', '=', 'sys_column.sys_column_id')
          .onRef('sys_field.sys_tab_id', '=', 'sys_tab.sys_tab_id'),
      )
      .select([
        'sys_column.sys_column_id',
        'sys_column.column_name',
        'sys_column.name',
        'sys_column.sys_reference_id',
        'sys_column.is_mandatory',
        'sys_column.is_updateable',
        'sys_column.field_length',
        'sys_column.default_value',
        'sys_column.seq_no',
        'sys_field.sys_field_id',
        'sys_field.seq_no as field_seq_no',
        'sys_field.seq_no_grid',
        'sys_field.is_displayed',
        'sys_field.is_displayed_grid',
        'sys_field.is_read_only as field_is_read_only',
        'sys_field.name as field_name',
      ])
      .where('sys_column.sys_table_id', '=', table.sys_table_id)
      .where('sys_column.is_active', '=', true)
      .orderBy('sys_column.seq_no', 'asc')
      .execute();

    const metadata: EntityMetadata = {
      table: {
        sys_table_id: table.sys_table_id,
        table_name: table.table_name,
        name: table.name,
        description: table.description,
      },
      columns: columns.map((col: any) => ({
        sys_field_id: col.sys_field_id,
        name: col.field_name || col.name,
        column_name: col.column_name,
        sys_reference_id: col.sys_reference_id,
        is_mandatory: col.is_mandatory,
        is_updateable: col.is_updateable,
        field_length: col.field_length,
        default_value: col.default_value,
        seq_no: col.field_seq_no || col.seq_no || 0,
        seq_no_grid: col.seq_no_grid || 0,
        is_displayed: col.is_displayed !== false,
        is_displayed_grid: col.is_displayed_grid !== false,
        is_read_only: col.field_is_read_only || false,
      })),
      window: window
        ? { sys_window_id: window.sys_window_id, name: window.name }
        : undefined,
    };

    this.metadataCache.set(tableName, metadata);
    return metadata;
  }

  async getFormFields(entity: string): Promise<FieldMetadata[]> {
    const metadata = await this.getEntityMetadata(entity);
    return metadata.columns.filter((col) => col.is_displayed).sort((a, b) => a.seq_no - b.seq_no);
  }

  async getGridFields(entity: string): Promise<FieldMetadata[]> {
    const metadata = await this.getEntityMetadata(entity);
    return metadata.columns.filter((col) => col.is_displayed_grid).sort((a, b) => a.seq_no_grid - b.seq_no_grid);
  }

  async validateData(entity: string, data: Record<string, any>, mode: 'create' | 'update' | 'patch'): Promise<void> {
    const metadata = await this.getEntityMetadata(entity);
    const errors: string[] = [];

    for (const column of metadata.columns) {
      const value = data[column.column_name];

      if (mode !== 'patch' && column.is_mandatory && !column.default_value) {
        if (value === undefined || value === null || value === '') {
          errors.push(`Field '${column.name}' (${column.column_name}) is required`);
        }
      }

      if (value && column.field_length && typeof value === 'string') {
        if (value.length > column.field_length) {
          errors.push(`Field '${column.name}' exceeds maximum length of ${column.field_length}`);
        }
      }

      if ((mode === 'update' || mode === 'patch') && !column.is_updateable) {
        if (value !== undefined && column.column_name !== `${this.getTableName(entity)}_id`) {
          errors.push(`Field '${column.name}' is not updateable`);
        }
      }

      if (value !== undefined && value !== null) {
        const typeError = this.validateType(value, column.sys_reference_id, column.name);
        if (typeError) errors.push(typeError);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation failed', errors });
    }
  }

  private validateType(value: any, referenceId: number, fieldName: string): string | null {
    switch (referenceId) {
      case 10: case 14: case 24: case 30: case 31:
        if (typeof value !== 'string') return `Field '${fieldName}' must be a string`;
        break;
      case 11:
        if (typeof value !== 'number' || !Number.isInteger(value)) return `Field '${fieldName}' must be an integer`;
        break;
      case 12:
        if (typeof value !== 'number') return `Field '${fieldName}' must be a number`;
        break;
      case 20:
        if (typeof value !== 'boolean') return `Field '${fieldName}' must be a boolean`;
        break;
      case 15: case 16:
        if (!(value instanceof Date) && isNaN(Date.parse(value))) return `Field '${fieldName}' must be a valid date`;
        break;
      case 13: case 18: case 19:
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof value !== 'string' || !uuidRegex.test(value)) return `Field '${fieldName}' must be a valid UUID`;
        break;
      case 28:
        if (typeof value !== 'object') return `Field '${fieldName}' must be a JSON object`;
        break;
    }
    return null;
  }

  private parseDefaultValue(defaultValue: string, referenceId: number): any {
    switch (referenceId) {
      case 11: return parseInt(defaultValue, 10);
      case 12: return parseFloat(defaultValue);
      case 20: return defaultValue.toLowerCase() === 'true' || defaultValue === 'Y';
      case 28: try { return JSON.parse(defaultValue); } catch { return {}; }
      default: return defaultValue;
    }
  }

  clearMetadataCache(): void {
    this.metadataCache.clear();
  }
}
