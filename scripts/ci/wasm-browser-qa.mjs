#!/usr/bin/env node
/**
 * Drive a generated browser application the way a person would.
 *
 * `wasm-smoke.ts` exercises the same backend over HTTP under the Node host,
 * which proves the model compiled into the behaviour it describes. It cannot
 * see the half that only exists in a browser: the Service Worker serving the
 * application, the worker host starting Postgres, and a dictionary-driven UI
 * drawing itself from rows. This does — through Chromium, against
 * `html/run-in-browser.html`, from choosing a model to creating a record.
 *
 * Both paths the page offers are covered, because they fail differently: the
 * built-in model is fetched, and an uploaded one is read in the tab and has to
 * replace whatever was chosen before it.
 *
 *   bun run wasm serve html --port 4500      # in one terminal
 *   node scripts/ci/wasm-browser-qa.mjs      # in another
 *
 * Screenshots land in $QA_OUT (default /tmp/qa). Not wired into CI yet: it
 * needs a Chromium and about ten minutes, most of it Postgres starting twice.
 */

import { chromium } from "@playwright/test";

const OUT = process.env.QA_OUT || "/tmp/qa";
const BASE = process.env.QA_BASE || "http://localhost:4500/run-in-browser.html";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();

const problems = [];
// Two console errors are the application working as designed: `/auth/me`
// answering 401 before anyone has signed in, and the browser asking for a
// favicon the application does not ship. Reporting them as problems would train
// the reader to ignore this list.
const EXPECTED = /favicon|status of 401/;
page.on("console", (m) => {
  if (m.type() === "error" && !EXPECTED.test(m.text())) problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => {
  const f = r.failure();
  if (f && !/net::ERR_ABORTED/.test(f.errorText))
    problems.push(`requestfailed: ${r.url()} ${f.errorText}`);
});

const step = async (name, fn) => {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAIL\n     " + e.message.split("\n")[0]);
    problems.push(`${name}: ${e.message.split("\n")[0]}`);
  }
};

console.log("\n== the generator page ==");
await step("loads", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("#model-summary:not([hidden])", { timeout: 15000 });
});
await step("defaults to the CRM model", async () => {
  const text = await page.textContent("#model-summary");
  if (!text.includes("crm.eml.mmd")) throw new Error("expected crm.eml.mmd, got " + text);
  const pressed = await page.getAttribute("#choice-crm", "aria-pressed");
  if (pressed !== "true") throw new Error("CRM choice not selected");
});
await page.screenshot({ path: `${OUT}/01-page.png`, fullPage: false });

await step("generates", async () => {
  await page.click("#generate");
  await page.waitForSelector("#result.is-shown .tally", { timeout: 30000 });
  const tally = await page.$$eval(".tally__cell", (cells) =>
    Object.fromEntries(
      cells.map((c) => [
        c.querySelector(".tally__label").textContent,
        c.querySelector(".tally__value").textContent,
      ])
    )
  );
  console.log("\n     " + JSON.stringify(tally));
  if (Number(tally.Entities) !== 17) throw new Error("expected 17 entities, got " + tally.Entities);
  if (Number(tally.Rules) !== 8) throw new Error("expected 8 rules, got " + tally.Rules);
  if (Number(tally["Access rules"]) !== 15) throw new Error("expected 15 access rules");
  process.stdout.write("   ");
});
await page.screenshot({ path: `${OUT}/02-generated.png`, fullPage: false });

await step("runs the application", async () => {
  await page.click("#run");
  await page.waitForSelector("#stage.is-shown", { timeout: 20000 });
});

const frame = await (await page.waitForSelector("#frame")).contentFrame();

await step("boots Postgres and reaches the sign-in screen", async () => {
  await frame.waitForSelector(".login__form", { timeout: 180000 });
});
await page.screenshot({ path: `${OUT}/03-login.png`, fullPage: false });

await step("boot log shows the real runtime", async () => {
  // the boot screen is removed after success; check it got there
  const title = await frame.textContent(".login__title");
  if (!title.includes("Acme CRM")) throw new Error("login title was " + title);
});

await step("signs in with the seeded administrator", async () => {
  await frame.fill("#email", "admin@admin.com");
  await frame.fill("#password", "admin");
  await frame.click(".login__form button[type=submit]");
  await frame.waitForSelector(".masthead", { timeout: 60000 });
});
await page.screenshot({ path: `${OUT}/04-dashboard.png`, fullPage: false });

await step("groups the entities by the categories the model declared", async () => {
  await frame.waitForSelector(".category__name", { timeout: 30000 });
  const headings = await frame.$$eval(".category__name", (n) => n.map((x) => x.textContent));
  console.log("\n     groups: " + headings.join(" | "));
  if (!headings.includes("Sales Pipeline")) throw new Error("missing Sales Pipeline group");
  if (!headings.includes("Application Dictionary"))
    throw new Error("no Application Dictionary group");
  process.stdout.write("   ");
});

await step("opens an entity grid", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/entity/account";
  });
  await frame.waitForSelector(".listbar", { timeout: 30000 });
  await frame.waitForSelector(".empty, .table", { timeout: 30000 });
});
await page.screenshot({ path: `${OUT}/05-entity-list.png`, fullPage: false });

await step("opens the new-record form built from the dictionary", async () => {
  // The action bar's New button, the way a person opens a record.
  await frame.click(".actionbar button:nth-of-type(2)");
  await frame.waitForSelector(".group__fields", { timeout: 30000 });
  const fields = await frame.$$eval(".field__label", (n) => n.map((x) => x.textContent.trim()));
  console.log("\n     fields: " + fields.slice(0, 8).join(", "));
  if (!fields.length) throw new Error("form had no fields");
  process.stdout.write("   ");
});
await page.screenshot({ path: `${OUT}/06-form.png`, fullPage: false });

await step("creates a record", async () => {
  const selects = await frame.$$("select.field__input");
  await frame.fill("#field-name", "Globex Corporation");
  for (const select of selects) {
    const options = await select.$$eval("option", (o) => o.map((x) => x.value).filter(Boolean));
    if (options.length) await select.selectOption(options[0]);
  }
  // Every remaining mandatory control, or the browser's own required-field
  // validation blocks submit before the application ever sees the write.
  for (const input of await frame.$$("input.field__input[required]")) {
    if (await input.inputValue()) continue;
    const type = await input.getAttribute("type");
    await input.fill(type === "number" ? "1" : "QA");
  }
  await frame.click('.record__actions button[type="submit"]');
  await frame.waitForSelector(".toast--success, .violations:not([hidden])", { timeout: 30000 });
  const violation = await frame.$(".violations:not([hidden])");
  if (violation) throw new Error("save rejected: " + (await violation.textContent()).slice(0, 200));
});
await page.screenshot({ path: `${OUT}/07-created.png`, fullPage: false });

await step("the record appears in the grid", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/entity/account";
  });
  await frame.waitForSelector(".table__row", { timeout: 30000 });
  const body = await frame.textContent(".table");
  if (!body.includes("Globex")) throw new Error("record not in grid");
});

await step("the rules screen shows how each decision was read", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/rules";
  });
  await frame.waitForSelector(".cards .rule", { timeout: 30000 });
  const cards = await frame.$$eval(".rule__name", (n) => n.map((x) => x.textContent));
  console.log("\n     rules: " + cards.join(", "));
  const readings = await frame.$$eval(".decision__reading", (n) =>
    n.slice(0, 3).map((x) => x.textContent)
  );
  console.log("     readings: " + readings.join(" | "));
  process.stdout.write("   ");
});
await page.screenshot({ path: `${OUT}/08-rules.png`, fullPage: false });

await step("the dictionary screen lists the seeded tables", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/dictionary";
  });
  await frame.waitForSelector(".table", { timeout: 30000 });
  const rows = await frame.$$eval(".table tbody tr", (r) => r.length);
  if (rows < 17) throw new Error(`expected >= 17 dictionary rows, got ${rows}`);
});
await page.screenshot({ path: `${OUT}/09-dictionary.png`, fullPage: false });

await step("the processes screen shows the model's state machines", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/processes";
  });
  await frame.waitForSelector(".cards .rule", { timeout: 30000 });
  const names = await frame.$$eval(".rule__name", (n) => n.map((x) => x.textContent));
  console.log("\n     processes: " + names.join(", "));
  process.stdout.write("   ");
});
await page.screenshot({ path: `${OUT}/10-processes.png`, fullPage: false });

await step("the audit trail recorded the sign-in and the write", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/audit";
  });
  await frame.waitForSelector(".table", { timeout: 30000 });
  const body = await frame.textContent(".table");
  if (!body.includes("AUTH_LOGIN")) throw new Error("no AUTH_LOGIN in the trail");
  if (!body.includes("CREATE")) throw new Error("no CREATE in the trail");
});
await page.screenshot({ path: `${OUT}/11-audit.png`, fullPage: false });

await step("the model screen serves the EML back", async () => {
  await frame.evaluate(() => {
    window.location.hash = "/model";
  });
  await frame.waitForSelector(".source", { timeout: 30000 });
  const source = await frame.textContent(".source");
  if (!source.includes("erDiagram")) throw new Error("model source not served");
});
await page.screenshot({ path: `${OUT}/12-model.png`, fullPage: false });

/* ------------------------------------------------------------- upload path */

console.log("\n== the upload path ==");

const page2 = await context.newPage();
page2.on("console", (m) => {
  if (m.type() === "error") problems.push(`upload console: ${m.text()}`);
});
page2.on("pageerror", (e) => problems.push(`upload pageerror: ${e.message}`));

const step2 = async (name, fn) => {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAIL\n     " + e.message.split("\n")[0]);
    problems.push(`upload/${name}: ${e.message.split("\n")[0]}`);
  }
};

await step2("loads the page", async () => {
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await page2.waitForSelector("#model-summary:not([hidden])", { timeout: 15000 });
});

await step2("switching to Upload reveals the drop zone and clears the model", async () => {
  await page2.click("#choice-upload");
  await page2.waitForSelector("#dropzone:not([hidden])", { timeout: 5000 });
  if (!(await page2.isHidden("#model-summary")))
    throw new Error("the previous model was left selected");
  if ((await page2.getAttribute("#choice-crm", "aria-pressed")) !== "false")
    throw new Error("CRM still marked as chosen");
});

await step2("accepts a chosen .mmd file", async () => {
  await page2.setInputFiles("#file", "examples/drug-discovery.eml.mmd");
  await page2.waitForSelector("#model-summary:not([hidden])", { timeout: 10000 });
  const text = await page2.textContent("#model-summary");
  if (!text.includes("drug-discovery"))
    throw new Error("summary did not name the uploaded file: " + text);
  const name = await page2.inputValue("#app-name");
  console.log(
    "\n     summary: " +
      text.replace(/\s+/g, " ").trim() +
      " · name guessed as " +
      JSON.stringify(name)
  );
  process.stdout.write("   ");
});
await page2.screenshot({ path: `${OUT}/13-upload-chosen.png` });

await step2("generates the uploaded model", async () => {
  await page2.fill("#app-name", "Lab Notebook");
  await page2.click("#generate");
  await page2.waitForSelector("#result.is-shown .tally", { timeout: 30000 });
  const tally = await page2.$$eval(".tally__cell", (cells) =>
    Object.fromEntries(
      cells.map((c) => [
        c.querySelector(".tally__label").textContent,
        c.querySelector(".tally__value").textContent,
      ])
    )
  );
  console.log("\n     " + JSON.stringify(tally));
  if (Number(tally.Entities) !== 17) throw new Error("expected 17 entities, got " + tally.Entities);
  if (Number(tally.Rules) !== 3) throw new Error("expected 3 rules, got " + tally.Rules);
  process.stdout.write("   ");
});
await page2.screenshot({ path: `${OUT}/14-upload-generated.png` });

await step2("runs the uploaded model's application", async () => {
  await page2.click("#run");
  await page2.waitForSelector("#stage.is-shown", { timeout: 20000 });
});

const frame2 = await (await page2.waitForSelector("#frame")).contentFrame();

await step2("boots and signs in", async () => {
  await frame2.waitForSelector(".login__form", { timeout: 240000 });
  const title = await frame2.textContent(".login__title");
  if (!title.includes("Lab Notebook")) throw new Error("login title was " + title);
  await frame2.fill("#email", "admin@admin.com");
  await frame2.fill("#password", "admin");
  await frame2.click(".login__form button[type=submit]");
  await frame2.waitForSelector(".masthead", { timeout: 90000 });
});
await page2.screenshot({ path: `${OUT}/15-upload-running.png` });

await step2("shows the uploaded model's own entities, not the CRM's", async () => {
  await frame2.waitForSelector(".card__name", { timeout: 30000 });
  const links = await frame2.$$eval(".card__name", (n) => n.map((x) => x.textContent));
  console.log("\n     entities: " + links.slice(0, 10).join(", "));
  if (!links.some((l) => /Compound/i.test(l)))
    throw new Error("no Compound entity on the dashboard");
  if (links.some((l) => /Opportunity/i.test(l)))
    throw new Error("CRM entities leaked into the uploaded app");
  process.stdout.write("   ");
});

await step2("a business rule refuses a write the model says it should", async () => {
  // experimentSubmitGate: an Experiment moving out of draft needs a title.
  const outcome = await frame2.evaluate(async () => {
    // The session is a bearer token the client holds: a Service Worker never
    // sees a Cookie header, so an application hosted this way cannot use one.
    const token = sessionStorage.getItem("erdwithai.session");
    const response = await fetch("api/rules/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "same-origin",
      body: JSON.stringify({
        entity: "Experiment",
        operation: "UPDATE",
        data: { status: "draft", title: "", estimated_duration_days: 0 },
      }),
    });
    return response.json();
  });
  console.log("\n     violations: " + JSON.stringify(outcome.violations));
  if (!outcome.violations.length) throw new Error("the rule did not refuse an untitled draft");
  process.stdout.write("   ");
});
await page2.screenshot({ path: `${OUT}/16-upload-rule.png` });

console.log("\n== problems ==");
if (problems.length) {
  for (const p of problems) console.log("  ✗ " + p);
} else console.log("  none");

await browser.close();
process.exit(problems.length ? 1 : 0);
