/**
 * The generation pipeline.
 *
 * Every entry point — the `erdwithai` CLI and the web app's `/api/generate`
 * route — goes through here, so a model generates the same application however
 * it was submitted. They used to assemble the generator's options separately,
 * and the copies drifted: the web path never parsed `%%category` directives, so
 * an app generated through the UI lost every category the model declared and
 * fell back to a single "General" group.
 *
 * Adding a generator input means adding it here once. A caller that needs
 * something different passes it as a setting; it does not rebuild the options.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Entity, EntityEnum, Relationship } from "@erdwithai/core/types";
import { extractRuleSections } from "../eml";
import {
  FullStackGenerator,
  type FullStackGeneratorOptions,
  type StackOption,
} from "../generators/full-stack.generator";
import { type CompiledHook, compileHooks } from "../hooks";
import { type EntityCategory, resolveCategories } from "../parsers/category.parser";
import { MermaidParser } from "../parsers/mermaid.parser";
import { type CompiledRule, compileRules } from "../rules";
import {
  type CompiledSaga,
  type CompiledWorkflow,
  compileSagaWorkflows,
  compileWorkflows,
} from "../workflows";

/** Everything a model contributes to generation. */
export interface ParsedModel {
  entities: Entity[];
  relationships: Relationship[];
  categories: EntityCategory[];
  /** `%%enum` declarations bound to a column by `%%field`, with their ids. */
  enums: EntityEnum[];
  /** Rules compiled from the model's `%%rule` decision flowcharts. */
  rules: CompiledRule[];
  /** Lifecycle handlers declared by the model's `%%hook` directives. */
  hooks: CompiledHook[];
  /** Status machines declared by the model's `%%workflow ... kind: state` sections. */
  workflows: CompiledWorkflow[];
  /** Multi-step processes declared by the model's `%%workflow ... kind: saga` sections. */
  sagas: CompiledSaga[];
}

export interface GenerationSettings {
  projectName: string;
  outputDir: string;
  projectVersion?: string;
  projectDescription?: string;
  stackOption?: StackOption;
  databaseType?: "postgresql" | "sqlite";
  /** Backend port. The frontend defaults to this + 1. */
  port?: number;
  frontendPort?: number;
  apiBaseUrl?: string;
  enableSwagger?: boolean;
  enableCors?: boolean;
  enableDarkMode?: boolean;
  skipFrontend?: boolean;
  skipBackend?: boolean;
  skipTests?: boolean;
  skipCliScaffold?: boolean;
  recordsPerEntity?: number;
}

/**
 * Canonicalise the database identifier.
 *
 * The CLI accepts `--db postgres` as well as `postgresql`, and used to record
 * whichever spelling was typed in the manifest — so two projects generated from
 * the same model disagreed about their own database. Generation itself treats
 * anything that is not `sqlite` as PostgreSQL, so only the label was ever wrong,
 * but the label is what tooling reads back.
 */
export function normalizeDatabaseType(value: string | undefined): "postgresql" | "sqlite" {
  return value === "sqlite" ? "sqlite" : "postgresql";
}

/** Defaults, in one place, so both entry points start from the same baseline. */
export const GENERATION_DEFAULTS = {
  projectVersion: "1.0.0",
  projectDescription: "Generated application",
  stackOption: "tanstackjs-nestjs" as StackOption,
  databaseType: "postgresql" as const,
  port: 3000,
  enableSwagger: true,
  enableCors: true,
  enableDarkMode: false,
  recordsPerEntity: 1000,
  /**
   * Generate from the bundled templates rather than scaffolding first.
   *
   * `bun create tanstack-start` and `nest new` fetch a starter over the network
   * and then stop to ask questions the arguments already answer. Everything
   * they write is overwritten by the template overlay in the phase that
   * follows, so the scaffold buys nothing and costs a network round trip and an
   * interactive prompt — which is why generation from the web app hung on
   * "Enter your project name:" while the backend, whose scaffold happened to
   * fail fast, completed from templates in the same run.
   *
   * Pass `--cli-scaffold` to opt back in.
   */
  skipCliScaffold: true,
};

/**
 * Parse model source into entities, relationships and categories.
 *
 * Accepts several sources so the CLI's multi-file mode (`--sys-file`,
 * `--bus-file`, `--ref-file`) and the web app's single ERD document take the
 * same path. Categories are read from the raw text of all of them: the ERD
 * parser drops `%%` comment lines, which is where `%%category` lives.
 */
export function parseModel(sources: string | string[]): ParsedModel {
  const list = (Array.isArray(sources) ? sources : [sources]).filter(Boolean);
  const parser = new MermaidParser();

  const entities: Entity[] = [];
  const enums: EntityEnum[] = [];
  const relationships: Relationship[] = [];

  for (const source of list) {
    const parsed = parser.parse(source);
    entities.push(...parsed.entities);
    enums.push(...parsed.enums);
    relationships.push(...parsed.relationships);
  }

  const joined = list.join("\n");
  const categories = resolveCategories(
    joined,
    entities.map((entity) => entity.name)
  );
  const warn = (message: string) => console.warn(`  \u26a0\ufe0f  ${message}`);

  // `%%rule` sections are decision flowcharts; compiling them here is what
  // carries a rule authored in the model through to the generated application.
  const rules = compileRules(extractRuleSections(joined), warn);
  // `%%hook` directives do the same for workflows: they name the handlers the
  // generated service runs around each CRUD operation.
  const hooks = compileHooks(
    joined,
    entities.map((entity) => entity.name),
    warn
  );

  // `%%workflow ... kind: state` sections become seeded workflow definitions,
  // which is what the trigger rules the generator seeds go looking for.
  const workflows = compileWorkflows(
    joined,
    entities.map((entity) => entity.name),
    warn
  );

  // `%%workflow ... kind: saga` sections are the multi-step form: each `%%step`
  // directive becomes one BPMN service task, ordered by the flowchart's edges.
  const sagas = compileSagaWorkflows(
    joined,
    entities.map((entity) => entity.name),
    warn
  );

  return { entities, relationships, categories, enums, rules, hooks, workflows, sagas };
}

/** Read model sources from disk, skipping any that are absent. */
export async function readModelSources(filePaths: Array<string | undefined>): Promise<string[]> {
  const sources: string[] = [];
  for (const filePath of filePaths) {
    if (!filePath) continue;
    try {
      sources.push(await fs.readFile(path.resolve(filePath), "utf-8"));
    } catch {
      // A missing optional input is not an error here — callers validate the
      // files they require before getting this far.
    }
  }
  return sources;
}

/**
 * Assemble the generator's options from a parsed model plus settings.
 *
 * This is the function that has to stay single: every field below was once
 * spelled out at each call site, and the one that forgot `categories` shipped
 * applications missing a feature the model had asked for.
 */
export function buildGeneratorOptions(
  model: ParsedModel,
  settings: GenerationSettings
): FullStackGeneratorOptions {
  const stackOption = settings.stackOption ?? GENERATION_DEFAULTS.stackOption;
  const port = settings.port ?? GENERATION_DEFAULTS.port;
  const frontendPort = settings.frontendPort ?? port + 1;
  const databaseType = normalizeDatabaseType(settings.databaseType);

  return {
    stackOption,
    projectName: settings.projectName,
    projectVersion: settings.projectVersion ?? GENERATION_DEFAULTS.projectVersion,
    projectDescription: settings.projectDescription ?? GENERATION_DEFAULTS.projectDescription,
    outputDir: settings.outputDir,
    port,
    frontendPort,
    tanstackStartNestjs: {
      backend: {
        databaseType,
        port,
        enableSwagger: settings.enableSwagger ?? GENERATION_DEFAULTS.enableSwagger,
        enableCors: settings.enableCors ?? GENERATION_DEFAULTS.enableCors,
      },
      frontend: {
        apiBaseUrl: settings.apiBaseUrl ?? `http://localhost:${port}`,
        enableDarkMode: settings.enableDarkMode ?? GENERATION_DEFAULTS.enableDarkMode,
      },
    },
    skipFrontend: !!settings.skipFrontend,
    skipBackend: !!settings.skipBackend,
    skipTests: !!settings.skipTests,
    skipCliScaffold: settings.skipCliScaffold ?? GENERATION_DEFAULTS.skipCliScaffold,
    recordsPerEntity: settings.recordsPerEntity ?? GENERATION_DEFAULTS.recordsPerEntity,
    categories: model.categories,
    modelEnums: model.enums,
    compiledRules: model.rules,
    compiledHooks: model.hooks,
    compiledWorkflows: model.workflows,
    compiledSagas: model.sagas,
  };
}

/** Extra fields recorded in the manifest beyond what the settings carry. */
export interface ManifestExtras {
  input?: unknown;
  packageManager?: string;
}

/**
 * Write `.erdwithai.json` so `erdwithai info` — and anything else inspecting a
 * generated project — can tell what produced it.
 */
export async function writeManifest(
  outputDir: string,
  model: ParsedModel,
  settings: GenerationSettings,
  extras: ManifestExtras = {}
): Promise<void> {
  const port = settings.port ?? GENERATION_DEFAULTS.port;
  try {
    await fs.writeFile(
      path.join(outputDir, ".erdwithai.json"),
      JSON.stringify(
        {
          name: settings.projectName,
          version: settings.projectVersion ?? GENERATION_DEFAULTS.projectVersion,
          description: settings.projectDescription ?? GENERATION_DEFAULTS.projectDescription,
          stack: settings.stackOption ?? GENERATION_DEFAULTS.stackOption,
          database: normalizeDatabaseType(settings.databaseType),
          input: extras.input,
          backendPort: port,
          frontendPort: settings.frontendPort ?? port + 1,
          apiUrl: settings.apiBaseUrl ?? `http://localhost:${port}`,
          entities: model.entities.map((entity) => entity.name),
          categories: model.categories.map((category) => category.name),
          rules: model.rules.map((rule) => `${rule.name} on ${rule.entity} (${rule.operation})`),
          hooks: model.hooks.map((hook) => `${hook.type} ${hook.handler} on ${hook.entity}`),
          workflows: model.workflows.map(
            (w) => `${w.name} on ${w.entity} (${w.states.length} states)`
          ),
          sagas: model.sagas.map(
            (s) => `${s.name} on ${s.entity} (${s.steps.length} steps, ${s.trigger})`
          ),
          packageManager: extras.packageManager,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch {
    // non-fatal — a missing manifest does not invalidate the generated app
  }
}

export interface GenerateApplicationOptions extends GenerationSettings {
  /** Model source text. Several are concatenated (CLI multi-file mode). */
  sources: string | string[];
  /** Pre-parsed model, when the caller has already parsed and logged it. */
  model?: ParsedModel;
  manifest?: ManifestExtras;
  /** Set false to skip `.erdwithai.json` (dry runs). */
  writeManifestFile?: boolean;
}

/**
 * Parse, generate, and record the manifest — the whole pipeline, in the order
 * every entry point needs it.
 */
export async function generateApplication(
  options: GenerateApplicationOptions
): Promise<ParsedModel> {
  const model = options.model ?? parseModel(options.sources);

  await fs.mkdir(options.outputDir, { recursive: true });

  const generator = new FullStackGenerator(buildGeneratorOptions(model, options));
  await generator.generate(model.entities, model.relationships);

  await writeModelSource(options.outputDir, options.sources);

  if (options.writeManifestFile !== false) {
    await writeManifest(options.outputDir, model, options, options.manifest ?? {});
  }

  return model;
}

/**
 * Ship the model into the application it generated.
 *
 * The generated code is the model compiled: reading it back tells you what the
 * application does but not what it was asked to do, and nothing in it records
 * that a decision table had three rows for a reason. An administrator extending
 * the application — and the assistant helping them — needs the source, and the
 * only copy otherwise lives in the generator's database.
 *
 * It also makes the generated app self-describing: regenerating it needs only
 * the directory it produced.
 */
export async function writeModelSource(
  outputDir: string,
  sources: string | string[]
): Promise<void> {
  const document = (Array.isArray(sources) ? sources : [sources]).filter(Boolean).join("\n\n");
  if (!document.trim()) return;

  try {
    await fs.mkdir(path.join(outputDir, "model"), { recursive: true });
    await fs.writeFile(path.join(outputDir, "model", "model.eml.mmd"), document, "utf-8");
  } catch {
    // Non-fatal, exactly like the manifest: the application runs without it.
  }
}
