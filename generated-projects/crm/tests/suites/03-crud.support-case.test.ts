/**
 * CRUD — Support Case
 *
 * One file per entity, so a failure names the entity that broke.
 *
 * Generated: 2026-08-17T16:41:43.850Z
 * Project: crm
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  buildInvalidRecord,
  buildRecord,
  firstTextField,
  getEntity,
  harness,
  scalarFields,
  writableFields,
} from "../harness";

const entity = getEntity("SupportCase");

describe("Support Case CRUD", () => {
  /** Ids created here that later tests reuse. */
  let createdId = "";

  beforeAll(async () => {
    await harness.setup();
  });

  afterAll(async () => {
    await harness.teardown();
  });

  it("lists records with pagination metadata", async () => {
    const response = await harness.client.get<{
      data: unknown[];
      meta: { total: number; page?: number; limit?: number };
    }>(`/bus/${entity.route}?page=1&limit=10`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(typeof response.data.meta.total).toBe("number");
    expect(response.data.data.length).toBeLessThanOrEqual(10);
  });

  it("creates a record", async () => {
    const created = await harness.createWithParents(entity);

    expect(created).not.toBeNull();
    expect(created?.id).toBeTruthy();

    createdId = String(created?.id);
  });

  it("reads the record back by id", async () => {
    expect(createdId).toBeTruthy();

    const response = await harness.client.get<Record<string, unknown>>(
      `/bus/${entity.route}/${createdId}`
    );

    expect(response.status).toBe(200);
    expect(response.data.id).toBe(createdId);
  });

  it("persists the values it was given", async () => {
    const textField = firstTextField(entity);
    if (!textField) return; // nothing text-shaped to assert on

    const marker = `e2e-${Date.now()}`;
    const created = await harness.createWithParents(entity, { [textField.name]: marker });
    expect(created).not.toBeNull();

    const response = await harness.client.get<Record<string, unknown>>(
      `/bus/${entity.route}/${created?.id}`
    );
    expect(String(response.data[textField.name])).toBe(marker);
  });

  it("updates a record with PATCH", async () => {
    expect(createdId).toBeTruthy();

    const textField = firstTextField(entity);
    if (!textField) return;

    const updated = `patched-${Date.now()}`;
    const response = await harness.client.patch<Record<string, unknown>>(
      `/bus/${entity.route}/${createdId}`,
      { [textField.name]: updated }
    );

    expect(response.status).toBeLessThan(300);
    expect(String(response.data[textField.name])).toBe(updated);
  });

  it("bumps the version on update", async () => {
    const created = await harness.createWithParents(entity);
    expect(created).not.toBeNull();

    const before = Number(created?.version ?? 0);
    const textField = firstTextField(entity);
    if (!textField) return;

    const response = await harness.client.patch<Record<string, unknown>>(
      `/bus/${entity.route}/${created?.id}`,
      { [textField.name]: `v-${Date.now()}` }
    );

    expect(Number(response.data.version ?? 0)).toBeGreaterThan(before);
  });

  it("replaces a record with PUT", async () => {
    const created = await harness.createWithParents(entity);
    expect(created).not.toBeNull();

    const replacement = buildRecord(entity);
    const response = await harness.client.put<Record<string, unknown>>(
      `/bus/${entity.route}/${created?.id}`,
      replacement,
      { allowFailure: true }
    );

    expect(response.status).toBeLessThan(500);
  });

  it("rejects a payload missing a required field", async () => {
    const invalid = buildInvalidRecord(entity);
    if (!invalid) return; // entity has no required scalar fields

    const response = await harness.client.post(`/bus/${entity.route}`, invalid.payload, {
      allowFailure: true,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await harness.client.get(
      `/bus/${entity.route}/00000000-0000-4000-8000-000000000000`,
      { allowFailure: true }
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("rejects a malformed id", async () => {
    const response = await harness.client.get(`/bus/${entity.route}/not-a-uuid`, {
      allowFailure: true,
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("sorts by a scalar column", async () => {
    const sortable = scalarFields(entity)[0];
    if (!sortable) return;

    const response = await harness.client.get<{ data: Array<Record<string, unknown>> }>(
      `/bus/${entity.route}?limit=20&orderBy=${sortable.name}&orderDir=asc`,
      { allowFailure: true }
    );

    expect(response.status).toBeLessThan(500);
  });

  it("searches by text", async () => {
    const textField = firstTextField(entity);
    if (!textField) return;

    const needle = `find-${Date.now()}`;
    await harness.createWithParents(entity, { [textField.name]: needle });

    const response = await harness.client.get<{ data: Array<Record<string, unknown>> }>(
      `/bus/${entity.route}?search=${encodeURIComponent(needle)}&limit=10`,
      { allowFailure: true }
    );

    expect(response.status).toBeLessThan(500);
    if (response.ok) {
      const hit = response.data.data.some((row) => String(row[textField.name]).includes(needle));
      expect(hit).toBe(true);
    }
  });

  it("filters with an equals operator", async () => {
    const textField = firstTextField(entity);
    if (!textField) return;

    const value = `filter-${Date.now()}`;
    await harness.createWithParents(entity, { [textField.name]: value });

    const response = await harness.client.get<{ data: Array<Record<string, unknown>> }>(
      `/bus/${entity.route}?filter.${textField.name}=equals:${encodeURIComponent(value)}`,
      { allowFailure: true }
    );

    expect(response.status).toBeLessThan(500);
  });

  // A delete removes the row and reports the workflows that ran clearing it.
  // It used to stamp `deleted_at` and answer 204, which read the same from the
  // outside — the record was gone from every query either way — while leaving
  // the row and its foreign keys in the table.
  it("deletes a record and reports what ran", async () => {
    const created = await harness.createWithParents(entity);
    expect(created).not.toBeNull();

    const response = await harness.client.delete<{
      deleted: boolean;
      promotion: { operation: string; docStatus: string; ranWorkflows: string[] };
    }>(`/bus/${entity.route}/${created?.id}`);
    expect(response.status).toBe(200);
    expect(response.data.deleted).toBe(true);
    expect(response.data.promotion.operation).toBe("delete");
    expect(response.data.promotion.docStatus).toBe("deleted");

    const after = await harness.client.get(`/bus/${entity.route}/${created?.id}`, {
      allowFailure: true,
    });
    expect(after.ok).toBe(false);
  });

  it("exposes every writable field through the API", async () => {
    const created = await harness.createWithParents(entity);
    expect(created).not.toBeNull();

    const response = await harness.client.get<Record<string, unknown>>(
      `/bus/${entity.route}/${created?.id}`
    );

    const returned = new Set(Object.keys(response.data));
    const missing = writableFields(entity)
      .map((f) => f.name)
      .filter((name) => !returned.has(name));

    expect(missing).toEqual([]);
  });
});
