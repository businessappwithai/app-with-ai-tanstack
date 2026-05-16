/**
 * Job Queue Module - Trigger.dev v3
 *
 * Provides background job processing for:
 * - Email notifications
 * - Report generation
 * - Data synchronization
 *
 * Tasks are defined in src/trigger/ and executed on Trigger.dev's
 * durable infrastructure. No Redis required.
 *
 * Generated: 2026-05-16T05:41:32.554Z
 * Project: CRM Regenerated 2
 */

import { Module } from '@nestjs/common';
import { JobQueueService } from './job-queue.service';
import { JobQueueController } from './job-queue.controller';

@Module({
  controllers: [JobQueueController],
  providers: [JobQueueService],
  exports: [JobQueueService],
})
export class JobQueueModule {}
