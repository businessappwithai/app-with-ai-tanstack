/**
 * Server Class Generator
 * Generates the ODataServer class with all controller decorators applied
 */

import * as fs from "fs";
import * as path from "path";
import { closeDatabase, getKnex, initializeDatabase } from "./database/connection";
import { getBusinessTables } from "./utils/dynamic-schema";

async function generateServerClass() {
  console.log("🔧 Generating ODataServer class with controller decorators...\n");

  // Initialize database
  await initializeDatabase();
  const db = getKnex();

  // Get all business tables
  const tables = await getBusinessTables(db);
  console.log(`Found ${tables.length} entities\n`);

  // Generate import statements for all controllers
  const imports = tables
    .map(
      (t) =>
        `import { ${t.entityName}Controller } from './controllers/generated/${t.entityName.toLowerCase()}.controller';`
    )
    .join("\n");

  // Generate @odata.controller decorators
  const decorators = tables
    .map((t) => `@odata.controller(${t.entityName}Controller, true)`)
    .join("\n");

  // Generate the server class file
  const serverCode = `/**
 * OData V4 Server Entry Point - jaystack/odata-v4-server Implementation
 *
 *  OData V4 Backend - TypeScript
 * Uses jaystack/odata-v4-server framework for OData V4 protocol compliance
 * All ${tables.length} bus_* and sys_* tables are automatically exposed as OData entities
 *
 * Auto-generated: ${new Date().toISOString()}
 */

import 'reflect-metadata';
import 'dotenv/config';
import { ODataServer, odata } from 'odata-v4-server';
import { initializeDatabase, closeDatabase } from './database/connection';

// Import all generated controllers
${imports}

/**
 *  OData V4 Server
 * All controllers registered via @odata.controller decorators
 */
@odata.cors
${decorators}
export class ODataServer extends ODataServer {}

/**
 * Bootstrap the server
 */
async function bootstrap() {
  console.log('Starting  OData V4 Server (jaystack/odata-v4-server)...\\n');

  // Initialize database connection
  await initializeDatabase();

  // Start the server
  const port = parseInt(process.env.PORT || '3003', 10);
  const basePath = '/odata';

  console.log('Registered ${tables.length} OData controllers');
  console.log('');

  ODataServer.create(basePath, port);

  console.log('');
  console.log(\\\`🚀 OData V4 Server running at http://localhost:\\\${port}\\\`);
  console.log(\\\`   Service root: http://localhost:\\\${port}\\\${basePath}\\\`);
  console.log(\\\`   $metadata:    http://localhost:\\\${port}\\\${basePath}/$metadata\\\`);
  console.log(\\\`   Environment:  \\\${process.env.NODE_ENV || 'development'}\\\`);
  console.log('');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing server');
    await closeDatabase();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\\nSIGINT signal received: closing server');
    await closeDatabase();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  console.error(err.stack);
  process.exit(1);
});
`;

  // Write the server file
  const serverPath = path.join(__dirname, "server.ts");
  fs.writeFileSync(serverPath, serverCode, "utf-8");
  console.log(`✅ Generated: server.ts`);
  console.log(`📁 Output: ${serverPath}\n`);

  await closeDatabase();
  process.exit(0);
}

generateServerClass().catch((err) => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
