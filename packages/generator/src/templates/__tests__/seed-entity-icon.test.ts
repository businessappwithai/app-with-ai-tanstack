/**
 * Regression: `%%entity <E> icon:` was accepted and compiled into nothing.
 *
 * The checker has always allowed the key — it is in `validEntityKeys` — and the
 * specification described it beside `%%category icon:` as though the two
 * behaved alike. They did not. `category.parser.ts` read the category's icon
 * and seeded `sys_category.icon`; nothing read the entity's, so the `sys_table`
 * insert never carried an `icon` column and every entity card in a generated
 * application drew the same default whatever the model asked for.
 *
 * That is the worst of the three possible states: a modeller who wrote the key
 * got no diagnostic saying it was ignored and no icon showing it was not. The
 * only way to find out was to read the seed.
 *
 * `sys_table.icon` is also where the Application Dictionary's upload field
 * writes, so the property held here is narrow and specific: the model's value
 * reaches the insert, and an entity the model says nothing about gets `null`
 * rather than a guess — because a guessed icon is indistinguishable from one
 * somebody chose.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Entity } from "@appwithai/core/types";
import { entityToBusEntity } from "@appwithai/core/types";
import Handlebars from "handlebars";
import { describe, expect, it } from "vitest";
import { TemplateLoader } from "../loader";

// Constructing one registers the helpers the template calls.
new TemplateLoader(join(import.meta.dirname, "../../../templates"));

const TEMPLATE = readFileSync(
  join(import.meta.dirname, "../../../templates/common/seeds/sys-dictionary.ts.hbs"),
  "utf8"
);

const entity = (name: string, icon?: string): Entity => ({
  name,
  tableName: `bus_${name.toLowerCase()}`,
  primaryKey: `${name.toLowerCase()}_id`,
  timestamps: true,
  ...(icon ? { icon } : {}),
  attributes: [{ name: `${name.toLowerCase()}_id`, type: "string", required: true }],
});

const render = (entities: Entity[]) =>
  Handlebars.compile(TEMPLATE, { noEscape: true })({
    now: "2026-09-19T00:00:00.000Z",
    config: { createdBy: "System" },
    entities: entities.map((e) => entityToBusEntity(e)),
  });

/** The `sys_table` insert for one entity, and nothing of its neighbours. */
function tableInsert(rendered: string, tableName: string): string {
  const at = rendered.indexOf(`table_name: '${tableName}'`);
  expect(at, `no sys_table insert for ${tableName}`).toBeGreaterThan(-1);
  return rendered.slice(at, rendered.indexOf("}).execute()", at));
}

describe("the generated dictionary seed", () => {
  it("writes the model's icon to sys_table.icon", () => {
    const rendered = render([entity("Patient", "stethoscope")]);

    expect(tableInsert(rendered, "bus_patient")).toContain(`icon: "stethoscope"`);
  });

  it("writes null for an entity the model gives no icon", () => {
    const rendered = render([entity("Invoice")]);

    expect(tableInsert(rendered, "bus_invoice")).toContain("icon: null");
  });

  it("keeps each entity's icon to its own row", () => {
    const rendered = render([
      entity("Patient", "stethoscope"),
      entity("Invoice"),
      entity("Ward", "bed-double"),
    ]);

    expect(tableInsert(rendered, "bus_patient")).toContain(`icon: "stethoscope"`);
    expect(tableInsert(rendered, "bus_invoice")).toContain("icon: null");
    expect(tableInsert(rendered, "bus_ward")).toContain(`icon: "bed-double"`);
  });

  it("quotes an icon name the way it quotes any other model string", () => {
    /*
     * Through `tsString`, not `'{{icon}}'`. The value is a lucide id today, but
     * the column it lands in also holds a `data:` URI an administrator
     * uploaded, and the seed is TypeScript being written to disk: a raw
     * interpolation of anything carrying an apostrophe closes the literal and
     * takes the generated application's compile with it. That is exactly how
     * `%%entity Opportunity help:` broke this same file once.
     */
    const rendered = render([entity("Note", "it's-a-note")]);

    expect(tableInsert(rendered, "bus_note")).toContain(String.raw`icon: "it's-a-note"`);
  });
});
