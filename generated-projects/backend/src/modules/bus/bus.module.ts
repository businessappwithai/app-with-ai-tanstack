/**
 * Business Module
 *
 * Handles all bus_ prefixed business entity tables.
 * Provides dynamic CRUD operations for all business entities.
 *
 * Generated: 2026-05-31T11:58:03.757Z
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}
