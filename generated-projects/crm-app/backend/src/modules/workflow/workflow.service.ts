/**
 * Workflow Service - Trigger.dev Integration
 *
 * Orchestrates background workflows for entity lifecycle events.
 * Integrates with Zen Engine for rule evaluation and applies mutations.
 *
 * Workflow flow:
 * 1. Entity CRUD operation creates workflow record (status: draft)
 * 2. Trigger.dev workflow task is triggered (async)
 * 3. Workflow loads entity + relations
 * 4. Workflow loads rules from sys_rule_definitions
 * 5. Zen Engine evaluates rules
 * 6. Mutations applied in DB transaction
 * 7. Workflow record updated (status: success/error)
 *
 * Generated: 2026-05-12T11:38:40.016Z
 * Project: crm-app
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { InjectDatabase } from '../../database/database.service.decorator';
import { entityLifecycleWorkflow } from '../../trigger/entity-lifecycle-workflow.task';

export interface TriggerWorkflowDto {
  entityName: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  userId: string;
}

export interface WorkflowStatus {
  status: 'draft' | 'success' | 'error';
  completedAt?: Date;
  error?: string;
  mutationsApplied?: Record<string, unknown>;
  durationMs?: number;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectDatabase() private readonly db: Kysely<any>,
  ) {}

  /**
   * Trigger an entity lifecycle workflow.
   * Creates workflow run record and fires Trigger.dev event.
   *
   * @param dto Workflow trigger payload
   * @returns Trigger.dev run ID
   */
  async trigger(dto: TriggerWorkflowDto): Promise<string> {
    this.logger.log(
      `Triggering workflow for ${dto.entityName}:${dto.entityId} (${dto.operation})`
    );

    // Create workflow run record
    const workflowRun = await this.db
      .insertInto('sys_workflow_runs')
      .values({
        entity_name: dto.entityName,
        entity_id: dto.entityId,
        operation: dto.operation,
        status: 'draft',
        created_by: dto.userId,
      } as any)
      .returningAll()
      .executeTakeFirst();

    // Set entity workflow_status to draft
    await this.db
      .updateTable(dto.entityName as any)
      .set({
        workflow_status: 'draft',
        workflow_run_id: workflowRun.id,
      } as any)
      .where('id', '=', dto.entityId)
      .execute();

    // Trigger async workflow in Trigger.dev
    const handle = await entityLifecycleWorkflow.trigger({
      workflowRunId: workflowRun.id,
      entityName: dto.entityName,
      entityId: dto.entityId,
      operation: dto.operation,
      userId: dto.userId,
    });

    this.logger.log(
      `Workflow ${handle.id} triggered for ${dto.entityName}:${dto.entityId}`
    );

    return handle.id;
  }

  /**
   * Get workflow status by run ID.
   *
   * @param runId Workflow run ID
   * @returns Workflow status
   */
  async getStatus(runId: string): Promise<WorkflowStatus> {
    const workflowRun = await this.db
      .selectFrom('sys_workflow_runs')
      .selectAll()
      .where('id', '=', runId)
      .executeTakeFirst();

    if (!workflowRun) {
      throw new Error(`Workflow run ${runId} not found`);
    }

    return {
      status: workflowRun.status,
      completedAt: workflowRun.completed_at,
      error: workflowRun.error_details,
      mutationsApplied: workflowRun.mutations_applied
        ? JSON.parse(workflowRun.mutations_applied as string)
        : undefined,
      durationMs: workflowRun.duration_ms,
    };
  }

  /**
   * Retry a failed workflow.
   *
   * @param workflowRunId Original workflow run ID
   * @returns New workflow run ID
   */
  async retry(workflowRunId: string): Promise<string> {
    const workflowRun = await this.db
      .selectFrom('sys_workflow_runs')
      .selectAll()
      .where('id', '=', workflowRunId)
      .executeTakeFirst();

    if (!workflowRun) {
      throw new Error(`Workflow run ${workflowRunId} not found`);
    }

    // Reset entity workflow_status to none
    await this.db
      .updateTable(workflowRun.entity_name as any)
      .set({
        workflow_status: 'none',
        workflow_run_id: null,
      } as any)
      .where('id', '=', workflowRun.entity_id)
      .execute();

    // Trigger new workflow
    return await this.trigger({
      entityName: workflowRun.entity_name,
      entityId: workflowRun.entity_id,
      operation: workflowRun.operation,
      userId: workflowRun.created_by,
    });
  }

  /**
   * Get recent workflow runs for an entity.
   *
   * @param entityName Entity table name
   * @param entityId Entity ID
   * @param limit Number of runs to return
   * @returns Workflow runs
   */
  async getEntityWorkflows(
    entityName: string,
    entityId: string,
    limit = 10
  ) {
    return await this.db
      .selectFrom('sys_workflow_runs')
      .selectAll()
      .where('entity_name', '=', entityName)
      .where('entity_id', '=', entityId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * Get all workflow runs with optional filters.
   *
   * @param filters Optional filters
   * @returns Workflow runs
   */
  async getAllWorkflows(filters?: {
    status?: 'draft' | 'success' | 'error';
    entityName?: string;
    limit?: number;
  }) {
    let query = this.db.selectFrom('sys_workflow_runs').selectAll();

    if (filters?.status) {
      query = query.where('status', '=', filters.status);
    }

    if (filters?.entityName) {
      query = query.where('entity_name', '=', filters.entityName);
    }

    const limit = filters?.limit ?? 100;

    return await query.orderBy('created_at', 'desc').limit(limit).execute();
  }
}
