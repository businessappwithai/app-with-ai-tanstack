/**
 * Rules Module
 *
 * Business rules engine module for my-app
 *
 * Generated: 2026-08-29T04:45:21.690Z
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
