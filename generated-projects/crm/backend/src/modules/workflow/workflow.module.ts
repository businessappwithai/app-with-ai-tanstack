/**
 * Workflow Module - Trigger.dev Integration
 *
 * Provides workflow orchestration for entity lifecycle events.
 *
 * Generated: 2026-08-29T04:45:21.699Z
 * Project: my-app
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => RulesModule)],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
