/**
 * Regression: every role in the model was seeded twice.
 *
 * `00_users_and_roles` seeds the title-cased role (`Airport Manager`) and the
 * `%%rbac` seed then looked for `airport_manager` with a case-only comparison.
 * `lower('Airport Manager')` is not `airport_manager`, so it wrote a second role
 * beside each real one: ten roles seeded, nine more added, and the Role screen
 * listed eighteen. The entity-access guard folds case and treats `_`, `-` and
 * spaces alike, so the seed has to as well.
 *
 * Found by /qa on 2026-10-21 (role-by-role walkthrough, airport model).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SEED = join(
  import.meta.dirname,
  "../../../templates/common/seeds/operation-access.ts.hbs"
);
const GUARD = join(
  import.meta.dirname,
  "../../../templates/tanstack-start-nestjs/backend/src/modules/auth/guards/entity-access.guard.ts.hbs"
);

describe("%%rbac role seed", () => {
  const seed = readFileSync(SEED, "utf8");

  it("matches an existing role with separators folded, not by case alone", () => {
    expect(seed).not.toContain("sql`lower(name)`");
    expect(seed).toContain("regexp_replace(trim(name), '[[:space:]_-]+', ' ', 'g')");
    expect(seed).toContain(".replace(/[\\s_-]+/g, ' ')");
  });

  it("folds names the way the entity-access guard does", () => {
    // The two must agree, or a role the seed thinks is new is one the guard
    // already treats as an existing role.
    expect(readFileSync(GUARD, "utf8")).toContain(".replace(/[\\s\\-_]+/g, ' ')");
  });
});
