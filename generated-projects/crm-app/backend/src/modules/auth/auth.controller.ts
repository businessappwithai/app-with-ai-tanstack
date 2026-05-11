/**
 * Auth Controller
 *
 * Provides user profile endpoints. Actual auth routes (sign-in, sign-up,
 * sign-out, session) are handled by better-auth at /api/auth/*.
 *
 * Generated: 2026-05-09T16:10:52.290Z
 */

import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('me')
@UseGuards(SessionAuthGuard)
export class AuthController {
  /**
   * GET /api/me - Return the currently authenticated user
   */
  @Get()
  async getCurrentUser(@Req() req: FastifyRequest & { user: Record<string, unknown> }) {
    return {
      data: req.user,
    };
  }

  /**
   * GET /api/me/health - Public health check
   */
  @Get('health')
  @Public()
  healthCheck() {
    return { status: 'ok' };
  }
}
