/**
 * Shared fixtures for the modelling tool's end-to-end suite.
 *
 * These tests drive the built application over HTTP and in a browser, against a
 * real PostgreSQL. They are deliberately API-heavy: the product's critical
 * surface is authorization and code generation, both of which are decided on the
 * server, and a click-through that asserts a button turned green proves less
 * about either than a request that asserts a 403.
 *
 * The seeded administrator is what `bun run seed:admin` creates. Its credentials
 * are fixed and known — that is the point of a bootstrap account — so the suite
 * uses it rather than registering a user it would then have to approve as
 * somebody else.
 */

import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** The bootstrap administrator, as `scripts/seed-admin-account.ts` writes it. */
export const ADMIN = {
  email: "admin@admin.com",
  password: "administrator",
} as const;

/**
 * A value no other run will produce.
 *
 * Every test in this suite leaves its rows behind — there is no teardown, and a
 * re-run against a populated database is the normal case — so anything that has
 * to be unique carries this.
 */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface SignInResult {
  status: number;
  body: unknown;
  /** The `Set-Cookie` value, when the sign-in produced a session. */
  cookie: string | null;
}

/** Sign in over the API and return the raw outcome, successful or not. */
export async function signIn(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<SignInResult> {
  const response = await request.post("/api/auth/login", {
    data: { email, password },
    failOnStatusCode: false,
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => null),
    cookie: response.headers()["set-cookie"] ?? null,
  };
}

/**
 * Sign in as the administrator, failing the test loudly if that is not possible.
 *
 * A suite whose fixture silently failed to authenticate would go on to assert
 * 401s everywhere and pass, having tested nothing — so this asserts rather than
 * returning a null session.
 */
export async function signInAsAdmin(request: APIRequestContext): Promise<void> {
  const result = await signIn(request, ADMIN.email, ADMIN.password);
  expect(
    result.status,
    `could not sign in as ${ADMIN.email}. Run "bun run seed:admin" against the test database.`
  ).toBe(200);
}

/** Sign in through the browser, so the session cookie lands in the page context. */
export async function signInThroughBrowser(page: Page): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN.email, password: ADMIN.password },
    failOnStatusCode: false,
  });
  expect(response.status(), "browser sign-in failed").toBe(200);
}

/** Create a project and return its id. */
export async function createProject(
  request: APIRequestContext,
  name = unique("e2e-project")
): Promise<string> {
  const response = await request.post("/api/projects", {
    data: { name, description: "Created by the end-to-end suite" },
    failOnStatusCode: false,
  });

  expect(response.status(), `creating a project answered ${response.status()}`).toBeLessThan(300);

  const body = (await response.json()) as { id?: string; project?: { id?: string } };
  const id = body.id ?? body.project?.id;
  expect(id, "the create-project response carried no id").toBeTruthy();
  return id as string;
}

/**
 * A small but complete EML model.
 *
 * Inline rather than read from `examples/`, because a test that breaks when
 * somebody edits an example is a test about the example. Two entities and one
 * relationship is enough to exercise parse, validate and generate.
 */
export const SAMPLE_EML = `erDiagram
    Customer ||--o{ Order : places

    Customer {
        uuid id PK
        string name
        string email
    }

    Order {
        uuid id PK
        uuid customer_id FK
        string status
        decimal total
    }

%%meta name: E2E Sample
%%entity Customer help: Somebody who buys something.
%%entity Order help: One purchase made by a customer.
%%enum OrderStatus: draft, submitted, shipped
%%field Order.status enum: OrderStatus
`;
