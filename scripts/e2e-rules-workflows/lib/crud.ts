/**
 * Create, read, update and delete — the moves spec 14 makes on every rule and
 * workflow, through the page, and the checks it makes on what the server then
 * holds. The rail, the Save button and the stored model are the same for a rule
 * and a workflow, so they live here once.
 */

import { expect, type Locator, type Page } from "@playwright/test";
import { type Author, logicPath, storedModel } from "./session";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The identifier the editor files a rule under — `slugifyRuleName` in
 * `packages/editors/src/components/eml/RuleEditor.tsx`, restated so the spec does
 * not import a React component. A test fails if the two ever disagree, because the
 * stored model is then searched for a name the editor never wrote.
 */
export function ruleIdentifier(title: string): string {
  const identifier = title.trim();
  if (/^[a-z][A-Za-z0-9]*$/.test(identifier)) return identifier;
  return (
    title
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join("") || "rule"
  );
}

/** `pascalWorkflowName` in `WorkflowEditor.tsx`, restated for the same reason. */
export function workflowIdentifier(title: string): string {
  const cleaned = title.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "Workflow";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export async function openLogic(page: Page, author: Author): Promise<void> {
  await page.goto(logicPath(author));
  await expect(page.getByRole("heading", { name: "Rules and workflows" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Loading the model…")).toHaveCount(0, { timeout: 60_000 });
}

export async function saveModel(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved to the model/)).toBeVisible({ timeout: 30_000 });
}

/** The rail's row for a rule or workflow, matched on its whole title — "X" is not "X revised". */
export function railRow(page: Page, title: string): Locator {
  return page
    .locator("aside")
    .first()
    .locator("div.group")
    .filter({
      has: page.locator("span.font-medium", { hasText: new RegExp(`^${escapeRegExp(title)}$`) }),
    });
}

export async function openFromRail(page: Page, title: string): Promise<void> {
  const row = railRow(page, title);
  await expect(row, `"${title}" is in the rail`).toHaveCount(1);
  await row.locator("button").first().click();
}

/** Delete through the rail's bin, which shows on hover. */
export async function deleteFromRail(page: Page, title: string): Promise<void> {
  const row = railRow(page, title);
  await expect(row, `"${title}" is in the rail`).toHaveCount(1);
  await row.hover();
  await row.getByRole("button", { name: /^Delete / }).click();
  await expect(row).toHaveCount(0);
}

/** The stored model's lines that open a section: `%%rule x on …`, `%%workflow X entity: …`. */
const sectionLine = (directive: "rule" | "workflow", identifier: string) =>
  new RegExp(`^%%${directive} ${escapeRegExp(identifier)}(\\s|$)`, "m");

const metaName = (title: string) => new RegExp(`^%%meta name: ${escapeRegExp(title)}\\s*$`, "m");

/** What the server holds for one section, once, at the moment of the call. */
export async function expectStored(
  author: Author,
  directive: "rule" | "workflow",
  identifier: string,
  present: boolean,
  title?: string
): Promise<string> {
  const eml = await storedModel(author);
  const line = sectionLine(directive, identifier);
  if (present) {
    expect(eml, `the stored model has %%${directive} ${identifier}`).toMatch(line);
    expect(
      eml.match(new RegExp(line.source, "gm"))?.length,
      `%%${directive} ${identifier} is stored once`
    ).toBe(1);
  } else {
    expect(eml, `the stored model no longer has %%${directive} ${identifier}`).not.toMatch(line);
    if (title) expect(eml, `no section is left named "${title}"`).not.toMatch(metaName(title));
  }
  return eml;
}
