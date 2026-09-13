/**
 * Regression: the same entity had two different names on screen, and neither
 * was the one the model declared.
 *
 * `formatDisplayName` and the browser stack's own `title()` were two
 * implementations of one idea, and they disagreed. Core split only on a
 * lower-to-upper step, so a name *beginning* with an acronym had no boundary to
 * find and came through whole: `KYCRecord`. The browser stack routed through
 * `snakeCase` and title-cased the pieces, which found the boundary but lowered
 * the acronym on the way: `Kyc Record`. So the NestJS application called the
 * entity `KYCRecord`, the browser application called it `Kyc Record`, and the
 * model called it neither.
 *
 * The browser copy's own comment already stated the rule it was breaking — "a
 * model that declares `CAPA` means the acronym, and titling it to `Capa`
 * renames the entity on screen" — and core did exactly that to `CAPA`.
 *
 * Nothing downstream reads a display name; it is a label. That is precisely why
 * this survived: no query fails, no build breaks, and the only symptom is a
 * reader comparing the screen to their own model and finding the two disagree.
 *
 * Found by /qa on 2026-09-13 against `investment-planning-wealth-management-system`,
 * whose dashboard offered a card reading `Kyc Record`.
 */

import { describe, expect, it } from "vitest";
import { formatDisplayName } from "../bus-entity.types";

describe("formatDisplayName", () => {
  it("keeps an acronym that starts a name, and splits the word after it", () => {
    expect(formatDisplayName("KYCRecord")).toBe("KYC Record");
    expect(formatDisplayName("FATCADeclaration")).toBe("FATCA Declaration");
    expect(formatDisplayName("CRSDeclaration")).toBe("CRS Declaration");
    expect(formatDisplayName("HTTPSProxy")).toBe("HTTPS Proxy");
  });

  it("leaves a name that is only an acronym alone", () => {
    expect(formatDisplayName("CAPA")).toBe("CAPA");
    expect(formatDisplayName("STRING")).toBe("STRING");
    expect(formatDisplayName("TABLE_DIRECT")).toBe("TABLE DIRECT");
  });

  it("splits ordinary camel case", () => {
    expect(formatDisplayName("AssetAllocationModel")).toBe("Asset Allocation Model");
    expect(formatDisplayName("InvestmentRecommendation")).toBe("Investment Recommendation");
    expect(formatDisplayName("AdmetProfile")).toBe("Admet Profile");
    expect(formatDisplayName("Order")).toBe("Order");
  });

  it("titles a snake_case column, which carries no acronym to preserve", () => {
    expect(formatDisplayName("kyc_record_id")).toBe("Kyc Record Id");
    expect(formatDisplayName("created_at")).toBe("Created At");
    expect(formatDisplayName("email")).toBe("Email");
  });

  it("treats a single capital before a word as its own word", () => {
    expect(formatDisplayName("ESignatureRequest")).toBe("E Signature Request");
  });
});
