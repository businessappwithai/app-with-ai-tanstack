/**
 * The generated application's own rule editor, held to the application it is in.
 *
 * Found by generating the education model and creating a rule through Admin →
 * Business Rules in a browser:
 *
 *  - the entity picker listed Patient, Appointment, Claim, Account and
 *    Opportunity — a hard-coded list from older models — and none of the
 *    application's own record types;
 *  - its Action picker offers EML's `validation-error`, which the engine's
 *    `validate()` does not read: it refuses a write only on `prevent`, so a
 *    rule saved from the editor matched and refused nothing.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TEMPLATES = path.resolve(__dirname, "../../../templates/tanstack-start-nestjs");
const read = (file: string) => readFileSync(path.join(TEMPLATES, file), "utf8");
const GENERATOR = readFileSync(
  path.resolve(
    __dirname,
    "../../generators/tanstack-start-nestjs/tanstack-start-frontend.generator.ts"
  ),
  "utf8"
);

describe("the generated rule editor", () => {
  const newRule = read("frontend/src/routes/admin/rules/new.tsx");
  const editRule = read("frontend/src/routes/admin/rules/$id.edit.tsx");

  it("offers the application's own record types, not another model's", () => {
    for (const leftover of ["bus_patient", "bus_claim", '"Account"', "bus_opportunity"]) {
      expect(newRule, `new.tsx still names ${leftover}`).not.toContain(leftover);
      expect(editRule, `$id.edit.tsx still names ${leftover}`).not.toContain(leftover);
    }
    expect(newRule).toContain("useRuleEntities()");
  });

  it("gives the table its entity's fields in both screens", () => {
    expect(newRule).toContain("entityFields={entityFields}");
    expect(editRule).toContain("entityFields={entityFields}");
  });

  // ISSUE-006 (/qa, 2026-09-25): bus_admission_application ran over the
  // Operation column of the rules list.
  it("keeps a long table name inside its column in the rules list", () => {
    const list = read("frontend/src/routes/admin/rules/index.tsx");
    expect(list).toMatch(/col-span-2 min-w-0">\s*<code\s+className="block truncate/);
  });

  it("ships the hook those screens import", () => {
    expect(read("frontend/src/hooks/use-rule-entities.ts")).toContain("tableId=");
    expect(GENERATOR).toContain('src: "src/hooks/use-rule-entities.ts"');
  });
});

describe("the generated rules engine", () => {
  const engine = read("backend/src/modules/rules/rules-engine.service.ts.hbs");

  it("reads the editor's validation-error as the refusal it means", () => {
    expect(engine).toMatch(/type === 'validation-error' \? 'prevent'/);
    expect(engine).not.toContain("type: v.action as RuleAction['type']");
  });
});

describe("the generated engine reads what the rule editor saves", () => {
  const engine = read("backend/src/modules/rules/rules-engine.service.ts.hbs");
  const bus = read("backend/src/modules/bus/bus.service.ts.hbs");

  // The editor saves a bare `{ inputs, outputs, rules }` table; the engine
  // wanted a JDM graph and answered "missing field `nodes`" for every rule
  // created, or re-saved, in the editor — so none of them refused anything.
  it("wraps a saved decision table in the graph the engine evaluates", () => {
    expect(engine).toContain("createDecision(Buffer.from(this.asJdmGraph(jdmContent)))");
    expect(engine).toContain("type: 'decisionTableNode'");
  });

  // PostgreSQL returns NUMERIC as "1.500000"; an update is checked against the
  // stored row, and `> 0` never fits a string.
  it("compares the dictionary's number columns as numbers", () => {
    expect(bus).toContain("const data = await this.withNumericValues(tableName, record);");
    expect(bus).toMatch(/sys_reference_id === 11 \|\| column\.sys_reference_id === 12/);
  });
});

describe("the generated automations screen keeps what is built in it", () => {
  const service = read("backend/src/modules/workflow-definitions/workflow-definitions.service.ts");
  const page = read("frontend/src/routes/admin/automations.tsx.hbs");

  // The update wrote every field but the automation's document, so a draft
  // and Publish alike kept the steps it was created with — none.
  it("saves the automation's document on update", () => {
    expect(service).toContain("updates.mermaid_code = dto.mermaid;");
  });

  it("saves drafts as they are edited, and creates them inactive", () => {
    expect(page).toContain("saveDraft(next);");
    expect(page).toContain("isActive: false,");
  });

  // ISSUE-008 (/qa, 2026-09-25): every "+ New automation" stores a draft and
  // nothing could remove one, so the rail filled with "Untitled automation".
  it("can delete an automation, in two clicks", () => {
    expect(page).toContain("method: 'DELETE'");
    expect(page).toContain("Click again to delete");
    expect(page).not.toMatch(/\bconfirm\(['"`]/);
  });
});

describe("the generated report designer", () => {
  // `reports.$tableName.tsx` is a child of `reports.tsx`; with no Outlet the
  // list rendered in its place and no entity's designer could be opened.
  it("lets the list hand over to the designer beneath it", () => {
    const list = read("frontend/src/routes/admin/reports.tsx");
    expect(list).toContain("useChildMatches()");
    expect(list).toContain("<Outlet />");
  });

  // Dates printed as midnight timestamps and NUMERIC as "1.500000".
  it("prints a value the way its column is typed", () => {
    const modal = read("frontend/src/components/reports/ReportPrintModal.tsx");
    expect(modal).toContain("typedDisplay(Number(field.sys_reference_id))");
    expect(modal).toContain('timeZone: "UTC"');
  });
});
