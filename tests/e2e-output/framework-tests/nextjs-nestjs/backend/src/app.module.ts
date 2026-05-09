/**
 * Root Application Module
 *
 * Generated: 2026-03-20T16:41:26.573Z
 * Project: nextjs-nestjs-test-app
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { DatabaseModule } from "./database/database.module";
import { BusModule } from "./modules/bus/bus.module";
import { SysModule } from "./modules/sys/sys.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Database (Knex.js)
    DatabaseModule,

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
  ],
})
export class AppModule {}
