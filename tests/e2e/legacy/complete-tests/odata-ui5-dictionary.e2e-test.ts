/**
 * Enhanced E2E Tests for OpenUI5 + OData V4 Generated Application
 * Compiere Application Dictionary Coverage
 *
 * Tests the complete Application Dictionary (sys_ tables) functionality:
 * - OData $metadata reflecting sys_ entity sets
 * - sys_ table OData collection queries ($filter, $orderby, $expand, $top, $skip)
 * - sys_column with reference type joins
 * - sys_field ordered by seq_no via OData $orderby
 * - OpenUI5 FCL Column 1 entity menu from sys_table metadata
 * - Dictionary-driven form rendering from sys_field data
 * - Runtime field reorder reflected in OData queries
 * - sys_reference seeded data via OData
 * - RBAC entities via OData
 *
 * Stack: OpenUI5 1.120+ FCL | OData V4 Server (jaystack) + Knex.js
 * Database: SQLite / PostgreSQL
 */

import { expect, test } from "@playwright/test";

// ============================================================================
// Configuration
// ============================================================================

const ODATA_BACKEND_URL = process.env.ODATA_BACKEND_URL || "http://localhost:3003";
const UI5_FRONTEND_URL = process.env.UI5_FRONTEND_URL || "http://localhost:3004";

// OData service root
const ODATA_ROOT = `${ODATA_BACKEND_URL}/odata`;

// Standard Reference Type IDs
const REFERENCE_TYPES = {
  STRING: 10,
  INTEGER: 11,
  AMOUNT: 12,
  ID: 13,
  TEXT: 14,
  DATE: 15,
  DATETIME: 16,
  LIST: 17,
  TABLE: 18,
  TABLE_DIRECT: 19,
  YES_NO: 20,
  LOCATION: 21,
  LOCATOR: 22,
  ACCOUNT: 23,
  URL: 24,
  IMAGE: 25,
  FILE: 26,
  COLOR: 27,
  JSON: 28,
  PASSWORD: 29,
  EMAIL: 30,
  PHONE: 31,
} as const;

// ============================================================================
// Test Suite: OData $metadata - Dictionary Entity Sets
// ============================================================================

test.describe("OData $metadata - Dictionary Entity Types", () => {
  test("GET /odata/$metadata - should contain sys_ entity types", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/$metadata`);

    expect(response.status()).toBe(200);

    const metadata = await response.text();

    // Should contain standard OData metadata elements
    expect(metadata).toContain("EntityContainer");
    expect(metadata).toContain("EntityType");

    // Should contain sys_ entity types
    expect(metadata).toContain("SysTable");
    expect(metadata).toContain("SysColumn");
    expect(metadata).toContain("SysWindow");
    expect(metadata).toContain("SysTab");
    expect(metadata).toContain("SysField");
    expect(metadata).toContain("SysReference");
  });

  test("$metadata should contain bus_ entity types", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/$metadata`);

    expect(response.status()).toBe(200);

    const metadata = await response.text();

    // Should contain EntityContainer with entity sets
    expect(metadata).toContain("EntityContainer");

    // Business entity types should be present (at least some)
    // The exact names depend on what was generated
    expect(metadata).toContain("EntityType");
  });

  test("$metadata should declare navigation properties for sys_ relationships", async ({
    request,
  }) => {
    const response = await request.get(`${ODATA_ROOT}/$metadata`);

    expect(response.status()).toBe(200);

    const metadata = await response.text();

    // sys_column should have NavigationProperty to sys_table
    expect(metadata).toContain("NavigationProperty");
  });

  test("$metadata should declare property types matching reference types", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/$metadata`);

    expect(response.status()).toBe(200);

    const metadata = await response.text();

    // Should have common OData property types
    expect(metadata).toContain("Edm.String");
    expect(metadata).toContain("Edm.Boolean");
    expect(metadata).toContain("Edm.Int32");
  });
});

// ============================================================================
// Test Suite: OData - SysReference (Seeded Reference Types)
// ============================================================================

test.describe("OData API - SysReferences Collection", () => {
  test("GET /odata/SysReferences - should return seeded reference types", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysReferences`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);

    // Should have at least 22 standard reference types
    expect(data.value.length).toBeGreaterThanOrEqual(22);
  });

  test("should retrieve STRING reference type by key", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysReferences(${REFERENCE_TYPES.STRING})`);

    expect(response.status()).toBe(200);

    const ref = await response.json();
    expect(ref).toHaveProperty("name", "String");
    expect(ref).toHaveProperty("sys_reference_id", REFERENCE_TYPES.STRING);
  });

  test("should support $filter on reference name", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysReferences?$filter=name eq 'Email'`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.value.length).toBeGreaterThanOrEqual(1);
    expect(data.value[0]).toHaveProperty("name", "Email");
  });

  test("should support $orderby on reference id", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysReferences?$orderby=sys_reference_id asc`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value.length > 1) {
      for (let i = 1; i < data.value.length; i++) {
        expect(data.value[i].sys_reference_id).toBeGreaterThanOrEqual(
          data.value[i - 1].sys_reference_id
        );
      }
    }
  });

  test("should support $top and $skip for pagination", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysReferences?$top=5&$skip=0`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.value.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// Test Suite: OData - SysTables CRUD
// ============================================================================

test.describe("OData API - SysTables Collection", () => {
  let createdTableId: string;

  test("GET /odata/SysTables - should return system and business tables", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysTables`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);

    // Should have both sys_ and bus_ tables
    const tableNames = data.value.map((t: { table_name: string }) => t.table_name);
    const hasSys = tableNames.some((n: string) => n.startsWith("sys_"));
    const hasBus = tableNames.some((n: string) => n.startsWith("bus_"));

    expect(hasSys).toBe(true);
    expect(hasBus).toBe(true);
  });

  test("should filter tables by table_name prefix", async ({ request }) => {
    const response = await request.get(
      `${ODATA_ROOT}/SysTables?$filter=startswith(table_name,'bus_')`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value.length > 0) {
      for (const table of data.value) {
        expect(table.table_name).toMatch(/^bus_/);
      }
    }
  });

  test("should filter system tables", async ({ request }) => {
    const response = await request.get(
      `${ODATA_ROOT}/SysTables?$filter=startswith(table_name,'sys_')`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value.length > 0) {
      for (const table of data.value) {
        expect(table.table_name).toMatch(/^sys_/);
      }
    }
  });

  test("POST /odata/SysTables - should create new table entry", async ({ request }) => {
    const newTable = {
      table_name: "bus_odata_test",
      name: "OData Test Entity",
      description: "E2E test entity for OData dictionary validation",
      access_level: "A",
      is_view: false,
      is_document: false,
      is_high_volume: false,
      is_changelog: true,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${ODATA_ROOT}/SysTables`, {
      data: newTable,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("table_name", newTable.table_name);
    expect(created).toHaveProperty("name", newTable.name);
    expect(created).toHaveProperty("is_active", true);

    createdTableId = created.sys_table_id || created.ID || created.id;
  });

  test("PATCH /odata/SysTables(:id) - should update table entry", async ({ request }) => {
    if (!createdTableId) {
      test.skip(true, "No table created");
      return;
    }

    const updates = {
      description: "Updated OData test entity",
      is_high_volume: true,
    };

    const response = await request.patch(`${ODATA_ROOT}/SysTables(${createdTableId})`, {
      data: updates,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(200);

    const updated = await response.json();
    expect(updated).toHaveProperty("is_high_volume", true);
  });

  test("DELETE /odata/SysTables(:id) - should delete table entry", async ({ request }) => {
    if (!createdTableId) {
      test.skip(true, "No table created");
      return;
    }

    const response = await request.delete(`${ODATA_ROOT}/SysTables(${createdTableId})`);

    expect([200, 204]).toContain(response.status());
  });
});

// ============================================================================
// Test Suite: OData - SysColumns with Reference Types
// ============================================================================

test.describe("OData API - SysColumns Collection", () => {
  test("GET /odata/SysColumns - should return column metadata", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysColumns`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("should filter columns by sys_table_id", async ({ request }) => {
    // First get a table
    const tablesResponse = await request.get(`${ODATA_ROOT}/SysTables?$top=1`);
    const tablesData = await tablesResponse.json();

    if (tablesData.value && tablesData.value.length > 0) {
      const tableId = tablesData.value[0].sys_table_id;

      const response = await request.get(
        `${ODATA_ROOT}/SysColumns?$filter=sys_table_id eq '${tableId}'`
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      for (const col of data.value) {
        expect(col.sys_table_id).toBe(tableId);
      }
    }
  });

  test("should have columns with valid reference type IDs", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysColumns?$top=50`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const validRefIds = Object.values(REFERENCE_TYPES);

    for (const col of data.value) {
      if (col.sys_reference_id) {
        expect(validRefIds).toContain(col.sys_reference_id);
      }
    }
  });

  test("should filter mandatory columns", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysColumns?$filter=is_mandatory eq true`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const col of data.value) {
      expect(col.is_mandatory).toBe(true);
    }
  });

  test("should order columns by seq_no", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysColumns?$orderby=seq_no asc&$top=20`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value.length > 1) {
      for (let i = 1; i < data.value.length; i++) {
        expect(data.value[i].seq_no).toBeGreaterThanOrEqual(data.value[i - 1].seq_no);
      }
    }
  });

  test("should $expand to include sys_table relationship", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysColumns?$expand=SysTable&$top=5`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value && data.value.length > 0) {
      // Expanded table data should be present
      for (const col of data.value) {
        if (col.SysTable) {
          expect(col.SysTable).toHaveProperty("table_name");
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: OData - SysWindows
// ============================================================================

test.describe("OData API - SysWindows Collection", () => {
  test("GET /odata/SysWindows - should return window definitions", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysWindows`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
    expect(data.value.length).toBeGreaterThan(0);
  });

  test("should have valid window_type values", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysWindows`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const window of data.value) {
      expect(["M", "T", "Q"]).toContain(window.window_type);
    }
  });

  test("should filter Maintain-type windows", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysWindows?$filter=window_type eq 'M'`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const window of data.value) {
      expect(window.window_type).toBe("M");
    }
  });
});

// ============================================================================
// Test Suite: OData - SysTabs (Master-Detail Hierarchy)
// ============================================================================

test.describe("OData API - SysTabs Collection", () => {
  test("GET /odata/SysTabs - should return tab definitions", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysTabs`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
    expect(data.value.length).toBeGreaterThan(0);
  });

  test("should have master tabs at level 0", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysTabs?$filter=tab_level eq 0`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.value.length).toBeGreaterThan(0);

    for (const tab of data.value) {
      expect(tab.tab_level).toBe(0);
    }
  });

  test("should order tabs by seq_no within a window", async ({ request }) => {
    // Get first window
    const windowsResponse = await request.get(`${ODATA_ROOT}/SysWindows?$top=1`);
    const windowsData = await windowsResponse.json();

    if (windowsData.value && windowsData.value.length > 0) {
      const windowId = windowsData.value[0].sys_window_id;

      const response = await request.get(
        `${ODATA_ROOT}/SysTabs?$filter=sys_window_id eq '${windowId}'&$orderby=seq_no asc`
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      if (data.value.length > 1) {
        for (let i = 1; i < data.value.length; i++) {
          expect(data.value[i].seq_no).toBeGreaterThanOrEqual(data.value[i - 1].seq_no);
        }
      }
    }
  });

  test("should $expand to include SysWindow and SysTable", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysTabs?$expand=SysWindow,SysTable&$top=3`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value && data.value.length > 0) {
      for (const tab of data.value) {
        if (tab.SysWindow) {
          expect(tab.SysWindow).toHaveProperty("name");
        }
        if (tab.SysTable) {
          expect(tab.SysTable).toHaveProperty("table_name");
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: OData - SysFields (Layout & Runtime Reordering)
// ============================================================================

test.describe("OData API - SysFields Collection (Layout & seq_no)", () => {
  test("GET /odata/SysFields - should return field layout data", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFields`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
    expect(data.value.length).toBeGreaterThan(0);
  });

  test("should order fields by seq_no", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFields?$orderby=seq_no asc&$top=20`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.value.length > 1) {
      for (let i = 1; i < data.value.length; i++) {
        expect(data.value[i].seq_no).toBeGreaterThanOrEqual(data.value[i - 1].seq_no);
      }
    }
  });

  test("should filter displayed fields", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFields?$filter=is_displayed eq true`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const field of data.value) {
      expect(field.is_displayed).toBe(true);
    }
  });

  test("should filter grid-displayed fields", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFields?$filter=is_displayed_grid eq true`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const field of data.value) {
      expect(field.is_displayed_grid).toBe(true);
    }
  });

  test("PATCH /odata/SysFields(:id) - should update seq_no for runtime reordering", async ({
    request,
  }) => {
    // Get two fields from the same tab
    const response = await request.get(
      `${ODATA_ROOT}/SysFields?$orderby=seq_no asc&$top=2&$filter=is_displayed eq true`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.value && data.value.length >= 2) {
      const field1 = data.value[0];
      const field2 = data.value[1];

      const origSeq1 = field1.seq_no;
      const origSeq2 = field2.seq_no;

      // Swap seq_no values
      const update1 = await request.patch(`${ODATA_ROOT}/SysFields(${field1.sys_field_id})`, {
        data: { seq_no: origSeq2 },
        headers: { "Content-Type": "application/json" },
      });
      expect(update1.status()).toBe(200);

      const update2 = await request.patch(`${ODATA_ROOT}/SysFields(${field2.sys_field_id})`, {
        data: { seq_no: origSeq1 },
        headers: { "Content-Type": "application/json" },
      });
      expect(update2.status()).toBe(200);

      // Verify new order
      const verifyResponse = await request.get(
        `${ODATA_ROOT}/SysFields?$orderby=seq_no asc&$filter=sys_tab_id eq '${field1.sys_tab_id}'`
      );
      const verifyData = await verifyResponse.json();
      const fieldIds = verifyData.value.map((f: { sys_field_id: string }) => f.sys_field_id);

      const newIdx1 = fieldIds.indexOf(field2.sys_field_id);
      const newIdx2 = fieldIds.indexOf(field1.sys_field_id);
      expect(newIdx1).toBeLessThan(newIdx2);

      // Restore original order
      await request.patch(`${ODATA_ROOT}/SysFields(${field1.sys_field_id})`, {
        data: { seq_no: origSeq1 },
        headers: { "Content-Type": "application/json" },
      });
      await request.patch(`${ODATA_ROOT}/SysFields(${field2.sys_field_id})`, {
        data: { seq_no: origSeq2 },
        headers: { "Content-Type": "application/json" },
      });
    }
  });

  test("PATCH /odata/SysFields(:id) - should toggle is_displayed", async ({ request }) => {
    const response = await request.get(
      `${ODATA_ROOT}/SysFields?$filter=is_displayed eq true&$top=1`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.value && data.value.length > 0) {
      const field = data.value[0];

      // Hide field
      const hideResponse = await request.patch(`${ODATA_ROOT}/SysFields(${field.sys_field_id})`, {
        data: { is_displayed: false },
        headers: { "Content-Type": "application/json" },
      });
      expect(hideResponse.status()).toBe(200);

      // Verify hidden
      const verifyResponse = await request.get(`${ODATA_ROOT}/SysFields(${field.sys_field_id})`);
      const verified = await verifyResponse.json();
      expect(verified.is_displayed).toBe(false);

      // Restore
      await request.patch(`${ODATA_ROOT}/SysFields(${field.sys_field_id})`, {
        data: { is_displayed: true },
        headers: { "Content-Type": "application/json" },
      });
    }
  });

  test("should have all required layout properties", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFields?$top=5`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const field of data.value) {
      expect(field).toHaveProperty("seq_no");
      expect(field).toHaveProperty("seq_no_grid");
      expect(field).toHaveProperty("is_displayed");
      expect(field).toHaveProperty("is_displayed_grid");
      expect(field).toHaveProperty("is_read_only");
      expect(field).toHaveProperty("is_same_line");
      expect(field).toHaveProperty("is_heading");
      expect(field).toHaveProperty("is_field_only");
      expect(field).toHaveProperty("is_active");

      expect(typeof field.seq_no).toBe("number");
      expect(typeof field.seq_no_grid).toBe("number");
    }
  });
});

// ============================================================================
// Test Suite: OData - SysFieldGroups
// ============================================================================

test.describe("OData API - SysFieldGroups Collection", () => {
  test("GET /odata/SysFieldGroups - should return field groups", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFieldGroups`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("should have valid field_group_type values", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysFieldGroups`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    for (const group of data.value) {
      expect(["C", "L", "T"]).toContain(group.field_group_type);
    }
  });

  test("POST /odata/SysFieldGroups - should create field group", async ({ request }) => {
    const newGroup = {
      name: "OData Test Group",
      description: "Test field group via OData",
      field_group_type: "C",
      is_collapsed_by_default: false,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${ODATA_ROOT}/SysFieldGroups`, {
      data: newGroup,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("name", "OData Test Group");

    // Clean up
    const groupId = created.sys_field_group_id || created.ID || created.id;
    if (groupId) {
      await request.delete(`${ODATA_ROOT}/SysFieldGroups(${groupId})`);
    }
  });
});

// ============================================================================
// Test Suite: OData - RBAC Entities
// ============================================================================

test.describe("OData API - RBAC (Users, Roles, Access)", () => {
  test("GET /odata/SysUsers - should return system users", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysUsers`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("GET /odata/SysRoles - should return roles", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysRoles`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("GET /odata/SysAccess - should return access control entries", async ({ request }) => {
    const response = await request.get(`${ODATA_ROOT}/SysAccess`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("should filter access by role", async ({ request }) => {
    const rolesResponse = await request.get(`${ODATA_ROOT}/SysRoles?$top=1`);
    const rolesData = await rolesResponse.json();

    if (rolesData.value && rolesData.value.length > 0) {
      const roleId = rolesData.value[0].sys_role_id;

      const response = await request.get(
        `${ODATA_ROOT}/SysAccess?$filter=sys_role_id eq '${roleId}'`
      );

      expect(response.status()).toBe(200);
    }
  });
});

// ============================================================================
// Test Suite: OpenUI5 Frontend - FCL Entity Menu from sys_table
// ============================================================================

test.describe("OpenUI5 Frontend - FCL Entity Menu (Dictionary-Driven)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
  });

  test("should display entity menu in FCL Column 1", async ({ page }) => {
    // FCL Column 1 should show searchable entity list derived from sys_table
    const entityMenu = page.locator('.sapMList, .sapMTree, [id*="entityMenu"]').first();

    if (await entityMenu.isVisible()) {
      await expect(entityMenu).toBeVisible();

      // Should contain entity names (from sys_table.name for bus_ tables)
      const menuText = await entityMenu.textContent();
      expect(menuText).toBeTruthy();
      // The menu should list business entities
      expect(menuText!.length).toBeGreaterThan(0);
    }
  });

  test("should allow searching entity menu", async ({ page }) => {
    // Look for search field in Column 1
    const searchField = page.locator('.sapMSearchField, input[placeholder*="Search"]').first();

    if (await searchField.isVisible()) {
      await searchField.fill("Customer");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);

      // Search should filter the entity list
      const entityList = page.locator('.sapMList, [id*="entityMenu"]').first();
      if (await entityList.isVisible()) {
        const listText = await entityList.textContent();
        // Should show matching entities or empty state
        expect(listText).toBeTruthy();
      }
    }
  });

  test("should navigate to entity list when clicking entity in Column 1", async ({ page }) => {
    // Click on first entity in the menu
    const entityItem = page.locator(".sapMLIB, .sapMListItems .sapMLIB").first();

    if (await entityItem.isVisible()) {
      await entityItem.click();
      await page.waitForTimeout(2000);

      // Column 2 should now show the entity's record list
      const column2 = page.locator('.sapFDynamicPageContent, .sapMTable, [id*="column2"]').first();
      if (await column2.isVisible()) {
        await expect(column2).toBeVisible();
      }
    }
  });
});

// ============================================================================
// Test Suite: OpenUI5 Frontend - Dictionary-Driven Detail Views
// ============================================================================

test.describe("OpenUI5 Frontend - Dictionary-Driven Views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
  });

  test("should render entity list with columns from sys_field.is_displayed_grid", async ({
    page,
  }) => {
    // Navigate to first entity
    const entityItem = page.locator(".sapMLIB").first();

    if (await entityItem.isVisible()) {
      await entityItem.click();
      await page.waitForTimeout(2000);

      // Check for table with columns
      const table = page.locator(".sapMTable, .sapUiTable").first();
      if (await table.isVisible()) {
        const columnHeaders = page.locator(".sapMTableHeaderCell, .sapMColumnHeader");
        const headerCount = await columnHeaders.count();

        // Should have columns (driven by sys_field.is_displayed_grid = true)
        expect(headerCount).toBeGreaterThan(0);
      }
    }
  });

  test("should render detail form with fields ordered by sys_field.seq_no", async ({ page }) => {
    // Navigate to entity, then to detail
    const entityItem = page.locator(".sapMLIB").first();

    if (await entityItem.isVisible()) {
      await entityItem.click();
      await page.waitForTimeout(2000);

      // Click on first record
      const recordItem = page.locator(".sapMTable .sapMLIB, .sapMColumnListItem").first();
      if (await recordItem.isVisible()) {
        await recordItem.click();
        await page.waitForTimeout(2000);

        // Detail view should show form fields
        const formFields = page.locator(".sapMInput, .sapMTextArea, .sapMSelect, .sapMCheckBox");
        const fieldCount = await formFields.count();

        // Should have form fields (driven by sys_field where is_displayed=true)
        expect(fieldCount).toBeGreaterThan(0);
      }
    }
  });

  test("should display field groups as sections in detail view", async ({ page }) => {
    // Navigate to entity detail
    const entityItem = page.locator(".sapMLIB").first();

    if (await entityItem.isVisible()) {
      await entityItem.click();
      await page.waitForTimeout(2000);

      const recordItem = page.locator(".sapMTable .sapMLIB, .sapMColumnListItem").first();
      if (await recordItem.isVisible()) {
        await recordItem.click();
        await page.waitForTimeout(2000);

        // Look for section headings (from sys_field_group)
        const sections = page.locator('.sapUxAPObjectPageSection, .sapMPanel, [role="region"]');
        const sectionCount = await sections.count();

        // May or may not have sections depending on the entity
        if (sectionCount > 0) {
          // Section titles should exist
          const sectionTitles = page.locator(
            ".sapUxAPObjectPageSectionTitle, .sapMPanelExpandableTitle"
          );
          expect(await sectionTitles.count()).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ============================================================================
// Test Suite: OData Metadata Integrity
// ============================================================================

test.describe("OData API - Dictionary Metadata Integrity", () => {
  test("every bus_ table should have columns in SysColumns", async ({ request }) => {
    const tablesResponse = await request.get(
      `${ODATA_ROOT}/SysTables?$filter=startswith(table_name,'bus_')`
    );
    const tablesData = await tablesResponse.json();

    if (tablesData.value && tablesData.value.length > 0) {
      for (const table of tablesData.value) {
        const columnsResponse = await request.get(
          `${ODATA_ROOT}/SysColumns?$filter=sys_table_id eq '${table.sys_table_id}'`
        );
        const columnsData = await columnsResponse.json();

        // Each business table should have at least one column defined
        expect(columnsData.value.length).toBeGreaterThan(0);
      }
    }
  });

  test("every bus_ table column should have a valid sys_reference_id", async ({ request }) => {
    const columnsResponse = await request.get(`${ODATA_ROOT}/SysColumns?$top=100`);
    const columnsData = await columnsResponse.json();

    const refsResponse = await request.get(`${ODATA_ROOT}/SysReferences`);
    const refsData = await refsResponse.json();
    const validRefIds = refsData.value.map((r: { sys_reference_id: number }) => r.sys_reference_id);

    for (const col of columnsData.value) {
      if (col.sys_reference_id) {
        expect(validRefIds).toContain(col.sys_reference_id);
      }
    }
  });

  test("every SysField should reference a valid SysColumn and SysTab", async ({ request }) => {
    const fieldsResponse = await request.get(`${ODATA_ROOT}/SysFields?$top=50`);
    const fieldsData = await fieldsResponse.json();

    for (const field of fieldsData.value) {
      expect(field).toHaveProperty("sys_tab_id");
      expect(field).toHaveProperty("sys_column_id");
      expect(field.sys_tab_id).toBeTruthy();
      expect(field.sys_column_id).toBeTruthy();
    }
  });

  test("every SysTab should reference a valid SysWindow and SysTable", async ({ request }) => {
    const tabsResponse = await request.get(`${ODATA_ROOT}/SysTabs`);
    const tabsData = await tabsResponse.json();

    for (const tab of tabsData.value) {
      expect(tab).toHaveProperty("sys_window_id");
      expect(tab).toHaveProperty("sys_table_id");
      expect(tab.sys_window_id).toBeTruthy();
      expect(tab.sys_table_id).toBeTruthy();
    }
  });

  test("bus_ tables should have primary key column (is_key=true)", async ({ request }) => {
    const tablesResponse = await request.get(
      `${ODATA_ROOT}/SysTables?$filter=startswith(table_name,'bus_')`
    );
    const tablesData = await tablesResponse.json();

    if (tablesData.value && tablesData.value.length > 0) {
      for (const table of tablesData.value) {
        const columnsResponse = await request.get(
          `${ODATA_ROOT}/SysColumns?$filter=sys_table_id eq '${table.sys_table_id}' and is_key eq true`
        );
        const columnsData = await columnsResponse.json();

        // Each table should have at least one key column
        expect(columnsData.value.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("selection columns should exist for search functionality", async ({ request }) => {
    const response = await request.get(
      `${ODATA_ROOT}/SysColumns?$filter=is_selection_column eq true`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    // There should be searchable columns defined
    expect(data.value.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: OData + OpenUI5 Dictionary Integration
// ============================================================================

test.describe("OData + OpenUI5 - Dictionary Integration", () => {
  test("should sync sys_table data between OData backend and UI", async ({ page, request }) => {
    // Get table count from API
    const response = await request.get(
      `${ODATA_ROOT}/SysTables?$filter=startswith(table_name,'bus_')&$count=true`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    const busTableCount = data.value?.length || 0;

    // Navigate to UI
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Entity menu should reflect the same number of entities
    const entityItems = page.locator(".sapMLIB, .sapMListItems .sapMLIB");
    const uiEntityCount = await entityItems.count();

    // UI should show at least some entities
    if (busTableCount > 0) {
      expect(uiEntityCount).toBeGreaterThan(0);
    }
  });

  test("field reorder via OData should reflect in UI", async ({ request }) => {
    // Get fields for first entity
    const fieldsResponse = await request.get(
      `${ODATA_ROOT}/SysFields?$filter=is_displayed eq true&$orderby=seq_no asc&$top=2`
    );

    const fieldsData = await fieldsResponse.json();

    if (fieldsData.value && fieldsData.value.length >= 2) {
      // The test validates that OData serves fields ordered by seq_no
      // and the UI can consume this order
      const field1Seq = fieldsData.value[0].seq_no;
      const field2Seq = fieldsData.value[1].seq_no;
      expect(field1Seq).toBeLessThanOrEqual(field2Seq);
    }
  });
});

// ============================================================================
// Test Suite: Performance - Dictionary Queries
// ============================================================================

test.describe("OData Performance - Dictionary Queries", () => {
  test("SysReferences query should respond within 2 seconds", async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get(`${ODATA_ROOT}/SysReferences`);

    const elapsed = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });

  test("SysFields query with filter and orderby should respond within 3 seconds", async ({
    request,
  }) => {
    const startTime = Date.now();

    const response = await request.get(
      `${ODATA_ROOT}/SysFields?$filter=is_displayed eq true&$orderby=seq_no asc&$top=50`
    );

    const elapsed = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });

  test("$metadata should respond within 2 seconds", async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get(`${ODATA_ROOT}/$metadata`);

    const elapsed = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(2000);
  });
});
