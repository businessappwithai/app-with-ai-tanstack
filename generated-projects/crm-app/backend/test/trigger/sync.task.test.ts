/**
 * Unit tests for syncEntityTask (Trigger.dev v3)
 *
 * Generated: 2026-05-09T16:10:52.348Z
 * Project: my-app
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@trigger.dev/sdk/v3', () => ({
  task: vi.fn().mockImplementation((config: any) => config),
}));

import { syncEntityTask, type SyncTaskPayload } from '../../src/trigger/sync.task';

describe('syncEntityTask', () => {
  it('has the correct task id', () => {
    expect((syncEntityTask as any).id).toBe('sync-entity');
  });

  it('has maxDuration of 120 seconds', () => {
    expect((syncEntityTask as any).maxDuration).toBe(120);
  });

  it('has retry config with 5 max attempts', () => {
    expect((syncEntityTask as any).retry.maxAttempts).toBe(5);
  });

  describe('run()', () => {
    it('handles create action successfully', async () => {
      const payload: SyncTaskPayload = {
        entityType: 'bus_company',
        entityId: 'entity-001',
        action: 'create',
      };

      const result = await (syncEntityTask as any).run(payload);

      expect(result.success).toBe(true);
      expect(result.action).toBe('create');
    });

    it('handles update action successfully', async () => {
      const payload: SyncTaskPayload = {
        entityType: 'bus_entity',
        entityId: 'entity-456',
        action: 'update',
      };

      const result = await (syncEntityTask as any).run(payload);

      expect(result.success).toBe(true);
      expect(result.action).toBe('update');
    });

    it('handles delete action successfully', async () => {
      const payload: SyncTaskPayload = {
        entityType: 'bus_entity',
        entityId: 'entity-789',
        action: 'delete',
      };

      const result = await (syncEntityTask as any).run(payload);

      expect(result.success).toBe(true);
      expect(result.action).toBe('delete');
    });

    it('returns the entityType in the result', async () => {
      const payload: SyncTaskPayload = {
        entityType: 'bus_custom',
        entityId: 'item-100',
        action: 'create',
      };

      const result = await (syncEntityTask as any).run(payload);

      expect(result.entityType).toBe('bus_custom');
    });
  });
});
