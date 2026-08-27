/**
 * Sample rows for a generated browser application.
 *
 * An application that boots with empty tables cannot be looked at. Every list
 * is "No entries", every lookup is an empty dropdown, and the one thing a
 * generated application is for — seeing whether the model was right — needs a
 * person to type twenty records first. So the browser CLI seeds a few rows per
 * entity, and the whole point is that they are *typed* rows rather than
 * `String 1`, `String 2`: the Application Dictionary already decided what each
 * column is, and this reads the same `sys_reference_id` the forms read.
 *
 * | Reference | What lands in the column |
 * |---|---|
 * | `TABLE_DIRECT` | the id of a row already generated for the parent table |
 * | a `%%enum` list | one of that enum's declared values |
 * | `EMAIL` / `PHONE` / `URL` / `COLOR` | a plausible address, number, link, hex |
 * | `AMOUNT` / `INTEGER` | a number scaled to what the column is called |
 * | `DATE` / `DATETIME` | a date near today, ordered so `*_at` follows creation |
 * | `TEXT` / `STRING` | words chosen from the column's own name |
 * | `YES_NO` / `JSON` / `PASSWORD` | a boolean, a small object, a placeholder |
 *
 * Two properties make the result usable rather than merely present:
 *
 * - **Foreign keys resolve.** Entities are emitted parent-first, and a
 *   `TABLE_DIRECT` column takes an id from the rows already generated for the
 *   table its name resolves to. A lookup that opens on a real record is the
 *   difference between demo data and noise.
 * - **It is deterministic.** The generator is a seeded PRNG, so regenerating
 *   the same model produces the same rows: a screenshot stays valid, and a diff
 *   of two generated applications shows what the model changed rather than what
 *   the random number generator did.
 */

import { ReferenceType } from "@appwithai/core/types";
import type { ParsedModel } from "../../pipeline/generate-application";
import { referenceIdFor, tableNameFor } from "./model-bundle";

export interface SampleDataOptions {
  /** Rows per entity. `0` produces nothing at all. */
  records: number;
  /** Seeds the PRNG. Same seed and same model means the same rows. */
  seed?: string;
  /** How often an OPTIONAL column is left null, 0–1. Defaults to 0.15. */
  nullRate?: number;
}

/** Rows keyed by table name, in the order they must be inserted. */
export type SampleData = Record<string, Array<Record<string, unknown>>>;

/* ------------------------------------------------------------------ random */

/** xmur3 — a string to a 32-bit seed, so a column's stream is its own. */
function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32 — small, fast, and good enough to look unpatterned. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Random {
  private next: () => number;
  constructor(seed: string) {
    this.next = rng(hashSeed(seed));
  }
  float(): number {
    return this.next();
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))] as T;
  }
  chance(probability: number): boolean {
    return this.next() < probability;
  }
  /** A v4-shaped uuid from this stream, so ids are stable across runs too. */
  uuid(): string {
    const hex = "0123456789abcdef";
    let out = "";
    for (let i = 0; i < 32; i++) {
      if (i === 12) out += "4";
      else if (i === 16) out += hex[8 + Math.floor(this.next() * 4)];
      else out += hex[Math.floor(this.next() * 16)];
    }
    return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
  }
}

/* ------------------------------------------------------------- vocabulary */

const FIRST_NAMES = [
  "Amara",
  "Priya",
  "Sofia",
  "Mei",
  "Aisha",
  "Elena",
  "Nadia",
  "Yara",
  "Ines",
  "Leila",
  "Tomas",
  "Rahul",
  "Kwame",
  "Diego",
  "Hiroshi",
  "Omar",
  "Lucas",
  "Mateo",
  "Noah",
  "Ivan",
];
const LAST_NAMES = [
  "Okafor",
  "Sharma",
  "Rossi",
  "Nakamura",
  "Haddad",
  "Novak",
  "Andersen",
  "Costa",
  "Dubois",
  "Fernandes",
  "Kowalski",
  "Mbeki",
  "Nguyen",
  "Petrov",
  "Silva",
  "Tanaka",
  "Weber",
  "Ziegler",
];
const COMPANY_HEADS = [
  "Northwind",
  "Blue Harbour",
  "Cedar",
  "Meridian",
  "Orchard",
  "Ridgeway",
  "Solstice",
  "Trafalgar",
  "Vanguard",
  "Whitfield",
  "Ironbridge",
  "Larkspur",
];
const COMPANY_TAILS = [
  "Trading",
  "Industries",
  "Logistics",
  "Supplies",
  "Partners",
  "Group",
  "Systems",
  "Works",
];
const PRODUCT_HEADS = [
  "Compact",
  "Industrial",
  "Precision",
  "Heavy-duty",
  "Portable",
  "Reinforced",
  "Insulated",
  "Stainless",
];
const PRODUCT_TAILS = [
  "Valve",
  "Bearing",
  "Cable",
  "Pump",
  "Bracket",
  "Filter",
  "Sensor",
  "Actuator",
  "Coupling",
];
const CITIES = [
  "Rotterdam",
  "Porto",
  "Leeds",
  "Malmo",
  "Bilbao",
  "Antwerp",
  "Cork",
  "Bergen",
  "Turin",
  "Gdansk",
];
const COUNTRIES = [
  "Netherlands",
  "Portugal",
  "United Kingdom",
  "Sweden",
  "Spain",
  "Belgium",
  "Ireland",
  "Norway",
];
const STREETS = [
  "Harbour Road",
  "Mill Lane",
  "Station Approach",
  "Foundry Street",
  "Kiln Way",
  "Quay Side",
];
const WORDS = [
  "delivery",
  "inspection",
  "tolerance",
  "batch",
  "handover",
  "schedule",
  "clearance",
  "allocation",
  "shortfall",
  "revision",
  "approval",
  "dispatch",
  "reconciliation",
  "provision",
];
const SENTENCES = [
  "Checked against the order and cleared without exception.",
  "Held overnight pending confirmation from the supplier.",
  "Quantity agreed after a short call; nothing outstanding.",
  "Raised for review — the price differs from the agreed rate.",
  "Completed on schedule. No follow-up required.",
  "Partial receipt; the balance is expected next week.",
  "Corrected after the first entry recorded the wrong unit.",
];
const DOMAINS = ["example.com", "example.org", "example.net"];
const COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0f766e",
  "#be123c",
];

/* --------------------------------------------------------------- decisions */

/** What a column's *name* suggests, when its reference type is only `String`. */
type Flavour =
  | "person"
  | "firstName"
  | "lastName"
  | "company"
  | "product"
  | "city"
  | "country"
  | "address"
  | "code"
  | "reference"
  | "title"
  | "uom"
  | "currency"
  | "word";

function flavourOf(column: string, entity: string): Flavour {
  const n = column.toLowerCase();
  if (/^first_?name$/.test(n)) return "firstName";
  if (/^(last|sur)_?name$/.test(n)) return "lastName";
  if (/^(full_?name|display_?name)$/.test(n)) return "person";
  if (/^(contact|person|customer|client|employee|user|approver|owner)_name$/.test(n))
    return "person";
  if (/^(company|vendor|supplier|organisation|organization|account|insurer)_name$/.test(n))
    return "company";
  if (/^(sku|code|.*_code|barcode)$/.test(n)) return "code";
  if (/(number|reference|ref|invoice_no|po_no)$/.test(n)) return "reference";
  if (/(title|subject|summary|label)$/.test(n)) return "title";
  if (/(city|town)$/.test(n)) return "city";
  if (/(country|nation)$/.test(n)) return "country";
  if (/(address|street|line1|line2)$/.test(n)) return "address";
  if (/^(uom|unit|unit_of_measure|measure)$/.test(n)) return "uom";
  if (/(currency|iso_currency)$/.test(n)) return "currency";
  if (n === "name") {
    const e = entity.toLowerCase();
    if (/(vendor|supplier|company|account|customer|client|insurer|organisation)/.test(e))
      return "company";
    if (/(product|item|material|medication|part|sku)/.test(e)) return "product";
    if (/(user|person|staff|employee|contact|patient|owner)/.test(e)) return "person";
    return "title";
  }
  return "word";
}

/** Integer ranges that make a column readable rather than merely numeric. */
function integerRange(column: string): [number, number] {
  const n = column.toLowerCase();
  if (/(quantity|qty|count|units|items|seats|capacity)/.test(n)) return [1, 40];
  if (/(stock|on_hand|inventory|level)/.test(n)) return [0, 500];
  if (/(age|years)/.test(n)) return [1, 60];
  if (/(duration|minutes|days|weeks|months)/.test(n)) return [1, 90];
  if (/(line_?number|seq|sequence|position|order_?no)/.test(n)) return [1, 20];
  if (/(percent|percentage|rate|score)/.test(n)) return [0, 100];
  if (/(attempts|retries|version)/.test(n)) return [1, 5];
  return [1, 100];
}

/** Money scaled by what it is for; a line total is not a unit price. */
function amountRange(column: string): [number, number] {
  const n = column.toLowerCase();
  if (/(unit_?price|price|rate|fee|cost_?per)/.test(n)) return [4, 480];
  if (/(variance|discount|adjustment|tax)/.test(n)) return [0, 90];
  if (/(total|amount|balance|value|subtotal|claimed|settled|paid)/.test(n)) return [50, 9500];
  return [5, 1200];
}

/**
 * Dates land near today, and the column's name decides which side of it: a
 * `due_on` in the past and a `created_at` in the future both read as bugs.
 */
function dayOffsetRange(column: string): [number, number] {
  const n = column.toLowerCase();
  if (/(due|expected|next|valid_until|expiry|expires|scheduled)/.test(n)) return [1, 45];
  if (/(created|opened|registered|joined|started|requested|submitted|captured)/.test(n))
    return [-120, -10];
  /* An invoice dated after the day it fell due reads as a bug in the model
     rather than in the sample data, so the documents that precede a due date
     are pinned behind today. */
  if (/(issued|invoice_date|order_date|ordered|billed|raised)/.test(n)) return [-90, -5];
  if (/(closed|resolved|completed|decided|approved|paid|settled|received|dispatched|sent)/.test(n))
    return [-30, -1];
  if (/(birth|dob)/.test(n)) return [-16000, -700];
  return [-60, 20];
}

function iso(date: Date, withTime: boolean): string {
  return withTime ? date.toISOString() : (date.toISOString().split("T")[0] as string);
}

/* ------------------------------------------------------------------ values */

interface Column {
  name: string;
  columnName: string;
  type: string;
  required: boolean;
  unique: boolean;
  maxLength?: number;
  isForeignKey: boolean;
  enumValues?: string[];
  referenceId: number;
}

function stringValue(random: Random, column: string, entity: string, row: number): string {
  switch (flavourOf(column, entity)) {
    case "firstName":
      return random.pick(FIRST_NAMES);
    case "lastName":
      return random.pick(LAST_NAMES);
    case "person":
      return `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`;
    case "company":
      return `${random.pick(COMPANY_HEADS)} ${random.pick(COMPANY_TAILS)}`;
    case "product":
      return `${random.pick(PRODUCT_HEADS)} ${random.pick(PRODUCT_TAILS)}`;
    case "city":
      return random.pick(CITIES);
    case "country":
      return random.pick(COUNTRIES);
    case "address":
      return `${random.int(1, 180)} ${random.pick(STREETS)}, ${random.pick(CITIES)}`;
    case "code":
      return `${initials(entity)}-${String(1000 + row * 7 + random.int(0, 6)).slice(0, 4)}`;
    case "reference":
      return `${initials(entity)}${new Date().getFullYear()}-${String(row + 1).padStart(4, "0")}`;
    case "title":
      return `${capitalise(random.pick(WORDS))} ${random.pick(WORDS)}`;
    case "uom":
      return random.pick(["each", "box", "case", "pallet", "kg", "litre"]);
    case "currency":
      return random.pick(["EUR", "GBP", "USD", "SEK"]);
    default:
      return capitalise(random.pick(WORDS));
  }
}

function initials(entity: string): string {
  const letters = entity.replace(/[^A-Za-z]/g, "");
  const caps = letters.match(/[A-Z]/g);
  return (caps && caps.length >= 2 ? caps.join("") : letters.slice(0, 3)).toUpperCase().slice(0, 4);
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* ------------------------------------------------------------------- rows */

/** Which table a foreign key points at, by the same rule the generator uses. */
function fkTarget(column: string, personEntity: string | undefined): string | undefined {
  const n = column.toLowerCase();
  if (n.endsWith("_by") || n.endsWith("_by_id")) return personEntity;
  if (PERSON_COLUMNS.has(n)) return personEntity;
  if (!n.endsWith("_id")) return undefined;
  return n.slice(0, -3).replace(/(^|_)([a-z])/g, (_m, _sep, ch: string) => ch.toUpperCase());
}

const PERSON_COLUMNS = new Set([
  "assigned_to",
  "author_id",
  "lab_manager_id",
  "manager_id",
  "owner_id",
  "pi_id",
  "remediation_owner",
  "remediation_owner_id",
  "user_id",
]);

/**
 * Parents before children, so a foreign key can take an id that exists.
 *
 * Kahn's algorithm over the FK graph, with one deliberate concession: a cycle
 * (two entities pointing at each other, or a self-reference) does not fail the
 * sort. A cycle's members are emitted anyway and their unsatisfiable keys are
 * left null, which is a smaller lie than refusing to generate anything.
 *
 * The concession is made one entity at a time. Dumping every remaining entity
 * in declaration order the moment the sort stalled meant a single cycle poisoned
 * everything *downstream* of it: `User` and `Team` point at each other, so the
 * sort stalled with both pending, and `Compound` — which is not in the cycle and
 * merely wants a `registered_by_id` — was emitted before the users it needed.
 * Its rows came out with a null in a NOT NULL column and every one was skipped,
 * leaving two entities with no sample data at all and only a log line to say so.
 * Breaking the cycle by promoting one member, then resuming the sort, keeps
 * parents-first for everyone who is not actually in a cycle.
 */
function inDependencyOrder(
  entities: Array<{ name: string; columns: Column[] }>,
  personEntity: string | undefined
): Array<{ name: string; columns: Column[] }> {
  const byName = new Map(entities.map((entity) => [entity.name, entity]));
  const pending = new Map<string, Set<string>>();

  for (const entity of entities) {
    const parents = new Set<string>();
    for (const column of entity.columns) {
      if (!column.isForeignKey) continue;
      const target = fkTarget(column.columnName, personEntity);
      if (target && target !== entity.name && byName.has(target)) parents.add(target);
    }
    pending.set(entity.name, parents);
  }

  const ordered: Array<{ name: string; columns: Column[] }> = [];
  const done = new Set<string>();

  const emit = (entity: { name: string; columns: Column[] }) => {
    ordered.push(entity);
    done.add(entity.name);
  };

  while (ordered.length < entities.length) {
    let progress = false;
    for (const entity of entities) {
      if (done.has(entity.name)) continue;
      const parents = pending.get(entity.name) as Set<string>;
      if ([...parents].every((parent) => done.has(parent))) {
        emit(entity);
        progress = true;
      }
    }
    if (progress) continue;

    /* Stalled: what is left is a cycle, plus everything downstream of it. Break
       it by promoting a member of the cycle *itself* — never something merely
       waiting on one. `Compound` waits on `User`, and `User` and `Team` wait on
       each other: promoting `Compound` first (it is declared first, and has as
       few outstanding parents as anyone) leaves its mandatory
       `registered_by_id` null, which is the whole failure. Promoting `User`
       costs only its optional `team_id`, and lets both of the others resolve
       properly afterwards. */
    const remaining = entities.filter((entity) => !done.has(entity.name));
    const outstanding = (name: string) =>
      [...(pending.get(name) as Set<string>)].filter((parent) => !done.has(parent));

    /* In a cycle iff the entity is reachable from itself along parents that are
       still outstanding. The graph is one model's entities, so a walk per
       candidate is cheaper than the machinery to avoid it. */
    const inCycle = (start: string) => {
      const seen = new Set<string>();
      const stack = [...outstanding(start)];
      while (stack.length > 0) {
        const name = stack.pop() as string;
        if (name === start) return true;
        if (seen.has(name)) continue;
        seen.add(name);
        stack.push(...outstanding(name));
      }
      return false;
    };

    const candidates = remaining.filter((entity) => inCycle(entity.name));
    /* A stalled sort always has a cycle among what is left, but falling back to
       `remaining` rather than trusting that keeps this a sort, not an assertion. */
    const pool = candidates.length > 0 ? candidates : remaining;
    emit(pool[0] as { name: string; columns: Column[] });
  }
  return ordered;
}

/**
 * Generate the rows.
 *
 * Returns tables in insertion order; the seeder walks them in that order, so
 * the object's key order is load-bearing rather than cosmetic.
 */
export function buildSampleData(parsed: ParsedModel, options: SampleDataOptions): SampleData {
  const count = Math.max(0, Math.floor(options.records));
  if (count === 0 || parsed.entities.length === 0) return {};

  const nullRate = options.nullRate ?? 0.15;
  const salt = options.seed ?? "appwithai";

  const entities = parsed.entities.map((entity) => ({
    name: entity.name,
    table: tableNameFor(entity),
    primaryKey: entity.primaryKey || "id",
    columns: entity.attributes.map((attribute) => ({
      name: attribute.name,
      columnName: attribute.name,
      type: attribute.type,
      required: !!attribute.required,
      unique: !!attribute.unique,
      maxLength: attribute.maxLength,
      isForeignKey: !!attribute.isForeignKey,
      enumValues: attribute.enumValues,
      /* The same call the dictionary makes, so a column's sample value and its
         form control are decided by one rule rather than two that can drift. */
      referenceId: referenceIdFor(attribute, attribute.name === (entity.primaryKey || "id")),
    })) as Column[],
  }));

  /* The entity person-role columns resolve to: `User` when the model declares
     one, otherwise whichever entity looks like the actor table. Without one,
     `approved_by_id` simply stays null rather than pointing at a stranger. */
  const personEntity =
    entities.find((entity) => entity.name === "User")?.name ??
    entities.find((entity) => /^(user|staff|employee|person|account)s?$/i.test(entity.name))?.name;

  const ids = new Map<string, string[]>();
  const data: SampleData = {};

  for (const entity of inDependencyOrder(entities, personEntity)) {
    const full = entities.find((candidate) => candidate.name === entity.name);
    if (!full) continue;
    const rows: Array<Record<string, unknown>> = [];
    const generatedIds: string[] = [];

    for (let row = 0; row < count; row++) {
      const record: Record<string, unknown> = {};
      for (const column of full.columns) {
        const random = new Random(`${salt}:${full.name}:${column.columnName}:${row}`);
        const isPrimary = column.columnName === full.primaryKey || column.columnName === "id";

        if (isPrimary) {
          const id = random.uuid();
          record[column.columnName] = id;
          generatedIds.push(id);
          continue;
        }

        /* An OPTIONAL column that is sometimes empty is what makes a generated
           screen look like a real one — but a foreign key the form needs is
           never dropped for the sake of variety. */
        if (!column.required && !column.isForeignKey && random.chance(nullRate)) {
          record[column.columnName] = null;
          continue;
        }

        record[column.columnName] = valueFor(column, full.name, row, random, {
          ids,
          personEntity,
          selfIds: generatedIds,
          entityName: full.name,
        });
      }
      rows.push(record);
    }

    ids.set(full.name, generatedIds);
    data[full.table] = rows;
  }

  return data;
}

interface ValueContext {
  ids: Map<string, string[]>;
  personEntity: string | undefined;
  selfIds: string[];
  entityName: string;
}

function valueFor(
  column: Column,
  entity: string,
  row: number,
  random: Random,
  context: ValueContext
): unknown {
  /* A foreign key takes an id that exists, or nothing. Pointing at a uuid no
     row has would make every lookup in the generated application empty — the
     failure this whole file exists to avoid. */
  if (column.isForeignKey) {
    const target = fkTarget(column.columnName, context.personEntity);
    const pool =
      target === context.entityName ? context.selfIds.slice(0, row) : context.ids.get(target ?? "");
    if (!pool || pool.length === 0) return null;
    return random.pick(pool);
  }

  if (column.enumValues?.length) return random.pick(column.enumValues);

  switch (column.referenceId) {
    case ReferenceType.EMAIL:
      return emailFor(random);
    case ReferenceType.PHONE:
      return `+${random.int(31, 49)} ${random.int(10, 99)} ${random.int(100, 999)} ${random.int(1000, 9999)}`;
    case ReferenceType.URL:
      return `https://www.${random.pick(DOMAINS)}/${random.pick(WORDS)}`;
    case ReferenceType.COLOR:
      return random.pick(COLORS);
    case ReferenceType.PASSWORD:
      return "not-a-real-password";
    default:
      break;
  }

  switch (column.type) {
    case "boolean":
      /* `is_active` reads wrong if half the rows are inactive. */
      return /^(is_|has_|can_)?(active|enabled|available|approved)$/.test(column.columnName)
        ? random.chance(0.85)
        : random.chance(0.5);
    case "integer": {
      const [min, max] = integerRange(column.columnName);
      return random.int(min, max);
    }
    case "decimal": {
      const [min, max] = amountRange(column.columnName);
      return Number((min + random.float() * (max - min)).toFixed(2));
    }
    case "date":
    case "datetime": {
      const [from, to] = dayOffsetRange(column.columnName);
      const when = new Date();
      when.setUTCDate(when.getUTCDate() + random.int(from, to));
      when.setUTCHours(random.int(7, 18), random.int(0, 59), random.int(0, 59), 0);
      return iso(when, column.type === "datetime");
    }
    case "json":
      return { source: "sample", note: random.pick(WORDS), index: row + 1 };
    case "text": {
      /* A `text` column is prose by default — unless its name says otherwise.
         "Quantity agreed after a short call" is a fine note and a poor
         postal address. */
      const flavour = flavourOf(column.columnName, entity);
      return flavour === "word" || flavour === "title"
        ? random.pick(SENTENCES)
        : stringValue(random, column.columnName, entity, row);
    }
    default: {
      const flavour = flavourOf(column.columnName, entity);
      const base = stringValue(random, column.columnName, entity, row);
      /* Codes and references already carry the row number; everything else
         needs one appending when the column is UNIQUE, or ten rows of
         "Northwind Trading" collide on insert. */
      const selfUnique = flavour === "code" || flavour === "reference";
      const value = column.unique && !selfUnique ? `${base} ${row + 1}` : base;
      return column.maxLength && value.length > column.maxLength
        ? value.slice(0, column.maxLength)
        : value;
    }
  }
}

function emailFor(random: Random): string {
  const first = random.pick(FIRST_NAMES).toLowerCase();
  const last = random.pick(LAST_NAMES).toLowerCase();
  return `${first}.${last}.${random.int(1, 999)}@${random.pick(DOMAINS)}`;
}
