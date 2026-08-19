/**
 * The test vocabulary these suites are written in.
 *
 * They used to import it from `bun:test`, which meant the application could not
 * be tested without Bun — awkward for a stack whose whole point is running under
 * Node with PostgreSQL compiled to WebAssembly, and the last thing keeping Bun
 * in a generated wasm application at all.
 *
 * `node:test` supplies the runner. What it does not supply is `expect`, so the
 * choice was to rewrite four hundred assertions into `assert.strictEqual` or to
 * write the twenty lines below. The assertions are the readable part of a test
 * suite; a mechanical rewrite of all of them would have been a large diff that
 * made every one of them worse.
 *
 * So this is `expect` with exactly the matchers these suites use — and it fails
 * loudly on any matcher it does not have, rather than quietly passing. Both
 * runners understand `node:test`, so `bun test` still works for anyone on the
 * Bun stack and `node --test` works for everyone else.
 */

import { after, before, beforeEach, describe, it } from "node:test";

// `before`/`after` in node:test run once per file, which is what `beforeAll`
// and `afterAll` meant in bun:test. Re-exported under both names so the suites
// read the same as they did.
export { describe, it, beforeEach, before as beforeAll, after as afterAll, before, after };

/** `Bun.sleep`, without Bun. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function show(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof Error) return value.message;
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text.length > 300 ? `${text.slice(0, 300)}…` : text;
  } catch {
    return String(value);
  }
}

function fail(actual: unknown, matcher: string, expected?: unknown, negated = false): never {
  const not = negated ? "not " : "";
  const tail = expected === undefined ? "" : ` ${show(expected)}`;
  throw new Error(`expected ${show(actual)} ${not}${matcher}${tail}`);
}

/** Structural equality, deep enough for JSON the API returned. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const [ka, kb] = [Object.keys(a as object), Object.keys(b as object)];
  if (ka.length !== kb.length) return false;
  return ka.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

function has(container: unknown, item: unknown): boolean {
  if (typeof container === "string") return container.includes(String(item));
  if (Array.isArray(container)) return container.some((entry) => deepEqual(entry, item));
  return false;
}

function lengthOf(value: unknown): number | null {
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return null;
}

function build(actual: unknown, negated: boolean) {
  const check = (ok: boolean, matcher: string, expected?: unknown) => {
    if (ok === negated) fail(actual, matcher, expected, negated);
  };
  const asNumber = (matcher: string): number => {
    if (typeof actual !== "number") fail(actual, `be a number to ${matcher}`);
    return actual;
  };

  return {
    toBe: (expected: unknown) => check(Object.is(actual, expected), "to be", expected),
    toEqual: (expected: unknown) => check(deepEqual(actual, expected), "to equal", expected),
    toBeTruthy: () => check(Boolean(actual), "to be truthy"),
    toBeFalsy: () => check(!actual, "to be falsy"),
    toBeNull: () => check(actual === null, "to be null"),
    toBeUndefined: () => check(actual === undefined, "to be undefined"),
    toBeDefined: () => check(actual !== undefined, "to be defined"),
    toContain: (item: unknown) => check(has(actual, item), "to contain", item),
    toMatch: (pattern: RegExp | string) =>
      check(
        typeof pattern === "string"
          ? String(actual).includes(pattern)
          : pattern.test(String(actual)),
        "to match",
        String(pattern)
      ),
    toHaveLength: (length: number) =>
      check(lengthOf(actual) === length, "to have length", length),
    toBeGreaterThan: (n: number) => check(asNumber("compare") > n, "to be greater than", n),
    toBeGreaterThanOrEqual: (n: number) =>
      check(asNumber("compare") >= n, "to be greater than or equal to", n),
    toBeLessThan: (n: number) => check(asNumber("compare") < n, "to be less than", n),
    toBeLessThanOrEqual: (n: number) =>
      check(asNumber("compare") <= n, "to be less than or equal to", n),
    toBeInstanceOf: (constructor: abstract new (...args: never) => unknown) =>
      check(actual instanceof constructor, "to be an instance of", constructor.name),
    toThrow: () => {
      if (typeof actual !== "function") fail(actual, "be a function to throw");
      let threw = false;
      try {
        (actual as () => unknown)();
      } catch {
        threw = true;
      }
      check(threw, "to throw");
    },
  };
}

export function expect(actual: unknown) {
  return { ...build(actual, false), not: build(actual, true) };
}
