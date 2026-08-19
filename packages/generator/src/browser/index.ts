/**
 * The generator, as it runs in a browser.
 *
 * This is the entry point bundled into `html/assets/erdwithai-wasm.js`, and it
 * is deliberately thin: the parsing, compiling and assembling it exposes are
 * the same functions the CLI calls, imported from the same files. There is no
 * browser edition of the compiler, which is the only way the page can promise
 * that what it generates is what `erdwithai-wasm generate` would have written.
 *
 * What it cannot import is anything reaching `node:fs` — hence `parse-model.ts`
 * being separate from `generate-application.ts`, and hence the runtime being
 * inlined by `scripts/build-wasm-runtime.ts` rather than read off disk.
 */

import languageDefinition from "../../../../language/erdwithai-language.json";
import { setLanguageDefinition as setCheckerDefinition } from "../../../../language";
import { setLanguageDefinition } from "../parsers/language-maps";
import { type ParsedModel, parseModel } from "../pipeline/parse-model";
import { type Issue, type ModelReview, reviewModel } from "../pipeline/review-model";

// The parser resolves the language definition off disk, which a browser has
// none of. Injecting the real JSON here — bundled, not re-typed — is what makes
// a model read the same way in a tab as it does in a terminal.
setLanguageDefinition(languageDefinition);
// The checker resolves it separately, through `language/index.ts`. Same JSON,
// same object — a tab has no disk for either of them to read it from.
setCheckerDefinition(
  languageDefinition as unknown as Parameters<typeof setCheckerDefinition>[0]
);

import { RUNTIME_BYTES } from "../generators/wasm/runtime-assets.generated";
import {
  DEFAULT_PGLITE_URL,
  generateWasmApp,
  type WasmGeneratorOptions,
} from "../generators/wasm/wasm-app.generator";

export type { ParsedModel, WasmGeneratorOptions };
export type { ModelReview };
// Exported on its own so the page can check a model the moment it is chosen,
// rather than only finding out at the point of generating it.
export { DEFAULT_PGLITE_URL, generateWasmApp, parseModel, reviewModel, RUNTIME_BYTES };

export interface BrowserGenerateOptions extends Partial<WasmGeneratorOptions> {
  /** The EML document. */
  source: string;
  /** Repair what the fixer can repair before checking. Default true. */
  autoFix?: boolean;
}

export interface BrowserGenerateResult {
  /** Every file of the application, path -> contents. */
  files: Record<string, string>;
  /** What the model turned out to contain, for the page to show. */
  summary: {
    project: string;
    entities: string[];
    categories: string[];
    relationships: number;
    enums: number;
    rules: string[];
    hooks: number;
    workflows: string[];
    sagas: string[];
    accessRules: number;
    fileCount: number;
    bytes: number;
  };
  warnings: string[];
  /** What the checker made of the model, after the fixer had its turn. */
  review: ModelReview;
}

/**
 * A model the checker refused.
 *
 * Thrown rather than returned so no caller can generate from it by forgetting to
 * look, and typed rather than a message string so the page can render each
 * finding with its line, code and hint instead of printing one flattened line.
 */
export class ModelCheckError extends Error {
  readonly issues: Issue[];
  readonly review: ModelReview;

  constructor(review: ModelReview) {
    const errors = review.counts.errors;
    super(`This model has ${errors} error${errors === 1 ? "" : "s"}.`);
    this.name = "ModelCheckError";
    this.issues = review.issues;
    this.review = review;
  }
}

/**
 * Parse a model and produce an application, in one call.
 *
 * Warnings are collected rather than logged. In a terminal a warning on stderr
 * is seen; in a tab it goes to a console nobody has open, and "your rule was
 * skipped because it has no entity" is exactly the thing the person who just
 * uploaded the model needs to read.
 */
export function generateFromSource(options: BrowserGenerateOptions): BrowserGenerateResult {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(
      args
        .map(String)
        .join(" ")
        .replace(/^\s*⚠️?\s*/u, "")
        .trim()
    );
  };

  // Checked before it is compiled, and with the same engine the CLI uses. A
  // browser is the one place where nobody sees a build log, so a model that says
  // something impossible has to say so here or nowhere.
  const review = reviewModel(options.source, { autoFix: options.autoFix !== false });
  if (!review.ok) {
    console.warn = originalWarn;
    throw new ModelCheckError(review);
  }
  const source = review.source;

  let parsed: ParsedModel;
  try {
    parsed = parseModel(source);
  } finally {
    console.warn = originalWarn;
  }

  if (!parsed.entities.length) {
    throw new Error(
      "This model declares no entities. An EML document needs an `erDiagram` section — " +
        "check that the file is a Mermaid ER diagram and not, say, a flowchart on its own."
    );
  }

  const name = options.name?.trim() || "Generated App";
  const generated = generateWasmApp(parsed, {
    name,
    version: options.version ?? "1.0.0",
    description: options.description ?? `Generated from ${parsed.entities.length} entities`,
    adminEmail: options.adminEmail ?? "admin@admin.com",
    adminPassword: options.adminPassword ?? "admin",
    adminName: options.adminName ?? "admin",
    source,
    pgliteUrl: options.pgliteUrl,
  });

  return {
    files: Object.fromEntries(generated.files),
    summary: {
      project: name,
      entities: parsed.entities.map((entity) => entity.name),
      categories: parsed.categories.map((category) => category.name),
      relationships: parsed.relationships.length,
      enums: parsed.enums.length,
      rules: parsed.rules.map((rule) => rule.name),
      hooks: parsed.hooks.length,
      workflows: parsed.workflows.map((workflow) => workflow.name),
      sagas: parsed.sagas.map((saga) => saga.name),
      accessRules: parsed.rbac.operations.length + parsed.rbac.transitions.length,
      fileCount: generated.stats.fileCount,
      bytes: generated.stats.bytes,
    },
    warnings,
    review,
  };
}
