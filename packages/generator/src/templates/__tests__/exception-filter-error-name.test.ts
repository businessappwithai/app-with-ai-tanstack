/**
 * Regression: a 403 from the Electric shape proxy said `"error": "Internal Server Error"`.
 *
 * The exception filter starts `error` at "Internal Server Error" and only
 * replaced it when the exception's response was an object. `new HttpException(
 * 'text', HttpStatus.FORBIDDEN)` carries a bare string, so every such refusal
 * kept the 500 label beside a 403 status. The string branch must name the
 * status like the object branch does.
 *
 * Found by /qa on 2026-10-21 (Electric proxy probe, airport model).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILTER = join(
  import.meta.dirname,
  "../../../templates/tanstack-start-nestjs/backend/src/common/filters/http-exception.filter.ts.hbs"
);

describe("http exception filter template", () => {
  const source = readFileSync(FILTER, "utf8");

  it("names the status when the HttpException response is a bare string", () => {
    const branch = source.slice(
      source.indexOf("typeof exceptionResponse === 'string'"),
      source.indexOf("typeof exceptionResponse === 'object'")
    );
    expect(branch).toContain("message = exceptionResponse");
    expect(branch).toContain("error = this.getErrorName(status)");
  });
});
