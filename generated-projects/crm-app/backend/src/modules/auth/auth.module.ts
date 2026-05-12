/**
 * Auth Module - BetterAuth Integration
 *
 * Auth routes are handled by better-auth's native HTTP handler
 * mounted directly on the Fastify instance (see main.ts).
 *
 * This module provides guards for protecting other routes:
 * - SessionAuthGuard: validates session cookies against better-auth
 * - RolesGuard: checks user roles for authorization
 *
 * Generated: 2026-05-12T11:48:19.415Z
 */

import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [
    Reflector,
    SessionAuthGuard,
    RolesGuard,
  ],
  exports: [SessionAuthGuard, RolesGuard],
})
export class AuthModule {}
