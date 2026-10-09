/**
 * An author, a project and a browser signed in as them.
 *
 * The project routes refuse the administrator ("Admins cannot modify
 * projects"), so the suite registers an ordinary account, has the bootstrap
 * administrator approve it, and works as that account — the same arrangement
 * `tests/e2e/helpers.ts` makes for the main suite, reused rather than copied.
 */

import { readFileSync } from "node:fs";
import {
  type Browser,
  type BrowserContext,
  expect,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import {
  adminContext,
  createUserSession,
  type UserSession,
  unique,
} from "../../../tests/e2e/helpers";

/** The model the suite is run against; override with RULES_WORKFLOWS_MODEL. */
export const MODEL_PATH =
  process.env.RULES_WORKFLOWS_MODEL ??
  new URL(
    "../../../docs/eml-sessions/education-management-system/education-management-system.mmd",
    import.meta.url
  ).pathname;

export const MODEL_SOURCE = readFileSync(MODEL_PATH, "utf8");

/**
 * `LOGIC_TARGET=generated` points the same specs at a generated application's
 * Admin → Rules and workflows screen instead of the modelling tool's Logic step. The
 * screen is one component in both (`@appwithai/editors`), so the specs are the proof.
 */
export const GENERATED = process.env.LOGIC_TARGET === "generated";

/** Where the rules and workflows screen lives for this author. */
export const logicPath = (author: { projectId: string }) =>
  GENERATED ? "/admin/automations" : `/projects/${author.projectId}/logic`;

export interface Author {
  session: UserSession;
  projectId: string;
}

export async function authorWithProject(
  playwright: PlaywrightWorkerArgs["playwright"],
  label: string
): Promise<Author> {
  if (GENERATED) {
    // The generated application has no projects: it is signed in as its administrator.
    return {
      session: { request: { dispose: async () => {} } } as unknown as UserSession,
      projectId: "generated",
    };
  }
  const admin = await adminContext(playwright);
  const session = await createUserSession(playwright, admin, label);
  await admin.dispose();
  const response = await session.request.post("/api/projects", {
    data: { name: unique(label), erdCode: MODEL_SOURCE },
  });
  expect(response.status(), "creating the project from the model").toBe(201);
  const { project } = (await response.json()) as { project: { id: string } };
  return { session, projectId: project.id };
}

export async function browserAs(browser: Browser, author: Author): Promise<BrowserContext> {
  if (GENERATED) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.fill("input[type=email]", process.env.GENERATED_ADMIN_EMAIL ?? "admin@admin.com");
    await page.fill("input[type=password]", process.env.GENERATED_ADMIN_PASSWORD ?? "admin123");
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard");
    // The session cookie is written by the sign-in response; let the dashboard's own
    // requests settle so a page opened next is not the one that races it.
    await page.waitForLoadState("networkidle");
    await page.close();
    return context;
  }
  return browser.newContext({
    storageState: await author.session.request.storageState(),
    viewport: { width: 1600, height: 1000 },
  });
}

/** The model as stored now. */
export async function storedModel(author: Author): Promise<string> {
  const response = await author.session.request.get(`/api/projects/${author.projectId}/eml`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { eml: string }).eml;
}

export function scenario<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../scenarios/${file}`, import.meta.url), "utf8")) as T;
}
