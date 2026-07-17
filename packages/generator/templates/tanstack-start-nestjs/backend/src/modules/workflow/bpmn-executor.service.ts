/**
 * BPMN Executor Service
 *
 * Parses BPMN XML produced by the bpmn-js designer and executes each
 * ServiceTask node inside an existing pg transaction.
 *
 * Node types (stored as extensionElements on each ServiceTask):
 *   UpdateEntity  — update a column on an entity row from decision context
 *   CreateEntity  — insert a new entity row
 *   Formula       — evaluate a simple expression and store result in vars
 *   REST          — call an external HTTP endpoint
 *   Agent         — placeholder for AI agent invocation
 */

import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import type pg from 'pg';

export interface WorkflowContext {
  entityId: string;
  entityName: string;
  entityData: Record<string, unknown>;
  decision: Record<string, unknown>;
  vars: Record<string, unknown>;
  client: pg.PoolClient;
}

export interface BpmnExecutionResult {
  success: boolean;
  nodesExecuted: number;
  errors: string[];
}

@Injectable()
export class BpmnExecutorService {
  private readonly logger = new Logger(BpmnExecutorService.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (tagName) =>
      ['bpmn:serviceTask', 'bpmn:sequenceFlow', 'bpmn:startEvent', 'bpmn:endEvent',
       'erdwithai:property', 'bpmn:extensionElements'].includes(tagName),
  });

  async execute(bpmnXml: string, ctx: WorkflowContext): Promise<BpmnExecutionResult> {
    const errors: string[] = [];
    let nodesExecuted = 0;

    try {
      const tasks = this.extractOrderedTasks(bpmnXml);
      this.logger.log(`BPMN executor: ${tasks.length} task(s) for ${ctx.entityName}:${ctx.entityId}`);

      for (const task of tasks) {
        try {
          await this.executeNode(task, ctx);
          nodesExecuted++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Node "${task.name || task.id}" (${task.nodeType}): ${msg}`);
          this.logger.warn(`BPMN node failed: ${msg}`);
          break; // stop on first error; caller rolls back transaction
        }
      }
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      errors.push(`BPMN parse error: ${msg}`);
    }

    return { success: errors.length === 0, nodesExecuted, errors };
  }

  // ── Parsing ────────────────────────────────────────────────────────────────

  private extractOrderedTasks(bpmnXml: string): BpmnTask[] {
    const parsed = this.parser.parse(bpmnXml);
    const definitions = parsed['bpmn:definitions'] ?? parsed.definitions;
    if (!definitions) throw new Error('No bpmn:definitions root found');

    const process =
      definitions['bpmn:process'] ??
      (Array.isArray(definitions.process) ? definitions.process[0] : definitions.process);
    if (!process) throw new Error('No bpmn:process found');

    const serviceTasks: any[] = Array.isArray(process['bpmn:serviceTask'])
      ? process['bpmn:serviceTask']
      : process['bpmn:serviceTask']
      ? [process['bpmn:serviceTask']]
      : [];

    const flows: any[] = Array.isArray(process['bpmn:sequenceFlow'])
      ? process['bpmn:sequenceFlow']
      : process['bpmn:sequenceFlow']
      ? [process['bpmn:sequenceFlow']]
      : [];

    const startEvents: any[] = Array.isArray(process['bpmn:startEvent'])
      ? process['bpmn:startEvent']
      : process['bpmn:startEvent']
      ? [process['bpmn:startEvent']]
      : [];

    const nextOf: Record<string, string> = {};
    for (const f of flows) nextOf[f['@_sourceRef']] = f['@_targetRef'];

    const taskById: Record<string, any> = {};
    for (const t of serviceTasks) taskById[t['@_id']] = t;

    const startId = startEvents[0]?.['@_id'];
    const ordered: BpmnTask[] = [];
    let currentId = startId ? nextOf[startId] : undefined;

    while (currentId && taskById[currentId]) {
      ordered.push(this.parseTask(taskById[currentId]));
      currentId = nextOf[currentId];
    }

    // Fallback: document order if no flow resolves
    if (ordered.length === 0 && serviceTasks.length > 0) {
      return serviceTasks.map((t) => this.parseTask(t));
    }

    return ordered;
  }

  private parseTask(raw: any): BpmnTask {
    const props: Record<string, string> = {};
    const ext = raw['bpmn:extensionElements'];
    const extArr = Array.isArray(ext) ? ext : ext ? [ext] : [];

    for (const e of extArr) {
      const propList =
        e['erdwithai:properties']?.['erdwithai:property'] ??
        e['erdwithai:property'] ?? [];
      const arr = Array.isArray(propList) ? propList : [propList];
      for (const p of arr) {
        if (p['@_name']) props[p['@_name']] = p['#text'] ?? p['@_value'] ?? '';
      }
    }

    return {
      id: raw['@_id'],
      name: raw['@_name'] ?? '',
      nodeType: props['nodeType'] ?? 'Unknown',
      properties: props,
    };
  }

  // ── Node execution ─────────────────────────────────────────────────────────

  private async executeNode(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    this.logger.debug(`Executing node ${task.nodeType} "${task.name}"`);

    switch (task.nodeType) {
      case 'UpdateEntity': return this.execUpdateEntity(task, ctx);
      case 'CreateEntity': return this.execCreateEntity(task, ctx);
      case 'Formula':      return this.execFormula(task, ctx);
      case 'REST':         return this.execRest(task, ctx);
      case 'Agent':        return this.execAgent(task, ctx);
      default:
        this.logger.warn(`Unknown node type "${task.nodeType}" — skipping`);
    }
  }

  private async execUpdateEntity(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    const { entity, field, source, value } = task.properties;
    if (!field) throw new Error('UpdateEntity requires "field" property');

    const tableName = entity
      ? (entity.startsWith('bus_') ? entity : `bus_${entity}`)
      : `bus_${ctx.entityName.replace(/^bus_/, '')}`;

    const resolvedValue =
      source && ctx.decision[source] !== undefined ? ctx.decision[source] :
      source && ctx.vars[source] !== undefined    ? ctx.vars[source] :
      value;

    await ctx.client.query(
      `UPDATE "${tableName}" SET "${field}" = $1, updated_at = NOW() WHERE id = $2`,
      [resolvedValue, ctx.entityId],
    );
    this.logger.debug(`UpdateEntity: ${tableName}.${field} = ${resolvedValue}`);
  }

  private async execCreateEntity(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    const { entity, fields } = task.properties;
    if (!entity) throw new Error('CreateEntity requires "entity" property');

    const tableName = entity.startsWith('bus_') ? entity : `bus_${entity}`;
    let fieldMap: Record<string, unknown> = {};

    if (fields) {
      try {
        const parsed = JSON.parse(fields) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) {
          fieldMap[k] =
            ctx.decision[v] !== undefined ? ctx.decision[v] :
            ctx.vars[v] !== undefined ? ctx.vars[v] :
            ctx.entityData[v] !== undefined ? ctx.entityData[v] : v;
        }
      } catch {
        throw new Error('CreateEntity "fields" must be valid JSON');
      }
    }

    const keys = Object.keys(fieldMap);
    if (keys.length === 0) throw new Error('CreateEntity "fields" is empty');

    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    await ctx.client.query(
      `INSERT INTO "${tableName}" (${cols}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`,
      keys.map((k) => fieldMap[k]),
    );
  }

  private execFormula(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    const { target, source, operation, operand } = task.properties;
    if (!target) throw new Error('Formula requires "target" property');
    if (!source) throw new Error('Formula requires "source" property');

    const baseVal = Number(ctx.decision[source] ?? ctx.vars[source] ?? ctx.entityData[source] ?? 0);
    const operandVal = Number(operand ?? 0);

    let result: number;
    switch (operation) {
      case 'multiply': result = baseVal * operandVal; break;
      case 'divide':   result = operandVal !== 0 ? baseVal / operandVal : 0; break;
      case 'add':      result = baseVal + operandVal; break;
      case 'subtract': result = baseVal - operandVal; break;
      default:         result = baseVal;
    }

    ctx.vars[target] = result;
    this.logger.debug(`Formula: ${target} = ${result}`);
    return Promise.resolve();
  }

  private async execRest(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    const { url, method = 'POST', bodyTemplate } = task.properties;
    if (!url) throw new Error('REST requires "url" property');

    let body: string;
    if (bodyTemplate) {
      body = bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const val = ctx.decision[key] ?? ctx.vars[key] ?? ctx.entityData[key] ?? '';
        return String(val);
      });
    } else {
      body = JSON.stringify({ entityId: ctx.entityId, decision: ctx.decision });
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      throw new Error(`REST ${method} ${url} returned ${response.status}`);
    }

    ctx.vars['_restResponse'] = await response.text();
  }

  private execAgent(task: BpmnTask, ctx: WorkflowContext): Promise<void> {
    const { agentId } = task.properties;
    this.logger.warn(`Agent node "${agentId}" skipped — Mastra integration pending`);
    return Promise.resolve();
  }
}

interface BpmnTask {
  id: string;
  name: string;
  nodeType: string;
  properties: Record<string, string>;
}
