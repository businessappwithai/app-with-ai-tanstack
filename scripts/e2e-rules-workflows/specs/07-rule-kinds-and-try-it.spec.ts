/**
 * The graph editor on the Enhance page: every kind of rule, tried before saving.
 *
 * An author who opens Business Rules should be able to start from a working
 * example of each kind of node — decision table, expression, function, switch,
 * and a table that starts a workflow — see in a sentence what it would do to a
 * write, and have it still be there, and still run, after a save and a reload.
 *
 * The assertions are on what the page says and what was stored, found by the
 * words on the screen.
 */

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { adminContext, createUserSession, type UserSession } from "../../../tests/e2e/helpers";
import { type Author, authorWithProject, browserAs, storedModel } from "../lib/session";

const STARTERS = [
  { starter: "Decision table", says: /Blocks the write/ },
  { starter: "Expression", says: /Blocks the write/ },
  { starter: "Function", says: /Blocks the write/ },
  { starter: "Switch", says: /Blocks the write/ },
  { starter: "Start a workflow", says: /Starts the workflow/ },
] as const;

async function openNewRule(page: Page, author: Author, entity: string) {
  await page.goto(`/projects/${author.projectId}/enhance/${entity}Service`);
  await page.getByRole("button", { name: /^Business Rules/ }).click();
  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("Entity").selectOption(entity);
}

test.describe("the rule editor offers every kind of rule", () => {
  let author: Author;

  test.beforeAll(async ({ playwright }) => {
    author = await authorWithProject(playwright, "rule-kinds");
  });
  test.afterAll(async () => {
    await author.session.request.dispose();
  });

  for (const { starter, says } of STARTERS) {
    test(`${starter}: start from the example, try it, read the answer`, async ({ browser }) => {
      const context = await browserAs(browser, author);
      const page = await context.newPage();
      await openNewRule(page, author, "Student");

      await page.getByRole("button", { name: new RegExp(`^${starter}`) }).click();
      await page.getByRole("button", { name: "Run the rule" }).click();

      await expect(page.getByLabel("Try the rule").getByText(says)).toBeVisible();
      await context.close();
    });
  }

  test("a rule says when it runs, in plain words", async ({ browser }) => {
    const context = await browserAs(browser, author);
    const page = await context.newPage();
    await openNewRule(page, author, "Student");

    const runsWhen = page.getByLabel("Runs when");
    await expect(runsWhen).toBeVisible();
    await runsWhen.selectOption({ label: "A record is changed" });
    await expect(page.getByText("Judged before the change is saved.")).toBeVisible();
    await context.close();
  });

  test("a function rule survives a save and a reload, and is stored as a graph", async ({
    browser,
  }) => {
    const context = await browserAs(browser, author);
    const page = await context.newPage();
    // The page reports a failed save with alert(); surface it instead of timing out.
    const alerts: string[] = [];
    page.on("dialog", (dialog) => {
      alerts.push(dialog.message());
      void dialog.dismiss();
    });
    await openNewRule(page, author, "Student");
    await page.getByLabel("Name").first().fill("Student name guard");
    await page.getByRole("button", { name: /^Function/ }).click();
    const saved = page.waitForResponse(
      (response) => response.url().endsWith("/eml") && response.request().method() === "PUT"
    );
    await page.getByRole("button", { name: "Save rules" }).click();
    const response = await saved;
    expect(response.status(), `saving the rule answered: ${await response.text()}`).toBe(200);
    await expect(page.getByText(/Saved to the model/), alerts.join("; ")).toBeVisible();

    const model = await storedModel(author);
    expect(model).toContain("%%rule studentNameGuard on Student");
    expect(model).toContain("%%jdm-graph ");
    expect(model).toContain("functionNode");

    await page.reload();
    await page.getByRole("button", { name: /^Business Rules/ }).click();
    await page.getByText("Student name guard").first().click();
    await page.getByRole("button", { name: /Show EML/ }).click();
    await expect(page.getByText("%%jdm-graph").first()).toBeVisible();
    await context.close();
  });
});

test.describe("Try it runs code, so it asks for write access", () => {
  let admin: APIRequestContext;
  let owner: UserSession;
  let stranger: UserSession;
  let projectId: string;
  const body = {
    graph: { nodes: [], edges: [] },
    record: { title: "x" },
  };

  test.beforeAll(async ({ playwright }) => {
    admin = await adminContext(playwright);
    owner = await createUserSession(playwright, admin, "dryrun-owner");
    stranger = await createUserSession(playwright, admin, "dryrun-stranger");
    const response = await owner.request.post("/api/projects", {
      data: { name: `dry-run ${Date.now()}`, erdCode: "erDiagram\n  Thing { string title }" },
    });
    projectId = ((await response.json()) as { project: { id: string } }).project.id;
  });
  test.afterAll(async () => {
    await owner.request.dispose();
    await stranger.request.dispose();
    await admin.dispose();
  });

  test("refuses nobody, a stranger, and answers the owner", async ({ playwright }) => {
    const path = `/api/projects/${projectId}/rules/dry-run`;
    const anonymous = await playwright.request.newContext({
      baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    });

    expect((await anonymous.post(path, { data: body, failOnStatusCode: false })).status()).toBe(
      401
    );
    expect(
      (await stranger.request.post(path, { data: body, failOnStatusCode: false })).status()
    ).toBeGreaterThanOrEqual(403);
    await anonymous.dispose();

    // The owner gets an answer — here, a refusal to run an empty graph, with a reason.
    const answer = await owner.request.post(path, { data: body });
    expect(answer.status()).toBe(200);
    const result = (await answer.json()) as { ok: boolean; problems?: string[] };
    expect(result.ok).toBe(false);
    expect(result.problems?.join(" ")).toMatch(/no nodes/);
  });

  test("runs a real graph and says what it would do", async () => {
    const graph = {
      nodes: [
        { id: "in", type: "inputNode", name: "in", position: { x: 0, y: 0 } },
        {
          id: "fn",
          type: "functionNode",
          name: "check",
          position: { x: 0, y: 0 },
          content: {
            source:
              "export const handler = async (input) => ({ action: input.title ? 'allow' : 'validation-error', message: 'Title needed' });",
          },
        },
        { id: "out", type: "outputNode", name: "out", position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: "a", type: "edge", sourceId: "in", targetId: "fn" },
        { id: "b", type: "edge", sourceId: "fn", targetId: "out" },
      ],
    };
    const run = async (record: object) =>
      (
        await (
          await owner.request.post(`/api/projects/${projectId}/rules/dry-run`, {
            data: { graph, record },
          })
        ).json()
      ).outcomes as Array<{ kind: string; text: string }>;

    expect((await run({ title: "" }))[0]?.kind).toBe("blocks");
    expect((await run({ title: "Hi" }))[0]?.kind).toBe("nothing");
  });

  test("refuses a function node that reaches for the network", async () => {
    const graph = {
      nodes: [
        { id: "in", type: "inputNode", name: "in" },
        {
          id: "fn",
          type: "functionNode",
          name: "bad",
          content: { source: "export const handler = async () => fetch('http://x')" },
        },
        { id: "out", type: "outputNode", name: "out" },
      ],
      edges: [
        { id: "a", sourceId: "in", targetId: "fn" },
        { id: "b", sourceId: "fn", targetId: "out" },
      ],
    };
    const result = (await (
      await owner.request.post(`/api/projects/${projectId}/rules/dry-run`, {
        data: { graph, record: {} },
      })
    ).json()) as { ok: boolean; problems?: string[] };
    expect(result.ok).toBe(false);
    expect(result.problems?.join(" ")).toMatch(/fetch/);
  });
});
