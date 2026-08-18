#!/usr/bin/env node
/**
 * `erdwithai-wasm` — generate an application that runs in a browser tab.
 *
 * The sibling of `erdwithai`. It reads the same `.eml.mmd`, through the same
 * parser, and compiles the same rules, hooks, workflows and `%%rbac`
 * directives; what changes is the target. Instead of a NestJS backend on Bun
 * and a Vite frontend on Node, it emits an application whose database is
 * PostgreSQL compiled to WebAssembly, whose server runs on a Worker under a
 * Node-API runtime, and whose HTTP layer is a Service Worker — all inside the
 * page that opens it.
 *
 *   erdwithai-wasm generate -i model.eml.mmd -o ./app --name "My App"
 *   erdwithai-wasm serve ./app                # run it, open a browser
 *   erdwithai-wasm inspect model.eml.mmd      # what would be generated
 *
 * PGlite is ~17MB of WebAssembly. `--vendor-pglite` copies it into the output
 * so the application needs no network at all; without it the app loads PGlite
 * from a CDN on first run and caches it.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { createServer } from "node:http";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Command } from "commander";
import { DEFAULT_PGLITE_URL, generateWasmApp, type WasmGeneratedApp } from "../generators/wasm";
import { readModelSources } from "../pipeline/generate-application";
import { parseModel } from "../pipeline/parse-model";

const program = new Command();

program
  .name("erdwithai-wasm")
  .description("Generate a full-stack application that runs entirely in the browser")
  .version("5.1.0");

/** Files PGlite needs at runtime. The `.map` and `contrib` halves are not among them. */
const PGLITE_FILES = [
  "index.js",
  "chunk-2BOC2OMW.js",
  "chunk-F4GETNPB.js",
  "chunk-JDT7TZ73.js",
  "chunk-QY3QWFKW.js",
  "chunk-RYDTTX3G.js",
  "chunk-TDKVRJ2S.js",
  "chunk-VVBUWNGP.js",
  "pglite.js",
  "pglite.wasm",
  "pglite.data",
  "initdb.js",
  "initdb.wasm",
  "templating.js",
  "fs/base.js",
  "fs/opfs-ahp.js",
  "fs/nodefs.js",
  "live/index.js",
  "worker/index.js",
  "vector.tar.gz",
];

program
  .command("generate")
  .description("Generate a browser-native application from a model")
  .option("-i, --input <file>", "Input Mermaid ERD / EML file")
  .option("--sys-file <file>", "System entities file (multi-file mode)")
  .option("--bus-file <file>", "Business entities file (multi-file mode)")
  .option("--ref-file <file>", "Reference entities file (multi-file mode)")
  .option("-o, --output <dir>", "Output directory", "./generated-wasm-app")
  .option("-n, --name <name>", "Project name", "my-app")
  .option("-v, --version <version>", "Project version", "1.0.0")
  .option("-d, --description <desc>", "Project description", "Generated browser application")
  .option("--admin-email <email>", "Seeded administrator's email", "admin@admin.com")
  .option("--admin-password <password>", "Seeded administrator's password", "admin")
  .option("--admin-name <name>", "Seeded administrator's display name", "admin")
  .option("--vendor-pglite", "Copy PGlite into the output so the app needs no network")
  .option(
    "--pglite-url <url>",
    "Where the app loads PGlite from when not vendored",
    DEFAULT_PGLITE_URL
  )
  .option("--force", "Overwrite a non-empty output directory")
  .option("--dry-run", "List what would be written, without writing it")
  .option("--quiet", "Only print errors")
  .action(async (options) => {
    const say = options.quiet ? () => {} : (line = "") => console.log(line);

    const inputs = [options.input, options.sysFile, options.busFile, options.refFile].filter(
      Boolean
    );
    if (!inputs.length) {
      console.error(
        "✖ Provide a model with -i / --input (or --sys-file / --bus-file / --ref-file)"
      );
      process.exit(1);
    }
    for (const input of inputs) {
      if (!existsSync(path.resolve(input))) {
        console.error(`✖ No such file: ${input}`);
        process.exit(1);
      }
    }

    const sources = await readModelSources(inputs);
    if (!sources.length) {
      console.error("✖ Could not read any of the given model files");
      process.exit(1);
    }

    say(`\n  Parsing ${inputs.join(", ")}`);
    const parsed = parseModel(sources);

    if (!parsed.entities.length) {
      console.error("✖ The model declares no entities — is the erDiagram section present?");
      process.exit(1);
    }

    const generated = generateWasmApp(parsed, {
      name: options.name,
      version: options.version,
      description: options.description,
      adminEmail: options.adminEmail,
      adminPassword: options.adminPassword,
      adminName: options.adminName,
      source: sources.join("\n\n"),
      pgliteUrl: options.pgliteUrl,
    });

    describe(say, parsed, generated);

    const outputDir = path.resolve(options.output);

    if (options.dryRun) {
      say("\n  Files (dry run):");
      for (const name of [...generated.files.keys()].sort()) say(`    ${name}`);
      say(`\n  ${generated.files.size} files, nothing written.\n`);
      return;
    }

    if (existsSync(outputDir) && !options.force) {
      const entries = await fs.readdir(outputDir);
      if (entries.length) {
        console.error(`✖ ${outputDir} is not empty. Pass --force to overwrite.`);
        process.exit(1);
      }
    }

    await writeFiles(outputDir, generated.files);
    say(`\n  Wrote ${generated.files.size} files to ${outputDir}`);

    if (options.vendorPglite) {
      const copied = await vendorPglite(outputDir);
      say(
        copied
          ? `  Vendored PGlite (${copied} files) — the application needs no network`
          : "  ⚠ Could not find @electric-sql/pglite to vendor; the app will use the CDN"
      );
    }

    say(`
  Run it:

    cd ${path.relative(process.cwd(), outputDir) || "."}
    erdwithai-wasm serve .

  Sign in as ${options.adminEmail} / ${options.adminPassword}
`);
  });

program
  .command("serve [dir]")
  .description("Serve a generated application over http (a Service Worker needs http, not file)")
  .option("-p, --port <port>", "Port", "4000")
  .action(async (directory = ".", options) => {
    const root = path.resolve(directory);
    if (!existsSync(path.join(root, "index.html"))) {
      console.error(`✖ ${root} does not look like a generated application (no index.html)`);
      process.exit(1);
    }
    await serveStatic(root, Number(options.port));
  });

program
  .command("run [dir]")
  .description("Serve a generated application and run its backend under Node as well")
  .option("-p, --port <port>", "Port for the backend host", "4001")
  .action(async (directory = ".", options) => {
    const root = path.resolve(directory);
    const host = path.join(root, "host/node-host.mjs");
    if (!existsSync(host)) {
      console.error(`✖ ${root} has no host/node-host.mjs`);
      process.exit(1);
    }
    const child = spawn(process.execPath, [host, "--port", String(options.port)], {
      stdio: "inherit",
      cwd: root,
    });
    child.on("exit", (code) => process.exit(code ?? 0));
  });

program
  .command("inspect <file>")
  .description("Show what would be generated from a model, without generating it")
  .action(async (file) => {
    const sources = await readModelSources([file]);
    if (!sources.length) {
      console.error(`✖ Could not read ${file}`);
      process.exit(1);
    }
    const parsed = parseModel(sources);
    const generated = generateWasmApp(parsed, {
      name: "inspection",
      version: "0.0.0",
      description: "",
      adminEmail: "admin@admin.com",
      adminPassword: "admin",
      adminName: "admin",
    });
    describe((line = "") => console.log(line), parsed, generated);
    console.log("");
  });

function describe(
  say: (line?: string) => void,
  parsed: ReturnType<typeof parseModel>,
  generated: WasmGeneratedApp
): void {
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)}KB`;
  say("");
  say(
    `  Entities       ${parsed.entities.length}  ${parsed.entities.map((e) => e.name).join(", ")}`
  );
  say(`  Relationships  ${parsed.relationships.length}`);
  say(
    `  Categories     ${parsed.categories.length}  ${parsed.categories.map((c) => c.name).join(", ")}`
  );
  say(`  Enums          ${parsed.enums.length}`);
  say(`  Rules          ${parsed.rules.length}  ${parsed.rules.map((r) => r.name).join(", ")}`);
  say(`  Hooks          ${parsed.hooks.length}`);
  say(
    `  State machines ${parsed.workflows.length}  ${parsed.workflows.map((w) => w.name).join(", ")}`
  );
  say(`  Sagas          ${parsed.sagas.length}`);
  say(
    `  Access rules   ${parsed.rbac.operations.length + parsed.rbac.transitions.length} ` +
      `(${parsed.rbac.operations.length} CRUD, ${parsed.rbac.transitions.length} transition)`
  );
  say("");
  say(`  Application    ${generated.stats.fileCount} files, ${kb(generated.stats.bytes)}`);
  say(`                 of which ${kb(generated.stats.runtimeBytes)} is the shared runtime`);
}

async function writeFiles(outputDir: string, files: Map<string, string>): Promise<void> {
  for (const [name, contents] of files) {
    const target = path.join(outputDir, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, contents, "utf-8");
  }
}

/**
 * Copy PGlite into the application.
 *
 * Resolved from this package's own dependencies rather than the user's cwd, so
 * `erdwithai-wasm` installed globally still finds it. Files that are missing in
 * a given PGlite release are skipped rather than failing the generation: the
 * list is a superset across versions, and a vendored app that is missing an
 * optional filesystem backend still runs.
 */
async function vendorPglite(outputDir: string): Promise<number> {
  let base: string;
  try {
    const entry = await import.meta.resolve?.("@electric-sql/pglite");
    base = entry
      ? path.dirname(fileURLToPath(entry))
      : path.dirname(fileURLToPath(pathToFileURL(require.resolve("@electric-sql/pglite")).href));
  } catch {
    const guess = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../../node_modules/@electric-sql/pglite/dist"
    );
    if (!existsSync(guess)) return 0;
    base = guess;
  }

  let copied = 0;
  for (const name of PGLITE_FILES) {
    const from = path.join(base, name);
    if (!existsSync(from)) continue;
    const to = path.join(outputDir, "vendor/pglite", name);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    copied += 1;
  }
  return copied;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".sql": "text/plain; charset=utf-8",
  ".mmd": "text/plain; charset=utf-8",
  ".gz": "application/gzip",
  ".svg": "image/svg+xml",
};

/**
 * A static server, deliberately not a dependency.
 *
 * The generated application has exactly one hosting requirement — be reachable
 * over http so a Service Worker can register — and adding `serve` or `express`
 * to a package whose entire point is that the app has no runtime dependencies
 * would be its own kind of joke.
 */
async function serveStatic(root: string, port: number): Promise<void> {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://localhost:${port}`);
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let target = path.normalize(path.join(root, relative));

      if (!target.startsWith(root)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (existsSync(target) && (await fs.stat(target)).isDirectory()) {
        target = path.join(target, "index.html");
      }
      if (!existsSync(target)) {
        response.writeHead(404).end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": MIME[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
        // Deliberately no COEP. Cross-origin isolation would buy a faster
        // Postgres where SharedArrayBuffer is available, and it costs the
        // ability to embed the application in an iframe — which is exactly what
        // the hosted generator page does, and what broke: a COEP document
        // refuses to embed a response that does not opt in, and a response the
        // Service Worker synthesised cannot easily opt in. PGlite runs fine
        // without it.
        "Cross-Origin-Resource-Policy": "same-origin",
        // Without this a Service Worker registered from /sw.js can only claim
        // its own directory, which is fine here and wrong the moment someone
        // serves the app from a subpath.
        "Service-Worker-Allowed": "/",
      });
      response.end(await fs.readFile(target));
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`\n  Serving ${root}\n  http://localhost:${port}\n`);
}

program.parse(process.argv);
