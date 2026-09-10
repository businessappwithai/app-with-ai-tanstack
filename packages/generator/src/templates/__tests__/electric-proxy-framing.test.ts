/**
 * Regression: the dictionary never synced in a generated application.
 *
 * The Electric proxy relays a shape response by copying every upstream header
 * and then sending the body it read with `fetch`. Electric answers
 * `transfer-encoding: chunked`, and `fetch` consumes the chunking — so the
 * relayed response announced chunked framing and carried a fixed-length buffer.
 * Nothing downstream can read that: undici refuses it with
 * `UND_ERR_HTTP_PARSER`, and the generated front end's own `/api` proxy turns
 * the refusal into a 500 for the browser. Every dictionary collection failed,
 * on every page load, with the upstream's `electric-*` headers still attached
 * so the failure read like an Electric fault rather than a proxy one.
 *
 * It was invisible until the *client* side was fixed: while `SHAPE_URL` was
 * still relative the client threw `Invalid URL` before a request ever left the
 * browser, and this failure sat behind it.
 *
 * `content-encoding` and `content-length` belong to the same class and are
 * dropped for the same reason: `fetch` has already decompressed the body, and
 * the length the upstream measured is the compressed one.
 *
 * Found by /qa on 2026-09-09 against an Education Management System model, in
 * a `docker compose up --build` of the deployable zip.
 * Report: docs/qa-reports/qa-report-education-management-system-2026-09-09.md
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CONTROLLER = join(
  import.meta.dirname,
  "../../../templates/tanstack-start-nestjs/backend/src/modules/electric/electric.controller.ts.hbs"
);

const source = readFileSync(CONTROLLER, "utf8");

describe("the generated Electric proxy", () => {
  it("does not relay the upstream's framing headers", () => {
    // The header names have to be *skipped*, not merely mentioned: the check is
    // that each appears inside the set the copy loop consults.
    const framing = source.match(/const FRAMING = new Set\(\[([\s\S]*?)\]\)/);
    expect(framing, "the proxy declares no framing-header exclusion set").not.toBeNull();

    const excluded = framing![1];
    for (const header of ["transfer-encoding", "content-encoding", "content-length"]) {
      expect(excluded).toContain(header);
    }
  });

  it("still consults that set in the header copy loop", () => {
    expect(source).toMatch(/FRAMING\.has\(name\)/);
  });

  it("still marks every response private, which is a separate promise", () => {
    // A shape response is computed for one role. Relaying Electric's own
    // cache-control would let a shared cache serve it to another.
    expect(source).toMatch(/headers\['cache-control'\] = 'private, no-store'/);
  });
});
