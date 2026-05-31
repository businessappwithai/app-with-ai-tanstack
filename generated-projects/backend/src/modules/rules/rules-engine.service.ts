/**
 * Business Rules Engine Service — GoRules (zen-engine)
 *
 * Evaluates business rules using the GoRules zen-engine and
 * JSON Decision Model (JDM) files stored in ./jdm/.
 *
 * Each entity type maps to a dedicated JDM file:
 *   bus_company  → jdm/bus_company.jdm.json
 *   bus_contact  → jdm/bus_contact.jdm.json
 *   bus_deal  → jdm/bus_deal.jdm.json
 *   bus_deal_stage  → jdm/bus_deal_stage.jdm.json
 *   bus_pipeline  → jdm/bus_pipeline.jdm.json
 *   bus_activity  → jdm/bus_activity.jdm.json
 *   bus_note  → jdm/bus_note.jdm.json
 *   bus_task  → jdm/bus_task.jdm.json
 *   bus_email_message  → jdm/bus_email_message.jdm.json
 *   bus_email_template  → jdm/bus_email_template.jdm.json
 *   bus_product  → jdm/bus_product.jdm.json
 *   bus_quote  → jdm/bus_quote.jdm.json
 *   bus_quote_item  → jdm/bus_quote_item.jdm.json
 *   bus_user  → jdm/bus_user.jdm.json
 *   bus_team  → jdm/bus_team.jdm.json
 *
 * Decision tables use hitPolicy "collect" so all matching rows are
 * returned, enabling multiple validation errors in a single call.
 *
 * Generated: 2026-05-31T11:58:03.738Z
 * Project: crm-app
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ZenEngine } from '@gorules/zen-engine';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface RuleAction {
  type: 'validate' | 'notify' | 'prevent' | 'transform';
  config: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  actions: RuleAction[];
  errors?: string[];
}

/** Shape of each output row returned by a GoRules decision table */
interface JdmViolation {
  action: string;
  message: string;
  ruleId: string;
  rule_id?: string;
}

@Injectable()
export class RulesEngine implements OnModuleDestroy {
  private readonly logger = new Logger(RulesEngine.name);

  /** Single ZenEngine instance — thread-safe, reused across requests */
  private readonly engine: ZenEngine;

  /** Maps entity type names to their JDM file names */
  private readonly jdmFiles: Record<string, string> = {
    bus_company: 'bus_company.jdm.json',
    bus_contact: 'bus_contact.jdm.json',
    bus_deal: 'bus_deal.jdm.json',
    bus_deal_stage: 'bus_deal_stage.jdm.json',
    bus_pipeline: 'bus_pipeline.jdm.json',
    bus_activity: 'bus_activity.jdm.json',
    bus_note: 'bus_note.jdm.json',
    bus_task: 'bus_task.jdm.json',
    bus_email_message: 'bus_email_message.jdm.json',
    bus_email_template: 'bus_email_template.jdm.json',
    bus_product: 'bus_product.jdm.json',
    bus_quote: 'bus_quote.jdm.json',
    bus_quote_item: 'bus_quote_item.jdm.json',
    bus_user: 'bus_user.jdm.json',
    bus_team: 'bus_team.jdm.json',
  };

  constructor() {
    this.engine = new ZenEngine();
  }

  /** Release native resources when the NestJS module shuts down */
  onModuleDestroy(): void {
    this.engine.dispose();
  }

  /** Get the ZenEngine instance for external use */
  getEngine(): ZenEngine {
    return this.engine;
  }

  /**
   * Evaluate rules with provided JDM content (from database)
   */
  async evaluateRulesWithJDM(
    entityType: string,
    jdmContent: string,
    data: Record<string, unknown>,
    action: 'create' | 'update' | 'delete',
  ): Promise<RuleEvaluationResult[]> {
    this.logger.log(`Evaluating rules for ${entityType}:${action}`);

    try {
      const decision = this.engine.createDecision(Buffer.from(jdmContent));
      const result = await decision.evaluate({ ...data, action });

      let violations: JdmViolation[] = [];

      if (Array.isArray(result.result)) {
        violations = result.result as JdmViolation[];
      } else if (result.result && typeof result.result === 'object') {
        violations = [result.result as JdmViolation];
      }

      return violations.map((v) => ({
        ruleId: v.ruleId || v.rule_id || 'unknown',
        ruleName: v.ruleId || v.rule_id || 'unknown',
        matched: true,
        actions: [
          {
            type: v.action as RuleAction['type'],
            config: { message: v.message },
          },
        ],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error evaluating rules for ${entityType}: ${message}`);
      return [
        {
          ruleId: 'engine-error',
          ruleName: 'Rules Engine Error',
          matched: false,
          actions: [],
          errors: [message],
        },
      ];
    }
  }

  /**
   * Evaluate all rules for a given entity type and action.
   *
   * @param entityType  The bus_ table name (e.g. 'bus_patient')
   * @param data        The entity data to validate
   * @param action      The CRUD operation being performed
   * @returns           Array of matched rule results (empty if no violations)
   */
  async evaluateRules(
    entityType: string,
    data: Record<string, unknown>,
    action: 'create' | 'update' | 'delete',
  ): Promise<RuleEvaluationResult[]> {
    this.logger.log(`Evaluating rules for ${entityType}:${action}`);

    const jdmFile = this.jdmFiles[entityType];
    if (!jdmFile) {
      this.logger.debug(`No JDM rules configured for entity: ${entityType}`);
      return [];
    }

    const jdmPath = join(__dirname, 'jdm', jdmFile);
    let content: Buffer;
    try {
      content = readFileSync(jdmPath);
    } catch {
      this.logger.warn(`JDM file not found for ${entityType}: ${jdmPath}`);
      return [];
    }

    let violations: JdmViolation[] = [];
    try {
      const decision = this.engine.createDecision(content);
      const result = await decision.evaluate({ ...data, action });

      // hitPolicy "collect" returns an array; single-match returns an object or null
      if (Array.isArray(result.result)) {
        violations = result.result as JdmViolation[];
      } else if (result.result && typeof result.result === 'object') {
        violations = [result.result as JdmViolation];
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error evaluating rules for ${entityType}: ${message}`);
      return [
        {
          ruleId: 'engine-error',
          ruleName: 'Rules Engine Error',
          matched: false,
          actions: [],
          errors: [message],
        },
      ];
    }

    return violations.map((v) => ({
      ruleId: v.ruleId,
      ruleName: v.ruleId,
      matched: true,
      actions: [
        {
          type: v.action as RuleAction['type'],
          config: { message: v.message },
        },
      ],
    }));
  }
}
