/**
 * Unit tests for AuthController
 *
 * Generated: 2026-05-09T16:10:52.346Z
 * Project: my-app
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../../src/modules/auth/auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController();
  });

  describe('getCurrentUser', () => {
    it('returns the authenticated user from the request', async () => {
      const mockUser = { id: 'user-001', email: 'admin@example.com', name: 'Admin User' };
      const mockRequest = { user: mockUser } as any;

      const result = await controller.getCurrentUser(mockRequest);

      expect(result).toEqual({ data: mockUser });
    });

    it('returns all user fields provided by the session guard', async () => {
      const mockUser = {
        id: 'user-002',
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin',
      };
      const mockRequest = { user: mockUser } as any;

      const result = await controller.getCurrentUser(mockRequest);

      expect(result.data).toStrictEqual(mockUser);
    });
  });

  describe('healthCheck', () => {
    it('returns ok status without authentication', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
