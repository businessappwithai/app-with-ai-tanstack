/**
 * Eight rules drawn node by node in the graph editor — the Expression,
 * Function and Switch nodes the decision table cannot express — each
 * configured, tried in "Try it", saved and reopened. Page only: nothing here
 * calls an API.
 *
 * `GRAPH_ONLY=<substring>` runs the rules whose name contains it.
 */

import { expect, type Page, test } from "@playwright/test";
import { RuleGraph } from "../lib/rule-graph";
import { runTryIt, startRule, type TryItAnswer } from "../lib/rule-table";
import { type Author, authorWithProject, browserAs, logicPath, railRuleName } from "../lib/session";

interface GraphRule {
  name: string;
  entity: string;
  /** Nodes to add, in order, between the Record and the Response. */
  chain: Array<
    | { kind: "Expression"; rows: Array<[string, string]> }
    | { kind: "Function"; body: string }
    | { kind: "Switch"; condition: string }
  >;
  tryIt: Array<{ sample: Record<string, unknown>; expect: TryItAnswer; message?: string }>;
}

const fn = (lines: string[]) => ({
  kind: "Function" as const,
  body: ["export const handler = async (input) => {", ...lines.map((l) => `  ${l}`), "};"].join(
    "\n"
  ),
});

const RULES: GraphRule[] = [
  {
    name: "Graph expression only",
    entity: "AttendanceRecord",
    chain: [{ kind: "Expression", rows: [["isLate", "minutes_late >= 15"]] }],
    // An expression gives a value but no action, so the application does nothing with it.
    tryIt: [{ sample: { minutes_late: 20 }, expect: "nothing" }],
  },
  {
    name: "Graph function blocks",
    entity: "Payment",
    chain: [
      fn([
        'if (input.amount > 10000) return { action: "validation-error", message: "Too large for one payment" };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      { sample: { amount: 20000 }, expect: "blocks", message: "Too large for one payment" },
      { sample: { amount: 20 }, expect: "allows" },
    ],
  },
  {
    name: "Graph function transforms",
    entity: "AttendanceRecord",
    chain: [
      fn([
        'if (input.minutes_late >= 15) return { action: "transform", transformData: { status: "late" } };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      { sample: { minutes_late: 30 }, expect: "changes" },
      { sample: { minutes_late: 1 }, expect: "allows" },
    ],
  },
  {
    name: "Graph function string check",
    entity: "Student",
    chain: [
      fn([
        'if ((input.school_email || "").endsWith("@gmail.com")) return { action: "validation-error", message: "Use the school address" };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      {
        sample: { school_email: "a@gmail.com" },
        expect: "blocks",
        message: "Use the school address",
      },
      { sample: { school_email: "a@school.edu" }, expect: "allows" },
    ],
  },
  {
    name: "Graph expression then function",
    entity: "FeeInvoice",
    chain: [
      { kind: "Expression", rows: [["owing", "balance_due > 0"]] },
      fn([
        'if (input.owing && input.status === "cancelled") return { action: "validation-error", message: "Settle the balance first" };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      {
        sample: { status: "cancelled", balance_due: 10 },
        expect: "blocks",
        message: "Settle the balance first",
      },
      { sample: { status: "issued", balance_due: 10 }, expect: "allows" },
    ],
  },
  {
    name: "Graph switch passes through",
    entity: "Student",
    chain: [{ kind: "Switch", condition: "status != null" }],
    tryIt: [{ sample: { status: "enrolled" }, expect: "nothing" }],
  },
  {
    name: "Graph function reads dates",
    entity: "AcademicTerm",
    chain: [
      fn([
        'if (input.starts_on && input.ends_on && input.starts_on > input.ends_on) return { action: "validation-error", message: "A term cannot end before it starts" };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      { sample: { starts_on: "2026-09-01", ends_on: "2026-01-01" }, expect: "blocks" },
      { sample: { starts_on: "2026-01-01", ends_on: "2026-09-01" }, expect: "allows" },
    ],
  },
  {
    name: "Graph function booleans",
    entity: "StudentGuardian",
    chain: [
      fn([
        'if (!input.may_collect && !input.is_primary_contact) return { action: "validation-error", message: "Someone must collect" };',
        'return { action: "allow" };',
      ]),
    ],
    tryIt: [
      { sample: { may_collect: false, is_primary_contact: false }, expect: "blocks" },
      { sample: { may_collect: true, is_primary_contact: false }, expect: "allows" },
    ],
  },
];

const only = process.env.GRAPH_ONLY;
const rules = RULES.filter((r) => !only || r.name.includes(only));

async function configure(
  page: Page,
  graph: RuleGraph,
  node: GraphRule["chain"][number],
  name: string
) {
  if (node.kind === "Expression") {
    await graph.node(name).getByText("Edit Expression").click();
    for (const [i, [key, expr]] of node.rows.entries()) {
      await graph.editor
        .getByText("Add row", { exact: true })
        .locator("visible=true")
        .first()
        .click();
      const editor = (await graph.editor.boundingBox())!;
      const y = editor.y + 107 + i * 40;
      await page.mouse.click(editor.x + 140, y);
      await page.keyboard.insertText(key);
      await page.mouse.click(editor.x + 520, y);
      await page.keyboard.insertText(expr);
      await page.keyboard.press("Escape");
    }
    await graph.openTab("Graph");
  } else if (node.kind === "Function") {
    await graph.node(name).getByText("Edit Function").click();
    await expect(graph.editor.locator(".monaco-editor >> visible=true").first()).toBeVisible({
      timeout: 30_000,
    });
    await graph.typeIntoCodeBox(node.body);
    await expect.poll(() => graph.codeBoxes()).toContainEqual(expect.stringContaining("handler"));
    await graph.openTab("Graph");
  } else {
    const condition = graph.node(name).locator("input, textarea, .cm-content").first();
    await condition.click();
    await page.keyboard.insertText(node.condition);
  }
}

test.describe("graph rules — drawn node by node", () => {
  let author: Author;
  test.beforeAll(async ({ playwright }) => {
    author = await authorWithProject(playwright, "graph-rules");
  });
  test.afterAll(async () => {
    await author.session.request.dispose();
  });

  for (const rule of rules) {
    test(`${rule.name} (${rule.entity})`, async ({ browser }, testInfo) => {
      test.setTimeout(300_000);
      const context = await browserAs(browser, author);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const graph = new RuleGraph(page);

      await page.goto(logicPath(author));
      await expect(page.getByText("Loading the model…")).toHaveCount(0, { timeout: 60_000 });
      await startRule(page, graph, rule);
      await graph.clear();
      await graph.add("Record");
      const names: string[] = [];
      const counts: Record<string, number> = {};
      for (const node of rule.chain) {
        await graph.add(node.kind);
        counts[node.kind] = (counts[node.kind] ?? 0) + 1;
        names.push(`${node.kind.toLowerCase()}${counts[node.kind]}`);
      }
      await graph.add("Response");
      const path = ["Record", ...names, "response"];
      for (let i = 0; i < path.length - 1; i++) {
        await graph.link(path[i] as string, path[i + 1] as string, 0);
      }
      for (const [i, node] of rule.chain.entries()) {
        await configure(page, graph, node, names[i] as string);
      }
      await testInfo.attach("graph", {
        body: await graph.editor.screenshot(),
        contentType: "image/png",
      });
      for (const t of rule.tryIt) await runTryIt(page, t.sample, t.expect, t.message);

      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText(/Saved to the model/)).toBeVisible({ timeout: 20_000 });
      await page.reload();
      await page
        .locator("aside")
        .first()
        .getByText(railRuleName(rule.name), { exact: true })
        .first()
        .click();
      await graph.waitReady();
      await expect(graph.nodes).toHaveCount(rule.chain.length + 2);
      expect(errors, "no uncaught error in the page").toEqual([]);
      await context.close();
    });
  }
});
