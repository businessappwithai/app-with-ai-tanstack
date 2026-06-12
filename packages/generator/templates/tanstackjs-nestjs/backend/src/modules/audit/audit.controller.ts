import { Controller, Get, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { AuditSearchParams, AuditSource } from './audit.types';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Search and filter audit log' })
  async search(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('user_id') user_id?: string,
    @Query('user_email') user_email?: string,
    @Query('action') action?: string,
    @Query('entity_type') entity_type?: string,
    @Query('entity_id') entity_id?: string,
    @Query('source') source?: string,
    @Query('success') success?: string,
    @Query('search') search?: string,
  ) {
    const params: AuditSearchParams = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(500, parseInt(limit, 10)) : 50,
      from,
      to,
      user_id: user_id || undefined,
      user_email: user_email || undefined,
      action: action || undefined,
      entity_type: entity_type || undefined,
      entity_id: entity_id || undefined,
      source: source as AuditSource | undefined,
      success: success === 'true' ? true : success === 'false' ? false : undefined,
      search: search || undefined,
    };
    return this.auditService.search(params);
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'List distinct entity types in audit log' })
  async getEntityTypes() {
    return this.auditService.getEntityTypes();
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify an audit record against immudb (tamper check)' })
  async verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.verify(id);
  }
}
