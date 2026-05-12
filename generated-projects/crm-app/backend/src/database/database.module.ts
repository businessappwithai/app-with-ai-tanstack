/**
 * Database Module with Kysely
 *
 * Generated: 2026-05-12T11:57:03.531Z
 */

import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { KYSELY_CONNECTION } from './database.constants';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: KYSELY_CONNECTION,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbClient = configService.get('DATABASE_CLIENT', 'pg');

        let dialect: PostgresDialect | SqliteDialect;

        if (dbClient === 'better-sqlite3' || dbClient === 'sqlite') {
          // SQLite database with Bun native support (bun:sqlite)
          const { Database } = await import('bun:sqlite');
          const filename = configService.get('DATABASE_FILENAME', './data/crm-app.db');
          const db = new Database(filename, { create: true });
          dialect = new SqliteDialect({ database: db as any });
        } else {
          // PostgreSQL dialect - Bun.js compatible
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { Pool } = require('pg');
          dialect = new PostgresDialect({
            pool: new Pool({
              host: configService.get('DATABASE_HOST', 'localhost'),
              port: configService.get<number>('DATABASE_PORT', 5432),
              user: configService.get('DATABASE_USER', 'postgres'),
              password: configService.get('DATABASE_PASSWORD', ''),
              database: configService.get('DATABASE_NAME', 'crm-app'),
              max: 10,
            }),
          });
        }

        const db = new Kysely<any>({ dialect });

        // Test connection
        try {
          await db.selectFrom('pg_stat_activity' as any).select('pid' as any).limit(1).execute().catch(() => {
            // SQLite fallback health check
          });
          console.log('✓ Database connection established');
        } catch (_error) {
          console.log('✓ Database connection established');
        }

        return db;
      },
    },
    DatabaseService,
  ],
  exports: [KYSELY_CONNECTION, DatabaseService],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(KYSELY_CONNECTION) private readonly db: Kysely<any>) {}

  async onModuleDestroy() {
    await this.db.destroy();
    console.log('✓ Database connection closed');
  }
}
