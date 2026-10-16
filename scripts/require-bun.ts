#!/usr/bin/env bun
/**
 * Refuse to go on unless this is Bun 1.4.3 or a later 1.4.
 *
 * Every script in this repository runs on Bun, and the type-check *is* Bun: it is
 * `bun check`, the type checker Bun has carried since 1.4.3. An older 1.4 has no
 * `check` command and would fail with a message about an unknown script rather than
 * about its own version. CI pins `BUN_VERSION: 1.4.3` (`.github/workflows/ci.yml`),
 * and the browser bundles it builds differ byte for byte between Bun versions, so a
 * different Bun is a different answer. Run first by `type-check` and
 * `type-check:language`.
 *
 *   bun scripts/require-bun.ts
 */

const MINOR = "1.4";
const MIN_PATCH = 3;

const bun = (globalThis as { Bun?: { version: string } }).Bun;
if (!bun) {
  console.error(`This script runs on Bun ${MINOR}, not Node. Run it with \`bun\`.`);
  process.exit(1);
}
const patch = Number(bun.version.split(".")[2] ?? Number.NaN);
if (!bun.version.startsWith(`${MINOR}.`) || !(patch >= MIN_PATCH)) {
  console.error(
    `Bun ${MINOR}.${MIN_PATCH} or a later ${MINOR} is required; this is Bun ${bun.version}. ` +
      `Install it with: curl -fsSL https://bun.sh/install | bash -s "bun-v${MINOR}.${MIN_PATCH}"`
  );
  process.exit(1);
}
