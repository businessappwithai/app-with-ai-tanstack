#!/usr/bin/env bun
/**
 * Exercise a generated browser application through its API.
 *
 * The application is meant to run in a tab, which is a poor place to assert
 * things from. So CI starts the identical `server/` code under the Node host
 * and drives it over HTTP — same routes, same PGlite build, same seed. What
 * this cannot see is the browser half (Service Worker, worker host, the UI);
 * what it can see is every decision the model turned into behaviour, which is
 * the half that changes when someone edits the generator.
 *
 *   bun scripts/ci/wasm-smoke.ts --base http://localhost:4700/api
 */

const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex >= 0 ? process.argv[baseIndex + 1]! : "http://localhost:4700/api";

let cookie = "";
let failures = 0;

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0]!;
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* a non-JSON body is a finding in itself, reported by the caller */
  }
  return { status: response.status, body: parsed as Record<string, unknown> };
}

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}\n        ${(error as Error).message}`);
  }
}

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

console.log(`\nExercising ${BASE}\n`);

await check("health reports a WebAssembly Postgres", async () => {
  const { status, body } = await call("GET", "/health");
  expect(status === 200, `status ${status}`);
  expect(String(body.database).includes("PGlite"), `database was ${body.database}`);
  expect(String(body.database).includes("wasm32"), "not a wasm build");
});

await check("business routes refuse an anonymous caller", async () => {
  const { status } = await call("GET", "/bus/account");
  expect(status === 401, `expected 401, got ${status}`);
});

await check("a wrong password is refused", async () => {
  const { status } = await call("POST", "/auth/login", {
    email: "admin@admin.com",
    password: "not-the-password",
  });
  expect(status === 401, `expected 401, got ${status}`);
});

await check("the seeded administrator can sign in", async () => {
  const { status, body } = await call("POST", "/auth/login", {
    email: "admin@admin.com",
    password: "admin",
  });
  expect(status === 200, `status ${status}`);
  const user = body.user as Record<string, unknown>;
  expect(user.isAdmin === true, "the seeded administrator is not an admin");
});

await check("the dictionary was seeded from the model", async () => {
  const { status, body } = await call("GET", "/sys/tables");
  expect(status === 200, `status ${status}`);
  expect(Array.isArray(body) && body.length >= 17, `only ${(body as unknown[]).length} tables`);
});

await check("%%rbac created a role for every name it uses", async () => {
  const { body } = await call("GET", "/sys/roles");
  const names = (body as Array<{ name: string }>).map((role) => role.name);
  expect(names.includes("Administrator"), "no Administrator role");
  expect(names.includes("Sales Manager"), `no Sales Manager role, got ${names.join(", ")}`);
});

await check("%%rbac restrictions were seeded", async () => {
  const { body } = await call("GET", "/auth/me/permissions");
  const operations = (body as { operations: unknown[] }).operations;
  const transitions = (body as { transitions: unknown[] }).transitions;
  expect(operations.length > 0, "no operation restrictions");
  expect(transitions.length > 0, "no transition restrictions");
});

await check("form fields come from the dictionary", async () => {
  const { status, body } = await call("GET", "/bus/account/fields/form");
  expect(status === 200, `status ${status}`);
  expect((body as unknown[]).length > 0, "no form fields");
});

let accountId = "";

await check("validation refuses an incomplete record", async () => {
  const { status } = await call("POST", "/bus/account", { name: "" });
  expect(status === 400, `expected 400, got ${status}`);
});

await check("a record can be created", async () => {
  const fields = (await call("GET", "/bus/account/fields/form")).body as Array<{
    column_name: string;
    is_mandatory: boolean;
    sys_reference_id: number;
  }>;

  const record: Record<string, unknown> = { name: "CI Account" };
  for (const field of fields) {
    if (!field.is_mandatory || field.column_name === "name" || field.column_name === "id") continue;
    // Mandatory list columns need one of their own values, which is what makes
    // this a check of the enum seed as well as of the write path.
    if (field.sys_reference_id >= 1000) {
      const values = (await call("GET", `/sys/ref-list?referenceId=${field.sys_reference_id}`))
        .body as Array<{ value: string }>;
      record[field.column_name] = values[0]?.value ?? "x";
    } else {
      record[field.column_name] = "CI";
    }
  }

  const { status, body } = await call("POST", "/bus/account", record);
  expect(status === 201, `status ${status}: ${JSON.stringify(body).slice(0, 300)}`);
  accountId = String(body.id);
});

await check("the record comes back in a listing", async () => {
  const { body } = await call("GET", "/bus/account?limit=5");
  const rows = (body as { data: Array<{ id: string }> }).data;
  expect(
    rows.some((row) => row.id === accountId),
    "the created record is not in the list"
  );
});

await check("search matches it", async () => {
  const { body } = await call("GET", "/bus/account?search=CI%20Account");
  expect((body as { total: number }).total >= 1, "search found nothing");
});

await check("a rule's decisions are readable, not guessed", async () => {
  const rules = (await call("GET", "/rules")).body as Array<{
    name: string;
    reading: { decisions: Array<{ assumed?: boolean }> };
  }>;
  expect(rules.length > 0, "no rules were seeded");
  const total = rules.reduce((sum, rule) => sum + rule.reading.decisions.length, 0);
  const assumed = rules.reduce(
    (sum, rule) => sum + rule.reading.decisions.filter((decision) => decision.assumed).length,
    0
  );
  console.log(`        ${total - assumed}/${total} flowchart decisions were read as expressions`);
  expect(total === 0 || assumed < total, "not one decision could be read");
});

await check("the audit trail recorded the sign-in and the write", async () => {
  const { body } = await call("GET", "/audit?limit=50");
  const actions = (body as { data: Array<{ action: string }> }).data.map((entry) => entry.action);
  expect(actions.includes("AUTH_LOGIN"), "no AUTH_LOGIN");
  expect(actions.includes("CREATE"), "no CREATE");
});

await check("a failed sign-in is on the trail too", async () => {
  const actions = (
    (await call("GET", "/audit?limit=50")).body as {
      data: Array<{ action: string; success: boolean }>;
    }
  ).data;
  expect(
    actions.some((entry) => entry.action === "AUTH_LOGIN" && entry.success === false),
    "the refused sign-in was not recorded"
  );
});

await check("the record can be deleted", async () => {
  const { status } = await call("DELETE", `/bus/account/${accountId}`);
  expect(status === 200, `status ${status}`);
  const { status: after } = await call("GET", `/bus/account/${accountId}`);
  expect(after === 404, `expected 404 after delete, got ${after}`);
});

await check("the model is served back with the application", async () => {
  const { status, body } = await call("GET", "/model");
  expect(status === 200, `status ${status}`);
  expect((body as { entities: unknown[] }).entities.length >= 17, "the model is incomplete");
});

console.log(failures ? `\n${failures} check(s) failed\n` : "\nAll checks passed\n");
process.exit(failures ? 1 : 0);
