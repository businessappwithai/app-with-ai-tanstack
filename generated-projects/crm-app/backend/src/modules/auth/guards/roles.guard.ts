/**
 * Roles Guard - Role-Based Access Control
 *
 * Enforces role-based access control for protected routes.
 * Works in conjunction with SessionAuthGuard (must be applied first).
 *
 * Usage:
 * @Roles('admin', 'doctor')
 * @UseGuards(SessionAuthGuard, RolesGuard)
 * async getPatients() { ... }
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by SessionAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated. Please sign in.');
    }

    // Get user's roles from session or database
    const userRoles = user.roles || [];

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your roles: ${userRoles.join(', ') || 'none'}.`
      );
    }

    return true;
  }
}
