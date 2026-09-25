#!/usr/bin/env bun

/**
 * Business rule and workflow editor E2E — the runner.
 *
 *   bun scripts/e2e-rules-workflows/run.ts                 # the modelling tool (01–05)
 *   bun scripts/e2e-rules-workflows/run.ts --generated     # also generate, boot and test the app (06)
 *   bun scripts/e2e-rules-workflows/run.ts --model path/to/model.eml.mmd --generated
 *   bun scripts/e2e-rules-workflows/run.ts -- --grep "Report Designs"   # anything after -- goes to Playwright
 *
 * --generated generates the model with the real pipeline, creates a fresh
 * database beside DATABASE_URL's (<name>_rules_workflows_e2e), migrates and
 * seeds it, starts the generated backend and front end, runs the suite with
 * GENERATED_APP_URL pointing at it, and stops both whatever happens.
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Subprocess, spawn } from "bun";
import pg from "pg";

const ROOT = path.resolve(import.meta.dir, "../..");
const HERE = import.meta.dir;
const args = process.argv.slice(2);
const passthrough = args.includes("--") ? args.slice(args.indexOf("--") + 1) : [];
const own = args.includes("--") ? args.slice(0, args.indexOf("--")) : args;
const flag = (name: string) => own.includes(name);
const option = (name: string) => {
  const i = own.indexOf(name);
  return i >= 0 ? own[i + 1] : undefined;
};

const model = path.resolve(
  option("--model") ??
    path.join(ROOT, "docs/eml-sessions/education-management-system/education-management-system.mmd")
);
if (!existsSync(model)) {
  console.error(`No model at ${model}`);
  process.exit(2);
}

const children: Subprocess[] = [];
const stop = () => {
  for (const child of children) child.kill();
};
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

async function run(cmd: string[], cwd: string, env: Record<string, string> = {}): Promise<void> {
  const child = spawn(cmd, {
    cwd,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${cmd.join(" ")} exited with ${code}`);
}

async function waitFor(url: string, seconds: number): Promise<void> {
  for (let i = 0; i < seconds; i++) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      /* not up yet */
    }
    await Bun.sleep(1000);
  }
  throw new Error(`${url} did not answer within ${seconds}s`);
}

async function freshDatabase(): Promise<string> {
  const base = process.env.DATABASE_URL;
  if (!base)
    throw new Error("--generated needs DATABASE_URL (the tool's own database is not touched)");
  const url = new URL(base);
  const name = `${url.pathname.slice(1) || "appwithai"}_rules_workflows_e2e`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  url.pathname = `/${name}`;
  const created = new pg.Client({ connectionString: url.toString() });
  await created.connect();
  await created.query("CREATE EXTENSION IF NOT EXISTS vector").catch(() => undefined);
  await created.end();
  return url.toString();
}

async function bootGeneratedApp(): Promise<Record<string, string>> {
  const out = mkdtempSync(path.join(tmpdir(), "appwithai-rules-workflows-"));
  const backendPort = process.env.GENERATED_BACKEND_PORT ?? "4701";
  const frontendPort = process.env.GENERATED_FRONTEND_PORT ?? "4700";
  console.log(`\n▸ Generating ${path.basename(model)} into ${out}`);
  await run(
    [
      "bun",
      "packages/generator/src/cli/generate.ts",
      "generate",
      "--input",
      model,
      "--output",
      out,
      "--name",
      "rules-workflows-e2e",
      "--port",
      backendPort,
      "--frontend-port",
      frontendPort,
      "--records-per-entity",
      "25",
      "--force",
      "--no-setup",
    ],
    ROOT
  );
  await run(["bun", "install"], out);

  const databaseUrl = await freshDatabase();
  const password = "admin123";
  writeFileSync(
    path.join(out, "backend/.env"),
    [
      `PORT=${backendPort}`,
      "HOST=127.0.0.1",
      "NODE_ENV=development",
      `DATABASE_URL=${databaseUrl}`,
      `CORS_ORIGIN=http://localhost:${frontendPort}`,
      `BETTER_AUTH_URL=http://localhost:${backendPort}`,
      `BETTER_AUTH_SECRET=${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`,
      "ADMIN_EMAIL=admin@admin.com",
      `ADMIN_PASSWORD=${password}`,
      "THROTTLE_TTL=60000",
      "THROTTLE_LIMIT=1000000",
      "IMMUDB_ENABLED=false",
      "",
    ].join("\n")
  );
  console.log("\n▸ Migrating and seeding");
  await run(["bun", "run", "migrate"], path.join(out, "backend"));

  console.log("\n▸ Starting the generated backend and front end");
  children.push(
    spawn(["bun", "run", "start"], {
      cwd: path.join(out, "backend"),
      stdout: "ignore",
      stderr: "inherit",
    })
  );
  children.push(
    spawn(["bun", "run", "dev"], {
      cwd: path.join(out, "frontend"),
      stdout: "ignore",
      stderr: "inherit",
    })
  );
  await waitFor(`http://127.0.0.1:${backendPort}/api/me/health`, 120);
  await waitFor(`http://localhost:${frontendPort}/login`, 180);

  if (!flag("--keep")) process.on("exit", () => rmSync(out, { recursive: true, force: true }));
  return {
    GENERATED_APP_URL: `http://localhost:${frontendPort}`,
    GENERATED_ADMIN_EMAIL: "admin@admin.com",
    GENERATED_ADMIN_PASSWORD: password,
  };
}

let code = 1;
try {
  const env: Record<string, string> = { RULES_WORKFLOWS_MODEL: model };
  if (flag("--generated")) Object.assign(env, await bootGeneratedApp());
  if (flag("--no-server")) env.E2E_NO_SERVER = "1";
  console.log("\n▸ Running the rules and workflows editor suite");
  const child = spawn(
    ["bunx", "playwright", "test", "-c", "playwright.config.ts", ...passthrough],
    {
      cwd: HERE,
      env: { ...process.env, ...env },
      stdout: "inherit",
      stderr: "inherit",
    }
  );
  code = await child.exited;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stop();
}
process.exit(code);
