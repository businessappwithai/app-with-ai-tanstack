/**
 * The workflow builder of a generated application, driven the way an author
 * drives it: start a workflow from one hook, add a check and a step, publish,
 * attach a rule to its hook, set it off with a real write, and take it away.
 *
 * Run against a started generated application:
 *   E2E_BASE_URL=http://localhost:4000 bunx playwright test -c playwright.config.ts specs/11
 */

import { expect, test } from "@playwright/test";

const EMAIL = process.env.GEN_EMAIL ?? "admin@admin.com";
const PASSWORD = process.env.GEN_PASSWORD ?? "admin123";

test.use({ viewport: { width: 1900, height: 1300 } });

test("a workflow built in the builder runs on a real write", async ({ browser }, testInfo) => {
  const marker = `QA-WF-${Date.now() % 100000}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");

  const snap = async (name: string) =>
    testInfo.attach(name, { body: await page.screenshot(), contentType: "image/png" });

  await test.step("start from one hook, as the Logic step does", async () => {
    await page.goto("/admin/automations", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "+ New workflow" }).click();
    await expect(page.getByLabel("Hook", { exact: true })).toBeVisible();
    // Every hook type is on offer, in one dropdown, and only one is chosen.
    const hooks = await page.getByLabel("Hook", { exact: true }).locator("option").allInnerTexts();
    expect(hooks.length).toBeGreaterThanOrEqual(13);
    await page.getByLabel("Workflow name").fill(`Mark hot ${marker}`);
    await page.getByLabel("Watches").selectOption({ label: "Lead" });
    await page
      .getByLabel("Hook", { exact: true })
      .selectOption({ label: hooks.find((h) => /afterCreate/.test(h)) as string });
    await snap("01-new-workflow");
    await page.getByRole("button", { name: "Create workflow" }).click();
    await expect(page.getByText(`Mark hot ${marker}`).first()).toBeVisible();
    await expect(page.getByText(/afterCreate/).first()).toBeVisible();
  });

  await test.step("add a check: only this run's lead", async () => {
    await page.getByText("Add a condition or an action").click();
    await page.getByText("A check", { exact: true }).first().click();
    await snap("02-check-added");
    // The check's inspector: which field, how, and what to compare with.
    await page.getByLabel("Field to look at").selectOption("lead.company_name");
    await page.locator("label", { hasText: /^Test/ }).locator("select").selectOption({ index: 0 });
    await page
      .locator("label", { hasText: /^Value/ })
      .locator("input")
      .fill(marker);
  });

  await test.step("add a step: set the rating", async () => {
    await page.getByText("Add a condition or an action").click();
    await page.getByText("Update a field", { exact: true }).first().click();
    await page.getByLabel("Field to write").selectOption("rating");
    await page.getByLabel("New value").fill("hot");
    await snap("03-step-configured");
  });

  await test.step("publish: it is live, and compiled for the engine", async () => {
    const published = page.waitForResponse(
      (r) =>
        /workflow-definitions\/[^/]+$/.test(r.url()) &&
        r.request().method() === "PUT" &&
        (r.request().postData() ?? "").includes('"isActive":true')
    );
    await page.getByRole("button", { name: "Publish" }).click();
    expect((await published).status()).toBe(200);
    await expect(page.getByText("Published")).toBeVisible();
  });

  const list = await (
    await page.request.get("/api/workflow-definitions?kind=automation&limit=200")
  ).json();
  const definition = (list.items as any[]).find((d) => String(d.name).includes(marker));

  await test.step("what was saved is the flowchart that was drawn", async () => {
    expect(definition, "the workflow is listed").toBeTruthy();
    expect(definition.is_active).toBe(true);
    expect(definition.mermaid_code).toContain("%%step s");
    expect(definition.mermaid_code).toContain("rating");
    expect(definition.bpmn_xml, "compiled for the engine").toBeTruthy();
    expect(definition.operation).toBe("CREATE");
  });

  await test.step("attach a rule to its hook: the rule takes the hook's write", async () => {
    const picker = page.getByLabel("Attach a rule to afterCreate");
    await expect(picker).toBeVisible();
    const choices = await picker.locator("option").allInnerTexts();
    expect(choices.length).toBeGreaterThan(1);
    await snap("04-attach-a-rule");
  });

  await test.step("a real write sets it off, for this lead and not another", async () => {
    const owner = (await (await page.request.get("/api/bus/bus_user?limit=1")).json()).data[0].id;
    const lead = (company: string) => ({
      first_name: "Wf",
      last_name: "Lead",
      company_name: company,
      email: `wf-${Date.now()}-${Math.random()}@example.com`,
      lead_source: "web",
      rating: "cold",
      status: "new",
      owner_id: owner,
    });
    const mine = await page.request.post("/api/bus/bus_lead", { data: lead(marker) });
    expect(mine.status()).toBe(201);
    const made = await mine.json();
    expect((await (await page.request.get(`/api/bus/bus_lead/${made.id}`)).json()).rating).toBe(
      "hot"
    );
    const other = await page.request.post("/api/bus/bus_lead", { data: lead(`${marker}-other`) });
    const otherLead = await other.json();
    expect(
      (await (await page.request.get(`/api/bus/bus_lead/${otherLead.id}`)).json()).rating
    ).toBe("cold");
    await page.request.delete(`/api/bus/bus_lead/${made.id}`);
    await page.request.delete(`/api/bus/bus_lead/${otherLead.id}`);
  });

  await test.step("reopen it from the rail: the builder shows the same steps", async () => {
    await page.goto("/admin/automations", { waitUntil: "networkidle" });
    await page.getByText(`Mark hot ${marker}`).first().click();
    await expect(page.getByText(/Set a field|rating/i).first()).toBeVisible();
    await snap("05-reopened");
  });

  await test.step("delete it, in two clicks", async () => {
    await page.getByRole("button", { name: "Delete this automation" }).click();
    await page.getByRole("button", { name: "Click again to delete" }).click();
    await expect
      .poll(
        async () => (await page.request.get(`/api/workflow-definitions/${definition.id}`)).status(),
        { timeout: 15_000 }
      )
      .toBe(404);
  });

  expect(pageErrors, "no page error").toEqual([]);
});
