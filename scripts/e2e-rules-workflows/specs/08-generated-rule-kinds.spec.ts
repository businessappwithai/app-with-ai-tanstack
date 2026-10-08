/**
 * Every kind of rule, enforced by a generated application.
 *
 * `models/rule-kinds.eml.mmd` is the helpdesk model plus one graph rule per node
 * type — a decision table, an expression, a function and a switch — and a
 * process the switch starts. Drawing a rule is not the same as the application
 * obeying it, so each case drives the generated API and asserts what the
 * *record* did:
 *
 *   table       a negative impact score is refused with the rule's own message
 *   expression  an impact score over 100 is refused
 *   function    a subject with a forbidden word is refused
 *   switch      an urgent ticket starts EscalateUrgent, whose step marks it
 *               urgent; an ordinary one starts nothing
 *
 * Run with `bun run test:e2e:rules-workflows -- --generated --model
 * scripts/e2e-rules-workflows/models/rule-kinds.eml.mmd`; skipped otherwise.
 */

import { type APIRequestContext, expect, test } from "@playwright/test";

const APP = process.env.GENERATED_APP_URL;

test.describe("a generated application obeys every kind of rule", () => {
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
    expect(customers.ok()).toBe(true);
    const first = ((await customers.json()) as { data: Array<{ id: string }> }).data[0];
    expect(first, "the seed should leave a customer to raise a ticket against").toBeDefined();
    customerId = first?.id ?? "";
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  const ticket = (overrides: Record<string, unknown>) => ({
    customer_id: customerId,
    subject: "Printer jams on page two",
    impact_score: 10,
    ...overrides,
  });

  const create = (overrides: Record<string, unknown>) =>
    api.post("/api/bus/ticket", { data: ticket(overrides), failOnStatusCode: false });

  test("the application's own seed data does not trip the rules", async () => {
    const response = await create({});
    expect(response.status(), await response.text()).toBeLessThan(300);
  });

  test("a decision table refuses a negative impact score, in its own words", async () => {
    const response = await create({ impact_score: -5 });
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Impact score cannot be negative");
  });

  test("an expression refuses an impact score over 100", async () => {
    const response = await create({ impact_score: 150 });
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Impact score cannot exceed 100");
  });

  test("a function refuses a forbidden word, whatever the case", async () => {
    const response = await create({ subject: "This is FORBIDDEN stuff" });
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain("Subject contains a forbidden word");
  });

  test("a switch starts the process for an urgent ticket, and its step marks the ticket", async () => {
    const response = await create({ subject: "Production is down", impact_score: 90 });
    expect(response.status(), await response.text()).toBeLessThan(300);
    const created = (await response.json()) as { id?: string; data?: { id?: string } };
    const id = created.id ?? created.data?.id;
    expect(id, "the create response should carry the new id").toBeTruthy();

    await expect
      .poll(
        async () => {
          const read = await api.get(`/api/bus/ticket/${id}`);
          const body = (await read.json()) as { priority?: string; data?: { priority?: string } };
          return body.priority ?? body.data?.priority;
        },
        { message: "EscalateUrgent should have marked the ticket urgent", timeout: 30_000 }
      )
      .toBe("urgent");

    const runs = await api.get(`/api/workflows/entity/bus_ticket/${id}`);
    expect(runs.ok()).toBe(true);
    expect(await runs.text()).toContain("EscalateUrgent");
  });

  test("the same switch starts nothing for an ordinary ticket", async () => {
    const response = await create({ subject: "Question about invoices", impact_score: 20 });
    expect(response.status(), await response.text()).toBeLessThan(300);
    const created = (await response.json()) as { id?: string; data?: { id?: string } };
    const id = created.id ?? created.data?.id;

    // Give a process that should not start the time it would have taken.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const runs = await api.get(`/api/workflows/entity/bus_ticket/${id}`);
    expect(await runs.text()).not.toContain("EscalateUrgent");
  });
});
