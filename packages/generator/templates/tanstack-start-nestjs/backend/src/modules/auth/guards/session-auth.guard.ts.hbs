/**
 * Session Auth Guard - BetterAuth Integration
 *
 * Protects routes by validating session tokens from BetterAuth.
 * Replaces JWT-based authentication with session-based auth.
 *
 * This guard extracts the session token from cookies or Authorization header
 * and validates it against BetterAuth's session store.
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '../../../lib/better-auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public via decorator metadata
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
      // BetterAuth validates session from cookies or Authorization header
      const session = await auth.api.getSession({
        headers,
      });

      if (!session) {
        this.logger.debug('No valid session found in request');
        throw new UnauthorizedException('Invalid or expired session. Please sign in again.');
      }

      // Attach user and session to request for use in controllers/services
      request.user = session.user;
      request.session = session;

      this.logger.debug(`User authenticated: ${session.user.email} (${session.user.id})`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Authentication failed: ${error.message}`);
      throw new UnauthorizedException('Authentication failed. Please sign in again.');
    }
  }
}
