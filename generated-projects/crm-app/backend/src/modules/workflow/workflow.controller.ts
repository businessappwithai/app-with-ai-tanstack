/**
 * Workflow Controller - Workflow Monitoring & Management
 *
 * Provides API endpoints for:
 * - Checking workflow status
 * - Viewing workflow history
 * - Retrying failed workflows
 * - Monitoring workflow execution
 *
 * Generated: 2026-05-12T11:38:40.016Z
 * Project: crm-app
 */

import { Controller, Get, Post, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkflowService } from './workflow.service';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(private readonly workflowService: WorkflowService) {}

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get workflow status by run ID' })
  @ApiResponse({ status: 200, description: 'Workflow status retrieved' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowStatus(@Param('runId') runId: string) {
    return await this.workflowService.getStatus(runId);
  }

  @Get('entity/:entityName/:entityId')
  @ApiOperation({ summary: 'Get workflow history for an entity' })
  @ApiResponse({ status: 200, description: 'Workflow history retrieved' })
  async getEntityWorkflows(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    return await this.workflowService.getEntityWorkflows(
      entityName,
      entityId,
      limit ? parseInt(limit, 10) : 10
    );
  }

  @Get('runs')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all workflow runs (admin only)' })
  @ApiResponse({ status: 200, description: 'Workflow runs retrieved' })
  async getAllWorkflows(
    @Query('status') status?: 'draft' | 'success' | 'error',
    @Query('entityName') entityName?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.workflowService.getAllWorkflows({
      status,
      entityName,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Post('runs/:runId/retry')
  @Roles('admin')
  @ApiOperation({ summary: 'Retry a failed workflow (admin only)' })
  @ApiResponse({ status: 200, description: 'Workflow retry initiated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async retryWorkflow(@Param('runId') runId: string) {
    const newRunId = await this.workflowService.retry(runId);
    return {
      message: 'Workflow retry initiated',
      newRunId,
    };
  }
}
