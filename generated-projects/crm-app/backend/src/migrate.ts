/**
 * Kysely Migration Runner
 *
 * Run with: bun run src/migrate.ts [up|down|latest|rollback]
 * Generated: 2026-05-12T11:57:03.529Z
 */

import * as path from 'path';
import * as fs from 'fs';
import { Kysely, Migrator, FileMigrationProvider, PostgresDialect, SqliteDialect } from 'kysely';
import 'dotenv/config';

const dbClient = process.env.DATABASE_CLIENT ?? 'pg';

async function createDialect(): Promise<PostgresDialect | SqliteDialect> {
  if (dbClient === 'better-sqlite3') {
    // Use Bun's native SQLite support
    const { Database } = await import('bun:sqlite');
    const dbPath = process.env.DATABASE_FILENAME ?? './data/app.db';
    // Ensure data directory exists
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    return new SqliteDialect({ database: new Database(dbPath) as any });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg');
    return new PostgresDialect({
      pool: new Pool({
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: Number(process.env.DATABASE_PORT ?? 5432),
        user: process.env.DATABASE_USER ?? 'postgres',
        password: process.env.DATABASE_PASSWORD ?? '',
        database: process.env.DATABASE_NAME ?? 'crm-app',
      }),
    });
  }
}

(async () => {
  const dialect = await createDialect();
  const db = new Kysely<any>({ dialect });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: {
        readdir: (dir: string) => fs.promises.readdir(dir),
      },
      path,
      // @ts-ignore - import.meta.dir is supported in Bun runtime
      migrationFolder: path.join(import.meta.dir, 'migrations'),
    }),
  });

  const command = process.argv[2] ?? 'latest';

  let result: { error?: unknown; results?: any[] };

  if (command === 'down' || command === 'rollback') {
    result = await migrator.migrateDown();
  } else {
    result = await migrator.migrateToLatest();
  }

  for (const r of result.results ?? []) {
    if (r.status === 'Success') {
      console.log(`✓ migration "${r.migrationName}" executed successfully`);
    } else if (r.status === 'Error') {
      console.error(`✗ migration "${r.migrationName}" failed`);
    }
  }

  if (result.error) {
    console.error('Migration failed:', result.error);
    process.exit(1);
  }

  await db.destroy();
  console.log('✓ Done');
})().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
