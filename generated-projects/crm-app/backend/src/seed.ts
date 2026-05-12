/**
 * Database Seed Runner
 * Run with: bun run src/seed.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import 'dotenv/config';

const dbClient = process.env.DATABASE_CLIENT ?? 'pg';

async function createDialect(): Promise<PostgresDialect | SqliteDialect> {
  if (dbClient === 'better-sqlite3') {
    const { Database } = await import('bun:sqlite');
    const dbPath = process.env.DATABASE_FILENAME ?? './data/crm-app.db';
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

async function runSeeds(db: Kysely<any>) {
  const seedDir = path.join(path.dirname(import.meta.dir), 'seeds');
  const files = (await fs.promises.readdir(seedDir)).sort();

  for (const file of files) {
    if (!file.endsWith('.ts')) continue;

    const seedPath = path.join(seedDir, file);
    const seedModule = await import(seedPath);

    if (seedModule.seed) {
      try {
        console.log(`Running seed: ${file}`);
        await seedModule.seed(db);
        console.log(`✓ Seed "${file}" completed`);
      } catch (error) {
        console.error(`✗ Seed "${file}" failed:`, error);
        throw error;
      }
    }
  }
}

(async () => {
  const dialect = await createDialect();
  const db = new Kysely<any>({ dialect });

  try {
    await runSeeds(db);
    console.log('✓ All seeds completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
})().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
