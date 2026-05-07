/**
 * Workflow Module - Trigger.dev Integration
 *
 * Provides workflow orchestration for entity lifecycle events.
 *
 * Generated: 2026-05-07T08:59:26.468Z
 * Project: crm-app
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
