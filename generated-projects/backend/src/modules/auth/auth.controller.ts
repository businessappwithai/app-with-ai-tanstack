/**
 * Auth Controller
 *
 * Provides user profile endpoints. Actual auth routes (sign-in, sign-up,
 * sign-out, session) are handled by better-auth at /api/auth/*.
 *
 * Generated: 2026-05-07T09:31:28.374Z
 */

import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Public } from "./decorators/public.decorator";
import { SessionAuthGuard } from "./guards/session-auth.guard";

@Controller("me")
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
  @Get("health")
  @Public()
  healthCheck() {
    return { status: "ok" };
  }
}
