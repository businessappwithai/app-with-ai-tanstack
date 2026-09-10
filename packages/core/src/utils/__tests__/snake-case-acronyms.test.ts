/**
 * Regression: an entity whose name begins with an acronym was given a table
 * name nothing else could name.
 *
 * `snakeCase` guarded the all-caps case ("CAPA" -> "capa") and nothing else, so
 * a name that merely *starts* with an acronym fell through to the per-capital
 * rule: `SIPInstruction` became `s_i_p_instruction`, `FATCADeclaration` became
 * `f_a_t_c_a_declaration`. Those are the tables an application was generated
 * with, while the EML CLI, the reporting pack and the checker's own foreign-key
 * naming all called the same entity `sip_instruction`.
 *
 * It surfaced as `relation "bus_sip_instruction" does not exist` from every
 * report derived from a relationship touching one of those entities — a report
 * that builds cleanly and fails at run time, which is the failure the
 * reporting-pack check exists to catch.
 *
 * `MermaidParser.toSnakeCase` was a second implementation of this function and
 * is now a call to it; a parser that decides identifiers its own way is a
 * parser that can be wrong on its own.
 *
 * Found by /qa on 2026-09-10 against `investment-planning-wealth-management-system`.
 */

import { describe, expect, it } from "vitest";
import { snakeCase } from "../naming";

describe("snakeCase", () => {
  it("treats a leading acronym as one word", () => {
    expect(snakeCase("SIPInstruction")).toBe("sip_instruction");
    expect(snakeCase("STPInstruction")).toBe("stp_instruction");
    expect(snakeCase("FATCADeclaration")).toBe("fatca_declaration");
  });

  it("treats an interior acronym the same way", () => {
    expect(snakeCase("XMLHttpRequest")).toBe("xml_http_request");
  });

  it("still lowercases a name that is nothing but an acronym", () => {
    expect(snakeCase("CAPA")).toBe("capa");
  });

  it("leaves the ordinary cases as they were", () => {
    expect(snakeCase("AcademicTerm")).toBe("academic_term");
    expect(snakeCase("Client")).toBe("client");
    expect(snakeCase("order_item")).toBe("order_item");
    expect(snakeCase("Order2Item")).toBe("order2_item");
    // A boundary that is both a separator and a capital, which once produced
    // "drug__discovery__live" and named a database that way.
    expect(snakeCase("Drug Discovery Live")).toBe("drug_discovery_live");
    expect(snakeCase("Drug-Discovery Live")).toBe("drug_discovery_live");
  });

  it("never starts with an underscore", () => {
    for (const name of ["SIPInstruction", "Client", " Leading", "-Leading"]) {
      expect(snakeCase(name).startsWith("_")).toBe(false);
    }
  });
});
