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
 * Generated: 2026-05-12T10:27:31.159Z
 * Project: crm-app
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
