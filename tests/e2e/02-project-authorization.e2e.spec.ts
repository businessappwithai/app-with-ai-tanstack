/**
 * Who can reach a project, and who cannot.
 *
 * This is the check the codebase cares about most — "every route touching a
 * project must call `requireProjectAccess`" — and it is the one a unit test
 * cannot make, because the thing being asserted is that *no* route was
 * forgotten. So the suite enumerates the project-scoped endpoints and drives
 * each of them as three different callers: nobody, a signed-in stranger, and
 * the owner.
 *
 * A route added later without the check fails here rather than in a report
 * somebody writes afterwards.
 */

import { type APIRequestContext, expect, test } from "@playwright/test";

import { createProject, SAMPLE_EML, signIn, signInAsAdmin, unique } from "./helpers";

/**
 * The project-scoped surface, as paths relative to a project id.
 *
 * Read-only verbs only. A test that asserts authorization by attempting a
 * destructive write on every endpoint would, the day one of them stopped
 * enforcing it, do the damage it was written to detect.
 */
const PROJECT_ROUTES = [
  "",
  "/eml",
  "/erd-versions",
  "/members",
  "/automations",
  "/deployment",
] as const;

/** A second, approved account — the "signed-in stranger". */
async function createApprovedUser(
  adminRequest: APIRequestContext,
  request: APIRequestContext
): Promise<{ email: string; password: string }> {
  const email = `${unique("e2e-stranger")}@example.com`;
  const password = "TestPassword123!";

  const registration = await request.post("/api/auth/register", {
    data: { email, password, name: "Stranger" },
    failOnStatusCode: false,
  });
  expect(registration.status(), "registering the stranger failed").toBe(202);

  const list = await adminRequest.get("/api/admin/users");
  expect(list.status()).toBe(200);
  const { users } = (await list.json()) as { users: Array<{ id: string; email: string }> };
  const created = users.find((user) => user.email === email);
  expect(created, "the registered account did not appear in the admin list").toBeTruthy();

  const approval = await adminRequest.post(`/api/admin/users/${created?.id}/approve`, {
    failOnStatusCode: false,
  });
  expect(approval.status(), "approving the stranger failed").toBeLessThan(300);

  return { email, password };
}

test.describe("a project belongs to somebody", () => {
  test("every project route refuses an unauthenticated caller", async ({ playwright, request }) => {
    await signInAsAdmin(request);
    const projectId = await createProject(request);

    // A context with no cookie jar at all — not merely a signed-out one.
    const anonymous = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });

    const allowed: string[] = [];
    for (const route of PROJECT_ROUTES) {
      const path = `/api/projects/${projectId}${route}`;
      const response = await anonymous.get(path, { failOnStatusCode: false });

      // 401 is the honest answer; 404 is the deliberate one for routes that
      // refuse to confirm an id exists. Anything below 400 means the route
      // served a stranger.
      if (response.status() < 400) allowed.push(`${path} -> ${response.status()}`);
    }
    await anonymous.dispose();

    expect(allowed, "these project routes served an unauthenticated caller").toEqual([]);
  });

  test("every project route refuses a signed-in stranger", async ({ playwright, request }) => {
    await signInAsAdmin(request);
    const projectId = await createProject(request);

    const stranger = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const { email, password } = await createApprovedUser(request, stranger);
    const signedIn = await signIn(stranger, email, password);
    expect(signedIn.status, "the stranger could not sign in").toBe(200);

    const allowed: string[] = [];
    for (const route of PROJECT_ROUTES) {
      const path = `/api/projects/${projectId}${route}`;
      const response = await stranger.get(path, { failOnStatusCode: false });
      if (response.status() < 400) allowed.push(`${path} -> ${response.status()}`);
    }
    await stranger.dispose();

    expect(allowed, "these project routes served a signed-in user who is not a member").toEqual([]);
  });

  test("the owner reaches their own project", async ({ request }) => {
    await signInAsAdmin(request);
    const projectId = await createProject(request);

    // The counterweight to the two tests above: a suite that only asserts
    // refusals passes just as happily when the endpoints are broken for
    // everybody.
    const response = await request.get(`/api/projects/${projectId}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ project: { id: projectId } });
  });

  test("does not confirm that another owner's project id exists", async ({
    playwright,
    request,
  }) => {
    await signInAsAdmin(request);
    const realId = await createProject(request);

    const stranger = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const { email, password } = await createApprovedUser(request, stranger);
    await signIn(stranger, email, password);

    const real = await stranger.get(`/api/projects/${realId}`, { failOnStatusCode: false });
    const invented = await stranger.get(`/api/projects/proj_does_not_exist`, {
      failOnStatusCode: false,
    });
    await stranger.dispose();

    // Same answer for "exists but not yours" and "does not exist". A 403 on one
    // and a 404 on the other is a directory of every project id in the system.
    expect(real.status()).toBe(invented.status());
  });
});

test.describe("writing to a project", () => {
  test("a stranger cannot save an ERD over someone else's project", async ({
    playwright,
    request,
  }) => {
    await signInAsAdmin(request);
    const projectId = await createProject(request);

    const stranger = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    const { email, password } = await createApprovedUser(request, stranger);
    await signIn(stranger, email, password);

    const response = await stranger.put(`/api/projects/${projectId}/eml`, {
      data: { content: SAMPLE_EML },
      failOnStatusCode: false,
    });
    await stranger.dispose();

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // And the owner's model is untouched.
    const owned = await request.get(`/api/projects/${projectId}/eml`, { failOnStatusCode: false });
    if (owned.status() === 200) {
      const body = await owned.text();
      expect(body).not.toContain("Customer ||--o{ Order");
    }
  });
});
