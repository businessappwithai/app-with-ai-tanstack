/**
 * Test Setup for OData V4 Server Tests
 * Uses jaystack/odata-v4-server test utilities
 */

import { closeDatabase, getKnex, initializeDatabase } from "../src/database/connection";

// Global test setup
beforeAll(async () => {
  // Initialize database connection
  await initializeDatabase();

  // Run migrations
  const db = getKnex();
  await db.migrate.latest();

  // Seed test data
  await db.seed.run();
});

// Global test teardown
afterAll(async () => {
  // Clean up database
  const db = getKnex();
  await db.migrate.rollback();

  // Close connection
  await closeDatabase();
});

// Reset database state between tests
beforeEach(async () => {
  const db = getKnex();

  // Clear all business tables
  const tables = await db("information_schema.tables")
    .where("table_schema", "public")
    .where("table_name", "like", "bus_%")
    .pluck("table_name");

  for (const table of tables) {
    await db.raw(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  // Re-seed test data
  await db.seed.run();
});

/**
 * Helper to create test entity data
 */
export function createTestEntity(overrides: any = {}) {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to wait for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
