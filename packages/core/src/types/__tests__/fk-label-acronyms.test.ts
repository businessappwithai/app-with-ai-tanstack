/**
 * Regression: a foreign key was labelled two different ways, and neither named
 * the entity it points at.
 *
 * `kyc_record_id` on `KYCVerification` points at `KYCRecord`. The NestJS
 * dictionary stripped the `_id` and titled what was left — `Kyc Record` — and
 * the browser bundle labelled the raw column without stripping anything at all
 * — `Kyc Record Id`. One model, one column, two different words on screen, and
 * the acronym gone from both because a column name is lower-case by the time
 * either of them sees it.
 *
 * The entity's own name is the only place the case survives, so the label is
 * resolved against the names the model declares rather than reconstructed from
 * the column. Both stacks call this now.
 *
 * Found by /qa on 2026-09-13.
 */

import { describe, expect, it } from "vitest";
import { attributeDisplayName, declaredEntityNames } from "../bus-entity.types";
import type { EntityAttribute } from "../entity.types";

const declared = declaredEntityNames([
  { name: "KYCRecord" },
  { name: "Client" },
  { name: "FATCADeclaration" },
]);

const fk = (name: string): EntityAttribute =>
  ({ name, type: "string", isForeignKey: true }) as EntityAttribute;

const plain = (name: string): EntityAttribute => ({ name, type: "string" }) as EntityAttribute;

describe("attributeDisplayName", () => {
  it("labels a foreign key with the entity it points at, acronym intact", () => {
    expect(attributeDisplayName(fk("kyc_record_id"), "id", declared)).toBe("KYC Record");
    expect(attributeDisplayName(fk("fatca_declaration_id"), "id", declared)).toBe(
      "FATCA Declaration"
    );
  });

  it("still strips the suffix when the target is not a declared entity", () => {
    expect(attributeDisplayName(fk("supplier_id"), "id", declared)).toBe("Supplier");
  });

  it("degrades to the stem when no entity list is supplied", () => {
    expect(attributeDisplayName(fk("kyc_record_id"), "id")).toBe("Kyc Record");
  });

  it("keeps the suffix on a _by column, where it is the label", () => {
    expect(attributeDisplayName(fk("created_by_id"), "id", declared)).toBe("Created By Id");
  });

  it("leaves the primary key and ordinary columns alone", () => {
    expect(attributeDisplayName(plain("id"), "id", declared)).toBe("Id");
    expect(attributeDisplayName(plain("email"), "id", declared)).toBe("Email");
  });
});
