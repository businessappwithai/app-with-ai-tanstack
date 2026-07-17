/**
 * Language-definition maps for the Mermaid ERD parser.
 *
 * The canonical, machine-readable definition of the ERDwithAI Modeling Language
 * (EML) lives in `language/erdwithai-language.json`. This module loads the type
 * and cardinality maps from that file at runtime so the parser stays in lockstep
 * with the language definition instead of duplicating it.
 *
 * Resolution order for the definition file:
 *   1. process.env.ERDWITHAI_LANGUAGE_FILE (explicit override)
 *   2. a `language/erdwithai-language.json` found by walking up from this module
 *   3. a `language/erdwithai-language.json` found by walking up from cwd
 *   4. built-in fallback maps (kept in sync with the JSON)
 *
 * The loader never throws: if the file is missing or malformed it falls back to
 * the built-in maps and continues.
 */

import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

export type CanonicalType =
  | "string"
  | "text"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "json";

export type CardinalityKind = "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";

interface LanguageDefinitionShape {
  types?: { map?: Record<string, CanonicalType>; default?: CanonicalType };
  cardinalities?: { map?: Array<{ operator: string; kind: CardinalityKind }> };
}

/** Built-in fallback, kept in sync with language/erdwithai-language.json. */
const FALLBACK_TYPE_MAP: Record<string, CanonicalType> = {
  string: "string",
  varchar: "string",
  char: "string",
  text: "text",
  longtext: "text",
  int: "integer",
  integer: "integer",
  bigint: "integer",
  smallint: "integer",
  number: "decimal",
  decimal: "decimal",
  float: "decimal",
  double: "decimal",
  money: "decimal",
  amount: "decimal",
  bool: "boolean",
  boolean: "boolean",
  date: "date",
  datetime: "datetime",
  timestamp: "datetime",
  time: "datetime",
  json: "json",
  jsonb: "json",
  object: "json",
  array: "json",
  uuid: "string",
  guid: "string",
  id: "string",
  email: "string",
  url: "string",
  phone: "string",
  password: "string",
  color: "string",
};

const FALLBACK_CARDINALITY_MAP: Array<{ operator: string; kind: CardinalityKind }> = [
  { operator: "||--||", kind: "oneToOne" },
  { operator: "||--o{", kind: "oneToMany" },
  { operator: "||--|{", kind: "oneToMany" },
  { operator: "}o--||", kind: "manyToOne" },
  { operator: "}|--||", kind: "manyToOne" },
  { operator: "}o--o{", kind: "manyToMany" },
  { operator: "}|--|{", kind: "manyToMany" },
  { operator: "|o--o|", kind: "oneToOne" },
];

function findDefinitionFile(): string | null {
  const envPath = process.env.ERDWITHAI_LANGUAGE_FILE;
  if (envPath && existsSync(envPath)) return envPath;

  const starts: string[] = [];
  try {
    starts.push(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url may be unavailable in some bundling contexts; ignore.
  }
  starts.push(process.cwd());

  for (const start of starts) {
    let dir = start;
    // Walk up to the filesystem root looking for language/erdwithai-language.json
    for (let i = 0; i < 12; i++) {
      const candidate = path.join(dir, "language", "erdwithai-language.json");
      if (existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

let cachedDefinition: LanguageDefinitionShape | null | undefined;

function loadDefinition(): LanguageDefinitionShape | null {
  if (cachedDefinition !== undefined) return cachedDefinition;
  try {
    const file = findDefinitionFile();
    if (!file) {
      cachedDefinition = null;
      return null;
    }
    cachedDefinition = JSON.parse(readFileSync(file, "utf-8")) as LanguageDefinitionShape;
    return cachedDefinition;
  } catch {
    cachedDefinition = null;
    return null;
  }
}

/** Type alias -> canonical type map, sourced from the language definition. */
export function getTypeMap(): Record<string, CanonicalType> {
  const def = loadDefinition();
  if (def?.types?.map && Object.keys(def.types.map).length > 0) {
    return def.types.map;
  }
  return FALLBACK_TYPE_MAP;
}

/** Default canonical type for unknown aliases. */
export function getDefaultType(): CanonicalType {
  return loadDefinition()?.types?.default ?? "string";
}

/** Resolve a Mermaid ER relationship operator to a cardinality kind. */
export function getCardinalityKind(operator: string): CardinalityKind | null {
  const def = loadDefinition();
  const map = def?.cardinalities?.map?.length ? def.cardinalities.map : FALLBACK_CARDINALITY_MAP;
  return map.find((c) => c.operator === operator)?.kind ?? null;
}

/** Test-only: reset the in-memory cache. */
export function __resetLanguageCache(): void {
  cachedDefinition = undefined;
}
