/**
 * Electric Module
 *
 * Exposes a GET /v1/shape proxy that forwards ElectricSQL shape
 * requests to the upstream Electric server, adding role-based
 * filtering for sys_ entity metadata.
 *
 * Generated: 2026-08-17T17:20:18.486Z
 * Project: crm
 */

import { Module } from '@nestjs/common';
import { ElectricController } from './electric.controller';

@Module({
  controllers: [ElectricController],
})
export class ElectricModule {}
