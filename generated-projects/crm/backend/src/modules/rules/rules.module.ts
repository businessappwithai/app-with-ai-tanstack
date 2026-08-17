/**
 * Rules Module
 *
 * Business rules engine module for crm
 *
 * Generated: 2026-08-17T17:20:18.419Z
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { RulesEngine } from './rules-engine.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => WorkflowModule)],
  controllers: [RulesController],
  providers: [RulesService, RulesEngine],
  exports: [RulesService, RulesEngine],
})
export class RulesModule {}
