#!/usr/bin/env bun
/**
 * Prove `html/checker.js` and `html/fixer.js` still say what the CLI says.
 *
 * `--check` on the build script proves the bundles are not stale. It does not
 * prove they *run* — the Node builtins they are bundled against are stubs, and a
 * stub that throws where the real thing returned would turn every check into an
 * exception the page reports as "invalid model". That failure looks exactly like
 * a broken document, which is the worst way for it to present.
 *
 * So this loads the built files the way a page loads them and checks every
 * example model twice: once through the bundle, once through `language/checker.ts`
 * directly. Any disagreement in errors, warnings, infos or the diagnostic codes
 * themselves fails the run.
 *
 *   bun scripts/ci/language-tools-smoke.ts
 */

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkSource } from "../../language/checker";

const ROOT = resolve(import.meta.dir, "../..");

const bundleChecker = await import(join(ROOT, "html/checker.js"));
const bundleFixer = await import(join(ROOT, "html/fixer.js"));

const dir = join(ROOT, "language/examples");
const models = (await readdir(dir)).filter((name) => name.endsWith(".mmd"));
if (models.length === 0) {
  console.error("✖ no example models to check against");
  process.exit(1);
}

let failed = 0;

for (const name of models) {
  const source = await readFile(join(dir, name), "utf-8");
  const direct = checkSource(source);
  const viaBundle = bundleChecker.check(source);

  const mine = `${direct.errors}/${direct.warnings}/${direct.infos}`;
  const theirs = `${viaBundle.counts.errors}/${viaBundle.counts.warnings}/${viaBundle.counts.infos}`;
  const directCodes = direct.issues
    .map((i) => i.code)
    .sort()
    .join(",");
  const bundleCodes = viaBundle.issues
    .map((i: { code: string }) => i.code)
    .sort()
    .join(",");

  if (mine !== theirs || directCodes !== bundleCodes) {
    console.error(
      `✖ ${name}: bundle says ${theirs} [${bundleCodes}], checker.ts says ${mine} [${directCodes}]`
    );
    failed++;
    continue;
  }
  console.log(`✓ ${name} — ${theirs} errors/warnings/infos, agreed`);
}

// The fixer's loop, on a document that needs exactly one of its five repairs.
const needsAName = "erDiagram\n    THING {\n        string id PK\n    }\n";
const fixed = bundleFixer.checkAndFix(needsAName);
if (!fixed.repaired || !fixed.source.includes("%%meta name:")) {
  console.error("✖ fixer.js did not apply EML001 to a document missing its name");
  failed++;
} else if (!fixed.ok) {
  console.error(
    `✖ fixer.js repaired the document but it still fails: ${fixed.counts.errors} error(s)`
  );
  failed++;
} else {
  console.log("✓ fixer.js repaired a missing %%meta name and the result re-checks clean");
}

/* --------------------------------------------------------------------------
 * The context a diagnostic carries back
 *
 * A report that names a line number and nothing else makes the reader count
 * lines, and the reader is usually a language model holding the document in a
 * context window rather than open in an editor. It miscounts, edits the wrong
 * line, and reports a fix that was never applied. So every diagnostic that names
 * a line now carries that line's text, and these assertions are what keep it
 * true through a rebuild.
 * ------------------------------------------------------------------------ */

const withABadType = [
  "%%meta name: Context Probe",
  "%%meta kind: erd",
  "erDiagram",
  "    Thing {",
  "        string id PK",
  "        widget size",
  "    }",
  "",
].join("\n");

const contextReport = bundleChecker.check(withABadType);
const typeIssue = contextReport.issues.find((issue: { code: string }) => issue.code === "EML115");

if (!typeIssue) {
  console.error("✖ checker.js did not report EML115 on an unknown type");
  failed++;
} else if (typeIssue.lineText !== "        widget size") {
  console.error(
    `✖ checker.js: EML115 carries lineText ${JSON.stringify(typeIssue.lineText)}, expected the declaring line`
  );
  failed++;
} else if (withABadType.split("\n")[typeIssue.line - 1] !== typeIssue.lineText) {
  console.error("✖ checker.js: lineText does not match the line its own `line` points at");
  failed++;
} else {
  console.log("✓ checker.js carries the offending source line on each located diagnostic");
}

/* The one that is easy to get wrong and impossible to notice. `checkAndFix`
   inserts `%%meta name:` at the top, so every line below it moves down by one.
   The remaining diagnostics are produced from the repaired document, so their
   line numbers — and the text resolved from them — must come from `source`,
   never from what the caller passed in. Resolving them against the input reads
   one line too high, everywhere, and silently. */
const shiftsLines = [
  "erDiagram",
  "    Thing {",
  "        string id PK",
  "        widget size",
  "    }",
  "",
].join("\n");

const shifted = bundleFixer.checkAndFix(shiftsLines);
const shiftedIssue = shifted.remaining.find((issue: { code: string }) => issue.code === "EML115");
const repairedLines = shifted.source.split("\n");

if (!shifted.repaired) {
  console.error("✖ fixer.js did not repair the document the line-shift check needs");
  failed++;
} else if (!shiftedIssue) {
  console.error("✖ fixer.js dropped EML115 from the remaining diagnostics");
  failed++;
} else if (repairedLines[shiftedIssue.line - 1] !== shiftedIssue.lineText) {
  console.error(
    `✖ fixer.js: remaining diagnostic resolves to ${JSON.stringify(
      repairedLines[shiftedIssue.line - 1]
    )} in the repaired source but carries ${JSON.stringify(shiftedIssue.lineText)}`
  );
  failed++;
} else if (shiftedIssue.lineText !== "        widget size") {
  console.error(
    `✖ fixer.js: expected the declaring line, got ${JSON.stringify(shiftedIssue.lineText)}`
  );
  failed++;
} else {
  console.log("✓ fixer.js resolves remaining diagnostics against the repaired document");
}

/* The verdict is the last line. It was moved to the bottom once, because a
   reader reads the final line of a report and a run whose last line is a note
   gets read as having failed on that note. The steps block is new and sits
   above it for exactly that reason. */
const rendered = bundleChecker.formatReport(contextReport);
const lastLine = rendered.trimEnd().split("\n").at(-1) ?? "";
if (!/^(OK|FAILED) — /.test(lastLine)) {
  console.error(`✖ checker.js: the last line of a report is not the verdict: ${lastLine}`);
  failed++;
} else if (!rendered.includes("next steps")) {
  console.error("✖ checker.js: a report with diagnostics carries no next steps");
  failed++;
} else if (!rendered.includes("        widget size")) {
  console.error("✖ checker.js: the rendered report does not show the offending line");
  failed++;
} else {
  console.log("✓ checker.js renders the line, the steps, and the verdict last");
}

if (failed > 0) {
  console.error(`\n${failed} disagreement(s). Run: bun run build:language-tools`);
  process.exit(1);
}
console.log(`\n✓ html/checker.js and html/fixer.js agree with the CLI on ${models.length} models`);
