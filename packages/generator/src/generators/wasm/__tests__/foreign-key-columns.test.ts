/**
 * The browser schema types a foreign key the way the NestJS schema does.
 *
 * `sqlType` had no case for `isForeignKey`, so every FK column fell through to
 * `VARCHAR(255)` while every `id` was `UUID`. The stated justification — that
 * the NestJS stack did the same — was not true: `bus-tables.migration.ts.hbs`
 * emits `UUID` for every column carrying the `FK` modifier.
 *
 * Two things followed, both silent:
 *
 *   - every foreign-key constraint was skipped, because the emitter only writes
 *     one when the column and the key it points at are the same type. The
 *     browser application had no referential integrity at all;
 *   - any join of `parent.id = child.parent_id` failed with `operator does not
 *     exist: uuid = character varying`. Nothing in the runtime joined two
 *     tables, so nothing noticed until the model's own `%%report` queries —
 *     which are exactly that shape — were compiled into it.
 */

import { describe, expect, it } from "vitest";
import { parseModel } from "../../../pipeline/parse-model";
import { buildModelBundle } from "../model-bundle";

const MODEL = [
  "erDiagram",
  "  Account ||--o{ Opportunity : has",
  "  Account {",
  "    uuid id PK",
  "    string name",
  "  }",
  "  Opportunity {",
  "    uuid id PK",
  "    string name",
  "    uuid account_id FK",
  "    decimal amount",
  "  }",
].join("\n");

const PROJECT = {
  name: "Test App",
  version: "1.0.0",
  description: "",
  adminEmail: "admin@admin.com",
  adminName: "Admin",
  adminPassword: "admin",
};

describe("the browser schema's foreign keys", () => {
  const { schema, model } = buildModelBundle(parseModel(MODEL), PROJECT);

  it("declares an FK column as UUID, not VARCHAR", () => {
    expect(schema).toMatch(/account_id UUID/);
    expect(schema).not.toMatch(/account_id VARCHAR/);
  });

  it("emits the foreign-key constraint the relationship declares", () => {
    // Skipped entirely while the types disagreed — 0 constraints on a model
    // with 28 relationships.
    expect(schema).toContain(
      "ADD CONSTRAINT fk_bus_opportunity_account_id FOREIGN KEY (account_id) REFERENCES bus_account(id)"
    );
  });

  it("reports the same type in the dictionary the screens read", () => {
    const opportunity = model.entities.find((entity) => entity.name === "Opportunity");
    const column = opportunity?.attributes.find((a) => a.columnName === "account_id");
    expect(column?.sqlType).toBe("UUID");
  });

  it("leaves a non-key string column alone", () => {
    expect(schema).toMatch(/name VARCHAR/);
  });
});

describe("the browser bundle carries the model's reports", () => {
  const WITH_REPORT = `${MODEL}
%%report open-by-account title: Open deals by account entity: Opportunity chart: bar x: account y: deals help: Which customers are actually in play. sql: SELECT a.name AS account, COUNT(*) AS deals FROM bus_opportunity o JOIN bus_account a ON a.id = o.account_id GROUP BY 1`;

  it("resolves each report's entity to the table the runtime queries", () => {
    const { model } = buildModelBundle(parseModel(WITH_REPORT), PROJECT);
    expect(model.reports).toHaveLength(1);
    expect(model.reports[0]).toMatchObject({
      name: "open-by-account",
      entity: "Opportunity",
      tableName: "bus_opportunity",
      chart: "bar",
      x: "account",
      y: "deals",
    });
  });

  it("carries no reports for a model that declares none", () => {
    const { model } = buildModelBundle(parseModel(MODEL), PROJECT);
    expect(model.reports).toEqual([]);
  });
});
