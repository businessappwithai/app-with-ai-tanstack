/**
 * JWT Auth Guard - BetterAuth Integration
 *
 * Protects routes by validating session tokens from BetterAuth
 *
 * Generated: 2026-05-09T16:10:52.289Z
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '../../../lib/better-auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
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
