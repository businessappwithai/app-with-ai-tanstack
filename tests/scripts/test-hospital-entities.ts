#!/usr/bin/env bun
/**
 * Hospital Entities E2E Test
 * Runtime: Bun.js (NOT Node.js)
 * Tests: DOCTOR, PATIENT, APPOINTMENT, DEPARTMENT entities
 */

import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("🔍 Testing DOCTOR entity page...");
  await page.goto("http://localhost:3001/bus_d_o_c_t_o_r");
  await page.waitForTimeout(3000);

  // Check for table
  const table = await page.locator("table").isVisible();
  console.log("✓ Table visible:", table);

  // Check for data rows
  const rowCount = await page.locator("table tbody tr").count();
  console.log("✓ Number of rows:", rowCount);

  // Check heading
  const heading = await page.locator("h1, h2").filter({ hasText: "DOCTOR" }).isVisible();
  console.log("✓ DOCTOR heading visible:", heading);

  // Test a few more entities
  const entities = ["bus_p_a_t_i_e_n_t", "bus_a_p_p_o_i_n_t_m_e_n_t", "bus_d_e_p_a_r_t_m_e_n_t"];

  for (const entity of entities) {
    console.log(`\n🔍 Testing ${entity}...`);
    await page.goto(`http://localhost:3001/${entity}`);
    await page.waitForTimeout(2000);

    const rows = await page.locator("table tbody tr").count();
    console.log(`✓ ${entity} rows:`, rows);
  }

  console.log("\n✅ All tests completed!");
  await browser.close();
})();
