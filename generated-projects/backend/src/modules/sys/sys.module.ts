/**
 * System Module (Application Dictionary)
 *
 * Handles all sys_ prefixed tables:
 * - sys_table, sys_column, sys_field
 *
 * Generated: 2026-05-31T11:58:03.753Z
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SysController } from './sys.controller';
import { SysService } from './sys.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SysController],
  providers: [SysService],
  exports: [SysService],
})
export class SysModule {}
