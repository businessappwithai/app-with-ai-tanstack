/**
 * Root Application Module
 *
 * Generated: 2026-05-16T05:41:09.450Z
 * Project: CRM Regenerated
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './database/database.module';
import { SysModule } from './modules/sys/sys.module';
import { BusModule } from './modules/bus/bus.module';
import { AuthModule } from './modules/auth/auth.module';
import { RulesModule } from './modules/rules/rules.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { JobQueueModule } from './modules/jobs/job-queue.module';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      // Use __dirname-relative paths so .env is found regardless of process cwd
      envFilePath: [
        `${__dirname}/../.env.local`,
        `${__dirname}/../.env`,
        '.env.local',
        '.env',
      ],
    }),

    // Rate limiting (permissive in dev/test, strict in production)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: process.env.NODE_ENV === 'production' ? 100 : 1000,
      },
    ]),

    // Database (Knex.js)
    DatabaseModule,

    // Authentication (BetterAuth with PostgreSQL)
    AuthModule,

    // Business Rules Engine (GoRules zen-engine)
    RulesModule,

    // Workflow orchestration (Trigger.dev v3 + GoRules)
    WorkflowModule,

    // Background job processing (Trigger.dev v3)
    JobQueueModule,

    // System/Dictionary module (sys_ tables)
    SysModule,

    // Business entity module (bus_ tables)
    BusModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global transform interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
