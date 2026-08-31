#!/usr/bin/env bun
/**
 * Hold `llmtext/llms-full.txt` and `llmtext/llmdetailed.txt` to the claims they
 * make about the checker.
 *
 * The two files tell a language model which diagnostics exist, which of them
 * repair themselves, and how to run the engine. Nothing enforced any of that:
 * both are prose, and prose about a compiler goes stale in the one direction
 * nobody notices — a code that was renamed, a repair that stopped being
 * automatic, a section number that moved. A model reading a stale claim does
 * not get an error; it gets a confident wrong answer.
 *
 * The site's `scripts/check-spec.mjs` covers its own published copies. This is
 * the same guarantee where the files are authored.
 *
 *   bun scripts/ci/llmtext-claims.ts
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import definition from "../../language/appwithai-language.json";
import { AUTO_FIXABLE_CODES } from "../../language/checker";

/* The checker exports a Set; every assertion below wants a stable ordering. */
const autoFixable = [...AUTO_FIXABLE_CODES].sort();

/* Directive name + status, straight from the definition JSON. Both documents
   name that file as the authority, so it is what their tables are held to. */
const directives = (
  definition.directives.reserved as Array<{ keyword: string; status: string }>
).map((entry) => ({ name: entry.keyword.replace(/^%%/, ""), status: entry.status }));

const ROOT = resolve(import.meta.dir, "../..");
const checkerSource = readFileSync(join(ROOT, "language/checker.ts"), "utf-8");

let failed = 0;
const held = (condition: boolean, label: string): void => {
  if (condition) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}`);
  }
};

for (const name of ["llms-full.txt", "llmdetailed.txt"]) {
  const doc = readFileSync(join(ROOT, "llmtext", name), "utf-8");
  /* Both files are hard-wrapped, so a claim about a sentence has to be matched
     against a whitespace-collapsed copy or it turns on where a line broke. */
  const prose = doc.replace(/\s+/g, " ");

  /* A diagnostic the engine cannot emit reads exactly like one it can. */
  const cited = [...new Set(doc.match(/EML\d{3}/g) ?? [])].sort();
  const unknown = cited.filter((code) => !checkerSource.includes(code));
  held(
    cited.length > 0 && unknown.length === 0,
    `${name}: every diagnostic it cites exists in the checker (${cited.length} codes${
      unknown.length ? `, missing: ${unknown.join(", ")}` : ""
    })`
  );

  /* The auto-repairs, against AUTO_FIXABLE_CODES rather than a copy of it. */
  /* Matched by presence, not by form: llms-full.txt names them in a sentence
     and llmdetailed.txt in a table, and both are legitimate. What must not
     happen is a code going unmentioned while the engine still repairs it. */
  const claimed = autoFixable.filter((code) => doc.includes(code));
  held(
    claimed.length === autoFixable.length,
    `${name}: tabulates every auto-fixable code (${autoFixable.length}; missing ${
      autoFixable.filter((c) => !claimed.includes(c)).join(", ") || "none"
    })`
  );
  held(
    !/\bseven auto-repairs\b|\bSeven codes are auto-fixable\b/i.test(prose) ||
      autoFixable.length === 7,
    `${name}: counts the auto-repairs correctly (checker says ${autoFixable.length})`
  );

  /* A cross-reference that resolves nowhere sends a reader nowhere. */
  const headings = new Set([...doc.matchAll(/^#{2,4} (\d+(?:\.\d+)*)[. ]/gm)].map((m) => m[1]));
  const dangling = [...new Set([...doc.matchAll(/§(\d+\.\d+)/g)].map((m) => m[1]))].filter(
    (ref) => !headings.has(ref)
  );
  held(
    dangling.length === 0,
    `${name}: every §N.N cross-reference resolves${
      dangling.length ? ` (dangling: ${dangling.join(", ")})` : ""
    }`
  );

  /* Directive status, against `language/appwithai-language.json` — the file both
     documents name as the authority. This is the check that was missing: §11
     rule 2 claimed %%entity was "validated but not compiled" while the same
     document's own §3.2 table said compiled, and a reader who believed rule 2
     would conclude %%entity help: was inert. It is not: it becomes
     sys_table.description and the whole of the generated manual's prose. */
  for (const entry of directives) {
    const row = new RegExp(`^\\| \`%%${entry.name}\` \\|[^\n]*$`, "m").exec(doc);
    held(
      row !== null && new RegExp(`\\b${entry.status}\\b`).test(row[0]),
      `${name}: the status table calls %%${entry.name} ${entry.status}${
        row ? "" : " (no row found)"
      }`
    );
    /* A compiled directive must never be described as inert in prose. */
    if (entry.status === "compiled") {
      held(
        !new RegExp(`%%${entry.name}\`?,? (and )?[^.]{0,60}are validated but not compiled`).test(
          prose
        ),
        `${name}: prose does not call the compiled %%${entry.name} "validated but not compiled"`
      );
    }
  }

  /* The published route has to be offered, or a model without this checkout
     concludes the checker is unreachable — the failure this text exists for. */
  held(
    prose.includes("curl -sO https://appwithai.org/guide/check-model.mjs"),
    `${name}: offers the checkout-free way to run the checker`
  );
  held(
    /reach GitHub says nothing about whether the checker can run/i.test(prose),
    `${name}: states that an unreachable GitHub is not an unreachable checker`
  );
  /* Three observed failures were all one URL failing, generalised into "no
     validation is possible" — including one where the blocked URL was this
     very file. */
  held(
    /needs no specification document at all/i.test(prose),
    `${name}: separates fetching the spec from running the checker`
  );
  /* The fourth failure mode: proposing the mandatory step instead of taking it. */
  held(
    /Perform the validation; do not offer it/i.test(prose),
    `${name}: requires the run rather than offering it`
  );
}

console.log(failed === 0 ? "\nllmtext claims hold." : `\n${failed} claim(s) contradicted.`);
process.exit(failed === 0 ? 0 : 1);
