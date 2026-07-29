#!/usr/bin/env bun
/**
 * EML Language Fixer
 * ==================
 * Reads a .mmd.error file produced by checker.ts, applies every auto-fixable
 * correction directly to the source .mmd file, then re-runs checker.ts so you
 * can immediately see whether the file is now clean.
 *
 * Usage:
 *   bun language/fixer.ts <file.mmd.error>   # fix one error file
 *   bun language/fixer.ts <file.mmd>          # fix the .mmd (derives error file name)
 *   bun language/fixer.ts examples/           # fix all .mmd.error files in directory
 *
 * Options:
 *   --dry-run    Show what would change, but do NOT write files
 *   --no-recheck Do NOT run checker.ts after fixing
 *   --json       Machine-readable diff output
 *   -h, --help   Show this help
 *
 * Auto-fixable error codes:
 *   EML001  Missing %%meta name → insert %%meta name: <derived>
 *   EML117  No primary key → prepend  string id PK  to entity block
 *   EML421  State workflow: no [*] → FirstState → insert initial transition
 *   EML422  State workflow: no terminal state → append LastState --> [*]
 *
 * All other codes are reported but left for the developer to fix manually.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const useColor = !process.env.NO_COLOR && process.stdout.isTTY && !hasFlag("--no-color");
const c = {
  dim:     (s: string) => useColor ? `\x1b[2m${s}\x1b[0m` : s,
  bold:    (s: string) => useColor ? `\x1b[1m${s}\x1b[0m` : s,
  red:     (s: string) => useColor ? `\x1b[31m${s}\x1b[0m` : s,
  yellow:  (s: string) => useColor ? `\x1b[33m${s}\x1b[0m` : s,
  green:   (s: string) => useColor ? `\x1b[32m${s}\x1b[0m` : s,
  cyan:    (s: string) => useColor ? `\x1b[36m${s}\x1b[0m` : s,
};

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

// ---------------------------------------------------------------------------
// Error file types (must match checker.ts output shape)
// ---------------------------------------------------------------------------

interface Issue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  line?: number;
  hint?: string;
  context?: string;
  autoFixable: boolean;
}

interface ErrorFile {
  file: string;
  checkedAt: string;
  languageVersion: string;
  summary: { errors: number; warnings: number; infos: number; ok: boolean };
  issues: Issue[];
}

// ---------------------------------------------------------------------------
// Per-code fix strategies
// ---------------------------------------------------------------------------

interface FixResult {
  code: string;
  applied: boolean;
  description: string;
  /** Lines changed in source (for diff display). */
  changes: Array<{ lineNo: number; before: string; after: string; action: "insert" | "replace" | "delete" }>;
}

function applyFixes(source: string, issues: Issue[]): { newSource: string; results: FixResult[] } {
  const lines = source.split("\n");
  const results: FixResult[] = [];
  const fixableIssues = issues.filter((i) => i.autoFixable);

  if (fixableIssues.length === 0) {
    return { newSource: source, results };
  }

  // Sort fixes by line number descending so insertions don't shift later line numbers
  const sorted = [...fixableIssues].sort((a, b) => (b.line ?? 0) - (a.line ?? 0));

  for (const issue of sorted) {
    const result = applyFix(lines, issue);
    results.push(result);
  }

  return { newSource: lines.join("\n"), results };
}

function applyFix(lines: string[], issue: Issue): FixResult {
  const base: FixResult = { code: issue.code, applied: false, description: "", changes: [] };

  switch (issue.code) {
    case "EML001":
      return fixMissingMetaName(lines, issue, base);
    case "EML117":
      return fixMissingPrimaryKey(lines, issue, base);
    case "EML421":
      return fixMissingInitialTransition(lines, issue, base);
    case "EML422":
      return fixMissingTerminalTransition(lines, issue, base);
    default:
      base.description = `No auto-fix strategy for ${issue.code}.`;
      return base;
  }
}

// ---------------------------------------------------------------------------
// Fix: EML001 — Missing %%meta name
// ---------------------------------------------------------------------------

function fixMissingMetaName(lines: string[], issue: Issue, base: FixResult): FixResult {
  // Derive a name from the first entity or from the file name encoded in the message
  let name = "EML Model";
  // Look for first entity declaration in the ERD
  for (const line of lines) {
    const m = line.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\s*\{$/);
    if (m && m[1] !== "erDiagram") {
      name = `${m[1]} App`;
      break;
    }
  }

  // Find the first non-comment, non-blank line to insert before
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed && !trimmed.startsWith("%%") && !trimmed.startsWith("%")) {
      insertAt = i;
      break;
    }
    // If the line is a %% comment that contains "meta name", it already exists
    if (trimmed.startsWith("%%meta name:")) {
      base.description = "%%meta name already present.";
      return base;
    }
  }

  const newLine = `%%meta name: ${name}`;
  lines.splice(insertAt, 0, newLine);
  base.applied = true;
  base.description = `Inserted  ${newLine}  at line ${insertAt + 1}.`;
  base.changes.push({ lineNo: insertAt + 1, before: "", after: newLine, action: "insert" });
  return base;
}

// ---------------------------------------------------------------------------
// Fix: EML117 — No primary key
// ---------------------------------------------------------------------------

function fixMissingPrimaryKey(lines: string[], issue: Issue, base: FixResult): FixResult {
  // Extract entity name from the message: 'Entity "Name" has no primary key'
  const entityMatch = issue.message.match(/Entity "([^"]+)"/);
  if (!entityMatch) {
    base.description = "Could not extract entity name from issue message.";
    return base;
  }
  const entityName = entityMatch[1]!;

  // Find the entity's opening brace line
  const openBraceRe = new RegExp(`^\\s*${entityName}\\s*\\{`);
  let openBraceLine = issue.line ? issue.line - 1 : -1; // 0-indexed

  if (openBraceLine < 0) {
    for (let i = 0; i < lines.length; i++) {
      if (openBraceRe.test(lines[i]!)) { openBraceLine = i; break; }
    }
  }

  if (openBraceLine < 0) {
    base.description = `Could not find entity block for "${entityName}".`;
    return base;
  }

  // Insert  string id PK  as the first attribute (line after opening brace)
  const insertAt = openBraceLine + 1;
  const indent = lines[insertAt]?.match(/^(\s*)/)?.[1] ?? "    ";
  const newLine = `${indent}string id PK`;
  lines.splice(insertAt, 0, newLine);
  base.applied = true;
  base.description = `Prepended  string id PK  to entity "${entityName}" at line ${insertAt + 1}.`;
  base.changes.push({ lineNo: insertAt + 1, before: "", after: newLine, action: "insert" });
  return base;
}

// ---------------------------------------------------------------------------
// Fix: EML421 — State workflow: no initial state
// ---------------------------------------------------------------------------

function fixMissingInitialTransition(lines: string[], issue: Issue, base: FixResult): FixResult {
  // Find the stateDiagram-v2 that belongs to the named workflow
  const wfMatch = issue.message.match(/workflow "([^"]+)"/);
  const wfName = wfMatch?.[1];

  // Locate the stateDiagram-v2 section (look for %%workflow <wfName> first, then next stateDiagram-v2)
  let stateDiagramLine = -1;
  let searchFrom = 0;
  if (wfName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes(`%%workflow ${wfName}`)) { searchFrom = i; break; }
    }
  }
  for (let i = searchFrom; i < lines.length; i++) {
    if (/^\s*stateDiagram(-v2)?\s*$/.test(lines[i]!)) { stateDiagramLine = i; break; }
  }

  if (stateDiagramLine < 0) {
    base.description = `Could not find stateDiagram section for workflow "${wfName ?? "unknown"}".`;
    return base;
  }

  // Find first non-blank, non-comment line inside the diagram → that is the first state
  let firstState: string | undefined;
  for (let i = stateDiagramLine + 1; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t || t.startsWith("%%")) continue;
    if (/^\[\*\]/.test(t)) { // already has initial
      base.description = "Initial transition [*] --> already present.";
      return base;
    }
    // Extract left-hand side state
    const m = t.match(/^(\w+)\s*-->/);
    if (m) { firstState = m[1]; break; }
    const m2 = t.match(/^(\w+)\s*$/);
    if (m2) { firstState = m2[1]; break; }
  }

  if (!firstState) {
    base.description = "Could not determine first state.";
    return base;
  }

  const insertAt = stateDiagramLine + 1;
  const indent = lines[insertAt]?.match(/^(\s*)/)?.[1] ?? "    ";
  const newLine = `${indent}[*] --> ${firstState}`;
  lines.splice(insertAt, 0, newLine);
  base.applied = true;
  base.description = `Inserted  [*] --> ${firstState}  at line ${insertAt + 1}.`;
  base.changes.push({ lineNo: insertAt + 1, before: "", after: newLine, action: "insert" });
  return base;
}

// ---------------------------------------------------------------------------
// Fix: EML422 — State workflow: no terminal state
// ---------------------------------------------------------------------------

function fixMissingTerminalTransition(lines: string[], issue: Issue, base: FixResult): FixResult {
  const wfMatch = issue.message.match(/workflow "([^"]+)"/);
  const wfName = wfMatch?.[1];

  let stateDiagramLine = -1;
  let searchFrom = 0;
  if (wfName) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes(`%%workflow ${wfName}`)) { searchFrom = i; break; }
    }
  }
  for (let i = searchFrom; i < lines.length; i++) {
    if (/^\s*stateDiagram(-v2)?\s*$/.test(lines[i]!)) { stateDiagramLine = i; break; }
  }

  if (stateDiagramLine < 0) {
    base.description = `Could not find stateDiagram section.`;
    return base;
  }

  // Find the end of the diagram (next blank line or next section opener)
  let diagramEnd = stateDiagramLine + 1;
  let lastState: string | undefined;
  const seenTargets = new Set<string>();
  const seenSources = new Set<string>();

  for (let i = stateDiagramLine + 1; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (!t || t.startsWith("%%")) {
      if (!t) { diagramEnd = i; break; }
      continue;
    }
    if (/^(erDiagram|flowchart|graph|stateDiagram)/.test(t)) { diagramEnd = i; break; }
    // Parse transition
    const m = t.match(/^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)/);
    if (m) {
      if (m[1] !== "[*]") seenSources.add(m[1]!);
      if (m[2] !== "[*]") seenTargets.add(m[2]!);
      if (m[2] === "[*]") {
        base.description = "Terminal transition already present.";
        return base;
      }
      lastState = m[1]!;
      diagramEnd = i + 1;
    }
  }

  // Candidate terminal states: states that appear as sources but never as targets (leaves)
  const candidates = [...seenSources].filter((s) => !seenTargets.has(s));
  const terminal = candidates[0] ?? lastState;

  if (!terminal) {
    base.description = "Could not determine terminal state.";
    return base;
  }

  const indent = lines[stateDiagramLine + 1]?.match(/^(\s*)/)?.[1] ?? "    ";
  const newLine = `${indent}${terminal} --> [*]`;
  lines.splice(diagramEnd, 0, newLine);
  base.applied = true;
  base.description = `Inserted  ${terminal} --> [*]  at line ${diagramEnd + 1}.`;
  base.changes.push({ lineNo: diagramEnd + 1, before: "", after: newLine, action: "insert" });
  return base;
}

// ---------------------------------------------------------------------------
// Process a single .mmd.error file
// ---------------------------------------------------------------------------

interface FixSummary {
  errorFile: string;
  mmdFile: string;
  applied: number;
  skipped: number;
  unfixable: number;
  results: FixResult[];
}

function processErrorFile(errorFilePath: string, dryRun: boolean): FixSummary {
  // Load the error file
  let errorData: ErrorFile;
  try {
    errorData = JSON.parse(readFileSync(errorFilePath, "utf8")) as ErrorFile;
  } catch (e) {
    throw new Error(`Cannot parse error file "${errorFilePath}": ${e instanceof Error ? e.message : String(e)}`);
  }

  const mmdFile = errorData.file;
  if (!existsSync(mmdFile)) {
    throw new Error(`Source .mmd file not found: ${mmdFile}`);
  }

  const fixableIssues = errorData.issues.filter((i) => i.autoFixable);
  const unfixable = errorData.issues.filter((i) => !i.autoFixable && (i.severity === "error" || i.severity === "warning")).length;

  if (fixableIssues.length === 0) {
    return {
      errorFile: errorFilePath,
      mmdFile,
      applied: 0,
      skipped: 0,
      unfixable,
      results: [],
    };
  }

  const source = readFileSync(mmdFile, "utf8");
  const { newSource, results } = applyFixes(source, errorData.issues);

  if (!dryRun && newSource !== source) {
    writeFileSync(mmdFile, newSource, "utf8");
  }

  const applied = results.filter((r) => r.applied).length;
  const skipped = results.filter((r) => !r.applied).length;

  return { errorFile: errorFilePath, mmdFile, applied, skipped, unfixable, results };
}

// ---------------------------------------------------------------------------
// Re-run checker on a fixed file
// ---------------------------------------------------------------------------

function recheck(mmdFile: string): { exitCode: number; output: string } {
  // Find checker.ts relative to this fixer file
  const checkerPath = path.join(path.dirname(new URL(import.meta.url).pathname), "checker.ts");
  if (!existsSync(checkerPath)) {
    return { exitCode: 1, output: `checker.ts not found at ${checkerPath}` };
  }

  const result = spawnSync("bun", [checkerPath, mmdFile], {
    encoding: "utf8",
    timeout: 30_000,
  });

  return {
    exitCode: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(`${c.bold("eml-fix")} — EML auto-fixer

${c.bold("USAGE")}
  bun language/fixer.ts <file.mmd.error>
  bun language/fixer.ts <file.mmd>          # derives the .error file name
  bun language/fixer.ts <directory/>        # fix all .mmd.error files in dir

${c.bold("OPTIONS")}
  --dry-run      Show what would be fixed without writing files
  --no-recheck   Do not re-run checker.ts after applying fixes
  --json         Machine-readable output
  -h, --help     Show this help

${c.bold("AUTO-FIXABLE CODES")}
  EML001   Missing %%meta name → insert %%meta name: <derived>
  EML117   No primary key → insert  string id PK  as first attribute
  EML421   State workflow: no [*]→First transition → insert it
  EML422   State workflow: no terminal state (→[*]) → insert it

${c.bold("WORKFLOW")}
  1. Run:  bun language/checker.ts your-model.mmd
  2. Fix:  bun language/fixer.ts your-model.mmd.error
  3. Checker re-runs automatically — check the updated output.
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const flags = {
    dryRun:   hasFlag("--dry-run"),
    noRecheck:hasFlag("--no-recheck"),
    json:     hasFlag("--json"),
    help:     hasFlag("--help") || hasFlag("-h"),
  };

  if (flags.help || process.argv.length < 3) {
    printHelp();
    process.exit(0);
  }

  const rawArg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!rawArg) {
    console.error(c.red("Error: No input specified."));
    printHelp();
    process.exit(2);
  }

  if (!existsSync(rawArg)) {
    console.error(c.red(`File or directory not found: ${rawArg}`));
    process.exit(2);
  }

  // Resolve to .mmd.error file(s)
  let errorFiles: string[] = [];
  const st = statSync(rawArg);
  if (st.isDirectory()) {
    const entries = readdirSync(rawArg, { withFileTypes: true });
    errorFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith(".mmd.error"))
      .map((e) => path.join(rawArg, e.name));
    if (errorFiles.length === 0) {
      console.log(c.yellow(`No .mmd.error files found in: ${rawArg}`));
      process.exit(0);
    }
  } else if (rawArg.endsWith(".mmd.error")) {
    errorFiles = [rawArg];
  } else if (rawArg.endsWith(".mmd")) {
    // Derive the error file name
    const errorFilePath = rawArg + ".error";
    if (!existsSync(errorFilePath)) {
      console.log(c.yellow(`No error file found for ${rawArg}. Run checker first:`));
      console.log(c.dim(`  bun language/checker.ts ${rawArg}`));
      process.exit(0);
    }
    errorFiles = [errorFilePath];
  } else {
    console.error(c.red(`Input must be a .mmd, .mmd.error file, or a directory.`));
    process.exit(2);
  }

  const allSummaries: FixSummary[] = [];

  for (const errorFile of errorFiles) {
    let summary: FixSummary;
    try {
      summary = processErrorFile(errorFile, flags.dryRun);
    } catch (err) {
      console.error(c.red(`Error processing ${errorFile}: ${err instanceof Error ? err.message : String(err)}`));
      continue;
    }
    allSummaries.push(summary);

    if (flags.json) continue; // collect all, output at end

    const relMmd = path.relative(process.cwd(), summary.mmdFile);
    const relErr = path.relative(process.cwd(), summary.errorFile);
    console.log(`\n${c.bold(flags.dryRun ? "Dry run:" : "Fixing:")} ${c.cyan(relMmd)}`);
    console.log(c.dim(`  error file: ${relErr}`));

    if (summary.results.length === 0) {
      if (summary.unfixable > 0) {
        console.log(c.yellow(`  No auto-fixable issues. ${summary.unfixable} issue(s) require manual intervention.`));
      } else {
        console.log(c.green("  No auto-fixable issues found — file is already clean."));
      }
    } else {
      for (const r of summary.results) {
        const icon = r.applied ? c.green("✓") : c.yellow("○");
        const label = r.applied
          ? flags.dryRun ? c.cyan("would fix") : c.green("fixed")
          : c.dim("skipped");
        console.log(`  ${icon} ${c.dim(`[${r.code}]`)} ${label}  ${r.description}`);
        if (r.applied) {
          for (const ch of r.changes) {
            const lineRef = c.dim(`:${ch.lineNo}`);
            if (ch.action === "insert") {
              console.log(`       ${c.green("+")} ${lineRef}  ${ch.after}`);
            } else if (ch.action === "replace") {
              console.log(`       ${c.red("-")} ${lineRef}  ${ch.before}`);
              console.log(`       ${c.green("+")} ${lineRef}  ${ch.after}`);
            } else {
              console.log(`       ${c.red("-")} ${lineRef}  ${ch.before}`);
            }
          }
        }
      }

      const appliedCount = summary.results.filter((r) => r.applied).length;
      if (!flags.dryRun) {
        console.log(
          `\n  ${c.green(`Applied ${appliedCount} fix(es).`)}` +
          (summary.unfixable > 0 ? c.yellow(` ${summary.unfixable} issue(s) still need manual attention.`) : "")
        );
      } else {
        console.log(`\n  ${c.cyan(`Would apply ${appliedCount} fix(es).`)} Run without --dry-run to write changes.`);
      }
    }

    // Re-run checker automatically (unless dry-run or disabled)
    if (!flags.dryRun && !flags.noRecheck && summary.applied > 0) {
      console.log(`\n${c.dim("─".repeat(56))}`);
      console.log(`${c.bold("Re-checking")} ${c.cyan(relMmd)}\n`);
      const recheck_result = recheck(summary.mmdFile);
      // Print checker output indented
      const lines = recheck_result.output.split("\n");
      for (const line of lines) {
        if (line.trim()) console.log(`  ${line}`);
      }
    } else if (!flags.dryRun && summary.unfixable > 0 && summary.applied === 0) {
      console.log(c.dim(`\n  Tip: run  bun language/checker.ts ${relMmd}  to see full diagnostics.`));
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(allSummaries.length === 1 ? allSummaries[0] : allSummaries, null, 2));
  }

  const anyApplied = allSummaries.some((s) => s.applied > 0);
  process.exit(anyApplied || allSummaries.every((s) => s.applied === 0 && s.unfixable === 0) ? 0 : 0);
}

main().catch((err) => {
  console.error(c.red(`Fatal: ${err instanceof Error ? err.message : String(err)}`));
  if (process.env.EML_DEBUG) console.error(err);
  process.exit(2);
});
