/**
 * Regression: the same column got an email input in one stack and a text box in
 * the other.
 *
 * `email`, `url` and `phone` are EML aliases that normalise to `string`, and the
 * parser records the alias in `semanticType`. A model that writes `string email`
 * instead of `email email` declares no alias, so there is nothing to record —
 * and the column's *name* is then the only evidence of what it holds.
 *
 * The browser stack has read that name since it was written. Core did not, so
 * `attributeReferenceId` returned STRING where `referenceIdFor` returned EMAIL,
 * and the NestJS application rendered a plain text box over the same column the
 * browser application gave an email input. Five columns across the published
 * dance-studio and ecommerce models were affected; §3.7's whole claim is that
 * the reference type decides the control, so the two applications were making
 * different promises about one model.
 *
 * One implementation now, in core, and the browser stack calls it. Checked
 * against 953 real attributes across four published models: 0 disagreements.
 *
 * Found by /qa on 2026-09-13, auditing a duplication rather than a symptom.
 */

import { describe, expect, it } from "vitest";
import { referenceFromColumnName } from "../bus-entity.types";
import type { EntityAttribute } from "../entity.types";
import { ReferenceType } from "../sys-dictionary.types";

const col = (name: string, type = "string"): EntityAttribute => ({ name, type }) as EntityAttribute;

describe("referenceFromColumnName", () => {
  it("reads an address, a number or a link out of the column's name", () => {
    expect(referenceFromColumnName(col("email"))).toBe(ReferenceType.EMAIL);
    expect(referenceFromColumnName(col("contact_email"))).toBe(ReferenceType.EMAIL);
    expect(referenceFromColumnName(col("phone"))).toBe(ReferenceType.PHONE);
    expect(referenceFromColumnName(col("mobile_number"))).toBe(ReferenceType.PHONE);
    expect(referenceFromColumnName(col("website"))).toBe(ReferenceType.URL);
  });

  it("applies to text as well as string, since both hold one", () => {
    expect(referenceFromColumnName(col("email", "text"))).toBe(ReferenceType.EMAIL);
  });

  it("leaves a column of another type alone, whatever it is called", () => {
    // The guard that matters: a checkbox with "email" in its name was being
    // given an email input.
    expect(referenceFromColumnName(col("email_opt_out", "boolean"))).toBeUndefined();
    expect(referenceFromColumnName(col("phone_verified", "boolean"))).toBeUndefined();
    expect(referenceFromColumnName(col("email_count", "integer"))).toBeUndefined();
  });

  it("says nothing about a column whose name carries no evidence", () => {
    expect(referenceFromColumnName(col("notes"))).toBeUndefined();
    expect(referenceFromColumnName(col("first_name"))).toBeUndefined();
  });
});
