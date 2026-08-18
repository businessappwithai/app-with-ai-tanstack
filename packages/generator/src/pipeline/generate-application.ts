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
import {
  FullStackGenerator,
  type FullStackGeneratorOptions,
} from "../generators/full-stack.generator";
import {
  GENERATION_DEFAULTS,
  type GenerationSettings,
  normalizeDatabaseType,
  type ParsedModel,
  parseModel,
} from "./parse-model";

/**
 * Re-exported so every existing importer keeps working: these moved to
 * parse-model.ts only so the browser stack could reach them without `node:fs`.
 */
export {
  GENERATION_DEFAULTS,
  type GenerationSettings,
  normalizeDatabaseType,
  type ParsedModel,
  parseModel,
};

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
    compiledRbac: model.rbac,
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
          rbac: [
            ...model.rbac.operations.map(
              (r) => `${r.entity}.${r.operation} -> ${r.roles.join("|")}`
            ),
            ...model.rbac.transitions.map(
              (r) => `${r.entity}.${r.transition} (transition) -> ${r.roles.join("|")}`
            ),
          ],
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
