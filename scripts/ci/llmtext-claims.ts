#!/usr/bin/env bun
/**
 * Hold `website/llmtext/llms-full.txt` and `website/llmtext/llmdetailed.txt` to the claims they
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

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import definition from "../../language/appwithai-language.json";
import { check } from "../../language/browser/checker.entry";
import { AUTO_FIXABLE_CODES } from "../../language/checker";
import { parseModel } from "../../packages/generator/src/pipeline/parse-model";

/* The checker exports a Set; every assertion below wants a stable ordering. */
const autoFixable = [...AUTO_FIXABLE_CODES].sort();

/* Directive name + status, straight from the definition JSON. Both documents
   name that file as the authority, so it is what their tables are held to. */
const directives = (
  definition.directives.reserved as Array<{ keyword: string; status: string }>
).map((entry) => ({ name: entry.keyword.replace(/^%%/, ""), status: entry.status }));

const ROOT = resolve(import.meta.dir, "../..");

/* The four published protocol documents. Two author a model from a brief; two
   take an existing `.mmd` and change it. The enhancement pair is *derived* from
   the pair above it — the whole language reference is copied and only the
   protocol section differs — so every claim held below has to hold for all four,
   and the derivation itself is held at the end of this file. */
const DOCUMENTS = [
  "llms-full.txt",
  "llmdetailed.txt",
  "llmtextenhancement.txt",
  "llmdetailedenhancement.txt",
] as const;
const checkerSource = readFileSync(join(ROOT, "language/checker.ts"), "utf-8");

let failed = 0;
const held = (condition: boolean, label: string): void => {
  if (condition) console.log(`ok   ${label}`);
  else {
    failed++;
    console.log(`FAIL ${label}`);
  }
};

for (const name of DOCUMENTS) {
  const doc = readFileSync(join(ROOT, "website", "llmtext", name), "utf-8");
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
  /* Any spelled-out count of the auto-repairs has to be the real one.
     This was pinned to the word "seven" and the number 7, so adding a code
     made the check fail on documents that had already been corrected — and
     would have passed a document that said "nine". The words are matched
     generically and compared against AUTO_FIXABLE_CODES. */
  const NUMBER_WORDS = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ];
  const counted = [
    ...prose.matchAll(/\b([a-z]+)(?: auto-repairs\b| codes are auto-fixable\b| codes: `EML)/gi),
  ]
    .map((match) => NUMBER_WORDS.indexOf((match[1] ?? "").toLowerCase()))
    .filter((index) => index >= 0);
  const miscounted = counted.filter((count) => count !== autoFixable.length);
  held(
    miscounted.length === 0,
    `${name}: counts the auto-repairs correctly (checker says ${autoFixable.length}${
      miscounted.length ? `, document says ${[...new Set(miscounted)].join(", ")}` : ""
    })`
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
     concludes the checker is unreachable — the failure this text exists for.
     The host is pinned to the apex. A `www.` label resolves but is served a
     certificate that does not name it, so a model told to curl that URL gets a
     TLS refusal and reports its validation state as "not determinable" — the
     very failure this text exists to prevent, arriving through the text. */
  held(
    /curl -sO https:\/\/www\.appwithai\.org\/guide\/check-model\.mjs/.test(prose),
    `${name}: offers the checkout-free way to run the checker`
  );
  held(
    /reach GitHub says nothing about whether the checker can run/i.test(prose),
    `${name}: states that an unreachable GitHub is not an unreachable checker`
  );
  /* The second runner, and the distinction it exists for.
   *
   * The checker answers "would the generator refuse this model". Nothing in it
   * requires a model to *have* a lifecycle, a rule, an access rule or a word of
   * help text, so a bare ERD is 0 errors and 0 warnings — and these documents
   * used to point at `scripts/check-model.mjs` in the website repository for the
   * other question, which the reader of this text has no clone of. It is a
   * published runner now, and every edition has to offer it by URL.
   *
   * The score itself is held to a real run on the site, in `check-spec.mjs`;
   * what is held here is that all four copies quote the same figure, because a
   * check added to the runner without editing the documents leaves them quoting
   * a number no run produces. */
  held(
    /curl -sO https:\/\/www\.appwithai\.org\/guide\/audit-model\.mjs/.test(prose),
    `${name}: offers the checklist audit, not only the checker`
  );
  held(
    /clean report is not a finished model/i.test(prose),
    `${name}: says plainly that a clean checker run does not mean the model is finished`
  );
  held(
    /22 passed, 0 failed/.test(prose) && /[Tt]wenty-two checks/.test(prose),
    `${name}: quotes the audit's score, and the same count in words`
  );

  /* Naming the exact error is only half of it — the reader also has to be able
   * to tell which *kind* of failure it was. A shell reporting `curl: (6)` has
   * no resolver, so every host fails identically and the result says nothing
   * about this one; the observed behaviour was to report it as the site being
   * unavailable. The table names the four codes that never reached the site and
   * the one that did, so a model can classify its own failure rather than
   * generalise from it. */
  for (const code of ["curl: (6)", "curl: (7)", "curl: (56)"])
    held(
      prose.includes(code),
      `${name}: names \`${code}\` among the failures that never reached the site`
    );
  held(
    /never reached the site, so none of them is evidence it is down/.test(prose),
    `${name}: says those failures are not evidence the site is down`
  );

  /* The page-only rung. A fetch layer that reads text/html and refuses
   * application/javascript reports the module as inaccessible while the same
   * host serves it pages — so the modules are published inside pages too, and
   * every edition has to name that directory or the rung is unreachable. */
  held(
    prose.includes("https://www.appwithai.org/guide/source/"),
    `${name}: names the page-carried copies, for a fetcher that refuses JavaScript`
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

/* ------------------------------------------------------------------------ */
/*  The examples are read the same way by both readers                       */
/* ------------------------------------------------------------------------ */

/**
 * Every fenced `mermaid` example must parse to the same entities the checker
 * sees in it.
 *
 * The two documents are read by two engines. `checkSource` decides whether a
 * model is *accepted*; `parseModel` decides what an accepted model *contains*,
 * and it is the second one that turns into an application. Nothing held them to
 * each other, and they disagreed about the most-copied example in the file.
 *
 * §10.3's seed declared each entity as `Member { string id PK }`. `MermaidParser`
 * opens an entity block on `^<Name>\s*\{$` — the brace has to end the line — so
 * it read **zero** entities. The checker did not report that, because the same
 * seed carries `%%category` and `%%entity … help:` directives it recovers the
 * names from; it reported zero errors and one `EML102` per entity instead, and
 * §10.3 told the reader in as many words to expect exactly those warnings and
 * not to act on them. A model following the protocol produced a document that
 * checked clean and generated nothing.
 *
 * Neither engine alone can catch that. This is the check that can: an example
 * the checker accepts must contain, to `parseModel`, at least the entities the
 * checker counted in it.
 */
/**
 * An entity *declaration* as a reader of the document would recognise one —
 * deliberately looser than the parser's own pattern, which requires the brace to
 * end the line.
 *
 * Matching the parser's pattern here would make this check vacuous in exactly
 * the case it exists for: a one-line `Member { string id PK }` would be found by
 * neither the regexp nor `parseModel`, the two would agree on nothing, and the
 * example would pass. The point is to find what the *document appears to
 * declare* and hold the parser to it.
 */
const ENTITY_BLOCK = /^[ \t]*([A-Z][A-Za-z0-9_]*)[ \t]*\{/gm;

for (const name of DOCUMENTS) {
  const doc = readFileSync(join(ROOT, "website", "llmtext", name), "utf-8");

  /* Fenced ```mermaid blocks only. A plain ``` fence is prose about the
     language — including, deliberately, the one-liner §10.3 now quotes as the
     form that does not work. */
  const examples: Array<{ line: number; body: string }> = [];
  const lines = doc.split("\n");
  for (let index = 0; index < lines.length; index++) {
    if (lines[index]?.trim() !== "```mermaid") continue;
    const start = index + 1;
    let end = start;
    while (end < lines.length && lines[end]?.trim() !== "```") end++;
    examples.push({ line: start + 1, body: lines.slice(start, end).join("\n") });
    index = end;
  }

  held(examples.length > 0, `${name}: has fenced mermaid examples to check (${examples.length})`);

  let disagreed = 0;
  for (const example of examples) {
    /* Only examples that are whole documents are comparable: a fragment showing
       one directive has no erDiagram and is not claiming to be a model. */
    if (!/^\s*erDiagram\s*$/m.test(example.body)) continue;

    const declared = new Set<string>();
    for (const match of example.body.matchAll(ENTITY_BLOCK)) {
      if (match[1]) declared.add(match[1]);
    }

    const parsed = new Set(parseModel(example.body).entities.map((entity) => entity.name));
    const missing = [...declared].filter((entity) => !parsed.has(entity));

    /* An example that declares entity blocks the parser cannot see is the
       failure this check exists for. The reverse — the parser finding more than
       the regexp did — is fine: an entity may be introduced by a directive. */
    if (missing.length > 0) {
      disagreed++;
      console.log(
        `FAIL ${name}:${example.line}: the parser does not see ${missing.join(", ")} — ` +
          "an entity block must end its line with `{`"
      );
    }
  }

  held(disagreed === 0, `${name}: every mermaid example parses to the entities it declares`);

  /*
   * And every one of them documents itself.
   *
   * These examples are the most-copied part of a specification: a model reading
   * it will imitate their shape long before it reads the prose about help. An
   * example without `%%entity help:` and `%%field help:` therefore teaches that
   * help is optional, however firmly the surrounding paragraphs say otherwise —
   * which is exactly the habit EML151-EML153 exist to break.
   */
  let undocumented = 0;
  for (const example of examples) {
    const codes = check(example.body).issues.filter((issue: { code: string }) =>
      ["EML151", "EML152", "EML153"].includes(issue.code)
    );
    if (codes.length > 0) {
      undocumented++;
      console.log(
        `FAIL ${name}:${example.line}: ${codes.length} help diagnostic(s) — ` +
          codes
            .slice(0, 3)
            .map((issue: { code: string; message: string }) => `${issue.code} ${issue.message}`)
            .join("; ")
      );
    }
  }
  held(
    undocumented === 0,
    `${name}: every mermaid example carries help on its entities and columns`
  );
}

/**
 * The seed the protocol tells a reader to write must itself survive both
 * readers. Belt and braces over the sweep above, because this one example is
 * the one every session copies.
 */
const seedExample = readFileSync(join(ROOT, "website", "llmtext", "llmdetailed.txt"), "utf-8")
  .split("```mermaid")
  .find((block) => block.includes("Acme Dance Studio"))
  ?.split("```")[0];

if (seedExample) {
  const seed = parseModel(seedExample);
  held(
    seed.entities.length === 4,
    `llmdetailed.txt §10.3: the seed example parses to its four entities (got ${seed.entities.length})`
  );
  held(
    seed.entities.every((entity) => entity.attributes.some((a) => a.name === "id")),
    "llmdetailed.txt §10.3: every seed entity carries the id the example writes"
  );
  const report = check(seedExample);
  held(
    report.counts.errors === 0 && report.counts.warnings === 0,
    `llmdetailed.txt §10.3: the seed checks clean (${report.counts.errors}e ${report.counts.warnings}w ${report.counts.infos}i)`
  );
} else {
  held(false, "llmdetailed.txt §10.3: the seed example is still findable");
}

/* ------------------------------------------------------------------------ */
/*  The viewers                                                              */
/* ------------------------------------------------------------------------ */

/**
 * `llmdetailed.txt` tells the reader to open the viewers, at a URL, and says
 * what they draw. All three of those rot silently: the page can move, a tab can
 * be renamed, and a claim about what is drawn can outlive the code that drew
 * it. A model following a stale instruction sends its user to a 404 in the
 * middle of a walkthrough.
 */
const detailed = readFileSync(join(ROOT, "website", "llmtext", "llmdetailed.txt"), "utf-8");
const detailedProse = detailed.replace(/\s+/g, " ");

held(
  /https:\/\/www\.appwithai\.org\/viewers\//.test(detailed),
  "llmdetailed.txt: names the viewers by their published URL"
);

/* The path it names has to be the directory this repository publishes, and the
   page it names has to be in it. */
for (const file of ["index.html", "eml-model.js", "model-viewer.js", "viewers.css"]) {
  held(
    existsSync(join(ROOT, "website", "viewers", file)),
    `website/viewers/${file} exists — llmdetailed.txt sends readers to it`
  );
}

/* Every tab the prose names by title is a tab the page actually has. Read off
   the markup rather than listed here, so a renamed tab fails this rather than
   quietly disagreeing with the instruction. */
const viewerPage = readFileSync(join(ROOT, "website", "viewers", "index.html"), "utf-8");
const tabs = [...viewerPage.matchAll(/data-tab="[^"]+">([^<]+)</g)].map((match) =>
  (match[1] ?? "").trim()
);
for (const named of ["Workflows", "Business rules", "Access"]) {
  held(
    tabs.includes(named) && detailedProse.includes(`**${named}**`),
    `llmdetailed.txt: the "${named}" tab it names exists on the page`
  );
}

/* The three ways in, and which one needs which browser. Recommending "Watch a
   file" without saying it is Chromium-only is how a reader concludes the page
   is broken. */
held(
  /File System Access API/.test(detailedProse) && /Watch a file/.test(detailedProse),
  "llmdetailed.txt: says which browsers can watch a file"
);
const modelViewer = readFileSync(join(ROOT, "website", "viewers", "model-viewer.js"), "utf-8");
held(
  modelViewer.includes("showOpenFilePicker"),
  "the viewers really gate watching on the File System Access API"
);

/* The claim that makes the viewers worth pointing at: they read the model with
   the generator's own code, so their verdict is the checker's verdict. */
held(
  /same parser, rule compiler, workflow compiler and RBAC derivation the generator/.test(
    detailedProse
  ),
  "llmdetailed.txt: says the viewers read the model with the generator's own code"
);
const viewerEntry = readFileSync(join(ROOT, "packages/generator/src/browser/viewers.ts"), "utf-8");
held(
  viewerEntry.includes("checker.entry") && viewerEntry.includes("../viewers"),
  "the viewer bundle really re-exports the published checker and the pipeline's reading"
);

/* ------------------------------------------------------------------------ */
/*  The enhancement editions                                                 */
/* ------------------------------------------------------------------------ */

/**
 * `llmtextenhancement.txt` and `llmdetailedenhancement.txt` start from an
 * existing `.mmd` where their bases start from a brief. Two things are held
 * here that nothing above covers.
 *
 * First, the derivation. Each enhancement edition is its base with the
 * authoring protocol swapped for the enhancement protocol and everything else
 * copied, so a base edited without rebuilding its companion is the one way
 * these four documents can come to disagree about the language itself — which
 * is the failure the whole arrangement exists to prevent. The site's
 * `scripts/build-llmtext-enhancement.mjs` is the deriver; what is asserted here
 * is the property it produces, so this check holds whether or not the deriver
 * was the thing that last wrote the file.
 *
 * Second, the four rules that make an enhancement protocol different from an
 * authoring one. Each was a real failure before it was a rule: starting without
 * the user's file, rebuilding the model from memory, answering with a patch the
 * user has to merge, and handing back a model that checks clean and is quietly
 * smaller than the one that came in. Only the first of those has a diagnostic.
 */
const PAIRS = [
  [
    "llms-full.txt",
    "llmtextenhancement.txt",
    /^## \d+\. Authoring protocol\b/m,
    /^## \d+\. Enhancement protocol\b/m,
  ],
  [
    "llmdetailed.txt",
    "llmdetailedenhancement.txt",
    /^## \d+\. Interactive authoring protocol\b/m,
    /^## \d+\. Interactive enhancement protocol\b/m,
  ],
] as const;

for (const [baseName, enhancedName, baseHeading, enhancedHeading] of PAIRS) {
  const base = readFileSync(join(ROOT, "website", "llmtext", baseName), "utf-8");
  const enhanced = readFileSync(join(ROOT, "website", "llmtext", enhancedName), "utf-8");

  held(baseHeading.test(base), `${baseName}: still carries the authoring protocol section`);
  held(enhancedHeading.test(enhanced), `${enhancedName}: carries the enhancement protocol section`);

  /* Everything after the protocol section is the base's, byte for byte. Taking
     the tail from the *next* `## ` heading after each protocol is what makes
     this independent of how long either protocol happens to be. */
  const tailAfterProtocol = (doc: string, heading: RegExp): string => {
    const at = doc.search(heading);
    const rest = doc.slice(at);
    /* The next *numbered* `## ` heading. A bare `## ` would stop inside the
       fenced dossier both protocols quote, whose own headings are `## Fields`
       and `## Enums` — which is the bug this assertion caught in the deriver. */
    const next = rest.search(/\n## \d+\. /);
    return next === -1 ? "" : rest.slice(next);
  };
  held(
    tailAfterProtocol(base, baseHeading) === tailAfterProtocol(enhanced, enhancedHeading) &&
      tailAfterProtocol(base, baseHeading).length > 1000,
    `${enhancedName}: carries ${baseName}'s language reference unchanged after the protocol`
  );

  /* And everything between the header rule and the protocol, which is §0 and
     whatever else precedes it in that shape. */
  const headTo = (doc: string, heading: RegExp): string =>
    doc.slice(doc.indexOf("\n---\n"), doc.search(heading));
  held(
    headTo(base, baseHeading) === headTo(enhanced, enhancedHeading),
    `${enhancedName}: carries ${baseName}'s sections before the protocol unchanged`
  );
}

for (const name of ["llmtextenhancement.txt", "llmdetailedenhancement.txt"]) {
  const doc = readFileSync(join(ROOT, "website", "llmtext", name), "utf-8");
  const prose = doc.replace(/\s+/g, " ");

  held(
    /load (?:their|your) `?\.mmd`?|Send me the `\.mmd`/i.test(prose),
    `${name}: asks the user to load their .mmd before anything else`
  );
  held(
    /Never reconstruct the model/i.test(prose),
    `${name}: forbids rebuilding the model from memory or the conversation`
  );
  held(
    /Not a patch\. Not a diff\.|Not a diff, not a patch/i.test(prose),
    `${name}: delivers the whole model rather than a patch`
  );
  held(
    /baseline/i.test(prose) && /inventor/i.test(prose),
    `${name}: baselines and inventories the model before editing it`
  );
  held(
    /(nothing was lost|nothing lost|regression)/i.test(prose) && doc.includes("%%report"),
    `${name}: compares the result against the baseline to prove nothing was lost`
  );
  /* The losses that no diagnostic reports. Naming them is the whole value of
     the comparison — a protocol that says "check nothing was lost" without
     saying what goes missing is a protocol nobody can follow. */
  for (const lost of ["%%rbac", "%%report", "help text"])
    held(
      name === "llmtextenhancement.txt" || doc.includes(lost),
      `${name}: names ${lost} among what an enhancement silently drops`
    );

  /* Each document has to be findable from the other three, or a reader lands
     on the enhancement form for a model that does not exist yet. */
  for (const sibling of DOCUMENTS)
    if (sibling !== name) held(doc.includes(sibling), `${name}: names its companion ${sibling}`);
}

/* The interactive edition keeps its gates. A phase list with no gate in it is
   the batch protocol wearing the other file's name, which that file does
   better. */
const interactiveEnhancement = readFileSync(
  join(ROOT, "website", "llmtext", "llmdetailedenhancement.txt"),
  "utf-8"
);
for (const gate of ["Gate A", "Gate B", "Gate C", "Gate D", "Gate E"])
  held(interactiveEnhancement.includes(gate), `llmdetailedenhancement.txt keeps ${gate}`);
held(
  interactiveEnhancement.includes("00-original.mmd"),
  "llmdetailedenhancement.txt keeps the user's original untouched as the thing to compare against"
);

/* ------------------------------------------------------------------------ */
/*  The published host, written in full                                      */
/* ------------------------------------------------------------------------ */

/**
 * Every mention of the host is `https://www.appwithai.org`.
 *
 * A model following these documents reported a failed validator fetch as
<<<<<<< HEAD
 * `[appwithai.org](https://www.appwithai.org)` — a Markdown link whose text
=======
 * `[www.appwithai.org](https://www.appwithai.org)` — a Markdown link whose text
>>>>>>> origin/claude/charming-bell-5uazl5
 * is a bare host, which is what anything parsing that output then tries to
 * resolve. The documents taught it: they named the host without a scheme in
 * prose, and these copies used the apex in most of their URLs while the
 * published ones used `www`. Both are fixed; this is what stops either
 * returning.
 *
<<<<<<< HEAD
 * The passages that deliberately show a bad spelling are teaching material —
 * the bare host, the Markdown link around one, the `www.` label that has no
 * certificate, and the badly-reported failure — so they are dropped before the
 * scan rather than special-cased in it. A counter-example that gets
 * "corrected" stops being one, which is why they are listed rather than
 * pattern-matched.
 */
const TEACHING = [
  "`appwithai.org/guide/checker.js` is a string a",
  "`[appwithai.org](https://www.appwithai.org)` reads to a person as a working",
  "- **The apex is not the canonical form.** `https://appwithai.org/…` serves the same files and",
  "  is the domain the repository's `CNAME` pins, but `https://www.appwithai.org/…`",
  '*"Validator retrieval failed for appwithai.org"* says neither',
  "  `https://appwithai.org` serves the same files, but the `www.` form is the canonical one.",
  "is the canonical host and the apex `https://appwithai.org` serves the same",
=======
 * The three passages that deliberately show another spelling are teaching
 * material — the rule itself and the two sentences contrasting the apex with
 * `www` — so they are dropped before the scan rather than special-cased in it.
 * A counter-example that gets "corrected" stops being one.
 */
const TEACHING = [
  "`appwithai.org/guide/checker.js` is a string a",
  "`[www.appwithai.org](https://www.appwithai.org)` reads to a person as a working",
  "- **The apex is not the canonical form.** `https://appwithai.org/…` serves the",
  '*"Validator retrieval failed for appwithai.org"* says neither',
  "  `https://appwithai.org` serves the same files, but the `www` form is",
  "the canonical form and the one to write; the apex `https://appwithai.org`",
>>>>>>> origin/claude/charming-bell-5uazl5
];

for (const name of DOCUMENTS) {
  const doc = readFileSync(join(ROOT, "website", "llmtext", name), "utf-8");
  const stray = doc
    .split("\n")
    .filter((line) => !TEACHING.some((teaching) => line.includes(teaching)))
    .filter((line) => /appwithai\.org/.test(line.replace(/https:\/\/www\.appwithai\.org/g, "")));

  held(
    stray.length === 0,
    `${name}: every mention of the host is https://www.appwithai.org${
      stray.length ? ` (${stray.length} stray, first: "${stray[0]?.trim().slice(0, 72)}")` : ""
    }`
  );
  held(
    doc.includes("Write the URL in full, every time"),
    `${name}: carries the rule that the URL is written in full`
  );
  held(
<<<<<<< HEAD
    doc.includes("[appwithai.org](https://www.appwithai.org)"),
=======
    doc.includes("[www.appwithai.org](https://www.appwithai.org)"),
>>>>>>> origin/claude/charming-bell-5uazl5
    `${name}: keeps the Markdown-link counter-example the rule is about`
  );
}

console.log(failed === 0 ? "\nllmtext claims hold." : `\n${failed} claim(s) contradicted.`);
process.exit(failed === 0 ? 0 : 1);
