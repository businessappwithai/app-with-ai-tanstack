/**
 * Tests for the browser stack's sample data.
 *
 * The properties worth holding are the ones that make the rows usable rather
 * than merely present: a foreign key that resolves to a row that exists, a
 * value shaped by the column's reference type, and a second run that produces
 * the same records as the first.
 */

import { describe, expect, it } from "vitest";
import { parseModel } from "../../../pipeline/parse-model";
import { buildSampleData } from "../sample-data";

const MODEL = `%%meta name: Sample Data Probe
%%meta kind: erd

%%enum OrderStatus: draft, placed, shipped, cancelled

erDiagram
    User {
        string id PK
        string full_name
        email  email UK
        boolean is_active
    }
    Vendor {
        string  id PK
        string  vendor_code UK
        string  name
        email   email OPTIONAL
        phone   phone OPTIONAL
        url     website OPTIONAL
        color   brand_colour OPTIONAL
    }
    Order {
        string   id PK
        string   vendor_id FK
        string   created_by_id FK
        string   status
        integer  quantity
        money    total_amount
        date     order_date
        datetime submitted_at OPTIONAL
        text     notes OPTIONAL
        json     payload OPTIONAL
        boolean  is_rush
    }
    Vendor ||--o{ Order : "supplies"
    User   ||--o{ Order : "raises"

%%field Order.status enum: OrderStatus
`;

const parsed = parseModel([MODEL]);
const data = buildSampleData(parsed, { records: 10, seed: "test" });

const rows = (table: string) => data[table] as Array<Record<string, unknown>>;

describe("sample data", () => {
  it("generates the requested number of rows for every entity", () => {
    expect(Object.keys(data)).toHaveLength(3);
    for (const table of Object.keys(data)) expect(rows(table)).toHaveLength(10);
  });

  it("generates nothing when no records are asked for", () => {
    expect(buildSampleData(parsed, { records: 0 })).toEqual({});
  });

  it("emits parents before the children that reference them", () => {
    const order = Object.keys(data);
    expect(order.indexOf("bus_vendor")).toBeLessThan(order.indexOf("bus_order"));
    expect(order.indexOf("bus_user")).toBeLessThan(order.indexOf("bus_order"));
  });

  it("points every foreign key at a row that exists", () => {
    const vendors = new Set(rows("bus_vendor").map((row) => row.id));
    const users = new Set(rows("bus_user").map((row) => row.id));
    for (const order of rows("bus_order")) {
      expect(vendors.has(order.vendor_id)).toBe(true);
      /* `created_by_id` resolves to the user entity by name, not to a
         `CreatedBy` table — the rule the dictionary uses for Table Direct. */
      expect(users.has(order.created_by_id)).toBe(true);
    }
  });

  it("takes enumerated columns from the declared vocabulary", () => {
    const allowed = new Set(["draft", "placed", "shipped", "cancelled"]);
    for (const order of rows("bus_order")) expect(allowed.has(order.status as string)).toBe(true);
  });

  it("shapes each value by its reference type", () => {
    for (const order of rows("bus_order")) {
      expect(typeof order.quantity).toBe("number");
      expect(Number.isInteger(order.quantity)).toBe(true);
      expect(typeof order.total_amount).toBe("number");
      expect(typeof order.is_rush).toBe("boolean");
      expect(order.order_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (order.submitted_at !== null) {
        expect(order.submitted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
      if (order.payload !== null) expect(typeof order.payload).toBe("object");
    }

    for (const vendor of rows("bus_vendor")) {
      if (vendor.email !== null) expect(vendor.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
      if (vendor.phone !== null) expect(vendor.phone).toMatch(/^\+\d/);
      if (vendor.website !== null) expect(vendor.website).toMatch(/^https:\/\//);
      /* `brand_colour` is a plain string today: the parser maps the `color`
         alias onto `string` and does not keep the alias, so no reference type
         records that the column is a colour and nothing downstream can know.
         The generator here is ready for COLOR when the alias survives; until
         then the column is text, and this asserts what actually happens. */
      if (vendor.brand_colour !== null) expect(typeof vendor.brand_colour).toBe("string");
    }
  });

  it("keeps unique columns unique", () => {
    const codes = rows("bus_vendor").map((row) => row.vendor_code);
    expect(new Set(codes).size).toBe(codes.length);
    const emails = rows("bus_user").map((row) => row.email);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("never leaves a required column empty", () => {
    for (const order of rows("bus_order")) {
      for (const column of [
        "id",
        "vendor_id",
        "status",
        "quantity",
        "total_amount",
        "order_date",
      ]) {
        expect(order[column]).not.toBeNull();
      }
    }
  });

  it("leaves some optional columns empty, so a screen looks real", () => {
    const optional = rows("bus_order").filter((row) => row.notes === null || row.payload === null);
    expect(optional.length).toBeGreaterThan(0);
  });

  it("produces the same rows for the same seed, and different rows for another", () => {
    expect(buildSampleData(parsed, { records: 10, seed: "test" })).toEqual(data);
    expect(buildSampleData(parsed, { records: 10, seed: "other" })).not.toEqual(data);
  });

  it("survives a model whose only reference is to itself", () => {
    const selfReferential = parseModel([
      `%%meta name: Self Reference
%%meta kind: erd
erDiagram
    Category {
        string id PK
        string name
        string category_id FK OPTIONAL
    }
    Category ||--o{ Category : "contains"
`,
    ]);
    const generated = buildSampleData(selfReferential, { records: 5, seed: "test" });
    const categories = generated["bus_category"] as Array<Record<string, unknown>>;
    expect(categories).toHaveLength(5);
    /* The first row has no earlier row to point at; later ones may. */
    expect(categories[0]?.category_id).toBeNull();
    const ids = new Set(categories.map((row) => row.id));
    for (const row of categories) {
      if (row.category_id !== null) expect(ids.has(row.category_id)).toBe(true);
    }
  });
});
