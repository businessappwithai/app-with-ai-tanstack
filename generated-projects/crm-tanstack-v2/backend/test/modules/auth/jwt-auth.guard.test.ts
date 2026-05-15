/**
 * Unit tests for JwtAuthGuard (BetterAuth session validation)
 *
 * Generated: 2026-05-15T16:06:25.877Z
 * Project: CRM App
 */

import { describe, it, expect } from 'bun:test';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  describe('initialization', () => {
    it('creates a guard instance', () => {
      const reflector = new Reflector();
      const guard = new JwtAuthGuard(reflector);

      expect(guard).toBeDefined();
      expect(guard instanceof JwtAuthGuard).toBe(true);
    });

    it('has a canActivate method', () => {
      const reflector = new Reflector();
      const guard = new JwtAuthGuard(reflector);

      expect(typeof guard.canActivate).toBe('function');
    });
  });
});
