/**
 * JWT Auth Guard - BetterAuth Integration
 *
 * Protects routes by validating session tokens from BetterAuth
 *
 * Generated: 2026-05-07T08:59:26.419Z
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '../../../lib/better-auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor() {} // Reflector removed - Bun runtime compatibility issue

  private get reflector(): Reflector | null {
    // Disabled - Reflector injection not working in Bun runtime
    // @Public() decorator won't work without Reflector
    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    try {
      const session = await auth.api.getSession({
        headers,
      });

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Attach user and session to request
      request.user = session.user;
      request.session = session;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
