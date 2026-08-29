/**
 * Electric Module
 *
 * Exposes GET /v1/shape — the role-scoped proxy in front of the upstream
 * ElectricSQL server that streams the Application Dictionary to each client.
 *
 * DatabaseModule is imported because the proxy verifies the session's roles
 * against sys_role before they are used to filter a shape.
 *
 * Generated: 2026-08-29T04:45:21.742Z
 * Project: my-app
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ElectricController } from './electric.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ElectricController],
})
export class ElectricModule {}
