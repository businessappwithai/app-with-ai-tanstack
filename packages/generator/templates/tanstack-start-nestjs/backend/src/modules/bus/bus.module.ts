/**
 * Business Module
 *
 * Handles all bus_ prefixed business entity tables.
 * Provides dynamic CRUD operations for all business entities.
 *
 * Generated: 2026-06-09T07:37:08.052Z
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';
import { RulesModule } from '../rules/rules.module';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';

@Module({
  imports: [DatabaseModule, WorkflowModule, AuditModule, RulesModule],
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
