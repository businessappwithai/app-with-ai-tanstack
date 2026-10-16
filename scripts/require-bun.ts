#!/usr/bin/env bun
/**
 * Refuse to go on unless this is Bun 1.4.
 *
 * Every script in this repository runs on Bun — the type-check included, whose `tsc`
 * is started with `bun --bun` so it runs on Bun's runtime rather than the Node its
 * shebang names. CI pins `BUN_VERSION: 1.4.3` (`.github/workflows/ci.yml`), and the
 * browser bundles it builds differ byte for byte between Bun versions, so a different
 * Bun is a different answer. Run first by `type-check` and `type-check:language`.
 *
 *   bun scripts/require-bun.ts
 */

const REQUIRED = "1.4";

const bun = (globalThis as { Bun?: { version: string } }).Bun;
if (!bun) {
  console.error(`This script runs on Bun ${REQUIRED}, not Node. Run it with \`bun\`.`);
  process.exit(1);
}
if (bun.version !== REQUIRED && !bun.version.startsWith(`${REQUIRED}.`)) {
  console.error(
    `Bun ${REQUIRED}.x is required; this is Bun ${bun.version}. ` +
      `Install it with: curl -fsSL https://bun.sh/install | bash -s "bun-v${REQUIRED}.3"`
  );
  process.exit(1);
}
