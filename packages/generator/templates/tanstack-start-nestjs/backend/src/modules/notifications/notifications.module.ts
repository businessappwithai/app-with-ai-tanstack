import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DatabaseModule } from "../../database/database.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

/**
 * Reads the audit trail; writes only read marks.
 *
 * `Reflector` and `DatabaseModule` are what SessionAuthGuard resolves against —
 * the same pair AuditModule provides for the same reason.
 */
@Module({
  imports: [DatabaseModule],
  providers: [Reflector, NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
