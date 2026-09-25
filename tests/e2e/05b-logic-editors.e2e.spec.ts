/**
 * The Logic step's editors, driven the way an author uses them.
 *
 * `05-automations` holds the builder's serialiser over HTTP; this drives the
 * screen. Against the education model it adds one of each thing the step can
 * make — a business rule, a lifecycle process, a status machine and a
 * multi-step process with every step type — saves, reloads, and asserts that
 * what comes back is what was entered, then that the saved model passes the
 * language checker the generator runs.
 *
 * Every assertion here is one the first run of this suite, by hand, found
 * failing:
 *
 *  - an `%%action` rule opened read-only, offering only to discard its actions
 *  - testing a table with the cell's own quoted value found no row
 *  - the rule-table picker on a Look up step was empty
 *  - a Create step's second line of values fell outside its directive
 *  - saving a rule moved its actions under the next rule's heading
 *  - updating the process's own record failed the checker (EML265)
 */

import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { checkSource } from "../../language/checker";
import { adminContext, createUserSession, type UserSession, unique } from "./helpers";

const EDUCATION = readFileSync(
  new URL(
    "../../docs/eml-sessions/education-management-system/education-management-system.mmd",
    import.meta.url
  ),
  "utf8"
);

let owner: UserSession;
let projectId: string;

test.beforeAll(async ({ playwright }) => {
  const admin = await adminContext(playwright);
  owner = await createUserSession(playwright, admin, "logic-editors");
  const response = await owner.request.post("/api/projects", {
    data: { name: unique("e2e-logic-editors"), erdCode: EDUCATION },
  });
  expect(response.status()).toBe(201);
  projectId = ((await response.json()) as { project: { id: string } }).project.id;
});

async function openLogic(page: Page): Promise<void> {
  await page.goto(`/projects/${projectId}/logic`);
  await expect(page.getByRole("heading", { name: "Rules and processes" })).toBeVisible();
  // A cold dev server compiles the route on first request; allow for it.
  await expect(page.getByText("Loading the model…")).toHaveCount(0, { timeout: 60_000 });
}

/** The builder's work area; its controls read in document order. */
const builder = (page: Page) => page.locator("div.min-h-\\[560px\\]");
const control = (area: Locator, index: number) => area.locator("input,select,textarea").nth(index);
const rail = (page: Page) => page.locator("aside").first();

test("rules, lifecycle, status and process editors round-trip through the model", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: await owner.request.storageState(),
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openLogic(page);

  // ---- A business rule, every input ----------------------------------------
  await rail(page).getByRole("button", { name: "New" }).click();
  await page.getByPlaceholder("Sample expiry guard").fill("Late Fee Guard");
  await page.locator("label:has-text('Entity') select").first().selectOption("FeeInvoice");
  await page.locator("label:has-text('Runs on') select").selectOption("beforeUpdate");
  await page.locator("label:has-text('Priority') input").fill("25");
  await page.getByLabel("Input 1 field").selectOption("status");
  await page.getByRole("button", { name: "＋ input" }).click();
  await page.getByLabel("Input 2 field").selectOption("balance_due");
  await page.getByLabel("Outcome 1 field").selectOption({ label: "Action" });
  await page.getByRole("button", { name: "＋ outcome" }).click();
  await page.getByLabel("Outcome 2 field").selectOption({ label: "Message" });
  await page.getByRole("button", { name: "＋ Add row" }).click();
  await page.getByLabel("Row 1, status", { exact: true }).fill('"cancelled"');
  await page.getByLabel("Row 1, balance_due", { exact: true }).fill("> 0");
  await page.getByLabel("Row 1, action answer").selectOption("validation-error");
  await page
    .getByLabel("Row 1, message answer")
    .fill("An invoice with a balance cannot be cancelled.");

  const testPanel = page.locator("section:has-text('Test with values')");
  await testPanel.locator("input").nth(0).fill('"cancelled"');
  await testPanel.locator("input").nth(1).fill("50");
  await expect(testPanel.locator("p")).toContainText("Row 1 fits");
  await testPanel.locator("input").nth(1).fill("0");
  await expect(testPanel.locator("p")).toContainText("Row 2 fits");

  // ---- An %%action rule opens as its table ---------------------------------
  await page.getByRole("button", { name: /Admission Banding/ }).click();
  await expect(page.getByText("Start an empty table instead")).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(6);

  // ---- A lifecycle process -------------------------------------------------
  await rail(page).getByRole("button", { name: "Lifecycle", exact: true }).click();
  let area = builder(page);
  await control(area, 0).fill("Fee Invoice Hooks");
  await area.locator("select").last().selectOption("FeeInvoice");
  await area.locator("button", { hasText: "When this happens" }).first().click();
  await area.getByPlaceholder("normalizeAccountName").fill("stampIssueDate");
  await control(area, 1).selectOption("beforeUpdate");
  await control(area, 3).selectOption("issued_on");
  await area.getByRole("button", { name: "＋ Add a lifecycle step" }).click();
  await area.getByPlaceholder("normalizeAccountName").fill("recalcBalance");
  await control(area, 1).selectOption("afterUpdate");

  // ---- A status machine ----------------------------------------------------
  await rail(page).getByRole("button", { name: "Status", exact: true }).click();
  await page.locator("label:has-text('Name') input").first().fill("Room Booking Status");
  await page.locator("label:has-text('Entity') select").first().selectOption("Room");
  await page.getByRole("button", { name: "Add state" }).click();
  await page.getByPlaceholder("submitted").fill("booked");
  await page.getByRole("button", { name: "Add state" }).click();
  await page.getByPlaceholder("submitted").fill("released");
  await page.getByText("The process finishes here").click();
  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(3);
  for (const [from, to] of [
    [0, 1],
    [1, 2],
  ] as const) {
    // Adding a state re-fits the canvas over 200ms; wait for the nodes to settle.
    await page.waitForTimeout(400);
    const source = await nodes.nth(from).locator(".react-flow__handle-right").boundingBox();
    const target = await nodes.nth(to).locator(".react-flow__handle-left").boundingBox();
    if (!source || !target) throw new Error("a state's handle is not on screen");
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);

  // ---- A process with every step type -------------------------------------
  await rail(page).getByRole("button", { name: "Process", exact: true }).click();
  area = builder(page);
  await control(area, 0).fill("Overdue Invoice Chase");
  await control(area, 1).selectOption("FeeInvoice");
  await control(area, 2).selectOption("automatic");
  await control(area, 3).selectOption("UPDATE");
  const add = async (label: string) => {
    await area.getByRole("button", { name: "＋ Add a condition or an action" }).last().click();
    await area.locator("button", { hasText: label }).first().click();
  };
  await add("A check");
  await control(area, 1).selectOption("feeinvoice.balance_due");
  await control(area, 2).selectOption("gt");
  await control(area, 3).fill("0");
  await add("Look up a rule table");
  await control(area, 1).selectOption("lateFeeGuard");
  await add("Create a record");
  await control(area, 1).selectOption("DisciplineIncident");
  await control(area, 2).fill("status: reported\nstudent_id: {{student_id}}\nseverity: 2");
  await control(area, 3).fill("incidentId");
  await add("Update a field");
  await control(area, 1).selectOption("FeeInvoice");
  // Record type, Which record, Field to write, New value. Left empty, Which
  // record writes the invoice the process runs on.
  await control(area, 3).selectOption("status");
  await control(area, 4).fill("overdue");
  await add("Delete a record");
  await control(area, 1).selectOption("FeeInvoiceLine");
  await control(area, 2).fill("{{incidentId}}");
  await add("Work out a value");
  await control(area, 1).selectOption("add");
  await control(area, 2).fill("{{feeinvoice.balance_due}}");
  await control(area, 3).fill("25");
  await control(area, 4).fill("newBalance");
  await add("Call a web service");
  await control(area, 1).selectOption("POST");
  await control(area, 2).fill("https://example.com/hooks/overdue");
  await control(area, 3).fill('{\n  "invoice": "{{feeinvoice.id}}"\n}');
  await control(area, 4).fill("chaseResponse");
  await add("A repeat");
  await control(area, 1).selectOption("feeinvoice.status");
  await control(area, 2).selectOption("neq");
  await control(area, 3).fill("paid");
  await control(area, 4).fill("3");
  await expect(area.getByText(/and stops once that is no longer true/)).toBeVisible();
  await area.locator("button", { hasText: "Set a field to" }).first().click();
  await control(area, 1).selectOption("FeeInvoice");
  await control(area, 3).selectOption("amount_paid");
  await control(area, 4).fill("{{newBalance}}");

  // ---- Save, reload, and read it all back ----------------------------------
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved to the model/)).toBeVisible({ timeout: 15_000 });
  await openLogic(page);

  for (const name of ["Late Fee Guard", "Fee Invoice Hooks", "Room Booking Status"]) {
    await expect(rail(page)).toContainText(name);
  }
  await expect(rail(page)).toContainText("Overdue Invoice Chase");

  await page.getByRole("button", { name: /Late Fee Guard/ }).click();
  await expect(page.getByLabel("Row 1, message answer")).toHaveValue(
    "An invoice with a balance cannot be cancelled."
  );
  await expect(page.getByLabel("Row 1, balance_due", { exact: true })).toHaveValue("> 0");
  await expect(page.locator("label:has-text('Priority') input")).toHaveValue("25");

  await page.getByRole("button", { name: /Overdue Invoice Chase/ }).click();
  area = builder(page);
  for (const text of [
    "Look up lateFeeGuard",
    "Create a DisciplineIncident",
    "Set status to overdue",
    "Delete a FeeInvoiceLine",
    "newBalance",
    "chaseResponse",
  ]) {
    await expect(area).toContainText(text);
  }
  await area.locator("button", { hasText: "Create a DisciplineIncident" }).first().click();
  await expect(control(area, 2)).toHaveValue(
    "status: reported\nstudent_id: student_id\nseverity: 2"
  );

  await page.getByRole("button", { name: /Fee Invoice Hooks/ }).click();
  await expect(builder(page)).toContainText("stampIssueDate");
  await expect(builder(page)).toContainText("recalcBalance");

  // ---- The model the generator will read -----------------------------------
  const stored = (await (await owner.request.get(`/api/projects/${projectId}/eml`)).json()) as {
    eml: string;
  };
  const orphans = stored.eml
    .split("\n")
    .filter((line) => /^\s*(student_id:|severity:|")/.test(line));
  expect(orphans, "a typed line escaped its %%step directive").toEqual([]);

  const banding = stored.eml.indexOf("%%rule admissionBanding");
  const nextHeading = stored.eml.indexOf("Business rules — the student record");
  const firstAction = stored.eml.indexOf("%%action bandOnSibling");
  expect(firstAction).toBeGreaterThan(banding);
  expect(firstAction, "the rule's actions moved under the next rule").toBeLessThan(nextHeading);

  const errors = checkSource(stored.eml).issues.filter((issue) => issue.severity === "error");
  expect(errors.map((issue) => `${issue.code} ${issue.message}`)).toEqual([]);

  expect(pageErrors).toEqual([]);
  await context.close();
});

test("the help opens on the page for the editor in use", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: await owner.request.storageState(),
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  await openLogic(page);

  await page.getByRole("button", { name: "Help", exact: true }).click();
  const panel = page.getByRole("complementary", { name: "Help" });
  await expect(panel.getByRole("heading", { name: "Rules and processes" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await page.getByRole("button", { name: "How business rules work" }).click();
  await expect(panel.getByRole("tab", { selected: true })).toHaveText("Business rules");
  await expect(panel.getByRole("heading", { name: "Reading the table" })).toBeVisible();
  await panel.getByRole("tab", { name: "Process" }).click();
  await expect(panel.getByRole("heading", { name: "The step types" })).toBeVisible();
  await page.getByRole("button", { name: "Close help" }).click();

  await rail(page)
    .getByRole("button", { name: /Invoice Lifecycle/ })
    .first()
    .click();
  await page.getByRole("button", { name: "How status machines work" }).click();
  await expect(panel.getByRole("tab", { selected: true })).toHaveText("Status");
  await context.close();
});
