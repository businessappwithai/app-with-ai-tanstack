/**
 * Create, read, update and delete — every one of them, for every rule and every
 * workflow, through the page, against the education model.
 *
 *   53 business rules: the 42 decision tables of `scenarios/rule-catalogue.ts`
 *     (every operator, every answer, one to three inputs) and the 11 graphs of
 *     `scenarios/graph-rule-catalogue.ts` (Expression, Function and Switch nodes,
 *     singly and chained).
 *   50 workflows: the 16 lifecycles, 12 status machines and 22 processes of
 *     `scenarios/workflow-catalogue.ts` (every hook, every step type, every test).
 *
 * Each test is one rule or workflow taken through its whole life:
 *
 *   create  built in the editor, tried (rules), saved; the server holds it once
 *   read    the page reloaded, opened from the rail, shown as it was built
 *   update  renamed and changed — a rule's message, priority or function; a
 *           lifecycle's extra hook, a status machine's extra state and move, a
 *           process's extra step — saved, reloaded and read back; the server holds
 *           the new one and nothing under the old name
 *   delete  removed from the rail, saved, reloaded: gone from the page and from
 *           the server, with no section left behind under its title
 *
 * The page does the building and the changing; the stored model (`GET
 * /api/projects/:id/eml`) is read only to check what the backend kept. Every item
 * deletes itself, so the project's model stays the education model plus one item.
 *
 * `CRUD_ONLY=<substring>` runs the items whose name contains it;
 * `CRUD_KIND=rules|workflows` runs one half.
 */

import { expect, type Page, test } from "@playwright/test";
import {
  deleteFromRail,
  expectRuleKept,
  expectWorkflowKept,
  openFromRail,
  openLogic,
  railRow,
  ruleIdentifier,
  saveModel,
  workflowIdentifier,
} from "../lib/crud";
import { buildGraphRule, chainNames, type GraphRuleScenario } from "../lib/graph-rule";
import { expectWorkflowShown, LogicPage, type WorkflowScenario } from "../lib/logic-page";
import { RuleGraph } from "../lib/rule-graph";
import { buildTableRule, runTryIt, setTypedCell, type TableRuleScenario } from "../lib/rule-table";
import { type Author, authorWithProject, browserAs, GENERATED } from "../lib/session";
import { GRAPH_RULES } from "../scenarios/graph-rule-catalogue";
import { TABLE_RULES } from "../scenarios/rule-catalogue";
import { WORKFLOWS } from "../scenarios/workflow-catalogue";

const only = process.env.CRUD_ONLY;
const kind = process.env.CRUD_KIND;
const pick = <T extends { name: string }>(items: T[]) =>
  items.filter((i) => !only || i.name.includes(only));

type RuleCase =
  | { shape: "table"; rule: TableRuleScenario }
  | { shape: "graph"; rule: GraphRuleScenario };

const RULE_CASES: RuleCase[] = [
  ...pick(TABLE_RULES).map((rule) => ({ shape: "table" as const, rule })),
  ...pick(GRAPH_RULES).map((rule) => ({ shape: "graph" as const, rule })),
];

const REVISED = " revised";

/** Collects the page's uncaught errors; a test ends by asserting there were none. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/* ------------------------------------------------------------------ rules */

/** The first row a message can be changed on, and the column it sits in. */
function messageCell(rule: TableRuleScenario) {
  const extras = rule.extraOutputs ?? ["message"];
  const index = extras.indexOf("message");
  if (index < 0) return undefined;
  const row = rule.rows.findIndex(
    (r) => r.action === "validation-error" && (r.answers?.[index] ?? "").startsWith('"')
  );
  if (row < 0) return undefined;
  const old = (rule.rows[row]?.answers?.[index] ?? "").slice(1, -1);
  return { row, col: 1 + rule.inputs.length + 1 + index, old, next: `${old} (revised)` };
}

/** The first function node with a message to change, and its body with the message changed. */
function functionChange(rule: GraphRuleScenario) {
  const names = chainNames(rule.chain);
  for (const [i, node] of rule.chain.entries()) {
    if (node.kind !== "Function") continue;
    const match = node.body.match(/message: "([^"]+)"/);
    if (!match?.[1]) continue;
    const old = match[1];
    const next = `${old} (revised)`;
    return { name: names[i] as string, old, next, body: node.body.replace(old, next) };
  }
  return undefined;
}

/** A Try-it expectation as it should read after the update. */
function revisedTryIt(
  tryIt: TableRuleScenario["tryIt"],
  change: { old: string; next: string } | undefined
) {
  return tryIt.map((t) =>
    change && t.message === change.old ? { ...t, message: change.next } : t
  );
}

const priorityInput = (page: Page) => page.locator("label:has(span:text-is('Priority')) input");
const entitySelect = (page: Page) => page.locator("label:has(span:text-is('Entity')) select");

if (kind !== "workflows") {
  test.describe("CRUD — business rules (53, table and graph)", () => {
    let author: Author;
    test.beforeAll(async ({ playwright }) => {
      author = await authorWithProject(playwright, "crud-rules");
    });
    test.afterAll(async () => {
      await author.session.request.dispose();
    });

    for (const item of RULE_CASES) {
      const { rule } = item;
      test(`rule (${item.shape}): ${rule.name} — create, read, update, delete`, async ({
        browser,
      }, testInfo) => {
        test.setTimeout(480_000);
        const context = await browserAs(browser, author);
        const page = await context.newPage();
        const errors = watchErrors(page);
        const graph = new RuleGraph(page);
        const title = rule.name;
        const id = ruleIdentifier(title);
        const newTitle = `${title}${REVISED}`;
        const newId = ruleIdentifier(newTitle);
        const priority = item.shape === "table" ? (item.rule.priority ?? 100) : 100;
        const newPriority = priority + 7;
        const tableChange = item.shape === "table" ? messageCell(item.rule) : undefined;
        const graphChange = item.shape === "graph" ? functionChange(item.rule) : undefined;
        const change = tableChange ?? graphChange;

        await test.step("create", async () => {
          await openLogic(page, author);
          if (item.shape === "table") await buildTableRule(page, graph, item.rule);
          else await buildGraphRule(page, graph, item.rule);
          for (const t of rule.tryIt) await runTryIt(page, t.sample, t.expect, t.message);
          await testInfo.attach("created", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await saveModel(page);
          await expectRuleKept(page, author, {
            id,
            title,
            entity: rule.entity,
            present: true,
            priority: GENERATED ? undefined : priority,
          });
        });

        await test.step("read", async () => {
          await openLogic(page, author);
          await openFromRail(page, title);
          await graph.waitReady();
          await expect(entitySelect(page)).toHaveValue(rule.entity);
          if (!GENERATED) await expect(priorityInput(page)).toHaveValue(String(priority));
          if (item.shape === "graph") {
            await expect(graph.nodes).toHaveCount(item.rule.chain.length + 2);
          }
          for (const t of rule.tryIt) await runTryIt(page, t.sample, t.expect, t.message);
        });

        await test.step("update", async () => {
          await page.getByLabel("Name").first().fill(newTitle);
          if (!GENERATED) await priorityInput(page).fill(String(newPriority));
          if (tableChange) {
            await graph.nodes
              .filter({ hasText: "Edit Table" })
              .first()
              .getByText("Edit Table")
              .click();
            await setTypedCell(
              page,
              graph,
              tableChange.row,
              tableChange.col,
              `"${tableChange.next}"`
            );
            await expect(graph.editor.locator("tbody tr").nth(tableChange.row)).toContainText(
              tableChange.next
            );
            await graph.openTab("Graph");
          }
          if (graphChange) {
            await graph.node(graphChange.name).getByText("Edit Function").click();
            await expect(
              graph.editor.locator(".monaco-editor >> visible=true").first()
            ).toBeVisible({
              timeout: 30_000,
            });
            await graph.typeIntoCodeBox(graphChange.body);
            await graph.openTab("Graph");
          }
          const tries = revisedTryIt(rule.tryIt, change);
          for (const t of tries) await runTryIt(page, t.sample, t.expect, t.message);
          await saveModel(page);

          await openLogic(page, author);
          await expect(railRow(page, title), "the old name is gone from the rail").toHaveCount(0);
          await openFromRail(page, newTitle);
          await graph.waitReady();
          await expect(page.getByLabel("Name").first()).toHaveValue(newTitle);
          await expect(entitySelect(page)).toHaveValue(rule.entity);
          if (!GENERATED) await expect(priorityInput(page)).toHaveValue(String(newPriority));
          for (const t of tries) await runTryIt(page, t.sample, t.expect, t.message);
          await expectRuleKept(page, author, {
            id: newId,
            title: newTitle,
            entity: rule.entity,
            present: true,
            text: change?.next,
            priority: GENERATED ? undefined : newPriority,
          });
          await expectRuleKept(page, author, { id, title, entity: rule.entity, present: false });
        });

        await test.step("delete", async () => {
          await deleteFromRail(page, newTitle);
          await saveModel(page);
          await openLogic(page, author);
          await expect(railRow(page, newTitle)).toHaveCount(0);
          await expect(railRow(page, title)).toHaveCount(0);
          const entity = rule.entity;
          await expectRuleKept(page, author, {
            id: newId,
            title: newTitle,
            entity,
            present: false,
          });
          await expectRuleKept(page, author, { id, title, entity, present: false });
        });

        expect(errors, "no uncaught error in the page").toEqual([]);
        await context.close();
      });
    }
  });
}

/* -------------------------------------------------------------- workflows */

/** A lifecycle hook the workflow does not use yet, for the update to add. */
function extraHook(wf: Extract<WorkflowScenario, { kind: "lifecycle" }>) {
  const used = new Set(wf.hooks.map((h) => h.when));
  const when =
    ["afterDelete", "afterUpdate", "afterCreate", "beforeDelete", "beforeUpdate"].find(
      (h) => !used.has(h)
    ) ?? "afterDelete";
  return { when, handler: "revisedAuditTrail" };
}

/** What the update changes, and the workflow as it should then read. */
function revised(wf: WorkflowScenario): WorkflowScenario {
  const name = `${wf.name} Revised`;
  if (wf.kind === "lifecycle") return { ...wf, name, hooks: [...wf.hooks, extraHook(wf)] };
  if (wf.kind === "status") {
    const from = wf.states[0] as string;
    return {
      ...wf,
      name,
      states: [...wf.states, "on_hold"],
      transitions: [...wf.transitions, { from, to: "on_hold", trigger: "pause" }],
    };
  }
  return {
    ...wf,
    name,
    steps: [
      ...wf.steps,
      { type: "Call a web service", method: "POST", url: "https://example.com/revised" },
    ],
  };
}

/**
 * What the stored definition must carry after the update. The modelling tool writes a hook
 * in the generator's form (`%%hook <when> <handler> on <Entity>`); a generated application
 * keeps the automation's diagram, so there the handler's name is what to look for.
 */
function changedText(next: WorkflowScenario): string {
  if (next.kind === "lifecycle") {
    const added = next.hooks[next.hooks.length - 1]!;
    return GENERATED ? added.handler : `%%hook ${added.when} ${added.handler} on ${next.entity}`;
  }
  if (next.kind === "status") return `${next.transitions.at(-1)!.from} --> on_hold : pause`;
  return "https://example.com/revised";
}

async function renameWorkflow(page: Page, wf: WorkflowScenario, title: string) {
  // Lifecycles and processes edit their name in place as the ladder's heading; a status
  // machine has a Name field above its canvas.
  const field =
    wf.kind === "status"
      ? page.locator("label:has(span:text-is('Name')) input").first()
      : page.getByRole("textbox", { name: "Name", exact: true }).first();
  await field.fill(title);
  await expect(field).toHaveValue(title);
}

if (kind !== "rules") {
  test.describe("CRUD — workflows (50: lifecycle, status machine, process)", () => {
    let author: Author;
    test.beforeAll(async ({ playwright }) => {
      author = await authorWithProject(playwright, "crud-workflows");
    });
    test.afterAll(async () => {
      await author.session.request.dispose();
    });

    for (const wf of pick(WORKFLOWS)) {
      test(`workflow (${wf.kind}): ${wf.name} — create, read, update, delete`, async ({
        browser,
      }, testInfo) => {
        test.setTimeout(420_000);
        const context = await browserAs(browser, author);
        const page = await context.newPage();
        const errors = watchErrors(page);
        const logic = new LogicPage(page, author.projectId);
        const id = workflowIdentifier(wf.name);
        const next = revised(wf);
        const newId = workflowIdentifier(next.name);

        await test.step("create", async () => {
          await logic.open();
          await logic.createWorkflow(wf);
          await testInfo.attach("created", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await logic.save();
          await expectWorkflowKept(page, author, {
            id,
            title: wf.name,
            entity: wf.entity,
            present: true,
          });
        });

        await test.step("read", async () => {
          await logic.open();
          await openFromRail(page, wf.name);
          await expectWorkflowShown(logic, wf);
        });

        await test.step("update", async () => {
          // Reading a status machine opened its EML; start the edit from a fresh page.
          await logic.open();
          await openFromRail(page, wf.name);
          await renameWorkflow(page, wf, next.name);
          if (next.kind === "lifecycle") {
            await logic.addHook(next.hooks[next.hooks.length - 1]!);
          } else if (next.kind === "status") {
            await logic.addState("on_hold");
            await logic.addTransition(next.transitions[next.transitions.length - 1]!);
          } else {
            await logic.addStep(next.steps[next.steps.length - 1]!);
          }
          await testInfo.attach("updated", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await logic.save();

          await logic.open();
          await expect(railRow(page, wf.name), "the old name is gone from the rail").toHaveCount(0);
          await openFromRail(page, next.name);
          await expectWorkflowShown(logic, next);
          await expectWorkflowKept(page, author, {
            id: newId,
            title: next.name,
            entity: wf.entity,
            present: true,
            text: changedText(next),
          });
          await expectWorkflowKept(page, author, {
            id,
            title: wf.name,
            entity: wf.entity,
            present: false,
          });
        });

        await test.step("delete", async () => {
          await logic.open();
          await deleteFromRail(page, next.name);
          await logic.save();
          await logic.open();
          await expect(railRow(page, next.name)).toHaveCount(0);
          await expect(railRow(page, wf.name)).toHaveCount(0);
          const entity = wf.entity;
          await expectWorkflowKept(page, author, {
            id: newId,
            title: next.name,
            entity,
            present: false,
          });
          await expectWorkflowKept(page, author, { id, title: wf.name, entity, present: false });
        });

        expect(errors, "no uncaught error in the page").toEqual([]);
        await context.close();
      });
    }
  });
}
