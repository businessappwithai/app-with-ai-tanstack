/**
 * Workflow Module - Trigger.dev Integration
 *
 * Provides workflow orchestration for entity lifecycle events.
 *
 * Generated: 2026-05-07T09:31:28.448Z
 * Project: crm-app
 */

import { forwardRef, Module } from "@nestjs/common";
import { RulesModule } from "../rules/rules.module";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [forwardRef(() => RulesModule)],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
