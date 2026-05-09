/**
 * Business Rules Controller - Rule Management API
 *
 * Provides REST API endpoints for:
 * - Listing all rules with filtering
 * - Creating new rules
 * - Updating existing rules
 * - Deleting rules
 * - Validating JDM content
 * - Dry-running rules with test data
 * - Getting rule history
 * - Migrating rules from files to database
 *
 * Generated: 2026-05-07T09:31:28.437Z
 * Project: crm-app
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import type { RulesService } from "./rules.service";

@ApiTags("rules")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, RolesGuard)
@Controller("rules")
export class RulesController {
  private readonly logger = new Logger(RulesController.name);

  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @ApiOperation({ summary: "List all business rules" })
  @ApiResponse({ status: 200, description: "Rules retrieved successfully" })
  async list(
    @Query('entityName') entityName?: string,
    @Query('operation') operation?: string,
    @Query('isActive') isActive?: string
  ) {
    const filters: Record<string, unknown> = {};
    if (entityName) filters.entityName = entityName;
    if (operation) filters.operation = operation;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    return await this.rulesService.findAll(filters as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rule by ID' })
  @ApiResponse({ status: 200, description: 'Rule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async get(@Param('id') id: string) {
    return await this.rulesService.findById(id);
  }

  @Post()
  @Roles("admin")
  @ApiOperation({ summary: "Create a new business rule (admin only)" })
  @ApiResponse({ status: 201, description: "Rule created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "Rule already exists" })
  async create(
    @Body()
    dto: {
      entityName: string;
      ruleName: string;
      operation: string;
      jdmContent: string;
    },
    @CurrentUser() user: { id: string }
  ) {
    return await this.rulesService.create(
      {
        entityName: dto.entityName,
        ruleName: dto.ruleName,
        operation: dto.operation as any,
        jdmContent: dto.jdmContent,
      },
      user.id
    );
  }

  @Put(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update an existing rule (admin only)" })
  @ApiResponse({ status: 200, description: "Rule updated successfully" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      jdmContent?: string;
      isActive?: boolean;
    },
    @CurrentUser() user: { id: string }
  ) {
    return await this.rulesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a rule (admin only)' })
  @ApiResponse({ status: 200, description: 'Rule deactivated successfully' })
  async delete(@Param('id') id: string) {
    await this.rulesService.delete(id);
    return { message: 'Rule deactivated successfully' };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get rule version history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async history(@Param('id') id: string) {
    return await this.rulesService.getHistory(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate JDM content' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(@Body() dto: { jdm: string }) {
    return await this.rulesService.validateJDM(dto.jdm);
  }

  @Post('dry-run')
  @ApiOperation({ summary: 'Dry run rule with test context' })
  @ApiResponse({ status: 200, description: 'Dry run completed' })
  async dryRun(@Body() dto: { jdm?: string; context?: Record<string, unknown> }) {
    if (dto.jdm) {
      return await this.rulesService.dryRun(dto.jdm, dto.context || {});
    }

    return { success: false, errors: ['JDM content is required'] };
  }

  @Post("migrate")
  @Roles("admin")
  @ApiOperation({ summary: "Migrate rules from files to database (admin only)" })
  @ApiResponse({ status: 200, description: "Migration completed" })
  async migrate() {
    const result = await this.rulesService.migrateFromFileSystem();
    return {
      migrated: result.migrated,
      errors: result.errors,
      message: `Migrated ${result.migrated} rules from files to database`,
    };
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate business rules for an entity' })
  @ApiResponse({ status: 200, description: 'Rules evaluated successfully' })
  async evaluateRules(
    @Body()
    body: {
      entityType: string;
      data: Record<string, unknown>;
      action: 'create' | 'update' | 'delete';
    },
  ) {
    const results = await this.rulesService.evaluate(body.entityType, body.data, body.action);

    return {
      entityType: body.entityType,
      action: body.action,
      results,
    };
  }

  @Get("entities")
  @ApiOperation({ summary: "Get list of entities that have business rules configured" })
  @ApiResponse({ status: 200, description: "Entity list retrieved" })
  getEntitiesWithRules() {
    return {
      entities: [
        { entityType: "bus_company", entityName: "Company" },
        { entityType: "bus_contact", entityName: "Contact" },
        { entityType: "bus_deal", entityName: "Deal" },
        { entityType: "bus_deal_stage", entityName: "DealStage" },
        { entityType: "bus_pipeline", entityName: "Pipeline" },
        { entityType: "bus_activity", entityName: "Activity" },
        { entityType: "bus_note", entityName: "Note" },
        { entityType: "bus_task", entityName: "Task" },
        { entityType: "bus_email_message", entityName: "EmailMessage" },
        { entityType: "bus_email_template", entityName: "EmailTemplate" },
        { entityType: "bus_product", entityName: "Product" },
        { entityType: "bus_quote", entityName: "Quote" },
        { entityType: "bus_quote_item", entityName: "QuoteItem" },
        { entityType: "bus_user", entityName: "User" },
        { entityType: "bus_team", entityName: "Team" },
      ],
    };
  }
}
