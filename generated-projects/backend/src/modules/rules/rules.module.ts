/**
 * Rules Module
 *
 * Business rules engine module for
 *
 * Generated: 2026-05-07T09:31:28.422Z
 */

import { Module } from "@nestjs/common";
import { RulesController } from "./rules.controller";
import { RulesService } from "./rules.service";
import { RulesEngine } from "./rules-engine.service";

@Module({
  controllers: [RulesController],
  providers: [RulesService, RulesEngine],
  exports: [RulesService, RulesEngine],
})
export class RulesModule {}
