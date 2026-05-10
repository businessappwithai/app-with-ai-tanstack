/**
 * Business Entity Controller
 *
 * Dynamic controller for all bus_ prefixed tables.
 * CRUD operations are driven by the Application Dictionary metadata.
 *
 * Generated: 2026-01-26T15:23:31.872Z
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { BusService } from "./bus.service";

@ApiTags("bus")
@ApiBearerAuth()
@Controller("bus")
export class BusController {
  constructor(private readonly busService: BusService) {}

  /**
   * List all records for a business entity
   * GET /api/bus/:entity
   */
  @Get(":entity")
  @ApiOperation({ summary: "List all records for a business entity" })
  @ApiParam({ name: "entity", description: "Entity name (e.g., customer, order)" })
  @ApiResponse({ status: 200, description: "Returns paginated list of records" })
  async findAll(
    @Param('entity') entity: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: 'asc' | 'desc',
    @Query() query?: Record<string, any>
  ) {
    // Extract filters from query params (exclude pagination params)
    const { page: _p, limit: _l, orderBy: _ob, orderDir: _od, ...filters } = query || {};

    return this.busService.findAll(entity, { page, limit, orderBy, orderDir }, filters);
  }

  /**
   * Get a single record by ID
   * GET /api/bus/:entity/:id
   */
  @Get(":entity/:id")
  @ApiOperation({ summary: "Get a single record by ID" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "id", description: "Record UUID" })
  @ApiResponse({ status: 200, description: "Returns the record" })
  @ApiResponse({ status: 404, description: "Record not found" })
  async findOne(@Param('entity') entity: string, @Param('id') id: string) {
    return this.busService.findById(entity, id);
  }

  // Field Groups routes - must come before :entity/:id to avoid route conflicts
  /**
   * Get field groups for an entity
   * GET /api/bus/:entity/field-groups
   */
  @Get(':entity/field-groups')
  @ApiOperation({ summary: 'Get all field groups for an entity' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getFieldGroups(@Param('entity') entity: string) {
    return this.busService.getFieldGroups(entity);
  }

  /**
   * Create a new field group
   * POST /api/bus/:entity/field-groups
   */
  @Post(":entity/field-groups")
  @ApiOperation({ summary: "Create a new field group" })
  @ApiParam({ name: "entity", description: "Entity name" })
  async createFieldGroup(@Param('entity') entity: string, @Body() groupData: any) {
    return this.busService.createFieldGroup(entity, groupData);
  }

  /**
   * Update a field group
   * PUT /api/bus/:entity/field-groups/:groupId
   */
  @Put(":entity/field-groups/:groupId")
  @ApiOperation({ summary: "Update a field group" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "groupId", description: "Group ID" })
  async updateFieldGroup(
    @Param('entity') entity: string,
    @Param('groupId') groupId: string,
    @Body() updates: any
  ) {
    return this.busService.updateFieldGroup(entity, groupId, updates);
  }

  /**
   * Delete a field group
   * @Delete /api/bus/:entity/field-groups/:groupId
   */
  @Delete(":entity/field-groups/:groupId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a field group" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "groupId", description: "Group ID" })
  async deleteFieldGroup(@Param('entity') entity: string, @Param('groupId') groupId: string) {
    await this.busService.deleteFieldGroup(entity, groupId);
  }

  /**
   * Assign field to a group
   * PUT /api/bus/:entity/fields/:fieldId/group
   */
  @Put(":entity/fields/:fieldId/group")
  @ApiOperation({ summary: "Assign field to a group" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "fieldId", description: "Field ID" })
  async assignFieldToGroup(
    @Param('entity') entity: string,
    @Param('fieldId') fieldId: string,
    @Body() body: { groupId: string | null }
  ) {
    await this.busService.assignFieldToGroup(entity, fieldId, body.groupId);
    return { success: true };
  }

  /**
   * Update field styling
   * PATCH /api/bus/:entity/fields/:fieldId/style
   */
  @Patch(":entity/fields/:fieldId/style")
  @ApiOperation({ summary: "Update field styling (color, col_span, etc.)" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "fieldId", description: "Field ID" })
  async updateFieldStyle(
    @Param('entity') entity: string,
    @Param('fieldId') fieldId: string,
    @Body() style: any
  ) {
    await this.busService.updateFieldStyle(entity, fieldId, style);
    return { success: true };
  }

  /**
   * Create a new record
   * POST /api/bus/:entity
   */
  @Post(":entity")
  @ApiOperation({ summary: "Create a new record" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiResponse({ status: 201, description: "Record created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  async create(@Param('entity') entity: string, @Body() data: Record<string, any>) {
    // Validate data against dictionary metadata
    await this.busService.validateData(entity, data, "create");
    return this.busService.create(entity, data);
  }

  /**
   * Update an existing record (full replace)
   * PUT /api/bus/:entity/:id
   */
  @Put(":entity/:id")
  @ApiOperation({ summary: "Update a record (full replace)" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "id", description: "Record UUID" })
  @ApiResponse({ status: 200, description: "Record updated successfully" })
  @ApiResponse({ status: 404, description: "Record not found" })
  @ApiResponse({ status: 409, description: "Conflict - record was modified" })
  async update(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
    @Headers('if-match') ifMatch?: string
  ) {
    // Extract version from If-Match header
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, "").replace("v", ""), 10) : undefined;

    // Validate data against dictionary metadata
    await this.busService.validateData(entity, data, "update");
    return this.busService.update(entity, id, data, version);
  }

  /**
   * Partially update a record
   * PATCH /api/bus/:entity/:id
   */
  @Patch(":entity/:id")
  @ApiOperation({ summary: "Partially update a record" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "id", description: "Record UUID" })
  @ApiResponse({ status: 200, description: "Record updated successfully" })
  @ApiResponse({ status: 404, description: "Record not found" })
  @ApiResponse({ status: 409, description: "Conflict - record was modified" })
  async patch(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
    @Headers('if-match') ifMatch?: string
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, "").replace("v", ""), 10) : undefined;

    // Validate partial data against dictionary metadata
    await this.busService.validateData(entity, data, "patch");
    return this.busService.update(entity, id, data, version);
  }

  /**
   * Delete a record (soft delete)
   * DELETE /api/bus/:entity/:id
   */
  @Delete(":entity/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a record (soft delete)" })
  @ApiParam({ name: "entity", description: "Entity name" })
  @ApiParam({ name: "id", description: "Record UUID" })
  @ApiResponse({ status: 204, description: "Record deleted successfully" })
  @ApiResponse({ status: 404, description: "Record not found" })
  async delete(@Param('entity') entity: string, @Param('id') id: string) {
    await this.busService.softDelete(entity, id);
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
    return this.busService.getEntityMetadata(entity);
  }

  /**
   * Get fields configuration for forms (ordered by seq_no)
   * GET /api/bus/:entity/fields/form
   */
  @Get(':entity/fields/form')
  @ApiOperation({ summary: 'Get fields for form display (ordered by seq_no)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getFormFields(@Param('entity') entity: string) {
    return this.busService.getFormFields(entity);
  }

  /**
   * Get fields configuration for grid/table (ordered by seq_no_grid)
   * GET /api/bus/:entity/fields/grid
   */
  @Get(':entity/fields/grid')
  @ApiOperation({ summary: 'Get fields for grid display (ordered by seq_no_grid)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getGridFields(@Param('entity') entity: string) {
    return this.busService.getGridFields(entity);
  }

  /**
   * Get ALL fields configuration for forms (including hidden ones) - for layout editor
   * GET /api/bus/:entity/fields/form/all
   */
  @Get(':entity/fields/form/all')
  @ApiOperation({ summary: 'Get ALL form fields including hidden ones (for layout editor)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getAllFormFields(@Param('entity') entity: string) {
    return this.busService.getAllFormFields(entity);
  }

  /**
   * Get ALL fields configuration for grids (including hidden ones) - for layout editor
   * GET /api/bus/:entity/fields/grid/all
   */
  @Get(':entity/fields/grid/all')
  @ApiOperation({ summary: 'Get ALL grid fields including hidden ones (for layout editor)' })
  @ApiParam({ name: 'entity', description: 'Entity name' })
  async getAllGridFields(@Param('entity') entity: string) {
    return this.busService.getAllGridFields(entity);
  }
}
