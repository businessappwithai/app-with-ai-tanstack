/**
 * `%%entity <E> icon: <name>` reaches the entity.
 *
 * It used to be accepted by the checker and read by nothing: `sys_table.icon`
 * took a column default, so every entity card in a generated application drew
 * the same icon whatever the model said. The specification described the key
 * as though it worked, which is the worst of the three states — a modeller
 * writing it got no diagnostic and no icon.
 *
 * These cases are about the parse. That the value then lands in the seed is
 * held by `templates/__tests__/seed-entity-icon.test.ts`, which reads the
 * rendered SQL rather than this object.
 */

import { describe, expect, it } from "vitest";
import { MermaidParser } from "../mermaid.parser";

const parser = new MermaidParser();

/** A model with one entity, plus whatever directive lines are being tested. */
function model(...directives: string[]): string {
  return [
    ...directives,
    "erDiagram",
    "  Patient {",
    "    string id PK",
    "    string name",
    "  }",
    "",
    "  Invoice {",
    "    string id PK",
    "    string patient_id FK",
    "  }",
  ].join("\n");
}

describe("%%entity icon:", () => {
  it("hangs the icon on the entity it names", () => {
    const { entities } = parser.parse(model("%%entity Patient icon: stethoscope"));

    expect(entities.find((e) => e.name === "Patient")?.icon).toBe("stethoscope");
  });

  it("leaves an entity the directive does not name alone", () => {
    const { entities } = parser.parse(model("%%entity Patient icon: stethoscope"));

    // Undefined, not an empty string: the seed writes NULL for this and the
    // card falls back to its default. An empty string would be an icon named
    // "" and would render the placeholder instead.
    expect(entities.find((e) => e.name === "Invoice")?.icon).toBeUndefined();
  });

  it("says nothing when the model declares no icon at all", () => {
    const { entities } = parser.parse(model());

    expect(entities.every((e) => e.icon === undefined)).toBe(true);
  });

  it("drops a directive naming an entity the document does not declare", () => {
    // EML141 reports this. Inventing the entity here would be a table the
    // schema has no place for — the same rule `help:` follows.
    const { entities } = parser.parse(model("%%entity Ghost icon: ghost"));

    expect(entities.map((e) => e.name)).toEqual(["Patient", "Invoice"]);
    expect(entities.every((e) => e.icon === undefined)).toBe(true);
  });

  it("takes the name verbatim, in whichever case it was written", () => {
    /*
     * No normalisation here on purpose. The renderer resolves PascalCase,
     * kebab-case and snake_case to one icon (`normalizeIconName` in the
     * generated `ui/icon.tsx`), and doing it twice would mean two answers to
     * maintain — this one running at generate time, against a lucide version
     * the generator does not have.
     */
    const { entities } = parser.parse(
      model("%%entity Patient icon: LayoutGrid", "%%entity Invoice icon: file_text")
    );

    expect(entities.find((e) => e.name === "Patient")?.icon).toBe("LayoutGrid");
    expect(entities.find((e) => e.name === "Invoice")?.icon).toBe("file_text");
  });

  it("does not read a line that merely mentions the directive", () => {
    /*
     * Every directive parser anchors at `^%%`, and prose is inert. A comment
     * describing the key must not set one.
     */
    const { entities } = parser.parse(
      model("%% write %%entity Patient icon: stethoscope to give it an icon")
    );

    expect(entities.find((e) => e.name === "Patient")?.icon).toBeUndefined();
  });

  it("keeps help, parent and icon on the same entity independent", () => {
    const { entities } = parser.parse(
      model(
        "%%entity Patient icon: stethoscope",
        "%%entity Patient help: Someone the hospital is treating.",
        "%%entity Invoice parent: Patient"
      )
    );

    const patient = entities.find((e) => e.name === "Patient");
    expect(patient?.icon).toBe("stethoscope");
    expect(patient?.description).toBe("Someone the hospital is treating.");
    expect(entities.find((e) => e.name === "Invoice")?.parentEntity).toBe("Patient");
  });
});
