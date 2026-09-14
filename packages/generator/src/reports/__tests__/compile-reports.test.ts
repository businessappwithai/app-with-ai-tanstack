/**
 * `%%report` reaches the generated application.
 *
 * The defect this covers: the checker read `%%report`, validated it and put it
 * in `model.reports`, and the *generator's* parser had no case for it — so the
 * published models' 85 reports generated an application with none, identical
 * to one generated with the directives deleted.
 *
 * The cases are taken from the models this repository publishes rather than
 * from fixtures written to match the parser, because a fixture that matches the
 * parser proves only that the parser matches itself.
 */

import { describe, expect, it } from "vitest";
import { parseModel } from "../../pipeline/parse-model";
import { compileReports, parseReportDirective } from "../index";

/** One real line, from `html/models/crm.eml.mmd`. */
const CRM_LINE =
  "    %%report rep-stalled-deals title: Deals with no activity in 14 days entity: Opportunity " +
  "chart: bar x: owner y: deals help: The rep's own pipeline hygiene and the manager's Monday " +
  "question. A deal nobody has touched in a fortnight is not a forecast, it is a hope. " +
  "sql: SELECT u.first_name || ' ' || u.last_name AS owner, COUNT(*) AS deals " +
  "FROM bus_opportunity o JOIN bus_user u ON u.id = o.owner_id " +
  "WHERE o.deleted_at IS NULL GROUP BY 1 ORDER BY deals DESC";

describe("parseReportDirective", () => {
  it("reads every key off a real directive, and keeps the SQL whole", () => {
    const report = parseReportDirective(CRM_LINE);
    expect("error" in report).toBe(false);
    if ("error" in report) return;

    expect(report.name).toBe("rep-stalled-deals");
    expect(report.title).toBe("Deals with no activity in 14 days");
    expect(report.entity).toBe("Opportunity");
    expect(report.chart).toBe("bar");
    expect(report.x).toBe("owner");
    expect(report.y).toBe("deals");
    // `help:` is a sentence containing the words "question" and "deal"; a scan
    // that stopped at any word rather than at a key would truncate it.
    expect(report.help).toContain("it is a hope.");
    expect(report.sql.startsWith("SELECT u.first_name")).toBe(true);
    expect(report.sql.endsWith("ORDER BY deals DESC")).toBe(true);
    // The SQL contains both a colon-free `||` and quoted spaces; nothing in it
    // may be mistaken for a key.
    expect(report.sql).toContain("' ' ||");
  });

  it("falls back to the name when there is no title", () => {
    const report = parseReportDirective("%%report open_deals sql: SELECT 1");
    expect("error" in report).toBe(false);
    if ("error" in report) return;
    expect(report.title).toBe("open deals");
  });

  describe("refuses what must never become a statement", () => {
    it.each([
      ["a write", "%%report r sql: DELETE FROM bus_account"],
      ["an update", "%%report r sql: UPDATE bus_account SET name = 'x'"],
      ["a second statement", "%%report r sql: SELECT 1; DROP TABLE bus_account"],
      ["no sql at all", "%%report r title: T"],
    ])("%s", (_label, line) => {
      expect(parseReportDirective(line)).toHaveProperty("error");
    });

    it("allows a semicolon inside a string literal", () => {
      const report = parseReportDirective("%%report r sql: SELECT * FROM t WHERE a = 'x;y'");
      expect("error" in report).toBe(false);
    });

    it("allows a single trailing semicolon", () => {
      const report = parseReportDirective("%%report r sql: SELECT 1;");
      expect("error" in report).toBe(false);
    });
  });

  it("refuses a chart type the language does not declare", () => {
    expect(parseReportDirective("%%report r chart: donut x: a y: b sql: SELECT 1")).toHaveProperty(
      "error"
    );
  });

  it("refuses a chart missing an axis, rather than drawing nothing", () => {
    expect(parseReportDirective("%%report r chart: bar x: a sql: SELECT 1")).toHaveProperty(
      "error"
    );
  });

  /**
   * CLAUDE.md, "Every directive parser anchors at ^%%": a `%%` line that merely
   * mentions a directive is prose, and the language promises prose is inert.
   */
  it("does not compile prose that mentions the directive", () => {
    expect(parseReportDirective("%% Each %%report names a query — see sql: below")).toHaveProperty(
      "error"
    );
  });
});

describe("compileReports", () => {
  const source = [
    "%%report a title: A entity: Account sql: SELECT 1",
    "%%report b title: B entity: Nowhere sql: SELECT 2",
    "%%report a title: Duplicate sql: SELECT 3",
    "%%report c sql: DELETE FROM x",
  ].join("\n");

  it("keeps the first of a duplicated name and warns", () => {
    const warnings: string[] = [];
    const reports = compileReports(source, ["Account"], (m) => warnings.push(m));

    expect(reports.map((r) => r.name)).toEqual(["a", "b"]);
    expect(reports[0]?.title).toBe("A");
    expect(warnings.some((w) => w.includes("declared more than once"))).toBe(true);
  });

  it("ungroups a report naming an entity the model does not declare, but keeps it", () => {
    const warnings: string[] = [];
    const reports = compileReports(source, ["Account"], (m) => warnings.push(m));

    expect(reports.find((r) => r.name === "b")?.entity).toBeUndefined();
    expect(warnings.some((w) => w.includes("which the model does not declare"))).toBe(true);
  });

  it("drops a write and says so, rather than dropping it silently", () => {
    const warnings: string[] = [];
    compileReports(source, ["Account"], (m) => warnings.push(m));
    expect(warnings.some((w) => w.includes("not a SELECT"))).toBe(true);
  });

  it("compiles nothing from a model that declares nothing", () => {
    expect(compileReports("erDiagram\n  Account {\n    uuid id PK\n  }", ["Account"])).toEqual([]);
  });
});

describe("parseModel carries reports through the pipeline", () => {
  /**
   * The seam that was broken. `parseModel` is what both the CLI and the browser
   * generator call; a report that does not survive this call reaches neither.
   */
  it("puts a declared report on ParsedModel, grouped to its entity", () => {
    const model = parseModel(
      [
        "erDiagram",
        "  Account {",
        "    uuid id PK",
        "    string name",
        "  }",
        CRM_LINE.replace("entity: Opportunity", "entity: Account"),
      ].join("\n")
    );

    expect(model.reports).toHaveLength(1);
    expect(model.reports[0]?.name).toBe("rep-stalled-deals");
    expect(model.reports[0]?.entity).toBe("Account");
  });
});
