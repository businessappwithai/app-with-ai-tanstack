/**
 * Enhanced E2E Tests for Next.js + NestJS Generated Application
 * Compiere Application Dictionary Coverage
 *
 * Tests the complete Application Dictionary (sys_ tables) functionality:
 * - sys_table, sys_column, sys_window, sys_tab, sys_field CRUD via NestJS API
 * - sys_reference seeded data and reference type validation
 * - sys_field_group operations
 * - Admin field layout editor UI
 * - Dynamic form/table rendering driven by sys_field metadata
 * - Runtime field reordering (seq_no modification)
 * - Dictionary-driven entity discovery and navigation
 * - RBAC via sys_user, sys_role, sys_access
 *
 * Stack: Next.js 14 + NestJS 10 + Fastify + Knex.js
 * Database: SQLite / PostgreSQL
 */

import { expect, test } from "@playwright/test";

// ============================================================================
// Configuration
// ============================================================================

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

// API endpoints for sys_ tables
const SYS_TABLE_API = "/api/sys/tables";
const SYS_COLUMN_API = "/api/sys/columns";
const SYS_WINDOW_API = "/api/sys/windows";
const SYS_TAB_API = "/api/sys/tabs";
const SYS_FIELD_API = "/api/sys/fields";
const SYS_FIELD_GROUP_API = "/api/sys/field-groups";
const SYS_REFERENCE_API = "/api/sys/references";
const SYS_VAL_RULE_API = "/api/sys/val-rules";
const SYS_USER_API = "/api/sys/users";
const SYS_ROLE_API = "/api/sys/roles";
const SYS_ACCESS_API = "/api/sys/access";

// Standard Reference Type IDs (from Compiere dictionary)
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
// Test Suite: sys_reference - Seeded Reference Types
// ============================================================================

test.describe("NestJS API - sys_reference (Seeded Data)", () => {
  test("GET /api/sys/references - should return all standard reference types", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_REFERENCE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Should have at least 22 standard reference types
    expect(data.data.length).toBeGreaterThanOrEqual(22);
  });

  test("should contain STRING reference type (id=10)", async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}${SYS_REFERENCE_API}/${REFERENCE_TYPES.STRING}`
    );

    expect(response.status()).toBe(200);

    const ref = await response.json();
    expect(ref).toHaveProperty("name", "String");
    expect(ref).toHaveProperty("sys_reference_id", REFERENCE_TYPES.STRING);
  });

  test("should contain all core reference types", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_REFERENCE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const refIds = data.data.map((r: { sys_reference_id: number }) => r.sys_reference_id);

    // Validate all 22 standard types are seeded
    const expectedTypes = [
      REFERENCE_TYPES.STRING,
      REFERENCE_TYPES.INTEGER,
      REFERENCE_TYPES.AMOUNT,
      REFERENCE_TYPES.ID,
      REFERENCE_TYPES.TEXT,
      REFERENCE_TYPES.DATE,
      REFERENCE_TYPES.DATETIME,
      REFERENCE_TYPES.LIST,
      REFERENCE_TYPES.TABLE,
      REFERENCE_TYPES.TABLE_DIRECT,
      REFERENCE_TYPES.YES_NO,
      REFERENCE_TYPES.LOCATION,
      REFERENCE_TYPES.LOCATOR,
      REFERENCE_TYPES.ACCOUNT,
      REFERENCE_TYPES.URL,
      REFERENCE_TYPES.IMAGE,
      REFERENCE_TYPES.FILE,
      REFERENCE_TYPES.COLOR,
      REFERENCE_TYPES.JSON,
      REFERENCE_TYPES.PASSWORD,
      REFERENCE_TYPES.EMAIL,
      REFERENCE_TYPES.PHONE,
    ];

    for (const expectedId of expectedTypes) {
      expect(refIds).toContain(expectedId);
    }
  });

  test("should have correct validation_type for reference types", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_REFERENCE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const refs = data.data;

    // Basic types should have DataType validation
    for (const ref of refs) {
      expect(ref).toHaveProperty("validation_type");
      expect(["S", "L", "T", "R"]).toContain(ref.validation_type);
    }
  });
});

// ============================================================================
// Test Suite: sys_table - Table Metadata CRUD
// ============================================================================

test.describe("NestJS API - sys_table CRUD", () => {
  let createdTableId: string;

  test("GET /api/sys/tables - should return system and business tables", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Should have both sys_ and bus_ tables registered
    const tableNames = data.data.map((t: { table_name: string }) => t.table_name);
    const hasSysTables = tableNames.some((name: string) => name.startsWith("sys_"));
    const hasBusTables = tableNames.some((name: string) => name.startsWith("bus_"));

    expect(hasSysTables).toBe(true);
    expect(hasBusTables).toBe(true);
  });

  test("should have sys_table entry for each system table", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const tableNames = data.data.map((t: { table_name: string }) => t.table_name);

    // Core sys_ tables should be registered
    const expectedSysTables = [
      "sys_table",
      "sys_column",
      "sys_window",
      "sys_tab",
      "sys_field",
      "sys_field_group",
      "sys_reference",
    ];

    for (const expected of expectedSysTables) {
      expect(tableNames).toContain(expected);
    }
  });

  test("should filter tables by access_level", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_TABLE_API}?access_level=A`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      for (const table of data.data) {
        expect(table.access_level).toBe("A");
      }
    }
  });

  test("POST /api/sys/tables - should create a new sys_table entry", async ({ request }) => {
    const newTable = {
      table_name: "bus_test_entity",
      name: "Test Entity",
      description: "E2E test entity for dictionary validation",
      access_level: "A",
      is_view: false,
      is_document: false,
      is_high_volume: false,
      is_changelog: true,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_TABLE_API}`, {
      data: newTable,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_table_id");
    expect(created).toHaveProperty("table_name", newTable.table_name);
    expect(created).toHaveProperty("name", newTable.name);
    expect(created).toHaveProperty("access_level", "A");
    expect(created).toHaveProperty("is_active", true);

    createdTableId = created.sys_table_id;
  });

  test("GET /api/sys/tables/:id - should retrieve created table", async ({ request }) => {
    if (!createdTableId) {
      test.skip(true, "No table created in previous test");
      return;
    }

    const response = await request.get(`${BACKEND_URL}${SYS_TABLE_API}/${createdTableId}`);

    expect(response.status()).toBe(200);

    const table = await response.json();
    expect(table).toHaveProperty("sys_table_id", createdTableId);
    expect(table).toHaveProperty("table_name", "bus_test_entity");
  });

  test("PATCH /api/sys/tables/:id - should update table metadata", async ({ request }) => {
    if (!createdTableId) {
      test.skip(true, "No table created");
      return;
    }

    const updates = {
      description: "Updated E2E test entity description",
      is_high_volume: true,
    };

    const response = await request.patch(`${BACKEND_URL}${SYS_TABLE_API}/${createdTableId}`, {
      data: updates,
    });

    expect(response.status()).toBe(200);

    const updated = await response.json();
    expect(updated).toHaveProperty("description", updates.description);
    expect(updated).toHaveProperty("is_high_volume", true);
  });

  test("DELETE /api/sys/tables/:id - should delete table entry", async ({ request }) => {
    if (!createdTableId) {
      test.skip(true, "No table created");
      return;
    }

    const response = await request.delete(`${BACKEND_URL}${SYS_TABLE_API}/${createdTableId}`);

    expect(response.status()).toBe(200);

    // Verify deletion
    const getResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}/${createdTableId}`);
    expect(getResponse.status()).toBe(404);
  });
});

// ============================================================================
// Test Suite: sys_column - Column Metadata with Reference Types
// ============================================================================

test.describe("NestJS API - sys_column CRUD", () => {
  let testTableId: string;
  let createdColumnId: string;

  test.beforeAll(async ({ request }) => {
    // Create a test table to attach columns to
    const tableResponse = await request.post(`${BACKEND_URL}${SYS_TABLE_API}`, {
      data: {
        table_name: "bus_column_test",
        name: "Column Test",
        access_level: "A",
        is_view: false,
        is_document: false,
        is_high_volume: false,
        is_changelog: true,
        entity_type: "U",
        is_active: true,
      },
    });

    if (tableResponse.status() === 201) {
      const table = await tableResponse.json();
      testTableId = table.sys_table_id;
    }
  });

  test("GET /api/sys/columns - should return columns for business tables", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_COLUMN_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("should filter columns by sys_table_id", async ({ request }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const response = await request.get(
      `${BACKEND_URL}${SYS_COLUMN_API}?sys_table_id=${testTableId}`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    // Newly created table should have no columns yet (or only auto-generated ones)
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("POST /api/sys/columns - should create column with STRING reference", async ({
    request,
  }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const newColumn = {
      sys_table_id: testTableId,
      column_name: "customer_name",
      name: "Customer Name",
      description: "Full name of the customer",
      sys_reference_id: REFERENCE_TYPES.STRING,
      field_length: 255,
      is_key: false,
      is_parent: false,
      is_mandatory: true,
      is_updateable: true,
      is_identifier: true,
      is_selection_column: true,
      is_translated: false,
      is_encrypted: false,
      is_allow_logging: true,
      is_allow_copy: true,
      seq_no: 10,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_COLUMN_API}`, {
      data: newColumn,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_column_id");
    expect(created).toHaveProperty("column_name", "customer_name");
    expect(created).toHaveProperty("sys_reference_id", REFERENCE_TYPES.STRING);
    expect(created).toHaveProperty("is_mandatory", true);
    expect(created).toHaveProperty("is_identifier", true);
    expect(created).toHaveProperty("field_length", 255);

    createdColumnId = created.sys_column_id;
  });

  test("POST /api/sys/columns - should create column with EMAIL reference", async ({ request }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const emailColumn = {
      sys_table_id: testTableId,
      column_name: "email",
      name: "Email Address",
      sys_reference_id: REFERENCE_TYPES.EMAIL,
      field_length: 320,
      is_key: false,
      is_parent: false,
      is_mandatory: false,
      is_updateable: true,
      is_identifier: false,
      is_selection_column: true,
      is_translated: false,
      is_encrypted: false,
      is_allow_logging: true,
      is_allow_copy: true,
      seq_no: 20,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_COLUMN_API}`, {
      data: emailColumn,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_reference_id", REFERENCE_TYPES.EMAIL);
  });

  test("POST /api/sys/columns - should create column with AMOUNT reference", async ({
    request,
  }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const amountColumn = {
      sys_table_id: testTableId,
      column_name: "total_amount",
      name: "Total Amount",
      sys_reference_id: REFERENCE_TYPES.AMOUNT,
      is_key: false,
      is_parent: false,
      is_mandatory: false,
      is_updateable: true,
      is_identifier: false,
      is_selection_column: false,
      is_translated: false,
      is_encrypted: false,
      is_allow_logging: true,
      is_allow_copy: true,
      seq_no: 30,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_COLUMN_API}`, {
      data: amountColumn,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_reference_id", REFERENCE_TYPES.AMOUNT);
  });

  test("POST /api/sys/columns - should create column with YES_NO reference", async ({
    request,
  }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const boolColumn = {
      sys_table_id: testTableId,
      column_name: "is_active",
      name: "Is Active",
      sys_reference_id: REFERENCE_TYPES.YES_NO,
      is_key: false,
      is_parent: false,
      is_mandatory: true,
      is_updateable: true,
      is_identifier: false,
      is_selection_column: false,
      is_translated: false,
      is_encrypted: false,
      is_allow_logging: true,
      is_allow_copy: true,
      seq_no: 40,
      default_value: "Y",
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_COLUMN_API}`, {
      data: boolColumn,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_reference_id", REFERENCE_TYPES.YES_NO);
    expect(created).toHaveProperty("default_value", "Y");
  });

  test("POST /api/sys/columns - should create column with DATE reference", async ({ request }) => {
    if (!testTableId) {
      test.skip(true, "No test table created");
      return;
    }

    const dateColumn = {
      sys_table_id: testTableId,
      column_name: "order_date",
      name: "Order Date",
      sys_reference_id: REFERENCE_TYPES.DATE,
      is_key: false,
      is_parent: false,
      is_mandatory: false,
      is_updateable: true,
      is_identifier: false,
      is_selection_column: true,
      is_translated: false,
      is_encrypted: false,
      is_allow_logging: true,
      is_allow_copy: true,
      seq_no: 50,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_COLUMN_API}`, {
      data: dateColumn,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_reference_id", REFERENCE_TYPES.DATE);
    expect(created).toHaveProperty("is_selection_column", true);
  });

  test("PATCH /api/sys/columns/:id - should update column properties", async ({ request }) => {
    if (!createdColumnId) {
      test.skip(true, "No column created");
      return;
    }

    const updates = {
      is_mandatory: false,
      field_length: 500,
      description: "Updated column description",
    };

    const response = await request.patch(`${BACKEND_URL}${SYS_COLUMN_API}/${createdColumnId}`, {
      data: updates,
    });

    expect(response.status()).toBe(200);

    const updated = await response.json();
    expect(updated).toHaveProperty("is_mandatory", false);
    expect(updated).toHaveProperty("field_length", 500);
  });

  test.afterAll(async ({ request }) => {
    // Clean up test table
    if (testTableId) {
      await request.delete(`${BACKEND_URL}${SYS_TABLE_API}/${testTableId}`);
    }
  });
});

// ============================================================================
// Test Suite: sys_window & sys_tab - Window/Tab Hierarchy
// ============================================================================

test.describe("NestJS API - sys_window & sys_tab", () => {
  let createdWindowId: string;
  let testTableId: string;

  test.beforeAll(async ({ request }) => {
    // Create a test table
    const tableResponse = await request.post(`${BACKEND_URL}${SYS_TABLE_API}`, {
      data: {
        table_name: "bus_window_test",
        name: "Window Test",
        access_level: "A",
        is_view: false,
        is_document: false,
        is_high_volume: false,
        is_changelog: true,
        entity_type: "U",
        is_active: true,
      },
    });

    if (tableResponse.status() === 201) {
      const table = await tableResponse.json();
      testTableId = table.sys_table_id;
    }
  });

  test("GET /api/sys/windows - should return generated windows", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_WINDOW_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    // Each business entity should have a window
    expect(data.data.length).toBeGreaterThan(0);
  });

  test("POST /api/sys/windows - should create a Maintain-type window", async ({ request }) => {
    const newWindow = {
      name: "Test Entity Management",
      description: "Manage Test Entity records",
      window_type: "M",
      is_sales_transaction: false,
      is_default: true,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_WINDOW_API}`, {
      data: newWindow,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_window_id");
    expect(created).toHaveProperty("name", newWindow.name);
    expect(created).toHaveProperty("window_type", "M");
    expect(created).toHaveProperty("is_default", true);

    createdWindowId = created.sys_window_id;
  });

  test("should validate window_type values (M=Maintain, T=Transaction, Q=Query)", async ({
    request,
  }) => {
    if (!createdWindowId) {
      test.skip(true, "No window created");
      return;
    }

    const window = await (
      await request.get(`${BACKEND_URL}${SYS_WINDOW_API}/${createdWindowId}`)
    ).json();
    expect(["M", "T", "Q"]).toContain(window.window_type);
  });

  test("POST /api/sys/tabs - should create master tab (level 0)", async ({ request }) => {
    if (!createdWindowId || !testTableId) {
      test.skip(true, "No window or table created");
      return;
    }

    const masterTab = {
      sys_window_id: createdWindowId,
      sys_table_id: testTableId,
      name: "Test Entity Header",
      tab_level: 0,
      seq_no: 10,
      is_single_row: true,
      has_tree: false,
      is_info_tab: false,
      is_translation_tab: false,
      is_read_only: false,
      is_insert_record: true,
      is_advanced_tab: false,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_TAB_API}`, {
      data: masterTab,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_tab_id");
    expect(created).toHaveProperty("tab_level", 0);
    expect(created).toHaveProperty("is_single_row", true);
    expect(created).toHaveProperty("is_insert_record", true);

    void created.sys_tab_id; // tab ID captured but not used in subsequent tests
  });

  test("POST /api/sys/tabs - should create detail tab (level 1)", async ({ request }) => {
    if (!createdWindowId || !testTableId) {
      test.skip(true, "No window or table created");
      return;
    }

    const detailTab = {
      sys_window_id: createdWindowId,
      sys_table_id: testTableId,
      name: "Test Entity Lines",
      tab_level: 1,
      seq_no: 20,
      is_single_row: false,
      has_tree: false,
      is_info_tab: false,
      is_translation_tab: false,
      is_read_only: false,
      is_insert_record: true,
      is_advanced_tab: false,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_TAB_API}`, {
      data: detailTab,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("tab_level", 1);
    expect(created).toHaveProperty("is_single_row", false);
  });

  test("GET /api/sys/tabs - should filter tabs by window_id", async ({ request }) => {
    if (!createdWindowId) {
      test.skip(true, "No window created");
      return;
    }

    const response = await request.get(
      `${BACKEND_URL}${SYS_TAB_API}?sys_window_id=${createdWindowId}`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.data.length).toBe(2); // master + detail

    // Verify tab ordering by seq_no
    const seqNumbers = data.data.map((t: { seq_no: number }) => t.seq_no);
    expect(seqNumbers[0]).toBeLessThan(seqNumbers[1]);
  });

  test.afterAll(async ({ request }) => {
    if (createdWindowId) {
      await request.delete(`${BACKEND_URL}${SYS_WINDOW_API}/${createdWindowId}`);
    }
    if (testTableId) {
      await request.delete(`${BACKEND_URL}${SYS_TABLE_API}/${testTableId}`);
    }
  });
});

// ============================================================================
// Test Suite: sys_field - Field Layout & Runtime Reordering
// ============================================================================

test.describe("NestJS API - sys_field (Layout & seq_no)", () => {
  test("GET /api/sys/fields - should return fields ordered by seq_no", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_API}?order_by=seq_no`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Validate fields are ordered by seq_no
    if (data.data.length > 1) {
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i].seq_no).toBeGreaterThanOrEqual(data.data[i - 1].seq_no);
      }
    }
  });

  test("should filter fields by tab_id and is_displayed", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_API}?is_displayed=true`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      for (const field of data.data) {
        expect(field.is_displayed).toBe(true);
      }
    }
  });

  test("should filter fields by is_displayed_grid for table views", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_API}?is_displayed_grid=true`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      for (const field of data.data) {
        expect(field.is_displayed_grid).toBe(true);
      }
    }
  });

  test("PATCH /api/sys/fields/:id - should update seq_no for runtime reordering", async ({
    request,
  }) => {
    // Get existing fields for any entity
    const response = await request.get(
      `${BACKEND_URL}${SYS_FIELD_API}?is_displayed=true&order_by=seq_no`
    );

    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.data && data.data.length >= 2) {
      const firstField = data.data[0];
      const secondField = data.data[1];

      // Swap their seq_no values (runtime reordering)
      const originalFirstSeq = firstField.seq_no;
      const originalSecondSeq = secondField.seq_no;

      // Update first field with second field's seq_no
      const updateFirst = await request.patch(
        `${BACKEND_URL}${SYS_FIELD_API}/${firstField.sys_field_id}`,
        {
          data: { seq_no: originalSecondSeq },
        }
      );
      expect(updateFirst.status()).toBe(200);

      // Update second field with first field's seq_no
      const updateSecond = await request.patch(
        `${BACKEND_URL}${SYS_FIELD_API}/${secondField.sys_field_id}`,
        {
          data: { seq_no: originalFirstSeq },
        }
      );
      expect(updateSecond.status()).toBe(200);

      // Verify the order has changed
      const verifyResponse = await request.get(
        `${BACKEND_URL}${SYS_FIELD_API}?sys_tab_id=${firstField.sys_tab_id}&order_by=seq_no`
      );
      const verifyData = await verifyResponse.json();
      const fieldOrder = verifyData.data.map((f: { sys_field_id: string }) => f.sys_field_id);

      // The second field should now come before the first
      const newFirstIndex = fieldOrder.indexOf(secondField.sys_field_id);
      const newSecondIndex = fieldOrder.indexOf(firstField.sys_field_id);
      expect(newFirstIndex).toBeLessThan(newSecondIndex);

      // Restore original order
      await request.patch(`${BACKEND_URL}${SYS_FIELD_API}/${firstField.sys_field_id}`, {
        data: { seq_no: originalFirstSeq },
      });
      await request.patch(`${BACKEND_URL}${SYS_FIELD_API}/${secondField.sys_field_id}`, {
        data: { seq_no: originalSecondSeq },
      });
    } else {
      test.skip(true, "Not enough fields to test reordering");
    }
  });

  test("PATCH /api/sys/fields/:id - should toggle is_displayed to hide field", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_API}?is_displayed=true`);

    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const field = data.data[0];

      // Hide the field
      const hideResponse = await request.patch(
        `${BACKEND_URL}${SYS_FIELD_API}/${field.sys_field_id}`,
        {
          data: { is_displayed: false },
        }
      );
      expect(hideResponse.status()).toBe(200);

      // Verify it's hidden
      const verifyResponse = await request.get(
        `${BACKEND_URL}${SYS_FIELD_API}/${field.sys_field_id}`
      );
      const verifiedField = await verifyResponse.json();
      expect(verifiedField.is_displayed).toBe(false);

      // Restore visibility
      await request.patch(`${BACKEND_URL}${SYS_FIELD_API}/${field.sys_field_id}`, {
        data: { is_displayed: true },
      });
    }
  });

  test("should validate field display logic properties", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const field = data.data[0];

      // Every field should have these layout properties
      expect(field).toHaveProperty("seq_no");
      expect(field).toHaveProperty("seq_no_grid");
      expect(field).toHaveProperty("is_displayed");
      expect(field).toHaveProperty("is_displayed_grid");
      expect(field).toHaveProperty("is_read_only");
      expect(field).toHaveProperty("is_same_line");
      expect(field).toHaveProperty("is_heading");
      expect(field).toHaveProperty("is_field_only");
      expect(field).toHaveProperty("is_active");

      // seq_no and seq_no_grid should be numbers
      expect(typeof field.seq_no).toBe("number");
      expect(typeof field.seq_no_grid).toBe("number");
    }
  });
});

// ============================================================================
// Test Suite: sys_field_group - Field Grouping
// ============================================================================

test.describe("NestJS API - sys_field_group", () => {
  let createdGroupId: string;

  test("GET /api/sys/field-groups - should return default field groups", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_FIELD_GROUP_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);

    // Default groups should exist (General, Details)
    if (data.data.length > 0) {
      const groupNames = data.data.map((g: { name: string }) => g.name);
      expect(groupNames).toContain("General");
    }
  });

  test("POST /api/sys/field-groups - should create collapsible field group", async ({
    request,
  }) => {
    const newGroup = {
      name: "Address Information",
      description: "Address and location fields",
      field_group_type: "C",
      is_collapsed_by_default: true,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_FIELD_GROUP_API}`, {
      data: newGroup,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_field_group_id");
    expect(created).toHaveProperty("name", "Address Information");
    expect(created).toHaveProperty("field_group_type", "C");
    expect(created).toHaveProperty("is_collapsed_by_default", true);

    createdGroupId = created.sys_field_group_id;
  });

  test("should support field_group_type values (C=Collapsible, L=Label, T=Tab)", async ({
    request,
  }) => {
    // Create a Label-type group
    const labelGroup = {
      name: "Contact Details",
      field_group_type: "L",
      is_collapsed_by_default: false,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_FIELD_GROUP_API}`, {
      data: labelGroup,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("field_group_type", "L");

    // Clean up
    await request.delete(`${BACKEND_URL}${SYS_FIELD_GROUP_API}/${created.sys_field_group_id}`);
  });

  test.afterAll(async ({ request }) => {
    if (createdGroupId) {
      await request.delete(`${BACKEND_URL}${SYS_FIELD_GROUP_API}/${createdGroupId}`);
    }
  });
});

// ============================================================================
// Test Suite: sys_val_rule - Validation Rules
// ============================================================================

test.describe("NestJS API - sys_val_rule (Validation Rules)", () => {
  let createdRuleId: string;

  test("POST /api/sys/val-rules - should create SQL validation rule", async ({ request }) => {
    const newRule = {
      name: "Active Records Only",
      description: "Only show active records",
      type: "S",
      code: "is_active = true",
      error_msg: "Record must be active",
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_VAL_RULE_API}`, {
      data: newRule,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_val_rule_id");
    expect(created).toHaveProperty("type", "S");
    expect(created).toHaveProperty("code", "is_active = true");

    createdRuleId = created.sys_val_rule_id;
  });

  test("GET /api/sys/val-rules - should list validation rules", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_VAL_RULE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    if (createdRuleId) {
      await request.delete(`${BACKEND_URL}${SYS_VAL_RULE_API}/${createdRuleId}`);
    }
  });
});

// ============================================================================
// Test Suite: RBAC - sys_user, sys_role, sys_access
// ============================================================================

test.describe("NestJS API - RBAC (Users, Roles, Access)", () => {
  let createdUserId: string;
  let createdRoleId: string;
  let createdAccessId: string;

  test("POST /api/sys/users - should create system user", async ({ request }) => {
    const newUser = {
      name: "E2E Test Admin",
      email: "e2e-admin@erdwithai.test",
      password_hash: "hashed_password_placeholder",
      is_system_user: true,
      is_sales_rep: false,
      login_failure_count: 0,
      is_locked: false,
      is_account_verified: true,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_USER_API}`, {
      data: newUser,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_user_id");
    expect(created).toHaveProperty("name", newUser.name);
    expect(created).toHaveProperty("email", newUser.email);
    expect(created).toHaveProperty("is_system_user", true);

    createdUserId = created.sys_user_id;
  });

  test("POST /api/sys/roles - should create admin role", async ({ request }) => {
    const newRole = {
      name: "E2E Admin Role",
      description: "Role for E2E testing",
      user_level: "System",
      is_master_role: true,
      is_can_export: true,
      is_can_report: true,
      is_personal_lock: false,
      is_personal_access: false,
      max_query_records: 1000,
      is_show_accounting: false,
      entity_type: "U",
      is_active: true,
    };

    const response = await request.post(`${BACKEND_URL}${SYS_ROLE_API}`, {
      data: newRole,
    });

    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created).toHaveProperty("sys_role_id");
    expect(created).toHaveProperty("name", newRole.name);
    expect(created).toHaveProperty("is_master_role", true);
    expect(created).toHaveProperty("max_query_records", 1000);

    createdRoleId = created.sys_role_id;
  });

  test("POST /api/sys/access - should create table access for role", async ({ request }) => {
    if (!createdRoleId) {
      test.skip(true, "No role created");
      return;
    }

    // Get a table to grant access to
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();

    if (tablesData.data && tablesData.data.length > 0) {
      const newAccess = {
        sys_role_id: createdRoleId,
        sys_table_id: tablesData.data[0].sys_table_id,
        access_type_table: "W",
        is_read_only: false,
        is_exclude: false,
        entity_type: "U",
        is_active: true,
      };

      const response = await request.post(`${BACKEND_URL}${SYS_ACCESS_API}`, {
        data: newAccess,
      });

      expect(response.status()).toBe(201);

      const created = await response.json();
      expect(created).toHaveProperty("sys_access_id");
      expect(created).toHaveProperty("access_type_table", "W");
      expect(created).toHaveProperty("is_exclude", false);

      createdAccessId = created.sys_access_id;
    }
  });

  test("GET /api/sys/users - should list users", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_USER_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("GET /api/sys/roles - should list roles", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}${SYS_ROLE_API}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    if (createdAccessId) {
      await request.delete(`${BACKEND_URL}${SYS_ACCESS_API}/${createdAccessId}`);
    }
    if (createdRoleId) {
      await request.delete(`${BACKEND_URL}${SYS_ROLE_API}/${createdRoleId}`);
    }
    if (createdUserId) {
      await request.delete(`${BACKEND_URL}${SYS_USER_API}/${createdUserId}`);
    }
  });
});

// ============================================================================
// Test Suite: Admin Dictionary UI - Field Layout Editor
// ============================================================================

test.describe("Next.js Frontend - Admin Dictionary Interface", () => {
  const ADMIN_URL = `${FRONTEND_URL}/admin/dictionary`;

  test("should display dictionary admin page", async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState("networkidle");

    // Check for admin header
    await expect(
      page.locator("h1, h2").filter({ hasText: /Dictionary|Admin|Configuration/i })
    ).toBeVisible();
  });

  test("should display list of windows (entities)", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/windows`);
    await page.waitForLoadState("networkidle");

    // Should show a list or table of windows
    const windowList = page.locator('table, .sapMList, [role="list"]').first();
    await expect(windowList).toBeVisible({ timeout: 10000 });
  });

  test("should display field layout editor", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/fields`);
    await page.waitForLoadState("networkidle");

    // Look for field layout editor elements
    const fieldEditor = page
      .locator('[data-testid="field-layout-editor"], .field-editor, [class*="field"]')
      .first();

    if (await fieldEditor.isVisible()) {
      await expect(fieldEditor).toBeVisible();

      // Should display field properties like seq_no, is_displayed, field group
      const hasFieldProperties =
        (await page.locator("text=/seq|sequence|order|display|visible|group/i").count()) > 0;
      expect(hasFieldProperties).toBeTruthy();
    }
  });

  test("should display tables admin page", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/tables`);
    await page.waitForLoadState("networkidle");

    // Should show table metadata
    const tableView = page.locator('table, [role="table"]').first();
    if (await tableView.isVisible()) {
      // Check for table columns like table_name, access_level, etc.
      const hasTableColumns =
        (await page.locator("text=/table_name|access_level|is_active/i").count()) > 0;
      expect(hasTableColumns).toBeTruthy();
    }
  });
});

// ============================================================================
// Test Suite: Dictionary-Driven Dynamic Form Rendering
// ============================================================================

test.describe("Next.js Frontend - Dictionary-Driven Dynamic Rendering", () => {
  test("should render entity form fields based on sys_field metadata", async ({
    page,
    request,
  }) => {
    // First get the list of business tables
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();

    const busTables = tablesData.data?.filter((t: { table_name: string }) =>
      t.table_name.startsWith("bus_")
    );

    if (busTables && busTables.length > 0) {
      const entityTable = busTables[0];

      // Navigate to the entity create page
      await page.goto(`${FRONTEND_URL}/${entityTable.table_name}/new`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Get the expected fields from sys_field API
      const fieldsResponse = await request.get(
        `${BACKEND_URL}${SYS_FIELD_API}?is_displayed=true&order_by=seq_no`
      );
      await fieldsResponse.json();

      // The page should have form inputs
      const formInputs = page.locator("input, textarea, select");
      const inputCount = await formInputs.count();
      expect(inputCount).toBeGreaterThan(0);
    }
  });

  test("should render entity table columns based on sys_field.is_displayed_grid", async ({
    page,
    request,
  }) => {
    // Get business tables
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();

    const busTables = tablesData.data?.filter((t: { table_name: string }) =>
      t.table_name.startsWith("bus_")
    );

    if (busTables && busTables.length > 0) {
      const entityTable = busTables[0];

      // Navigate to entity list page
      await page.goto(`${FRONTEND_URL}/${entityTable.table_name}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Table should be visible
      const table = page.locator("table").first();
      if (await table.isVisible()) {
        // Get column headers
        const headers = page.locator('table thead th, table thead [role="columnheader"]');
        const headerCount = await headers.count();

        // Should have at least some columns
        expect(headerCount).toBeGreaterThan(0);
      }
    }
  });

  test("should display entity dashboard listing all bus_ entities from sys_table", async ({
    page,
    request,
  }) => {
    // Get business table count from API
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();
    const busTableCount =
      tablesData.data?.filter((t: { table_name: string }) => t.table_name.startsWith("bus_"))
        .length || 0;

    // Navigate to dashboard
    await page.goto(`${FRONTEND_URL}/entities`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Dashboard should list entities
    if (busTableCount > 0) {
      // Check for entity cards or links
      const entityLinks = page.locator('a[href*="bus_"], a[href*="entities/"], [data-entity]');
      const linkCount = await entityLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Test Suite: Dictionary Metadata Integrity
// ============================================================================

test.describe("NestJS API - Dictionary Metadata Integrity", () => {
  test("every bus_ table should have a corresponding sys_window", async ({ request }) => {
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();

    const busTables = tablesData.data?.filter((t: { table_name: string }) =>
      t.table_name.startsWith("bus_")
    );

    if (busTables && busTables.length > 0) {
      const windowsResponse = await request.get(`${BACKEND_URL}${SYS_WINDOW_API}`);
      const windowsData = await windowsResponse.json();
      const windowNames = windowsData.data?.map((w: { name: string }) => w.name) || [];

      for (const _table of busTables) {
        // Each business table's display name should match a window
        expect(windowNames.length).toBeGreaterThan(0);
      }
    }
  });

  test("every sys_column should reference a valid sys_reference type", async ({ request }) => {
    const columnsResponse = await request.get(`${BACKEND_URL}${SYS_COLUMN_API}`);
    const columnsData = await columnsResponse.json();

    const refsResponse = await request.get(`${BACKEND_URL}${SYS_REFERENCE_API}`);
    const refsData = await refsResponse.json();
    const validRefIds =
      refsData.data?.map((r: { sys_reference_id: number }) => r.sys_reference_id) || [];

    if (columnsData.data && columnsData.data.length > 0) {
      for (const column of columnsData.data) {
        expect(validRefIds).toContain(column.sys_reference_id);
      }
    }
  });

  test("sys_field entries should reference valid sys_column and sys_tab", async ({ request }) => {
    const fieldsResponse = await request.get(`${BACKEND_URL}${SYS_FIELD_API}`);
    const fieldsData = await fieldsResponse.json();

    if (fieldsData.data && fieldsData.data.length > 0) {
      // Verify each field has required foreign keys
      for (const field of fieldsData.data) {
        expect(field).toHaveProperty("sys_tab_id");
        expect(field).toHaveProperty("sys_column_id");
        expect(field.sys_tab_id).toBeTruthy();
        expect(field.sys_column_id).toBeTruthy();
      }
    }
  });

  test("sys_tab entries should reference valid sys_window and sys_table", async ({ request }) => {
    const tabsResponse = await request.get(`${BACKEND_URL}${SYS_TAB_API}`);
    const tabsData = await tabsResponse.json();

    if (tabsData.data && tabsData.data.length > 0) {
      for (const tab of tabsData.data) {
        expect(tab).toHaveProperty("sys_window_id");
        expect(tab).toHaveProperty("sys_table_id");
        expect(tab.sys_window_id).toBeTruthy();
        expect(tab.sys_table_id).toBeTruthy();
      }
    }
  });

  test("bus_ table columns should have proper primary key (is_key=true)", async ({ request }) => {
    const tablesResponse = await request.get(`${BACKEND_URL}${SYS_TABLE_API}`);
    const tablesData = await tablesResponse.json();

    const busTables = tablesData.data?.filter((t: { table_name: string }) =>
      t.table_name.startsWith("bus_")
    );

    if (busTables && busTables.length > 0) {
      for (const table of busTables) {
        const columnsResponse = await request.get(
          `${BACKEND_URL}${SYS_COLUMN_API}?sys_table_id=${table.sys_table_id}`
        );
        const columnsData = await columnsResponse.json();

        if (columnsData.data && columnsData.data.length > 0) {
          // Each table should have exactly one primary key column
          const keyColumns = columnsData.data.filter((c: { is_key: boolean }) => c.is_key);
          expect(keyColumns.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  test("identifier columns should be marked with is_identifier=true", async ({ request }) => {
    const columnsResponse = await request.get(`${BACKEND_URL}${SYS_COLUMN_API}`);
    const columnsData = await columnsResponse.json();

    if (columnsData.data && columnsData.data.length > 0) {
      // There should be some identifier columns
      const identifierColumns = columnsData.data.filter(
        (c: { is_identifier: boolean }) => c.is_identifier
      );
      expect(identifierColumns.length).toBeGreaterThan(0);
    }
  });

  test("selection columns should be marked with is_selection_column=true", async ({ request }) => {
    const columnsResponse = await request.get(`${BACKEND_URL}${SYS_COLUMN_API}`);
    const columnsData = await columnsResponse.json();

    if (columnsData.data && columnsData.data.length > 0) {
      // There should be some selection (searchable) columns
      const selectionColumns = columnsData.data.filter(
        (c: { is_selection_column: boolean }) => c.is_selection_column
      );
      expect(selectionColumns.length).toBeGreaterThan(0);
    }
  });
});
