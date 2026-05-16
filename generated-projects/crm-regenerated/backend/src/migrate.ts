/**
 * Database Migration Runner
 * Run with: bun run src/migrate.ts
 *
 * Generated: 2026-05-16T05:41:09.514Z
 */

import * as path from 'path';
import * as fs from 'fs';
import { Kysely } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { config } from 'dotenv';

// Load .env from backend root (parent of src/) regardless of cwd
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '.env.local'), override: true });

async function createDialect() {
  const dbDir = process.env.DATABASE_DIR ?? path.join(__dirname, '..', 'data', 'c_r_m _regenerated.db');
  fs.mkdirSync(dbDir, { recursive: true });
  const pglite = new PGlite(dbDir);
  await pglite.waitReady;
  return new PGliteDialect(pglite);
}

async function runMigrations(db: Kysely<any>) {
  const migrationDir = path.join(__dirname, 'migrations');
  const files = (await fs.promises.readdir(migrationDir)).filter(f => f.endsWith('.ts')).sort();

  for (const file of files) {
    const migrationPath = path.join(migrationDir, file);
    const migrationModule = await import(migrationPath);

    if (migrationModule.up) {
      try {
        console.log(`Running migration: ${file}`);
        await migrationModule.up(db);
        console.log(`✓ Migration "${file}" completed`);
      } catch (error) {
        console.error(`✗ Migration "${file}" failed:`, error);
        throw error;
      }
    }
  }
}

(async () => {
  const dialect = await createDialect();
  const db = new Kysely<any>({ dialect });

  try {
    await runMigrations(db);
    console.log('✓ All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
})().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
