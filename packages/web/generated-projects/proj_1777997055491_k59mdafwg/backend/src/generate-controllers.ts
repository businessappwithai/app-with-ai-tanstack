/**
 * Generate OData V4 Controllers using jaystack/odata-v4-server
 *
 * This script dynamically generates controller classes for all database entities.
 * Run: ts-node src/generate-controllers.ts
 *
 * Generated: 2026-05-06T11:42:08.723Z
 */

import * as fs from "fs";
import * as path from "path";
import { closeDatabase, getKnex, initializeDatabase } from "./database/connection";
import { type DatabaseTable, getBusinessTables } from "./utils/dynamic-schema";

// Generate controller class code for a single entity
function generateControllerClass(table: DatabaseTable): string {
  const { entityName, entitySetName, tableName, primaryKey } = table;

  return `import { ODataController, odata, Edm } from 'odata-v4-server';
import { getKnex } from '../../database/connection';
import { parseFilter } from '../../utils/odata-filter';
import { transformDatesInResults, transformSingleResult } from '../../utils/odata-formatter';
import crypto from 'crypto';

// Table constants (closure to avoid 'this' context issues)
const TABLE_NAME = '\${tableName}';
const PRIMARY_KEY = '\${primaryKey}';

/**
 * Helper: Get table columns from information schema
 */
async function getTableColumns(): Promise<any[]> {
  const db = getKnex();
  const dbType = (db as any).client?.config?.client === 'sqlite3' ? 'sqlite' : 'postgres';

  if (dbType === 'sqlite') {
    const columns = await db.raw(\\\`PRAGMA table_info('\\&dollar;{TABLE_NAME}')\\\`);
    return columns || [];
  } else {
    const columns = await db('information_schema.columns')
      .select('column_name', 'data_type', 'is_nullable')
      .where('table_schema', 'public')
      .where('table_name', TABLE_NAME)
      .orderBy('ordinal_position');
    return columns;
  }
}

/**
 * Helper: Create property name mapping for OData filter parsing
 */
function createPropertyNameMap(columns: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const col of columns) {
    const colName = col.column_name || col.name;
    map.set(colName, colName);

    // Also map PascalCase version
    const pascalCase = colName
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    map.set(pascalCase, colName);
  }
  return map;
}

/**
 * Entity type class for \${entityName}
 * This defines the OData entity structure
 */
export class \${entityName} {
  @Edm.String
  @Edm.Key
  \${primaryKey}: string;
}

/**
 * \${entityName} Controller
 * OData EntitySet: \${entitySetName}
 * Database Table: \${tableName}
 */
@odata.type(\${entityName})
export class \${entityName}Controller extends ODataController {
  /**
   * GET /\${entitySetName}
   * Returns all \${entityName} records with OData query support
   */
  @odata.GET
  async find(@odata.query $query: any): Promise<any[]> {
    const db = getKnex();
    let builder = db(TABLE_NAME);

    // Apply $filter if present
    if ($query && $query.$filter) {
      try {
        const columns = await getTableColumns();
        const propertyNameMap = createPropertyNameMap(columns);
        const filterCondition = parseFilter($query.$filter, columns, propertyNameMap);
        if (filterCondition.sql) {
          builder = builder.whereRaw(filterCondition.sql, filterCondition.params);
        }
      } catch (err) {
        console.error('Filter parsing error:', err);
        // Continue without filter on error
      }
    }

    // Default ordering by created_at if exists
    try {
      builder = builder.orderBy('created_at', 'desc');
    } catch {
      // Table might not have created_at, skip ordering
    }

    const results = await builder.select('*');

    // Transform dates to ISO strings
    const columns = await getTableColumns();
    return transformDatesInResults(results, columns);
  }

  /**
   * GET /\${entitySetName}(:id)
   * Returns a single \${entityName} record by primary key
   */
  @odata.GET
  async findOne(@odata.key key: string, @odata.query $query: any): Promise<any> {
    const db = getKnex();

    const result = await db(TABLE_NAME)
      .where(PRIMARY_KEY, key)
      .first();

    if (!result) {
      throw new Error('Entity not found');
    }

    // Transform dates to ISO strings
    const columns = await getTableColumns();
    return transformSingleResult(result, columns);
  }

  /**
   * POST /\${entitySetName}
   * Creates a new \${entityName} record
   */
  @odata.POST
  async insert(@odata.body data: any): Promise<any> {
    const db = getKnex();

    // Generate UUID for id if not provided
    if (!data[PRIMARY_KEY]) {
      data[PRIMARY_KEY] = crypto.randomUUID();
    }

    // Add timestamps if columns exist
    try {
      data.created_at = new Date().toISOString();
      data.updated_at = new Date().toISOString();
    } catch {
      // Columns might not exist, skip
    }

    await db(TABLE_NAME).insert(data);

    // Fetch the created record
    const result = await db(TABLE_NAME)
      .where(PRIMARY_KEY, data[PRIMARY_KEY])
      .first();

    // Transform dates to ISO strings
    const columns = await getTableColumns();
    return transformSingleResult(result, columns);
  }

  /**
   * PATCH /\${entitySetName}(:id)
   * Updates an existing \${entityName} record
   */
  @odata.PATCH
  async update(@odata.key key: string, @odata.body delta: any): Promise<any> {
    const db = getKnex();

    // Update timestamp if column exists
    try {
      delta.updated_at = new Date().toISOString();
    } catch {
      // Column might not exist, skip
    }

    await db(TABLE_NAME)
      .where(PRIMARY_KEY, key)
      .update(delta);

    // Fetch the updated record
    const result = await db(TABLE_NAME)
      .where(PRIMARY_KEY, key)
      .first();

    if (!result) {
      throw new Error('Entity not found');
    }

    // Transform dates to ISO strings
    const columns = await getTableColumns();
    return transformSingleResult(result, columns);
  }

  /**
   * DELETE /\${entitySetName}(:id)
   * Deletes a \${entityName} record
   */
  @odata.DELETE
  async remove(@odata.key key: string): Promise<void> {
    const db = getKnex();

    await db(TABLE_NAME)
      .where(PRIMARY_KEY, key)
      .del();
  }
}
`;
}

// Generate index file that exports all controllers
function generateIndexFile(tables: DatabaseTable[]): string {
  const exports = tables
    .map((t) => `export * from './$\{t.entityName.toLowerCase()}.controller';`)
    .join("\\n");

  return `/**
 * Auto-generated controller index
 * Generated: $\{new Date().toISOString()}
 */

$\{exports}
`;
}

// Main generation logic
async function main() {
  console.log("🔧 Generating OData V4 Controllers...\\n");

  // Initialize database
  await initializeDatabase();
  const db = getKnex();

  // Get all business tables
  const tables = await getBusinessTables(db);
  console.log(`Found $\{tables.length} entities to generate\\n`);

  // Create controllers directory
  const controllersDir = path.join(__dirname, "controllers", "generated");
  if (!fs.existsSync(controllersDir)) {
    fs.mkdirSync(controllersDir, { recursive: true });
  }

  // Generate each controller
  for (const table of tables) {
    const controllerCode = generateControllerClass(table);
    const fileName = `$\{table.entityName.toLowerCase()}.controller.ts`;
    const filePath = path.join(controllersDir, fileName);

    fs.writeFileSync(filePath, controllerCode, "utf-8");
    console.log(`✅ Generated: $\{fileName}`);
  }

  // Generate index file
  const indexCode = generateIndexFile(tables);
  const indexPath = path.join(controllersDir, "index.ts");
  fs.writeFileSync(indexPath, indexCode, "utf-8");
  console.log(`✅ Generated: index.ts\\n`);

  console.log(`🎉 Successfully generated $\{tables.length} controllers!`);
  console.log(`📁 Output: $\{controllersDir}\\n`);

  await closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
