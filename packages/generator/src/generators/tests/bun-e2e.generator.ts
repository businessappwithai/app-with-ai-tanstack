/**
 * Bun E2E Test Generator
 *
 * Emits a self-contained `tests/` project alongside the generated backend and
 * frontend. Everything it writes runs on `bun:test` — the suites drive the
 * application through its HTTP API, which is the surface a Bun test runner can
 * actually reach (there is no browser here).
 *
 * Layout produced under <outputDir>/tests:
 *
 *   run.ts                       orchestrator — starts the app, runs suites in order
 *   harness/                     shared machinery (config, http, auth, factory, rules…)
 *   suites/00-health…08-users    one file per functional area
 *   suites/03-crud.<entity>      one per entity
 *   suites/05-rules.<entity>     one per entity
 */

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import type {
  BusEntity,
  BusEntityAttribute,
  Entity,
  EntityEnum,
  Relationship,
} from "@appwithai/core/types";
import { entityToBusEntity } from "@appwithai/core/types";
import type { CompiledWorkflow } from "../../workflows";
import { BaseGenerator } from "../base.generator";

function resolveTemplateDir(subpath: string): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "packages/generator/templates", subpath),
    path.join(cwd, "templates", subpath),
    path.join(cwd, "../../../packages/generator/templates", subpath),
    path.join(cwd, "../../packages/generator/templates", subpath),
    path.join(__dirname, "../../../templates", subpath),
    path.join(__dirname, "../../templates", subpath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

export interface BunE2ETestGeneratorOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  /** Backend port — the suites' default target. */
  port: number;
  /** Frontend port — sent as the Origin header. */
  frontendPort: number;
  /** Records the bulk-seed suite creates per entity. */
  recordsPerEntity?: number;
  /**
   * The `%%enum` declarations a `%%field` binds to a column. The dictionary
   * suite compares the options the API offers for a column against these, so
   * a dropdown that has drifted from the model is a failing test rather than a
   * screen nobody looked at.
   */
  modelEnums?: EntityEnum[];
  /**
   * The state machines `%%workflow … kind: state` declares. The transition
   * suite drives each one edge by edge, and asserts the edges the model never
   * drew are refused.
   */
  compiledWorkflows?: CompiledWorkflow[];
}

/** Static harness files copied verbatim (after Handlebars rendering). */
const HARNESS_FILES = [
  "config.ts",
  "http.ts",
  "auth.ts",
  "server.ts",
  "entities.ts",
  // What the model declared, as data: enum values and state-machine edges.
  // The dictionary and transition suites compare the running application
  // against this rather than against themselves.
  "model.ts",
  "factory.ts",
  "rules.ts",
  "workflows.ts",
  "manifest.ts",
  // What the run did and how long it took: the collector each suite process
  // appends to, and the merge the runner writes a report from.
  "metrics.ts",
  "report.ts",
  "harness.ts",
  "index.ts",
];

/** Suites that are generated once, not per entity. Order matters. */
const SHARED_SUITES = [
  "00-health.test.ts",
  "01-auth.test.ts",
  "02-dictionary.test.ts",
  // The window/tab/field layout every screen is drawn from, and the references
  // every lookup and dropdown is fed by. Split from 02 because a broken layout
  // and a broken reference fail for different reasons and want different names.
  "02b-dictionary-layout.test.ts",
  "02c-dictionary-references.test.ts",
  "04-bulk-seed.test.ts",
  "06-rules-workflow.test.ts",
  // The state machine, driven edge by edge — after the rule-triggered
  // workflows, because both write to the same status fields.
  "06b-workflow-transitions.test.ts",
  "07-workflow-random.test.ts",
  "08-users-roles.test.ts",
  "09-workflow-multistep.test.ts",
  // Last, so they measure the fullest the tables will be this run.
  "10-benchmark.test.ts",
  "11-performance-budget.test.ts",
];

/** Root-level files. */
const ROOT_FILES = ["package.json", "tsconfig.json", "README.md", "run.ts", "cleanup.ts"];

/** Files made executable after writing. */
const EXECUTABLE_FILES = ["run.ts", "cleanup.ts"];

export class BunE2ETestGenerator extends BaseGenerator {
  private readonly options: BunE2ETestGeneratorOptions;

  constructor(options: BunE2ETestGeneratorOptions) {
    super(resolveTemplateDir("tanstack-start-nestjs/tests"));
    this.options = options;
  }

  async generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    const testsDir = path.join(outputDir, "tests");
    await fs.mkdir(path.join(testsDir, "harness"), { recursive: true });
    await fs.mkdir(path.join(testsDir, "suites"), { recursive: true });

    const busEntities = entities.map((entity) => entityToBusEntity(entity));
    const context = this.buildContext(busEntities, relationships);

    await this.writeRootFiles(testsDir, context);
    await this.writeHarness(testsDir, context);
    await this.writeSharedSuites(testsDir, context);
    await this.writePerEntitySuites(testsDir, busEntities, context);

    const perEntity = busEntities.length * 2;
    console.log(
      `   ✓ tests/ — ${SHARED_SUITES.length + perEntity} suites, ` +
        `${HARNESS_FILES.length + 1} harness modules`
    );
  }

  // ── context ───────────────────────────────────────────────────────────────

  private buildContext(
    entities: BusEntity[],
    relationships: Relationship[]
  ): Record<string, unknown> {
    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
        id: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
      config: {
        port: this.options.port,
        frontendPort: this.options.frontendPort,
        recordsPerEntity: this.options.recordsPerEntity ?? 1000,
      },
      entities,
      relationships,
      modelEnums: this.options.modelEnums ?? [],
      stateMachines: this.stateMachines(entities),
      now: new Date().toISOString(),
    };
  }

  /**
   * The model's state machines, resolved onto the physical tables the suites
   * drive: entity name, table, the status column the guard reads, and the
   * edges — the same derivation the backend's transition seed performs, so the
   * suite and the seed cannot disagree about what the model said.
   */
  private stateMachines(entities: BusEntity[]): Array<Record<string, unknown>> {
    const byEntity = new Map<string, CompiledWorkflow>();
    for (const workflow of this.options.compiledWorkflows ?? []) {
      if (!byEntity.has(workflow.entity)) byEntity.set(workflow.entity, workflow);
    }

    const machines: Array<Record<string, unknown>> = [];
    for (const entity of entities) {
      // `originalName` is the entity as the ERD spelled it, which is the key
      // `CompiledWorkflow.entity` carries; `name` is the same string for every
      // model that does not rename, and the fallback covers the ones that do.
      const workflow = byEntity.get(entity.name) ?? byEntity.get(entity.originalName);
      if (!workflow || workflow.transitions.length === 0) continue;

      // entityToBusEntity gives every attribute a physical `columnName`; the
      // inherited attribute type does not declare it, so it is read through the
      // bus-entity attribute shape rather than assumed.
      const columns = ((entity.attributes ?? []) as Array<Partial<BusEntityAttribute>>).map(
        (attribute) => attribute.columnName ?? attribute.name
      );
      const statusField = columns.includes("status") ? "status" : "workflow_status";

      // `[*]` is the diagram's start and end marker, not a state a record is
      // ever in — the seed drops those edges, so the suite must too or it
      // would assert against transitions the guard has never heard of.
      const edges = workflow.transitions
        .filter((t) => t.from !== "[*]" && t.to !== "[*]")
        .map((t) => ({ from: t.from, to: t.to, trigger: t.trigger ?? "" }));
      if (edges.length === 0) continue;

      machines.push({
        entity: entity.name,
        tableName: entity.tableName,
        statusField,
        initial: workflow.initial ?? "",
        terminal: workflow.terminal ?? [],
        edges,
      });
    }
    return machines;
  }

  // ── writers ───────────────────────────────────────────────────────────────

  private async writeRootFiles(testsDir: string, context: Record<string, unknown>): Promise<void> {
    for (const file of ROOT_FILES) {
      const content = await this.renderTemplate(`${file}.hbs`, context);
      await fs.writeFile(path.join(testsDir, file), content);
    }

    for (const file of EXECUTABLE_FILES) {
      // chmod is best-effort — Windows and some CI filesystems reject it.
      await fs.chmod(path.join(testsDir, file), 0o755).catch(() => {});
    }
  }

  private async writeHarness(testsDir: string, context: Record<string, unknown>): Promise<void> {
    for (const file of HARNESS_FILES) {
      const content = await this.renderTemplate(`harness/${file}.hbs`, context);
      await fs.writeFile(path.join(testsDir, "harness", file), content);
    }

    // The test vocabulary — `describe`, `it`, `expect` — over `node:test`. No
    // model reaches it, so it is the same file in every generated application.
    await fs.writeFile(
      path.join(testsDir, "harness", "testing.ts"),
      await this.component("harness/testing.ts")
    );
  }

  private async writeSharedSuites(
    testsDir: string,
    context: Record<string, unknown>
  ): Promise<void> {
    for (const file of SHARED_SUITES) {
      const content = await this.renderTemplate(`suites/${file}.hbs`, context);
      await fs.writeFile(path.join(testsDir, "suites", file), content);
    }
  }

  /**
   * One CRUD file and one rules file per entity, so a failure names the entity
   * that broke instead of collapsing every entity into one suite.
   *
   * Filenames carry the group's numeric prefix (03 for CRUD, 05 for rules) so
   * the runner's filename sort keeps them in the intended position relative to
   * the shared suites.
   */
  private async writePerEntitySuites(
    testsDir: string,
    entities: BusEntity[],
    context: Record<string, unknown>
  ): Promise<void> {
    for (const entity of entities) {
      const slug = entity.tableName.replace(/^bus_/, "").replace(/[^a-z0-9]+/gi, "-");
      const entityContext = { ...context, entity };

      const crud = await this.renderTemplate("suites/crud-entity.test.ts.hbs", entityContext);
      await fs.writeFile(path.join(testsDir, "suites", `03-crud.${slug}.test.ts`), crud);

      const rules = await this.renderTemplate("suites/rules-entity.test.ts.hbs", entityContext);
      await fs.writeFile(path.join(testsDir, "suites", `05-rules.${slug}.test.ts`), rules);
    }
  }
}

export default BunE2ETestGenerator;
