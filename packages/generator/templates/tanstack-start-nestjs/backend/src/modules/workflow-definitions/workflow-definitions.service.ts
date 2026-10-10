import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { type Kysely, sql } from "kysely";
import { InjectDatabase } from "../../database/database.service.decorator";
import { compileAutomationBpmn, tableForEntity } from "./automation-compiler";

export type WorkflowDefinitionDto = {
  name: string;
  entityName: string;
  operation: "CREATE" | "UPDATE" | "DELETE" | "ALL";
  /** BPMN diagrams carry XML; automations carry mermaid. Exactly one is required. */
  bpmnXml?: string;
  /** Mermaid with `%%` directives, as the automation builder writes it. */
  mermaid?: string;
  /**
   * "bpmn", "automation", or "state". Defaults to bpmn, which is what every older row is.
   * A "state" definition is a status machine: it is never run, it is the diagram its
   * edges were read from, and saving it replaces the entity's `sys_workflow_transitions`.
   */
  kind?: "bpmn" | "automation" | "state";
  /** The column a status machine moves. Defaults to `status`. */
  statusField?: string;
  /** The edges of a status machine, as the editor drew them. */
  transitions?: Array<{ from: string; to: string; name?: string }>;
  description?: string;
  isActive?: boolean;
  /**
   * How the definition is reached.
   *   automatic  run on every write matching entityName + operation
   *   rule       run only when a rule's trigger-workflow action names it
   * Defaults to automatic, which is what an unmarked definition has always done.
   */
  triggerType?: "automatic" | "rule";
};

/**
 * Content fields a model-owned definition will not accept through the API.
 *
 * `isActive` is deliberately absent: switching a workflow off is an operational
 * decision an admin should be able to take without editing the model. The next
 * generation turns it back on, which is the honest outcome — the model says it
 * should be running.
 */
const MODEL_OWNED_FIELDS = [
  "name",
  "entityName",
  "operation",
  "bpmnXml",
  "mermaid",
  "description",
  "triggerType",
  "transitions",
] as const;

@Injectable()
export class WorkflowDefinitionsService {
  constructor(@InjectDatabase() private readonly db: Kysely<any>) {}

  /**
   * A page of definitions, newest first.
   *
   * Paged rather than unbounded: an app that has been running a while
   * accumulates definitions faster than anyone deletes them, and a list
   * endpoint that returns all of them eventually times out the page that
   * depends on it. 200 is the default because it fills the longest rail the
   * builder draws without a second request.
   */
  async findAll(filters?: {
    entityName?: string;
    operation?: string;
    isActive?: boolean;
    kind?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(filters?.limit ?? 200, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);

    const where = <T extends { where: any }>(q: T): T => {
      let query: any = q;
      if (filters?.entityName) query = query.where("entity_name", "=", filters.entityName);
      if (filters?.operation) query = query.where("operation", "=", filters.operation);
      if (filters?.isActive !== undefined) query = query.where("is_active", "=", filters.isActive);
      if (filters?.kind) query = query.where("kind", "=", filters.kind);
      return query as T;
    };

    const items = await where(this.db.selectFrom("sys_workflow_definitions").selectAll())
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    const counted = await where(
      this.db
        .selectFrom("sys_workflow_definitions")
        .select((eb: any) => eb.fn.countAll().as("total"))
    ).executeTakeFirst();

    const total = Number((counted as { total?: number | string })?.total ?? items.length);
    return { items, total, limit, offset, hasMore: offset + items.length < total };
  }

  async findOne(id: string) {
    const def = await this.db
      .selectFrom("sys_workflow_definitions")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!def) throw new NotFoundException(`Workflow definition ${id} not found`);
    return def;
  }

  async findActiveForEntity(entityName: string, operation: string) {
    // Match definitions stored under either the singular base name (e.g. 'account')
    // or the full bus_ table name (e.g. 'bus_account').
    const flat = entityName.toLowerCase().replace(/^bus_/, "").replace(/_/g, "");
    return this.db
      .selectFrom("sys_workflow_definitions")
      .selectAll()
      .where((eb) => eb(sql<string>`replace(lower(entity_name), '_', '')`, "in", [flat, `bus${flat}`]))
      .where((eb) =>
        eb.or([eb("operation", "=", operation.toUpperCase()), eb("operation", "=", "ALL")])
      )
      .where("is_active", "=", true)
      .orderBy("created_at", "asc")
      .execute();
  }

  async create(dto: WorkflowDefinitionDto, userId?: string) {
    // A definition is either a BPMN diagram or a mermaid automation. Demanding
    // BPMN of both is what stopped the automation builder saving anything.
    const kind = dto.kind ?? (dto.mermaid?.trim() ? "automation" : "bpmn");

    if (kind === "state") {
      if (!dto.mermaid?.trim()) throw new BadRequestException("mermaid is required");
      await this.assertStateMachineFree(dto.entityName);
      await this.writeTransitions(dto);
    } else if (kind === "automation") {
      if (!dto.mermaid?.trim()) throw new BadRequestException("mermaid is required");
      if (!/^\s*(flowchart|graph)\b/m.test(dto.mermaid)) {
        throw new BadRequestException("An automation must be a mermaid flowchart");
      }
    } else {
      if (!dto.bpmnXml?.trim()) throw new BadRequestException("bpmnXml is required");
      if (!dto.bpmnXml.includes("<bpmn:")) throw new BadRequestException("Invalid BPMN XML");
    }

    const [result] = await this.db
      .insertInto("sys_workflow_definitions")
      .values({
        name: dto.name,
        entity_name: dto.entityName,
        operation: kind === "state" ? "UPDATE" : (dto.operation ?? "ALL"),
        // An automation built in the application stores its flowchart; what the
        // executor runs is the BPMN compiled from it, written here so that
        // publishing the automation is what makes it do something.
        bpmn_xml:
          kind === "state" ? null : dto.bpmnXml ??
          (kind === "automation" && dto.mermaid
            ? compileAutomationBpmn(dto.mermaid, tableForEntity(dto.entityName), tableForEntity)
            : null),
        mermaid_code: dto.mermaid ?? null,
        kind,
        description: dto.description ?? null,
        trigger_type: dto.triggerType ?? "automatic",
        // Anything created through the API was built in the app, so the model
        // seed leaves it alone.
        source: "designer",
        is_active: dto.isActive ?? true,
        created_by: userId ?? null,
      } as any)
      .returningAll()
      .execute();
    return result;
  }

  async update(id: string, dto: Partial<WorkflowDefinitionDto>) {
    const existing = await this.findOne(id);

    // A definition declared by a %%workflow section belongs to the model. The
    // next generation rewrites it, so accepting an edit here would look like it
    // worked and then quietly vanish.
    if ((existing as any).source === "model") {
      const attempted = MODEL_OWNED_FIELDS.filter((field) => dto[field] !== undefined);
      if (attempted.length > 0) {
        throw new BadRequestException(
          `"${(existing as any).name}" is declared in the model — edit the %%workflow section and regenerate. ` +
            `Rejected: ${attempted.join(", ")}.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if ((existing as any).kind === "state") {
      if (dto.transitions) {
        await this.writeTransitions({
          ...dto,
          entityName: dto.entityName ?? (existing as any).entity_name,
        });
      }
      if (dto.mermaid !== undefined) updates.mermaid_code = dto.mermaid;
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.isActive !== undefined) updates.is_active = dto.isActive;
      const [saved] = await this.db
        .updateTable("sys_workflow_definitions")
        .set(updates as any)
        .where("id", "=", id)
        .returningAll()
        .execute();
      return saved;
    }
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.entityName !== undefined) updates.entity_name = dto.entityName;
    if (dto.operation !== undefined) updates.operation = dto.operation;
    if (dto.bpmnXml !== undefined) updates.bpmn_xml = dto.bpmnXml;
    // The automation builder's whole document. Leaving it out of the update
    // meant every save — the draft and Publish alike — kept the steps the
    // automation was created with, which for a new one is none at all.
    if (dto.mermaid !== undefined) {
      if (!/^\s*(flowchart|graph)\b/m.test(dto.mermaid)) {
        throw new BadRequestException("An automation must be a mermaid flowchart");
      }
      updates.mermaid_code = dto.mermaid;
      // Recompiled with it, or a saved edit would keep running the steps it was
      // created with. An explicit `bpmnXml` in the same call wins.
      if (dto.bpmnXml === undefined && (existing as any).kind === "automation") {
        updates.bpmn_xml = compileAutomationBpmn(
          dto.mermaid,
          tableForEntity(dto.entityName ?? (existing as any).entity_name),
          tableForEntity,
        );
      }
    }
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.triggerType !== undefined) updates.trigger_type = dto.triggerType;

    const [result] = await this.db
      .updateTable("sys_workflow_definitions")
      .set(updates as any)
      .where("id", "=", id)
      .returningAll()
      .execute();
    return result;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if ((existing as any).source === "model") {
      throw new BadRequestException(
        `"${(existing as any).name}" is declared in the model — remove the %%workflow section and regenerate. ` +
          "Deactivate it instead if you need it off now.",
      );
    }
    if ((existing as any).kind === "state") {
      await sql`DELETE FROM sys_workflow_transitions WHERE table_name = ${tableForEntity(
        (existing as any).entity_name,
      )}`.execute(this.db);
    }
    await this.db.deleteFrom("sys_workflow_definitions").where("id", "=", id).execute();
    return { deleted: true };
  }

  /**
   * One status machine per record type: its edges are what the entity guard enforces,
   * and edges the model drew are not the application's to overwrite.
   */
  private async assertStateMachineFree(entityName: string) {
    const table = tableForEntity(entityName);
    const own = await this.db
      .selectFrom("sys_workflow_definitions")
      .select("id")
      .where("kind", "=", "state")
      .where("entity_name", "=", entityName)
      .executeTakeFirst();
    if (own) {
      throw new BadRequestException(`${entityName} already has a status machine — edit that one.`);
    }
    const drawn = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM sys_workflow_transitions WHERE table_name = ${table}`.execute(
      this.db,
    );
    if ((drawn.rows[0]?.n ?? 0) > 0) {
      throw new BadRequestException(
        `${entityName}'s status machine is declared in the model — edit the %%workflow section and regenerate.`,
      );
    }
  }

  /** Replace the entity's edges with the ones the editor drew, in one transaction. */
  private async writeTransitions(dto: Partial<WorkflowDefinitionDto>) {
    const edges = dto.transitions ?? [];
    for (const edge of edges) {
      if (!edge.from?.trim() || !edge.to?.trim()) {
        throw new BadRequestException("Every transition needs a from and a to state");
      }
    }
    const table = tableForEntity(dto.entityName ?? "");
    const field = dto.statusField?.trim() || "status";
    await this.db.transaction().execute(async (trx) => {
      await sql`DELETE FROM sys_workflow_transitions WHERE table_name = ${table}`.execute(trx);
      for (const edge of edges) {
        await sql`
          INSERT INTO sys_workflow_transitions (table_name, status_field, from_state, to_state, transition_name)
          VALUES (${table}, ${field}, ${edge.from}, ${edge.to}, ${edge.name ?? null})
          ON CONFLICT (table_name, status_field, from_state, to_state) DO NOTHING`.execute(trx);
      }
    });
  }
}
