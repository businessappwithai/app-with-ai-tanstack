#!/usr/bin/env node
/**
 * The standalone case: an application written to disk by the CLI, served as
 * static files, registering its own Service Worker. The hosted page exercises a
 * different path (a wider-scoped worker already serving the files), so passing
 * there says nothing about this.
 *
 *   bun run wasm generate -i language/examples/crm.eml.mmd -o /tmp/app --vendor-pglite
 *   bun run wasm serve /tmp/app --port 4800
 *   node scripts/ci/wasm-standalone-qa.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE || "http://localhost:4800/index.html";
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message.slice(0, 200)));

const step = async (name, fn) => {
  process.stdout.write(`  ${name} ... `);
  try { await fn(); console.log("ok"); }
  catch (e) { console.log("FAIL\n     " + e.message.split("\n")[0]); problems.push(name); }
};

console.log("\n== a CLI-generated application, served statically ==");

await step("registers its own Service Worker and boots", async () => {
  await page.goto(BASE);
  await page.waitForSelector(".login__form", { timeout: 240000 });
});
await page.screenshot({ path: `${process.env.QA_OUT || "/tmp/qa"}/20-standalone-login.png` });

await step("the boot log names the runtime it started", async () => {
  const log = await page.textContent("#boot-log").catch(() => "");
  console.log("\n     " + log.replace(/\s+/g, " ").slice(0, 260));
  process.stdout.write("   ");
});

await step("signs in and reaches the application", async () => {
  await page.fill("#email", "admin@admin.com");
  await page.fill("#password", "admin");
  await page.click(".login__form button[type=submit]");
  await page.waitForSelector(".masthead", { timeout: 90000 });
  await page.waitForSelector(".category__name", { timeout: 60000 });
});
await page.screenshot({ path: `${process.env.QA_OUT || "/tmp/qa"}/21-standalone-app.png` });

await step("the data survives a reload (IndexedDB, not memory)", async () => {
  const before = await page.evaluate(async () => {
    const token = sessionStorage.getItem("erdwithai.session");
    const response = await fetch("api/sys/model-summary", { headers: { Authorization: `Bearer ${token}` } });
    return (await response.json()).counts.entities;
  });
  await page.reload();
  await page.waitForSelector(".masthead, .login__form", { timeout: 180000 });
  const seeded = await page.evaluate(() => document.getElementById("boot-log")?.textContent ?? "");
  if (seeded.includes("Seeding the dictionary")) throw new Error("it re-seeded instead of reattaching");
  console.log(`\n     reattached to the existing database (${before} entities)`);
  process.stdout.write("   ");
});

console.log(problems.length ? `\n  ${problems.length} problem(s)\n` : "\n  none\n");
await browser.close();
process.exit(problems.length ? 1 : 0);
