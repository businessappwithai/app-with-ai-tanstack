/**
 * Unit tests for JwtAuthGuard (BetterAuth session validation)
 *
 * Generated: 2026-08-29T04:45:22.004Z
 * Project: my-app
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
