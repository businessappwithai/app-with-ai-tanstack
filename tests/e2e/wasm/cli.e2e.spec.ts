/**
 * `erdwithai-wasm`, end to end, from the outside.
 *
 * These run the CLI as a command and read what it wrote, rather than importing
 * its functions — because every failure this suite exists to catch was a failure
 * of the whole command and not of a function: a script still saying `bun`, a
 * `.env` the built backend cannot find, an overlay quietly growing a tenth file
 * it rewrites.
 *
 * The two halves of the stack are tested differently, on purpose:
 *
 *   - **standalone** is generated *and started*, because it has no install step,
 *     so there is nothing between generating it and finding out whether it runs.
 *   - **the NestJS overlay** is generated and inspected. Actually running it
 *     means `npm install` — two thousand packages, minutes — which CI's
 *     `generated-wasm-app` job does once per commit. What this asserts instead
 *     is the contract that job cannot: exactly which files the overlay touched.
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const run = promisify(execFile);
const ROOT = new URL("../../../", import.meta.url).pathname.replace(/\/$/, "");
const CLI = join(ROOT, "packages/generator/src/cli-wasm/generate.ts");
const CRM = join(ROOT, "language/examples/crm.eml.mmd");

let workspace = "";

test.beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "wasm-cli-"));
});

test.afterAll(async () => {
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

/** Run the CLI, returning its output whether it succeeded or not. */
async function cli(args: string[]): Promise<{ code: number; out: string }> {
  try {
    const { stdout, stderr } = await run("bun", [CLI, ...args], {
      cwd: ROOT,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, out: (failure.stdout ?? "") + (failure.stderr ?? "") };
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const { stdout } = await run("find", [
    directory,
    "-type",
    "f",
    "-not",
    "-path",
    "*/node_modules/*",
  ]);
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((path) => path.slice(directory.length + 1))
    .sort();
}

test.describe("@cli the standalone browser application", () => {
  const output = () => join(workspace, "standalone");

  test("generates every part of the model", async () => {
    const { code, out } = await cli([
      "generate",
      "-i",
      CRM,
      "-o",
      output(),
      "--name",
      "Acme CRM",
      "--standalone",
      "--force",
    ]);

    expect(code, out).toBe(0);
    // The counts are the model's, not the generator's, so they are the thing
    // worth asserting: a parser that silently drops a section still writes a
    // complete-looking application.
    expect(out).toMatch(/Entities\s+17/);
    expect(out).toMatch(/Rules\s+8/);
    expect(out).toMatch(/Access rules\s+15/);
    expect(out).toMatch(/State machines\s+5/);
  });

  test("compiles the model into data, not into source per entity", async () => {
    const files = await listFiles(output());

    // The whole reason this stack generates in milliseconds: one model.json and
    // one schema file differ per model, and the rest is the same runtime bytes
    // every time. If this starts growing per-entity files, that property is
    // gone and nobody will notice until generation gets slow.
    expect(files).toContain("app/model.json");
    expect(files).toContain("app/schema.bus.sql");
    expect(files).toContain("app/schema.sys.sql");
    expect(files.filter((file) => /^server\/.*account/i.test(file))).toEqual([]);

    const model = JSON.parse(await readFile(join(output(), "app/model.json"), "utf-8"));
    expect(model.entities).toHaveLength(17);
    expect(model.project.name).toBe("Acme CRM");
    // Each application gets its own IndexedDB name; two generated in one browser
    // share an origin, and a fixed name meant the second ran the first's data.
    expect(model.project.dataKey).toBeTruthy();
  });

  test("gives two different models two different databases", async () => {
    const other = join(workspace, "standalone-drug");
    const { code } = await cli([
      "generate",
      "-i",
      join(ROOT, "examples/drug-discovery.eml.mmd"),
      "-o",
      other,
      "--name",
      "Drug Discovery",
      "--standalone",
      "--force",
    ]);
    expect(code).toBe(0);

    const first = JSON.parse(await readFile(join(output(), "app/model.json"), "utf-8"));
    const second = JSON.parse(await readFile(join(other, "app/model.json"), "utf-8"));
    expect(second.project.dataKey).not.toBe(first.project.dataKey);
  });
});

test.describe("@cli the model checker", () => {
  test("refuses a model whose access rules name things that do not exist", async () => {
    const model = join(workspace, "bad-rbac.eml.mmd");
    await writeFile(
      model,
      [
        "%%meta name: Bad RBAC",
        "%%rbac role:admin on Ghost.delete",
        "%%rbac role:admin on Customer.teleport",
        "erDiagram",
        "    Customer {",
        "        string id PK",
        "        string name",
        "    }",
        "",
      ].join("\n"),
      "utf-8"
    );

    const { code, out } = await cli([
      "generate",
      "-i",
      model,
      "-o",
      join(workspace, "never"),
      "--standalone",
      "--force",
    ]);

    expect(code).not.toBe(0);
    // Both findings, by code, with the entity named. A rule against a
    // non-existent entity never matches and never says so at runtime, which is
    // the whole reason the check happens before generation rather than after.
    expect(out).toContain("EML213");
    expect(out).toContain("Ghost");
    expect(out).toContain("EML214");
    expect(out).toContain("Nothing was generated");
  });

  test("--skip-check generates anyway, for anyone who means it", async () => {
    const model = join(workspace, "bad-rbac.eml.mmd");
    const { code } = await cli([
      "generate",
      "-i",
      model,
      "-o",
      join(workspace, "forced"),
      "--standalone",
      "--force",
      "--skip-check",
    ]);
    expect(code).toBe(0);
  });

  test("repairs what the fixer can repair, and says which", async () => {
    const model = join(workspace, "no-name.eml.mmd");
    await writeFile(
      model,
      [
        "erDiagram",
        "    Customer {",
        "        string id PK",
        "        string name",
        "    }",
        "",
      ].join("\n"),
      "utf-8"
    );

    const { code, out } = await cli([
      "generate",
      "-i",
      model,
      "-o",
      join(workspace, "fixed"),
      "--standalone",
      "--force",
    ]);

    expect(code).toBe(0);
    // EML001 is a missing `%%meta name:`. Repairing it silently would be worse
    // than refusing: the application would carry a name nobody chose.
    expect(out).toContain("fixed  [EML001]");
  });

  test("a clean model says nothing about itself", async () => {
    const { code, out } = await cli([
      "generate",
      "-i",
      CRM,
      "-o",
      join(workspace, "quiet"),
      "--standalone",
      "--force",
    ]);
    expect(code).toBe(0);
    expect(out).not.toContain("error");
    expect(out).not.toContain("fixed  [");
  });
});

test.describe("@cli the WebAssembly overlay", () => {
  // Generating the full NestJS stack twice takes a couple of minutes.
  test.describe.configure({ timeout: 600_000 });

  const plain = () => join(workspace, "nest-plain");
  const wasm = () => join(workspace, "nest-wasm");

  test("changes only the database driver, the audit ledger and the scripts", async () => {
    // Identical inputs, including the description: the two CLIs used to default
    // it differently, and the whole comparison below turned on nine files rather
    // than the twelve that difference produced.
    const shared = ["-i", CRM, "--name", "Acme CRM", "-d", "Generated application", "--force"];

    // `--no-setup` for the ordinary CLI only: it installs, migrates and seeds
    // after generating, and there is no database here — nor any need for one,
    // since this compares what was written. `erdwithai-wasm` has no such step
    // and does not take the flag.
    const ordinary = await run(
      "bun",
      [
        join(ROOT, "packages/generator/src/cli/generate.ts"),
        "generate",
        ...shared,
        "--no-setup",
        "-o",
        plain(),
      ],
      { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NO_COLOR: "1" } }
    );
    expect(ordinary.stdout.length).toBeGreaterThan(0);

    const { code, out } = await cli(["generate", ...shared, "-o", wasm()]);
    expect(code, out).toBe(0);

    const before = await listFiles(plain());
    const after = await listFiles(wasm());

    // Added files, and nothing else added. The overlay is allowed to bring a
    // driver and three registry configs; a fourth addition means it has started
    // solving a problem somewhere other than where the problem is.
    expect(after.filter((file) => !before.includes(file)).sort()).toEqual([
      ".npmrc",
      "backend/.npmrc",
      "backend/pg-wasm/index.d.ts",
      "backend/pg-wasm/index.js",
      "backend/pg-wasm/package.json",
      "frontend/.npmrc",
    ]);
    // And nothing removed.
    expect(before.filter((file) => !after.includes(file))).toEqual([]);

    const changed: string[] = [];
    for (const file of before) {
      const [a, b] = await Promise.all([
        readFile(join(plain(), file), "utf-8").catch(() => ""),
        readFile(join(wasm(), file), "utf-8").catch(() => ""),
      ]);
      // Both CLIs stamp a generation timestamp; a difference of a few seconds is
      // not a difference in the application.
      const blank = (text: string) => text.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "<time>");
      if (blank(a) !== blank(b)) changed.push(file);
    }

    expect(changed.sort()).toEqual([
      ".erdwithai.json",
      "backend/.env",
      "backend/.env.example",
      "backend/package.json",
      "backend/run-app.sh",
      "backend/src/modules/audit/immudb.service.ts",
      "docker-start.sh",
      "frontend/package.json",
      "package.json",
    ]);
    // Exactly one of them is application source. That is the claim the whole
    // approach rests on: the backend never knew what was behind its `Pool`.
    expect(changed.filter((file) => file.endsWith(".ts") && file.includes("/src/"))).toEqual([
      "backend/src/modules/audit/immudb.service.ts",
    ]);
  });

  test("leaves no script asking for a runtime the application does not have", async () => {
    for (const manifest of ["package.json", "backend/package.json", "frontend/package.json"]) {
      const scripts = JSON.parse(await readFile(join(wasm(), manifest), "utf-8")).scripts ?? {};
      for (const [name, script] of Object.entries(scripts as Record<string, string>)) {
        // The generated `tests/` workspace is still a bun:test suite and is
        // excluded deliberately — porting it means rewriting the generated E2E
        // harness, which is a different change from running on Node.
        if (name.includes("test")) continue;
        expect(script, `${manifest} → ${name}`).not.toMatch(/\bbunx?\b/);
      }
    }
  });

  test("the backend finds its .env once it is compiled", async () => {
    const scripts = JSON.parse(
      await readFile(join(wasm(), "backend/package.json"), "utf-8")
    ).scripts;
    // `__dirname` is `src/` under Bun and `dist/src/` once built, so the
    // backend's walk up to `.env` lands on a file that does not exist and the
    // first thing needing a secret fails as though the file were missing.
    for (const script of Object.values(scripts as Record<string, string>)) {
      if (script.includes("node ") && script.includes("dist/")) {
        expect(script).toContain("-r dotenv/config");
      }
    }
  });

  test("the driver is a plain version better-auth's peer range accepts", async () => {
    const shim = JSON.parse(await readFile(join(wasm(), "backend/pg-wasm/package.json"), "utf-8"));
    // `8.99.0-wasm` reads better and does not install: npm excludes prereleases
    // from `^8.0.0`, so better-auth's optional peer on `pg` refuses the tree.
    expect(shim.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(shim.name).toBe("pg");
  });

  test("the audit ledger keeps saying what it cannot detect", async () => {
    const ledger = await readFile(
      join(wasm(), "backend/src/modules/audit/immudb.service.ts"),
      "utf-8"
    );
    // A hash chain in the application's own database detects accidental and
    // casual tampering, and not a deliberate rewrite by someone who owns the
    // database — immudb's real protection was being somewhere else. If that
    // sentence ever goes, the claim silently becomes stronger than the code.
    expect(ledger).toContain("deliberate");
    expect(ledger).toContain("verifiedSet");
    expect(ledger).toContain("verifiedGet");
  });
});
