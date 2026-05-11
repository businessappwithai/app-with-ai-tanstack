/**
 * Unit tests for JwtAuthGuard (BetterAuth session validation)
 *
 * Generated: 2026-05-09T16:10:52.347Z
 * Project: my-app
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

vi.mock('../../../src/lib/better-auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../src/modules/auth/decorators/public.decorator';
import { auth } from '../../../src/lib/better-auth';

const mockGetSession = vi.mocked(auth.api.getSession);

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockSession = {
    user: { id: 'user-001', email: 'admin@example.com', name: 'Admin User' },
    session: { id: 'session-001', expiresAt: new Date(Date.now() + 3600_000) },
  };

  function makeContext(
    isPublic: boolean,
    headers: Record<string, string> = {},
  ): { ctx: ExecutionContext; request: Record<string, any> } {
    const request: Record<string, any> = { headers, user: undefined, session: undefined };
    const handler = vi.fn();
    const cls = vi.fn();

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;

    return { ctx, request };
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    vi.clearAllMocks();
  });

  describe('public routes', () => {
    it('returns true for @Public() routes without checking session', async () => {
      const { ctx } = makeContext(true);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  describe('protected routes — valid session', () => {
    it('returns true when a valid session exists', async () => {
      mockGetSession.mockResolvedValue(mockSession as any);
      const { ctx } = makeContext(false, { cookie: 'session=valid' });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('attaches the user to the request', async () => {
      mockGetSession.mockResolvedValue(mockSession as any);
      const { ctx, request } = makeContext(false);

      await guard.canActivate(ctx);

      expect(request.user).toEqual(mockSession.user);
    });
  });

  describe('protected routes — invalid / missing session', () => {
    it('throws UnauthorizedException when getSession returns null', async () => {
      mockGetSession.mockResolvedValue(null as any);
      const { ctx } = makeContext(false);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when getSession throws', async () => {
      mockGetSession.mockRejectedValue(new Error('Token expired'));
      const { ctx } = makeContext(false);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('reflector usage', () => {
    it('checks IS_PUBLIC_KEY on both the handler and the class', async () => {
      mockGetSession.mockResolvedValue(mockSession as any);
      const handler = vi.fn();
      const cls = vi.fn();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
        getHandler: () => handler,
        getClass: () => cls,
      } as unknown as ExecutionContext;

      await guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, cls]);
    });
  });
});
