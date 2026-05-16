/**
 * Rules Service - Database-Persistent Business Rules
 *
 * Provides CRUD operations for managing business rules in the database.
 * Integrates with GoRules Zen Engine for rule evaluation.
 *
 * Generated: 2026-05-16T05:41:09.466Z
 * Project: CRM Regenerated
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { InjectDatabase } from '../../database/database.service.decorator';
import { RulesEngine } from './rules-engine.service';
import type { RuleEvaluationResult } from './rules-engine.service';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface CreateRuleDto {
  entityName: string;
  ruleName: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ALL';
  jdmContent: string;
}

export interface UpdateRuleDto {
  jdmContent?: string;
  isActive?: boolean;
}

export interface Rule {
  id: string;
  entityName: string;
  ruleName: string;
  operation: string;
  jdmContent: string;
  version: number;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  constructor(
    private readonly rulesEngine: RulesEngine,
    @InjectDatabase() private readonly db: Kysely<any>,
  ) {}

  /**
   * Get all rules with optional filtering
   */
  async findAll(filters?: {
    entityName?: string;
    operation?: string;
    isActive?: boolean;
  }): Promise<Rule[]> {
    let query = this.db.selectFrom('sys_rule_definitions').selectAll();

    if (filters?.entityName) {
      query = query.where('entity_name', '=', filters.entityName);
    }

    if (filters?.operation) {
      query = query.where('operation', '=', filters.operation.toUpperCase());
    }

    if (filters?.isActive !== undefined) {
      query = query.where('is_active', '=', filters.isActive);
    }

    const rules = await query
      .orderBy('entity_name', 'asc')
      .orderBy('operation', 'asc')
      .orderBy('rule_name', 'asc')
      .execute();

    return rules.map((rule) => this.mapDbRuleToRule(rule));
  }

  /**
   * Get rule by ID
   */
  async findById(id: string): Promise<Rule> {
    const rule = await this.db
      .selectFrom('sys_rule_definitions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!rule) {
      throw new NotFoundException(`Rule with ID ${id} not found`);
    }

    return this.mapDbRuleToRule(rule);
  }

  /**
   * Create a new rule
   */
  async create(dto: CreateRuleDto, userId: string): Promise<Rule> {
    const existing = await this.db
      .selectFrom('sys_rule_definitions')
      .selectAll()
      .where('entity_name', '=', dto.entityName)
      .where('operation', '=', dto.operation)
      .where('rule_name', '=', dto.ruleName)
      .executeTakeFirst();

    if (existing) {
      throw new Error(
        `Rule ${dto.ruleName} already exists for ${dto.entityName}:${dto.operation}`
      );
    }

    const validation = await this.validateJDM(dto.jdmContent);
    if (!validation.valid) {
      throw new Error(`Invalid JDM content: ${validation.errors.join(', ')}`);
    }

    const rule = await this.db
      .insertInto('sys_rule_definitions')
      .values({
        entity_name: dto.entityName,
        rule_name: dto.ruleName,
        operation: dto.operation.toUpperCase(),
        jdm_content: dto.jdmContent,
        version: 1,
        is_active: true,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)
      .returningAll()
      .executeTakeFirst();

    this.logger.log(`Created rule ${rule.rule_name} for ${rule.entity_name}:${rule.operation}`);

    return this.mapDbRuleToRule(rule);
  }

  /**
   * Update an existing rule
   */
  async update(id: string, dto: UpdateRuleDto, userId: string): Promise<Rule> {
    const rule = await this.findById(id);

    if (dto.jdmContent) {
      const validation = await this.validateJDM(dto.jdmContent);
      if (!validation.valid) {
        throw new Error(`Invalid JDM content: ${validation.errors.join(', ')}`);
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
    };

    if (dto.jdmContent) {
      updateData.jdm_content = dto.jdmContent;
      updateData.version = rule.version + 1;
    }

    if (dto.isActive !== undefined) {
      updateData.is_active = dto.isActive;
    }

    const updated = await this.db
      .updateTable('sys_rule_definitions')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    this.logger.log(`Updated rule ${updated.rule_name} (version ${updated.version})`);

    return this.mapDbRuleToRule(updated);
  }

  /**
   * Delete a rule (soft delete by setting is_active = false)
   */
  async delete(id: string): Promise<void> {
    const rule = await this.findById(id);

    await this.db
      .updateTable('sys_rule_definitions')
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();

    this.logger.log(`Deactivated rule ${rule.ruleName}`);
  }

  /**
   * Get rule history (all versions of a rule)
   */
  async getHistory(ruleId: string): Promise<Rule[]> {
    return [await this.findById(ruleId)];
  }

  /**
   * Validate JDM content
   */
  async validateJDM(jdmContent: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const parsed = JSON.parse(jdmContent);

      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        return { valid: false, errors: ['JDM must have a nodes array'] };
      }

      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        return { valid: false, errors: ['JDM must have an edges array'] };
      }

      const engine = this.rulesEngine.getEngine();
      const decision = engine.createDecision(Buffer.from(jdmContent));
      await decision.evaluate({});

      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Dry run - evaluate rule with sample context
   */
  async dryRun(jdmContent: string, context: Record<string, unknown>): Promise<{
    success: boolean;
    result?: unknown;
    errors?: string[];
  }> {
    try {
      const engine = this.rulesEngine.getEngine();
      const decision = engine.createDecision(Buffer.from(jdmContent));
      const result = await decision.evaluate(context);

      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Migrate rules from JDM files to database
   */
  async migrateFromFileSystem(): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    const entityOperations = [
      { file: 'bus_company.jdm.json', entityName: 'bus_company', operation: 'CREATE' },
      { file: 'bus_contact.jdm.json', entityName: 'bus_contact', operation: 'CREATE' },
      { file: 'bus_deal.jdm.json', entityName: 'bus_deal', operation: 'CREATE' },
      { file: 'bus_deal_stage.jdm.json', entityName: 'bus_deal_stage', operation: 'CREATE' },
      { file: 'bus_pipeline.jdm.json', entityName: 'bus_pipeline', operation: 'CREATE' },
      { file: 'bus_activity.jdm.json', entityName: 'bus_activity', operation: 'CREATE' },
      { file: 'bus_note.jdm.json', entityName: 'bus_note', operation: 'CREATE' },
      { file: 'bus_task.jdm.json', entityName: 'bus_task', operation: 'CREATE' },
      { file: 'bus_email_message.jdm.json', entityName: 'bus_email_message', operation: 'CREATE' },
      { file: 'bus_email_template.jdm.json', entityName: 'bus_email_template', operation: 'CREATE' },
      { file: 'bus_product.jdm.json', entityName: 'bus_product', operation: 'CREATE' },
      { file: 'bus_quote.jdm.json', entityName: 'bus_quote', operation: 'CREATE' },
      { file: 'bus_quote_item.jdm.json', entityName: 'bus_quote_item', operation: 'CREATE' },
      { file: 'bus_user.jdm.json', entityName: 'bus_user', operation: 'CREATE' },
      { file: 'bus_team.jdm.json', entityName: 'bus_team', operation: 'CREATE' },
    ];

    for (const { file, entityName, operation } of entityOperations) {
      try {
        const jdmPath = join(__dirname, 'jdm', file);
        const jdmContent = readFileSync(jdmPath, 'utf-8');

        const parsed = JSON.parse(jdmContent);
        const ruleName = parsed.name || `${entityName}_${operation.toLowerCase()}_rule`;

        const existing = await this.db
          .selectFrom('sys_rule_definitions')
          .selectAll()
          .where('entity_name', '=', entityName)
          .where('operation', '=', operation)
          .where('rule_name', '=', ruleName)
          .executeTakeFirst();

        if (existing) {
          this.logger.log(`Rule ${ruleName} already exists, skipping migration`);
          continue;
        }

        await this.create(
          {
            entityName,
            ruleName,
            operation: operation as CreateRuleDto['operation'],
            jdmContent,
          },
          'system-migration'
        );

        migrated++;
        this.logger.log(`Migrated rule ${ruleName} from ${file}`);
      } catch (error) {
        const errorMsg = `Failed to migrate ${file}: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { migrated, errors };
  }

  /**
   * Validate data against business rules
   */
  async validate(
    entityType: string,
    data: Record<string, unknown>,
    action: 'create' | 'update' | 'delete' = 'create',
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const rule = await this.db
      .selectFrom('sys_rule_definitions')
      .selectAll()
      .where('entity_name', '=', entityType)
      .where('operation', '=', action.toUpperCase())
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!rule) {
      return { valid: true, errors: [], warnings: [] };
    }

    const results = await this.rulesEngine.evaluateRulesWithJDM(
      entityType,
      rule.jdm_content,
      data,
      action
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const result of results) {
      if (!result.matched) continue;

      for (const ruleAction of result.actions) {
        if (ruleAction.type === 'prevent') {
          const message = ruleAction.config.message as string | undefined;
          errors.push(message || `Rule violation: ${result.ruleName}`);
        } else if (ruleAction.type === 'validate') {
          const message = ruleAction.config.message as string | undefined;
          warnings.push(message || `Validation warning: ${result.ruleName}`);
        } else if (ruleAction.type === 'notify') {
          warnings.push(`Notification: ${result.ruleName}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute rules and return results
   */
  async evaluate(
    entityType: string,
    data: Record<string, unknown>,
    action: 'create' | 'update' | 'delete' = 'create',
  ): Promise<RuleEvaluationResult[]> {
    const rule = await this.db
      .selectFrom('sys_rule_definitions')
      .selectAll()
      .where('entity_name', '=', entityType)
      .where('operation', '=', action.toUpperCase())
      .where('is_active', '=', true)
      .executeTakeFirst();

    if (!rule) {
      return [];
    }

    return this.rulesEngine.evaluateRulesWithJDM(
      entityType,
      rule.jdm_content,
      data,
      action
    );
  }

  private mapDbRuleToRule(record: Record<string, unknown>): Rule {
    return {
      id: record.id as string,
      entityName: record.entity_name as string,
      ruleName: record.rule_name as string,
      operation: record.operation as string,
      jdmContent: record.jdm_content as string,
      version: record.version as number,
      isActive: record.is_active as boolean,
      createdBy: record.created_by as string,
      updatedBy: record.updated_by as string | undefined,
      createdAt: record.created_at as Date,
      updatedAt: record.updated_at as Date,
    };
  }
}
