/**
 * A state machine, enforced by a generated application.
 *
 * `models/rule-kinds.eml.mmd` draws TicketLifecycle:
 *
 *   open -> in_progress, open -> closed, in_progress -> resolved,
 *   resolved -> in_progress, resolved -> closed
 *
 * The guard refuses a status write with no matching edge — for every caller,
 * administrator included — and `GET /api/workflows/transitions` offers only the
 * moves that exist. Each case drives the API and asserts what the record did.
 *
 * Run with `bun run test:e2e:rules-workflows -- --generated --model
 * scripts/e2e-rules-workflows/models/rule-kinds.eml.mmd`; skipped otherwise.
 */

import { type APIRequestContext, expect, test } from "@playwright/test";

const APP = process.env.GENERATED_APP_URL;

const EDGES: Record<string, string[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["resolved"],
  resolved: ["in_progress", "closed"],
  closed: [],
};

test.describe("a generated application enforces a drawn state machine", () => {
  test.skip(!APP, "needs --generated with --model models/rule-kinds.eml.mmd");

  let api: APIRequestContext;
  let customerId: string;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: APP,
      extraHTTPHeaders: { Origin: APP ?? "" },
    });
    const signIn = await api.post("/api/auth/sign-in/email", {
      data: {
        email: process.env.GENERATED_ADMIN_EMAIL,
        password: process.env.GENERATED_ADMIN_PASSWORD,
      },
    });
    expect(signIn.ok(), `signing in answered ${signIn.status()}`).toBe(true);
    const customers = await api.get("/api/bus/customer?limit=1");
    customerId = ((await customers.json()) as { data: Array<{ id: string }> }).data[0]?.id ?? "";
    expect(customerId).not.toBe("");
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  const createTicket = async (): Promise<string> => {
    const response = await api.post("/api/bus/ticket", {
      data: { customer_id: customerId, subject: "State machine probe", impact_score: 10 },
      failOnStatusCode: false,
    });
    expect(response.status(), await response.text()).toBeLessThan(300);
    const body = (await response.json()) as { id?: string; data?: { id?: string } };
    const id = body.id ?? body.data?.id;
    expect(id).toBeTruthy();
    return id as string;
  };

  const setStatus = (id: string, status: string) =>
    api.patch(`/api/bus/ticket/${id}`, { data: { status }, failOnStatusCode: false });

  const statusOf = async (id: string): Promise<string | undefined> => {
    const body = (await (await api.get(`/api/bus/ticket/${id}`)).json()) as {
      status?: string;
      data?: { status?: string };
    };
    return body.status ?? body.data?.status;
  };

  const offered = async (from: string): Promise<string[]> => {
    const response = await api.get(`/api/workflows/transitions?table=bus_ticket&from=${from}`);
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as unknown;
    const rows = (
      Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    ) as Array<{
      to_state?: string;
      to?: string;
    }>;
    return rows.map((row) => row.to_state ?? row.to ?? "").sort();
  };

  test("the transitions endpoint offers exactly the drawn moves", async () => {
    for (const [from, to] of Object.entries(EDGES)) {
      expect(await offered(from), `moves out of ${from}`).toEqual([...to].sort());
    }
  });

  test("a drawn move is accepted, and the record keeps it", async () => {
    const id = await createTicket();
    const response = await setStatus(id, "in_progress");
    expect(response.status(), await response.text()).toBeLessThan(300);
    expect(await statusOf(id)).toBe("in_progress");
  });

  test("a move the diagram never drew is refused, administrator or not", async () => {
    const id = await createTicket();
    // open -> resolved is not an edge: it must go through in_progress.
    const response = await setStatus(id, "resolved");
    expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    expect(await statusOf(id), "the refused write must leave the record alone").toBe("open");
  });

  test("a whole path is walkable, and a closed ticket goes nowhere", async () => {
    const id = await createTicket();
    for (const next of ["in_progress", "resolved", "in_progress", "resolved", "closed"]) {
      const response = await setStatus(id, next);
      expect(response.status(), `to ${next}: ${await response.text()}`).toBeLessThan(300);
    }
    expect(await statusOf(id)).toBe("closed");
    const back = await setStatus(id, "open");
    expect(back.status()).toBeGreaterThanOrEqual(400);
    expect(await statusOf(id)).toBe("closed");
  });
});
