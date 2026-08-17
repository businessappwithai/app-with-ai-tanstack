/**
 * System Module (Application Dictionary)
 *
 * Handles all sys_ prefixed tables:
 * - sys_table, sys_column, sys_field
 * - sys_category (entity grouping for the dashboard)
 *
 * Generated: 2026-08-17T16:41:43.472Z
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BusModule } from '../bus/bus.module';
import { SysCategoryController } from './controllers/sys-category.controller';
import { SysController } from './sys.controller';
import { SysCategoryService } from './services/sys-category.service';
import { SysService } from './sys.service';

@Module({
  imports: [DatabaseModule, BusModule],
  controllers: [SysController, SysCategoryController],
  providers: [SysService, SysCategoryService],
  exports: [SysService, SysCategoryService],
})
export class SysModule {}
