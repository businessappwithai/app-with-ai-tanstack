/**
 * Model Context Module
 *
 * Retrieval over the `.eml.mmd` this application was generated from, so an
 * administrator extending it has an assistant that can answer from what the
 * application declares.
 *
 * Generated: 2026-08-29T04:45:21.756Z
 * Project: my-app
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ModelContextController } from './model-context.controller';
import { ModelContextService } from './model-context.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ModelContextController],
  providers: [ModelContextService],
  exports: [ModelContextService],
})
export class ModelContextModule {}
