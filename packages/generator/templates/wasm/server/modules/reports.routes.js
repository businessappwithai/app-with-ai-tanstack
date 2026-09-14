/**
 * `/reports` — the questions the model declared with `%%report`.
 *
 * Each one is a title, a sentence saying who asks it and why, and the SQL that
 * answers it. The queries run against this application's own WebAssembly
 * PostgreSQL, which is the whole reason they can be here at all: the reporting
 * platform the orchestrator composes beside a deployed application needs a
 * server, a second database and a seeder, and a browser tab has none of those.
 * The same directive, read a second way.
 *
 * The reports are not a table. They come off `model.json` — the model *is* the
 * definition, and storing a copy in `sys_` would only create something that can
 * disagree with it. Nothing in this runtime edits a report, so nothing needs a
 * row to edit.
 */

import { Router } from "../lib/router.js";
import { badRequest, json, notFound } from "../lib/http.js";
import { requireUser } from "../lib/guards.js";

/**
 * The most rows one report returns.
 *
 * A model's query is free to have no LIMIT, and most do — the interesting ones
 * are already narrowed by their WHERE clause. This is a browser tab holding the
 * whole database in memory, so "every row" is a question that ends the tab
 * rather than answering anything.
 */
const MAX_ROWS = 2000;

/**
 * A report may only read.
 *
 * The generator refuses a non-SELECT at compile time, so this is the second
 * check rather than the only one — but `model.json` is a file in the
 * application directory, and the runtime should not hand a statement to the
 * database because a file said to.
 */
function assertReadOnly(sql) {
  const body = String(sql).replace(/;\s*$/, "");
  if (!/^\s*(?:with|select)\b/i.test(body)) {
    throw badRequest("A report query must be a SELECT or a WITH query.");
  }
  // A semicolon outside quotes is a second statement hiding behind the first.
  let quote = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote) {
        if (body[i + 1] === quote) i += 1;
        else quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === ";") throw badRequest("A report query must be a single statement.");
  }
  return body;
}

/** What a caller may see: everything except the query itself. */
function withoutSql(report) {
  const { sql: _sql, ...meta } = report;
  return meta;
}

export function reportsRoutes(model) {
  const router = new Router();
  router.use(async (_request, { user }) => {
    requireUser(user);
  });

  const reports = Array.isArray(model.reports) ? model.reports : [];
  const byName = new Map(reports.map((report) => [report.name, report]));

  router.get("/", async () => json(reports.map(withoutSql)));

  router.get("/:name", async (_request, { params }) => {
    const report = byName.get(params.name);
    if (!report) throw notFound(`No report named "${params.name}"`);
    return json(withoutSql(report));
  });

  router.get("/:name/run", async (_request, { db, params }) => {
    const report = byName.get(params.name);
    if (!report) throw notFound(`No report named "${params.name}"`);

    const body = assertReadOnly(report.sql);
    const started = Date.now();

    // Wrapped rather than appended to: a model's query may end in ORDER BY, a
    // LIMIT of its own or a comment, and adding to any of those changes what it
    // means. One row past the cap distinguishes a full page from a truncated
    // one without counting the whole thing twice.
    let rows;
    try {
      rows = await db.query(
        `SELECT * FROM (${body}) AS report_body LIMIT ${MAX_ROWS + 1}`
      );
    } catch (error) {
      // The query came out of the model, so this is a defect in the document
      // rather than in the request. Name the report and quote the database —
      // an author cannot act on "the report failed".
      throw badRequest(`Report "${report.name}" failed: ${error?.message || String(error)}`);
    }

    const truncated = rows.length > MAX_ROWS;
    if (truncated) rows = rows.slice(0, MAX_ROWS);

    return json({
      report: withoutSql(report),
      // Off the first row rather than a driver field list, so the column order
      // the report's own SELECT declares is the order it renders in.
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows,
      rowCount: rows.length,
      truncated,
      durationMs: Date.now() - started,
    });
  });

  return router;
}
