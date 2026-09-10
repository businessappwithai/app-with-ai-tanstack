/**
 * Regression: the model's own help text never reached the running application.
 *
 * `%%entity <E> help:` and `%%field <E>.<c> help:` are the only place a model
 * says what something is *for* rather than what shape it is, and CLAUDE.md
 * states where it lands: "It becomes `sys_column.description`, which the
 * generated form renders under the control and the Application Dictionary shows
 * beside the column." Neither was true. The dictionary seed never wrote
 * `sys_column.description` at all, and the help it did write — `sys_field.help`,
 * which is what the form actually renders — was composed entirely from the
 * column's shape, so a model with a paragraph on every column produced an
 * application saying "The Student Number of this Student. Required — the record
 * cannot be saved while this is empty."
 *
 * It was invisible from the generator: the manual renders from the parsed model
 * directly and read perfectly, while the application it shipped beside carried
 * none of the same prose.
 *
 * The composed sentences are kept — "required" and "must be unique" are facts
 * the author's sentence does not carry — so the property held here is that the
 * author's words come first and the derived ones follow, in both places.
 *
 * Found by /qa on 2026-09-10 against an Education Management System model.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entity } from "@appwithai/core/types";
import { entityToBusEntity } from "@appwithai/core/types";
import Handlebars from "handlebars";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { TemplateLoader } from "../loader";

// Constructing one registers the helpers the template calls.
new TemplateLoader(join(import.meta.dirname, "../../../templates"));

const TEMPLATE = readFileSync(
  join(import.meta.dirname, "../../../templates/common/seeds/sys-dictionary.ts.hbs"),
  "utf8"
);

const ENTITY_HELP =
  "One child on the school's roll, from the day a place is accepted to the day they leave.";
const COLUMN_HELP =
  "The school's own identifier, unique and unchanging for the child's whole time here.";

const student: Entity = {
  name: "Student",
  tableName: "bus_student",
  description: ENTITY_HELP,
  primaryKey: "student_id",
  timestamps: true,
  attributes: [
    { name: "student_id", type: "string", required: true },
    {
      name: "student_number",
      type: "string",
      required: true,
      unique: true,
      maxLength: 20,
      description: COLUMN_HELP,
    },
    { name: "year_group", type: "integer", required: true },
  ],
};

const rendered = Handlebars.compile(TEMPLATE, { noEscape: true })({
  now: "2026-09-10T00:00:00.000Z",
  config: { createdBy: "System" },
  entities: [entityToBusEntity(student)],
});

/**
 * Run the seed's own help composition, rather than restating it here.
 *
 * The file is self-contained TypeScript up to the point `seed()` is declared —
 * the help model, the sentence builders and the entity list, and nothing that
 * touches a database. Asserting against a copy of those rules in the test would
 * only prove the copy agrees with itself.
 */
function composeHelp(call: string): string {
  const source = rendered.slice(0, rendered.indexOf("export async function seed"));
  const js = ts.transpileModule(`${source}\nglobalThis.__result = ${call};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  // The seed imports kysely and uuid at the top; neither is reached by the help
  // composition, so a stub keeps the module evaluable without pulling either in.
  new Function("require", "exports", js)(() => ({ v4: () => "" }), {});
  return (globalThis as { __result?: string }).__result ?? "";
}

describe("the generated dictionary seed", () => {
  it("writes the column's help text to sys_column.description", () => {
    // The insert has to carry it, not merely the file somewhere.
    const insert = rendered.slice(rendered.indexOf("insertInto('sys_column')"));
    expect(insert).toContain(COLUMN_HELP);
  });

  it("carries the entity's help text into the window and tab help", () => {
    // Both are composed at run time from this list, so it is the list that has
    // to hold the author's sentence.
    const list = rendered.slice(
      rendered.indexOf("const dictionaryHelpEntities"),
      rendered.indexOf("const dictionaryHelp =")
    );
    expect(list).toContain(ENTITY_HELP);
    expect(list).toContain(COLUMN_HELP);
  });

  it("puts the author's sentence before the derived one, and keeps both", () => {
    const help = composeHelp("fieldHelpFor('bus_student', 'student_number')");

    expect(help.startsWith(COLUMN_HELP)).toBe(true);
    // The mechanical clauses the author did not write are still there.
    expect(help).toContain("Required");
    expect(help).toContain("unique");
    expect(help).toContain("20 characters");
  });

  it("still describes a column the model left unexplained", () => {
    // A model with no help text is not a model with no help: the derived
    // sentence is what such an application has always shown, and still does.
    expect(composeHelp("fieldHelpFor('bus_student', 'year_group')")).toContain("whole number");
  });

  it("opens the window and the tab with the entity's own sentence", () => {
    expect(composeHelp("windowHelpFor('bus_student')").startsWith(ENTITY_HELP)).toBe(true);
    expect(composeHelp("tabHelpFor('bus_student')").startsWith(ENTITY_HELP)).toBe(true);
  });
});
