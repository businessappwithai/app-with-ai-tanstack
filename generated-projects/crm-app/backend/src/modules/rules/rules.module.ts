/**
 * Rules Module
 *
 * Business rules engine module for crm-app
 *
 * Generated: 2026-05-12T10:27:31.160Z
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
