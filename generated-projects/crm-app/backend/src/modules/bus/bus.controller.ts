/**
 * Business Entity Controller
 *
 * Dynamic controller for all bus_ prefixed tables.
 * CRUD operations are driven by the Application Dictionary metadata.
 *
 * Generated: 2026-05-12T11:38:40.022Z
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusService } from './bus.service';

@ApiTags('bus')
@ApiBearerAuth()
@Controller('bus')
export class BusController {
  private readonly logger = new Logger(BusController.name);

  constructor(private readonly busService: BusService) {
    this.logger.log('BusController initialized');
  }

  /**
   * List all records for a business entity
   * GET /api/bus/:entity
   */
  @Get(':entity')
  @ApiOperation({ summary: 'List all records for a business entity' })
  @ApiParam({ name: 'entity', description: 'Entity name (e.g., customer, order)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of records' })
  async findAll(
    @Param('entity') entity: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: 'asc' | 'desc',
    @Query() query?: Record<string, any>,
  ) {
    const methodName = 'findAll';
    this.logger.debug(`[${methodName}] Request - entity: ${entity}, page: ${page}, limit: ${limit}, orderBy: ${orderBy}, orderDir: ${orderDir}`);

    // Extract filters from query params (exclude pagination params)
    const { page: _p, limit: _l, orderBy: _ob, orderDir: _od, ...rawFilters } = query || {};

    // Parse filter parameters with format: filter.fieldName=operator:value
    const parsedFilters = this.parseFilters(rawFilters);

    if (Object.keys(parsedFilters).length > 0) {
      this.logger.debug(`[${methodName}] Filters: ${JSON.stringify(parsedFilters)}`);
    }

    const result = await this.busService.findAll(entity, { page, limit, orderBy, orderDir }, parsedFilters);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, returned ${result.data.length} records (total: ${result.meta.total})`);
    return result;
  }

  /**
   * Parse filter parameters from query string
   * Supports format: filter.fieldName=operator:value
   * Operators: contains, equals, startsWith, endsWith, gt, gte, lt, lte
   */
  private parseFilters(rawFilters: Record<string, any>): Record<string, any> {
    const parsed: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawFilters)) {
      // Check if this is a filter parameter (starts with 'filter.')
      if (key.startsWith('filter.')) {
        const fieldName = key.substring(7); // Remove 'filter.' prefix

        // Parse operator:value format
        if (typeof value === 'string' && value.includes(':')) {
          const [operator, searchValue] = value.split(':', 2);

          switch (operator) {
            case 'contains':
              parsed[fieldName] = `%${searchValue}%`;
              break;
            case 'startsWith':
              parsed[fieldName] = `${searchValue}%`;
              break;
            case 'endsWith':
              parsed[fieldName] = `%${searchValue}`;
              break;
            case 'equals':
            case 'eq':
              parsed[fieldName] = searchValue;
              break;
            case 'gt':
              parsed[fieldName] = { operator: '>', value: searchValue };
              break;
            case 'gte':
              parsed[fieldName] = { operator: '>=', value: searchValue };
              break;
            case 'lt':
              parsed[fieldName] = { operator: '<', value: searchValue };
              break;
            case 'lte':
              parsed[fieldName] = { operator: '<=', value: searchValue };
              break;
            default:
              // Unknown operator, treat as exact match
              parsed[fieldName] = value;
          }

          this.logger.debug(`[parseFilters] Parsed filter: ${fieldName} with operator ${operator}`);
        } else {
          // No operator specified, use as-is
          parsed[fieldName] = value;
        }
      } else if (!key.startsWith('page') && !key.startsWith('limit') && !key.startsWith('orderBy') && !key.startsWith('orderDir')) {
        // Non-filter query params, pass through as-is
        parsed[key] = value;
      }
    }

    return parsed;
  }

  /**
   * Get a single record by ID
   * GET /api/bus/:entity/:id
   */
  @Get(':entity/:id')
  @ApiOperation({ summary: 'Get a single record by ID' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiParam({ name: 'id', description: 'Record UUID' })
  @ApiResponse({ status: 200, description: 'Returns the record' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async findOne(
    @Param('entity') entity: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const methodName = 'findOne';
    this.logger.debug(`[${methodName}] Request - entity: ${entity}, id: ${id}`);

    const result = await this.busService.findById(entity, id);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, id: ${id}`);
    return result;
  }

  /**
   * Create a new record
   * POST /api/bus/:entity
   */
  @Post(':entity')
  @ApiOperation({ summary: 'Create a new record' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Param('entity') entity: string,
    @Body() data: Record<string, any>,
  ) {
    const methodName = 'create';
    this.logger.log(`[${methodName}] Request - entity: ${entity}`);
    this.logger.debug(`[${methodName}] Request body: ${JSON.stringify(data)}`);

    // Validate data against dictionary metadata
    await this.busService.validateData(entity, data, 'create');
    const result = await this.busService.create(entity, data);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, created id: ${result.id}`);
    return result;
  }

  /**
   * Update an existing record (full replace)
   * PUT /api/bus/:entity/:id
   */
  @Put(':entity/:id')
  @ApiOperation({ summary: 'Update a record (full replace)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiParam({ name: 'id', description: 'Record UUID' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 409, description: 'Conflict - record was modified' })
  async update(
    @Param('entity') entity: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, any>,
    @Headers('if-match') ifMatch?: string,
  ) {
    const methodName = 'update';
    // Extract version from If-Match header
    const version = ifMatch
      ? parseInt(ifMatch.replace(/"/g, '').replace('v', ''), 10)
      : undefined;

    this.logger.log(`[${methodName}] Request - entity: ${entity}, id: ${id}, expectedVersion: ${version}`);
    this.logger.debug(`[${methodName}] Request body: ${JSON.stringify(data)}`);

    // Validate data against dictionary metadata
    await this.busService.validateData(entity, data, 'update');
    const result = await this.busService.update(entity, id, data, version);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, id: ${id}, new version: ${result.version}`);
    return result;
  }

  /**
   * Partially update a record
   * PATCH /api/bus/:entity/:id
   */
  @Patch(':entity/:id')
  @ApiOperation({ summary: 'Partially update a record' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiParam({ name: 'id', description: 'Record UUID' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  @ApiResponse({ status: 409, description: 'Conflict - record was modified' })
  async patch(
    @Param('entity') entity: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, any>,
    @Headers('if-match') ifMatch?: string,
  ) {
    const methodName = 'patch';
    const version = ifMatch
      ? parseInt(ifMatch.replace(/"/g, '').replace('v', ''), 10)
      : undefined;

    this.logger.log(`[${methodName}] Request - entity: ${entity}, id: ${id}, expectedVersion: ${version}`);
    this.logger.debug(`[${methodName}] Request body: ${JSON.stringify(data)}`);

    // Validate partial data against dictionary metadata
    await this.busService.validateData(entity, data, 'patch');
    const result = await this.busService.update(entity, id, data, version);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, id: ${id}, new version: ${result.version}`);
    return result;
  }

  /**
   * Delete a record (soft delete)
   * DELETE /api/bus/:entity/:id
   */
  @Delete(':entity/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a record (soft delete)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiParam({ name: 'id', description: 'Record UUID' })
  @ApiResponse({ status: 204, description: 'Record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async delete(
    @Param('entity') entity: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const methodName = 'delete';
    this.logger.log(`[${methodName}] Request - entity: ${entity}, id: ${id}`);

    await this.busService.softDelete(entity, id);

    this.logger.log(`[${methodName}] Success - entity: ${entity}, id: ${id}`);
  }

  /**
   * Get dictionary metadata for an entity
   * Useful for clients to understand field configuration
   * GET /api/bus/:entity/meta
   */
  @Get(':entity/meta')
  @ApiOperation({ summary: 'Get dictionary metadata for an entity' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  @ApiResponse({ status: 200, description: 'Returns entity metadata from Application Dictionary' })
  async getMetadata(@Param('entity') entity: string) {
    const methodName = 'getMetadata';
    this.logger.debug(`[${methodName}] Request - entity: ${entity}`);

    const result = await this.busService.getEntityMetadata(entity);

    this.logger.debug(`[${methodName}] Success - entity: ${entity}, returned ${result.columns.length} columns`);
    return result;
  }

  /**
   * Get fields configuration for forms (ordered by seq_no)
   * GET /api/bus/:entity/fields/form
   */
  @Get(':entity/fields/form')
  @ApiOperation({ summary: 'Get fields for form display (ordered by seq_no)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getFormFields(@Param('entity') entity: string) {
    const methodName = 'getFormFields';
    this.logger.debug(`[${methodName}] Request - entity: ${entity}`);

    const result = await this.busService.getFormFields(entity);

    this.logger.debug(`[${methodName}] Success - entity: ${entity}, returned ${result.length} form fields`);
    return result;
  }

  /**
   * Get fields configuration for grid/table (ordered by seq_no_grid)
   * GET /api/bus/:entity/fields/grid
   */
  @Get(':entity/fields/grid')
  @ApiOperation({ summary: 'Get fields for grid display (ordered by seq_no_grid)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getGridFields(@Param('entity') entity: string) {
    const methodName = 'getGridFields';
    this.logger.debug(`[${methodName}] Request - entity: ${entity}`);

    const result = await this.busService.getGridFields(entity);

    this.logger.debug(`[${methodName}] Success - entity: ${entity}, returned ${result.length} grid fields`);
    return result;
  }
}
