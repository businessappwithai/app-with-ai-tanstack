/**
 * System Controller (Application Dictionary)
 *
 * Handles CRUD operations for all sys_ tables.
 * The sys_field endpoints are critical for runtime UI modification.
 *
 * Generated: 2026-03-20T16:41:26.575Z
 */

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { SysService } from "./sys.service";

@ApiTags("sys")
@ApiBearerAuth()
@Controller("sys")
export class SysController {
  constructor(private readonly sysService: SysService) {}

  // ============================================================================
  // SYS_TABLE Endpoints
  // ============================================================================

  @Get("tables")
  @ApiOperation({ summary: "List all tables" })
  async findAllTables(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('prefix') prefix?: string
  ) {
    return this.sysService.findAllTables({ page, limit, search, prefix });
  }

  @Get('tables/:id')
  @ApiOperation({ summary: 'Get table by ID' })
  async findTableById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sysService.findTableById(id);
  }

  // ============================================================================
  // SYS_COLUMN Endpoints
  // ============================================================================

  @Get("columns")
  @ApiOperation({ summary: "List all columns" })
  async findAllColumns(
    @Query('tableId') tableId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.sysService.findAllColumns({ tableId, page, limit });
  }

  @Get('columns/:id')
  @ApiOperation({ summary: 'Get column by ID' })
  async findColumnById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sysService.findColumnById(id);
  }

  // ============================================================================
  // SYS_FIELD Endpoints (Critical for Runtime UI Modification)
  // ============================================================================

  @Get("fields")
  @ApiOperation({ summary: "List all fields" })
  async findAllFields(
    @Query('tabId') tabId?: string,
    @Query('tableId') tableId?: string,
    @Query('view') view?: 'form' | 'grid',
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.sysService.findAllFields({ tabId, tableId, view, page, limit });
  }

  @Get('fields/:id')
  @ApiOperation({ summary: 'Get field by ID' })
  async findFieldById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sysService.findFieldById(id);
  }

  @Patch("fields/:id")
  @ApiOperation({ summary: "Update field (seq_no, is_displayed, etc.)" })
  async updateField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, unknown>,
    @Headers('if-match') ifMatch?: string
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ""), 10) : undefined;
    return this.sysService.updateField(id, data, version);
  }

  @Put('fields/batch-reorder')
  @ApiOperation({ summary: 'Batch update field order (seq_no)' })
  async batchReorderFields(
    @Body() data: { fields: Array<{ id: string; seq_no: number }> },
  ) {
    return this.sysService.batchReorderFields(data.fields);
  }

  // ============================================================================
  // SYS_REFERENCE Endpoints
  // ============================================================================

  @Get("references")
  @ApiOperation({ summary: "List all references (lookup types)" })
  async findAllReferences(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.sysService.findAllReferences({ page, limit });
  }

  @Get('references/:id')
  @ApiOperation({ summary: 'Get reference by ID' })
  async findReferenceById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sysService.findReferenceById(id);
  }
}
