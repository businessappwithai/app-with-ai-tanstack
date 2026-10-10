/**
 * Fifty workflows — lifecycle, status machine and process — built in the Logic
 * step's editors with nothing but the page: no API call writes or reads one.
 * Each is saved, the page is reloaded, and the workflow is opened again from the
 * rail to prove what the ladder or the diagram shows is what was built.
 *
 * `WF_ONLY=<substring>` runs the workflows whose name contains it.
 */

import { expect, test } from "@playwright/test";
import { LogicPage, stepSentence, type WorkflowScenario } from "../lib/logic-page";
import { type Author, authorWithProject, browserAs } from "../lib/session";
import { WORKFLOWS } from "../scenarios/workflow-catalogue";

const only = process.env.WF_ONLY;
const workflows = WORKFLOWS.filter((w) => !only || w.name.includes(only));

async function expectReopened(logic: LogicPage, wf: WorkflowScenario) {
  const page = logic.page;
  await logic.select(wf.name);
  if (wf.kind === "status") {
    const eml = await logic.showEml();
    for (const t of wf.transitions) {
      expect(eml, `${wf.name}: ${t.from} → ${t.to}`).toContain(
        `${t.from} --> ${t.to}${t.trigger ? ` : ${t.trigger}` : ""}`
      );
    }
    for (const end of wf.end) expect(eml).toContain(`${end} --> [*]`);
    await expect(page.locator(".react-flow__node")).toHaveCount(wf.states.length);
    return;
  }
  const ladder = logic.builder;
  if (wf.kind === "lifecycle") {
    for (const hook of wf.hooks) {
      await expect(ladder).toContainText(hook.when);
      await expect(ladder).toContainText(hook.handler);
    }
    return;
  }
  for (const step of wf.steps) {
    for (const sentence of stepSentence(step)) await expect(ladder).toContainText(sentence);
  }
}

test.describe("workflow editors — workflows built through the page", () => {
  let author: Author;

  test.beforeAll(async ({ playwright }) => {
    author = await authorWithProject(playwright, "workflow-editor");
  });
  test.afterAll(async () => {
    await author.session.request.dispose();
  });

  for (const wf of workflows) {
    test(`${wf.kind}: ${wf.name} (${wf.entity})`, async ({ browser }, testInfo) => {
      test.setTimeout(240_000);
      const context = await browserAs(browser, author);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const logic = new LogicPage(page, author.projectId);

      await logic.open();
      await logic.createWorkflow(wf);
      await testInfo.attach("built", { body: await page.screenshot(), contentType: "image/png" });
      await logic.save();

      await logic.open();
      await expectReopened(logic, wf);
      expect(errors, "no uncaught error in the page").toEqual([]);
      await context.close();
    });
  }
});
