/**
 * Rules Module
 *
 * Business rules engine module for CRM Regenerated 2
 *
 * Generated: 2026-05-16T05:41:32.556Z
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { RulesEngine } from './rules-engine.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RulesController],
  providers: [RulesService, RulesEngine],
  exports: [RulesService, RulesEngine],
})
export class RulesModule {}
