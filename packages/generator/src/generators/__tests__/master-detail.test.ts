/**
 * Parent and child, from the one directive that declares it to the dictionary
 * rows the running application reads.
 *
 * `%%entity <Child> parent: <Parent>` is the only place a model can say that an
 * entity has no life away from its owner — the ERD cannot, because
 * `InvoiceLine.invoice_id` and `Invoice.customer_id` are the same shape. What
 * the directive buys is an arrangement: no window and no dashboard card for the
 * child, a tab inside the parent's window instead, linked on the foreign key the
 * child already declared. Every assertion below is about one step of that, and
 * each of them has been silently wrong at some point:
 *
 *  - the child kept a window, so it got a dashboard card as well as a tab;
 *  - the tab was created but `link_column_id` was never set, so the detail list
 *    showed every row of the child table under every parent record;
 *  - the column was never marked `is_parent`, which is what the browser bundle
 *    and the NestJS seed both read to find the link.
 *
 * The checker half is here for the same reason: EML149 is the only thing that
 * notices an entity shaped like a line item that never says so, and a model that
 * never says so generates the arrangement this file exists to prevent.
 */

import { describe, expect, it } from "vitest";
import { checkSource } from "../../../../../language/checker";
import { parseModel } from "../../pipeline/parse-model";
import { DictionaryGenerator } from "../dictionary.generator";

/**
 * An invoice with lines, and a customer the invoice merely references.
 *
 * The two foreign keys are deliberately identical in shape — that is the whole
 * point of the directive, and a fixture where they differed would test nothing.
 */
const MODEL = `%%meta name: Billing
erDiagram
    Customer {
        string id PK
        string name
    }
    Invoice {
        string id PK
        string reference
        string customer_id FK
    }
    InvoiceLine {
        string id PK
        string invoice_id FK
        string description
        decimal amount
    }
    Customer ||--o{ Invoice : "billed"
    Invoice ||--o{ InvoiceLine : "contains"
    %%entity Customer help: An organisation the business bills.
    %%entity Invoice help: A demand for payment issued to a customer.
    %%entity InvoiceLine parent: Invoice
    %%entity InvoiceLine help: One charge on an invoice.
    %%category name: Billing; entities: Customer, Invoice
`;

function dictionaryFor(source: string) {
  const model = parseModel(source);
  const generator = new DictionaryGenerator({ projectName: "billing" });
  return {
    model,
    dictionary: generator.generateDictionaryContext(model.entities, model.relationships),
  };
}

describe("%%entity parent: — the dictionary arrangement", () => {
  const { model, dictionary } = dictionaryFor(MODEL);

  it("hangs the parent on the child at parse time, with the column to link on", () => {
    const line = model.entities.find((entity) => entity.name === "InvoiceLine");
    expect(line?.parentEntity).toBe("Invoice");
    expect(line?.parentLinkColumn).toBe("invoice_id");

    // The reference is untouched: an invoice still points at a customer who
    // exists independently, and nothing about that is master-detail.
    expect(
      model.entities.find((entity) => entity.name === "Invoice")?.parentEntity
    ).toBeUndefined();
  });

  it("gives the child no window of its own", () => {
    const windowTables = new Set(dictionary.sysWindows.map((window) => window._tableRef));
    const tableIdOf = (name: string) =>
      dictionary.sysTables.find((table) => table.table_name === name)?._tempId;

    expect(windowTables.has(tableIdOf("bus_invoice") as string)).toBe(true);
    expect(windowTables.has(tableIdOf("bus_customer") as string)).toBe(true);
    expect(windowTables.has(tableIdOf("bus_invoice_line") as string)).toBe(false);
  });

  it("puts the child's tab inside the parent's window, one level down", () => {
    const tableIdOf = (name: string) =>
      dictionary.sysTables.find((table) => table.table_name === name)?._tempId;
    const tabFor = (name: string) =>
      dictionary.sysTabs.find((tab) => tab._tableRef === tableIdOf(name));

    const invoiceTab = tabFor("bus_invoice");
    const lineTab = tabFor("bus_invoice_line");

    expect(invoiceTab?.tab_level).toBe(0);
    expect(lineTab?.tab_level).toBe(1);
    expect(lineTab?.sys_window_id).toBe(invoiceTab?.sys_window_id);
    // Sequenced after the master tab, never before it.
    expect(Number(lineTab?.seq_no)).toBeGreaterThan(Number(invoiceTab?.seq_no));
  });

  it("links the tab on the child's own foreign key, and marks that column", () => {
    const lineTable = dictionary.sysTables.find((table) => table.table_name === "bus_invoice_line");
    const lineTab = dictionary.sysTabs.find((tab) => tab._tableRef === lineTable?._tempId);
    const linkColumn = dictionary.sysColumns.find(
      (column) => column._tempId === lineTab?.link_column_id
    );

    expect(linkColumn?.column_name).toBe("invoice_id");
    expect(linkColumn?.is_parent).toBe(true);

    // Nothing else is marked: `Invoice.customer_id` is a reference, and marking
    // it would put invoices in a tab under the customer.
    const marked = dictionary.sysColumns
      .filter((column) => column.is_parent)
      .map((column) => column.column_name);
    expect(marked).toEqual(["invoice_id"]);
  });

  it("points the child's table at the window its records are reached through", () => {
    const invoiceTable = dictionary.sysTables.find((table) => table.table_name === "bus_invoice");
    const lineTable = dictionary.sysTables.find((table) => table.table_name === "bus_invoice_line");
    const invoiceTab = dictionary.sysTabs.find((tab) => tab._tableRef === invoiceTable?._tempId);

    expect(lineTable?.sys_window_id).toBe(invoiceTab?.sys_window_id);
  });

  it("arranges the same way when the child is declared before its parent", () => {
    const reordered = MODEL.replace(
      /    Invoice \{[\s\S]*?\n    \}\n(    InvoiceLine \{[\s\S]*?\n    \}\n)/,
      (_match, line: string) =>
        `${line}    Invoice {\n        string id PK\n        string reference\n        string customer_id FK\n    }\n`
    );
    const { dictionary: out } = dictionaryFor(reordered);

    const tableIdOf = (name: string) =>
      out.sysTables.find((table) => table.table_name === name)?._tempId;
    const lineTab = out.sysTabs.find((tab) => tab._tableRef === tableIdOf("bus_invoice_line"));
    const invoiceTab = out.sysTabs.find((tab) => tab._tableRef === tableIdOf("bus_invoice"));

    expect(lineTab?.tab_level).toBe(1);
    expect(lineTab?.sys_window_id).toBe(invoiceTab?.sys_window_id);
  });
});

describe("EML149 — an entity shaped like a line item that never says so", () => {
  it("stays quiet on a model that declares its parent", () => {
    const codes = checkSource(MODEL).issues.map((issue) => issue.code);
    expect(codes).not.toContain("EML149");
    expect(codes).not.toContain("EML150");
  });

  it("names the candidate and its parent when the directive is missing", () => {
    const source = MODEL.replace("    %%entity InvoiceLine parent: Invoice\n", "");
    const report = checkSource(source);
    const found = report.issues.filter((issue) => issue.code === "EML149");

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("info");
    expect(found[0]?.message).toContain("InvoiceLine");
    expect(found[0]?.message).toContain("Invoice");
    // Never an error: whether a list of these away from their owner is useful
    // is a question about the business, not about the document.
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("does not fire on a plain reference", () => {
    // Invoice references Customer and is named nothing like it, which is what
    // most foreign keys look like.
    const source = MODEL.replace("    %%entity InvoiceLine parent: Invoice\n", "");
    const found = checkSource(source)
      .issues.filter((issue) => issue.code === "EML149")
      .map((issue) => issue.message);
    expect(found.join(" ")).not.toContain("Customer");
  });

  it("finds a line item whose parent's name is not a prefix of its own", () => {
    const source = `%%meta name: Advice
erDiagram
    Recommendation {
        string id PK
        string name
    }
    InvestmentRecommendation {
        string id PK
        string name
    }
    RecommendationItem {
        string id PK
        string investment_recommendation_id FK
        decimal weight
    }
    InvestmentRecommendation ||--o{ RecommendationItem : "proposes"
`;
    const found = checkSource(source).issues.filter((issue) => issue.code === "EML149");
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("RecommendationItem");
    expect(found[0]?.message).toContain("InvestmentRecommendation");
  });
});

describe("EML150 — a child on the dashboard it cannot appear on", () => {
  it("reports a declared child that is still named in a %%category", () => {
    const source = MODEL.replace(
      "%%category name: Billing; entities: Customer, Invoice",
      "%%category name: Billing; entities: Customer, Invoice, InvoiceLine"
    );
    const report = checkSource(source);
    const found = report.issues.filter((issue) => issue.code === "EML150");

    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain("InvoiceLine");
  });
});
