/**
 * What an entity's table is called — one answer, for everything that asks.
 *
 * Three readers need it and they must agree: the browser stack writes the
 * `CREATE TABLE`, the NestJS stack writes its migration, and the reporting pack
 * writes SQL that queries both. A second implementation is not a style problem
 * here — it is a report that fails at run time against a table that exists
 * under a different name, which is exactly how `bus_k_y_c_record` reached a
 * published download while every reader of the same model called the table
 * `bus_kyc_record`.
 *
 * The rule itself is unchanged from the copy this was lifted out of
 * (`generators/wasm/model-bundle.ts`, which now imports it), so moving it
 * renames nothing.
 */

import type { Entity } from "@appwithai/core/types";

/**
 * `KYCRecord` -> `kyc_record`.
 *
 * An acronym is one word and the boundary is where it ends, so the run is split
 * before its last capital — the letter that starts the next word.
 */
const snake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

/** `Order` -> `bus_order`, leaving an already-prefixed name alone. */
export function tableNameFor(entity: Entity): string {
  const base = snake(entity.tableName || entity.name);
  return base.startsWith("bus_") || base.startsWith("sys_") ? base : `bus_${base}`;
}
