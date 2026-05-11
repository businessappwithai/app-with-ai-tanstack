/**
 * Workflow Module - Trigger.dev Integration
 *
 * Provides workflow orchestration for entity lifecycle events.
 *
 * Generated: 2026-05-09T16:10:52.301Z
 * Project: my-app
 */

import { Module, forwardRef } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [forwardRef(() => RulesModule)],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
