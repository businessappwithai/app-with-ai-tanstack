/**
 * Database Module with Knex.js
 *
 * Generated: 2026-05-07T09:31:28.654Z
 */

import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Knex as KnexType } from "knex";
import Knex from "knex";
import { KNEX_CONNECTION } from "./database.constants";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  providers: [
    {
      provide: KNEX_CONNECTION,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbClient = configService.get("DATABASE_CLIENT", "pg");

        const knexConfig: KnexType.Config = {
          client: dbClient,
          pool: {
            min: 2,
            max: 10,
          },
          migrations: {
            tableName: "knex_migrations",
            directory: "./migrations",
          },
          seeds: {
            directory: "./seeds",
          },
        };

        // Configure connection based on database type
        if (dbClient === "better-sqlite3") {
          // SQLite configuration
          (knexConfig.connection as any) = {
            filename: configService.get("DATABASE_FILENAME", "./data/crm-app.db"),
          };
          (knexConfig as any).useNullAsDefault = true;
        } else {
          // PostgreSQL configuration
          knexConfig.connection = {
            host: configService.get("DATABASE_HOST", "localhost"),
            port: configService.get("DATABASE_PORT", 5432),
            user: configService.get("DATABASE_USER", "postgres"),
            password: configService.get("DATABASE_PASSWORD", ""),
            database: configService.get("DATABASE_NAME", "crm-app"),
          };
        }

        const knex = Knex(knexConfig);

        // Test connection
        try {
          await knex.raw("SELECT 1");
          console.log("✓ Database connection established");
        } catch (error) {
          console.error("✗ Database connection failed:", error);
          throw error;
        }

        return knex;
      },
    },
    DatabaseService,
  ],
  exports: [KNEX_CONNECTION, DatabaseService],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: KnexType) {}

  async onModuleDestroy() {
    await this.knex.destroy();
    console.log("✓ Database connection closed");
  }
}
