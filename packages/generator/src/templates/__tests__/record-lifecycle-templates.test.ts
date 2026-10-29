/**
 * The record lifecycle reaches every application generated from now on.
 *
 * Draft → the status flow → Final, the action buttons, who may press them and
 * the cache expiries are all template changes. A piece that exists in the
 * generator and never reaches an application is the failure this guards: it
 * generates the CRM through the one generation path, into a directory, and
 * reads what landed there.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateApplication } from "../../pipeline/generate-application";

const MODEL = join(import.meta.dirname, "../../../../../language/examples/crm.eml.mmd");
const CACHE_KEYS = [
  "CACHE_TTL_DEFAULT_MS",
  "CACHE_TTL_CAPABILITIES_MS",
  "CACHE_TTL_ACCESS_POLICY_MS",
  "CACHE_TTL_ENTITY_METADATA_MS",
  "CACHE_TTL_IDENTIFIER_FIELDS_MS",
  "CACHE_TTL_DICTIONARY_FIELDS_MS",
  "CACHE_TTL_LIFECYCLE_MS",
];

let out = "";
const read = (path: string) => readFileSync(join(out, path), "utf8");

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "lifecycle-templates-"));
  await generateApplication({
    sources: readFileSync(MODEL, "utf8"),
    projectName: "crm",
    outputDir: out,
    skipCliScaffold: true,
    skipFrontend: true,
    skipTests: true,
    writeManifestFile: false,
  } as any);
}, 240_000);

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true });
});

describe("the record lifecycle in a generated backend", () => {
  it("writes every table's lifecycle, with the CRM's drawn moves", () => {
    const lifecycle = read("backend/src/common/lifecycle.ts");
    expect(lifecycle).toContain("bus_opportunity: {");
    expect(lifecycle).toContain("column: 'stage'");
    expect(lifecycle).toContain("afterDraft: 'prospecting'");
    expect(lifecycle).toContain("terminal: ['closed_won', 'closed_lost']");
    expect(lifecycle).toContain("{ from: 'negotiation', to: 'closed_won', event: 'close_won', label: 'Close won' }");
    // An entity with no machine moves Draft → Final on doc_status.
    expect(lifecycle).toMatch(/bus_product: \{ column: 'doc_status', hasMachine: false/);
    expect(lifecycle).toContain("export function movesFrom(");
  });

  it("migrates to one grant table, the capability view, the move log and the assignee", () => {
    const migration = read("backend/src/migrations/0023_record_lifecycle.ts");
    for (const piece of [
      "CREATE TABLE IF NOT EXISTS sys_access_grant",
      "CREATE OR REPLACE VIEW sys_operation_access",
      "CREATE OR REPLACE VIEW sys_transition_access",
      "CREATE OR REPLACE VIEW sys_user_capability",
      "pg_notify('access_changed'",
      "CREATE TABLE IF NOT EXISTS sys_record_transitions",
      "ADD COLUMN IF NOT EXISTS assigned_to UUID",
      "'bus_opportunity',",
    ]) {
      expect(migration).toContain(piece);
    }
  });

  it("seeds the model's moves as grants, a reopen as its own kind", () => {
    const seed = read("backend/seeds/04b_operation_access.ts");
    expect(seed).toContain("insertInto('sys_access_grant')");
    expect(seed).toContain("{ from: 'negotiation', to: 'closed_won', kind: 'move' }");
    expect(seed).toMatch(/transition: 'reopen',[\s\S]*?kind: 'reopen'/);
  });

  it("states every cache expiry in .env and .env.example, defaulting to 6 seconds", () => {
    for (const file of ["backend/.env", "backend/.env.example"]) {
      const env = read(file);
      for (const key of CACHE_KEYS) expect(env).toContain(`${key}=6000`);
    }
    expect(read("backend/src/common/ttl-cache.ts")).toContain("export function createCache");
    expect(read("backend/src/modules/bus/bus.service.ts")).toContain("createCache<string, EntityMetadata>('entityMetadata')");
    expect(read("backend/src/modules/sys/sys.service.ts")).toContain("createCache<string, unknown>('dictionaryFields')");
  });

  it("serves the action buttons and holds a Final record", () => {
    const controller = read("backend/src/modules/bus/bus.controller.ts");
    expect(controller).toContain("@Get(':entity/:id/actions')");
    expect(controller).toContain("@Post(':entity/:id/transition')");
    expect(read("backend/src/modules/bus/transition.service.ts")).toContain("TRANSITION_FORBIDDEN");
    expect(read("backend/src/modules/auth/guards/entity-access.guard.ts")).toContain("RECORD_FINAL");
    expect(read("backend/src/modules/auth/capability.service.ts")).toContain("sys_user_capability");
  });
});
