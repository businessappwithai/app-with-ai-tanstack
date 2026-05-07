/**
 * Entity Lifecycle Workflow - Trigger.dev v3 Task
 *
 * Orchestrates entity lifecycle events with GoRules Zen Engine:
 * 1. Load entity + related entities from database
 * 2. Load JDM rule from sys_rule_definitions table
 * 3. Execute @gorules/zen-engine with JSON context
 * 4. Parse output mutations
 * 5. Apply mutations in DB transaction (set status: success)
 * 6. Write sys_workflow_runs record
 * 7. Handle errors (set status: error)
 *
 * This workflow runs asynchronously after CRUD operations.
 *
 * Generated: 2026-05-07T09:31:28.408Z
 * Project: crm-app
 */

import { task } from '@trigger.dev/sdk/v3';
import Knex, { type Knex as KnexType } from 'knex';
import { ZenEngine } from '@gorules/zen-engine';

// Initialize database connection
const dbClient = process.env.DATABASE_CLIENT || 'better-sqlite3';
const knexConfig =
  dbClient === 'better-sqlite3'
    ? {
        client: 'better-sqlite3',
        connection: { filename: process.env.DATABASE_FILENAME || './data/.db' },
        useNullAsDefault: true,
      }
    : {
        client: 'pg',
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || '',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
        },
      };
const knex = Knex(knexConfig);

// Create ZenEngine instance
const zenEngine = new ZenEngine();

export interface EntityLifecycleWorkflowPayload {
  workflowRunId: string;
  entityName: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  userId: string;
}

export const entityLifecycleWorkflow = task({
  id: 'entity-lifecycle-workflow',
  maxDuration: 300, // 5 minutes max
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: EntityLifecycleWorkflowPayload, { ctx: _ctx }) => {
    const { workflowRunId, entityName, entityId, operation, userId: _userId } = payload;

    console.log(`[Workflow] Starting workflow ${workflowRunId} for ${entityName}:${entityId}`);

    const startTime = Date.now();

    try {
      // Step 1: Load entity with relations
      const entityWithContext = await loadEntityWithContext(knex, entityName, entityId);

      // Step 2: Load rule from sys_rule_definitions
      const rule = await knex('sys_rule_definitions')
        .where({
          entity_name: entityName,
          operation: operation.toUpperCase(),
          is_active: true,
        })
        .first();

      if (!rule) {
        console.log(`[Workflow] No rule found for ${entityName}:${operation}, marking as success`);

        // No rule defined, just mark as success
        await knex.transaction(async (trx) => {
          await trx(entityName).where('id', entityId).update({ workflow_status: 'success' });

          await trx('sys_workflow_runs')
            .where('id', workflowRunId)
            .update({
              status: 'success',
              output_payload: JSON.stringify({ message: 'No rule defined' }),
              completed_at: new Date(),
              duration_ms: Date.now() - startTime,
            });
        });

        return {
          success: true,
          message: 'No rule defined',
          workflowRunId,
        };
      }

      console.log(`[Workflow] Loaded rule ${rule.rule_name} (${rule.id})`);

      // Step 3: Execute Zen Engine
      console.log(`[Workflow] Evaluating rules for ${entityName}...`);
      const violations = await evaluateRules(zenEngine, rule.jdm_content, {
        ...entityWithContext.entity,
        action: operation,
      });

      console.log(`[Workflow] Rules evaluated: ${violations.length} violations found`);

      // Step 4: Apply mutations in transaction
      const mutations = {
        violations: violations.map((v) => ({
          ruleId: v.ruleId,
          actions: v.actions,
        })),
        entity: {} as Record<string, unknown>,
        relations: {},
      };

      await knex.transaction(async (trx) => {
        // If any violations with action="prevent", fail the workflow
        const preventViolations = violations.filter((v) =>
          v.actions.some((a) => a.type === 'prevent'),
        );

        if (preventViolations.length > 0) {
          const errors = preventViolations.map((v) => ({
            ruleId: v.ruleId,
            message:
              v.actions.find((a) => a.type === 'prevent')?.config?.message || 'Validation failed',
          }));

          await trx(entityName).where('id', entityId).update({ workflow_status: 'error' });

          await trx('sys_workflow_runs')
            .where('id', workflowRunId)
            .update({
              status: 'error',
              error_details: JSON.stringify(errors),
              completed_at: new Date(),
              duration_ms: Date.now() - startTime,
            });

          throw new Error(`Rule validation failed: ${errors.map((e) => e.message).join(', ')}`);
        }

        // Extract entity mutations from violations (transform actions)
        violations.forEach((v) => {
          v.actions.forEach((action) => {
            if (action.type === 'transform' && action.config?.field && action.config?.value) {
              mutations.entity[action.config.field as string] = action.config.value;
            }
          });
        });

        // Apply entity mutations
        if (Object.keys(mutations.entity).length > 0) {
          console.log(`[Workflow] Applying mutations:`, mutations.entity);
          await trx(entityName).where('id', entityId).update(mutations.entity);
        }

        // Update workflow status to success
        await trx(entityName).where('id', entityId).update({ workflow_status: 'success' });

        // Update workflow run record
        await trx('sys_workflow_runs')
          .where('id', workflowRunId)
          .update({
            status: 'success',
            output_payload: JSON.stringify({ violations }),
            mutations_applied: JSON.stringify(mutations),
            completed_at: new Date(),
            duration_ms: Date.now() - startTime,
          });
      });

      console.log(`[Workflow] Completed successfully for ${entityName}:${entityId}`);

      return {
        success: true,
        workflowRunId,
        violations,
        mutationsApplied: Object.keys(mutations.entity).length,
      };
    } catch (error) {
      console.error(`[Workflow] Failed for ${entityName}:${entityId}:`, error);

      // Update workflow with error
      await knex.transaction(async (trx) => {
        await trx(entityName).where('id', entityId).update({ workflow_status: 'error' });

        await trx('sys_workflow_runs')
          .where('id', workflowRunId)
          .update({
            status: 'error',
            error_details: error instanceof Error ? error.message : String(error),
            completed_at: new Date(),
            duration_ms: Date.now() - startTime,
          });
      });

      throw error; // Re-throw to trigger retry
    }
  },
});

/**
 * Load entity with related data
 */
async function loadEntityWithContext(
  knex: KnexType,
  entityName: string,
  entityId: string,
): Promise<{ entity: Record<string, unknown>; relations: Record<string, unknown> }> {
  const entity = await knex(entityName).where('id', entityId).first();

  if (!entity) {
    throw new Error(`Entity ${entityName}:${entityId} not found`);
  }

  return {
    entity,
    relations: {},
  };
}

/**
 * Evaluate rules using Zen Engine
 */
async function evaluateRules(
  engine: ZenEngine,
  jdmContent: string,
  context: Record<string, unknown>,
): Promise<
  Array<{
    ruleId: string;
    matched: boolean;
    actions: Array<{ type: string; config: Record<string, unknown> }>;
  }>
> {
  try {
    const decision = engine.createDecision(Buffer.from(JSON.stringify(jdmContent)));
    const result = await decision.evaluate(context);

    let violations: any[] = [];

    if (Array.isArray(result.result)) {
      violations = result.result;
    } else if (result.result && typeof result.result === 'object') {
      violations = [result.result];
    }

    return violations.map((v: any) => ({
      ruleId: v.ruleId || v.rule_id || 'unknown',
      matched: true,
      actions: [
        {
          type: v.action || v.action_type || 'notify',
          config: { message: v.message || v.error_details },
        },
      ],
    }));
  } catch (error) {
    console.error('[Workflow] Error evaluating rules:', error);
    throw error;
  }
}
