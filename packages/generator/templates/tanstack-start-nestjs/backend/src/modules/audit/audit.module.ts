import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditService } from "./audit.service";
import { ImmudbService } from "./immudb.service";

@Module({
  providers: [ImmudbService, AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
