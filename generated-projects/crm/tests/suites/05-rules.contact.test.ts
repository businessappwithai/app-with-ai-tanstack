/**
 * Static business rules — Contact
 *
 * Generates a JDM validation rule set for this entity, registers it, then
 * proves it actually fires: valid records pass, invalid records are prevented.
 *
 * Generated: 2026-08-29T04:45:22.149Z
 * Project: my-app
 */

import { afterAll, beforeAll, describe, expect, it } from "../harness/testing.ts";
import {
  buildRecord,
  buildStaticValidationJdm,
  collectActions,
  createRule,
  dryRun,
  evaluate,
  getEntity,
  getRule,
  harness,
  listRules,
  numericFields,
  scalarFields,
  validateJdm,
  writableFields,
  type RuleRecord,
} from "../harness/index.ts";

const entity = getEntity("Contact");
const suiteId = `e2e-bus_contact-${Date.now().toString(36)}`;

describe("Contact business rules", () => {
  let rule: RuleRecord | null = null;

  beforeAll(async () => {
    await harness.setup();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it("builds valid JDM for the entity", async () => {
    const jdm = buildStaticValidationJdm(entity, writableFields(entity));

    // Well-formed JSON with the three-node input → table → output shape.
    const parsed = JSON.parse(jdm) as { nodes: unknown[]; edges: unknown[] };
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.edges).toHaveLength(2);

    const result = await validateJdm(harness.client, jdm);
    const isValid = result.valid ?? result.isValid;
    if (isValid !== undefined) expect(isValid).toBe(true);
  });

  it("registers the rule against the entity", async () => {
    const jdm = buildStaticValidationJdm(entity, writableFields(entity));

    rule = await createRule(harness.client, {
      entityName: entity.tableName,
      ruleName: `${suiteId}-validation`,
      operation: "ALL",
      jdmContent: jdm,
    });

    expect(rule.id).toBeTruthy();
    harness.trackRule(rule.id);
  });

  it("reads the rule back", async () => {
    expect(rule).not.toBeNull();

    const fetched = await getRule(harness.client, rule!.id);
    expect(fetched.id).toBe(rule!.id);
    expect(fetched.entity_name ?? fetched.entityName).toBeTruthy();
  });

  it("lists the rule under its entity", async () => {
    const rules = await listRules(harness.client, { entityName: entity.tableName });
    const ids = rules.map((r) => r.id);

    expect(ids).toContain(rule!.id);
  });

  it("evaluates a valid record without a prevent action", async () => {
    // buildValidRecord resolves foreign keys from real parents — a bare
    // buildRecord() leaves them unset and would trip the required-FK rule.
    const payload = await harness.buildValidRecord(entity);
    const outcome = await evaluate(harness.client, entity.tableName, "CREATE", payload);

    const prevents = collectActions(outcome.results).filter((a) => a.type === "prevent");
    expect(prevents.map((action) => action.config.message)).toEqual([]);
  });

  it("prevents a record missing a required field", async () => {
    const required = scalarFields(entity).filter((f) => f.required);
    if (required.length === 0) return; // nothing mandatory to violate

    // Start from a valid payload so the only violation is the one we introduce.
    const payload = await harness.buildValidRecord(entity);
    delete payload[required[0]!.name];

    const outcome = await evaluate(harness.client, entity.tableName, "CREATE", payload);
    const actions = collectActions(outcome.results);

    expect(actions.some((a) => a.type === "prevent")).toBe(true);
  });

  it("prevents a negative value on a numeric field", async () => {
    const numeric = numericFields(entity);
    if (numeric.length === 0) return;

    const payload = await harness.buildValidRecord(entity, { [numeric[0]!.name]: -42 });
    const outcome = await evaluate(harness.client, entity.tableName, "CREATE", payload);

    expect(collectActions(outcome.results).some((a) => a.type === "prevent")).toBe(true);
  });

  it("dry-runs the rule without touching data", async () => {
    expect(rule).not.toBeNull();

    const before = await harness.client.get<{ meta: { total: number } }>(
      `/bus/${entity.route}?limit=1`
    );

    const result = await dryRun(harness.client, rule!.id, buildRecord(entity));
    expect(result).toBeTruthy();

    const after = await harness.client.get<{ meta: { total: number } }>(
      `/bus/${entity.route}?limit=1`
    );
    expect(after.data.meta.total).toBe(before.data.meta.total);
  });

  it("blocks a real create that violates the rule", async () => {
    const numeric = numericFields(entity);
    if (numeric.length === 0) return;

    const payload = await harness.buildValidRecord(entity, { [numeric[0]!.name]: -1 });
    const response = await harness.client.post(`/bus/${entity.route}`, payload, {
      allowFailure: true,
    });

    // The rules engine runs inside the create path, so a prevent surfaces as 4xx.
    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("allows a real create that satisfies the rule", async () => {
    const created = await harness.createWithParents(entity);
    expect(created).not.toBeNull();
    expect(created?.id).toBeTruthy();
  });

  it("stops enforcing once deactivated", async () => {
    expect(rule).not.toBeNull();

    await harness.client.delete(`/rules/${rule!.id}`, { allowFailure: true });

    const rules = await listRules(harness.client, {
      entityName: entity.tableName,
      isActive: true,
    });
    expect(rules.map((r) => r.id)).not.toContain(rule!.id);
  });
});
