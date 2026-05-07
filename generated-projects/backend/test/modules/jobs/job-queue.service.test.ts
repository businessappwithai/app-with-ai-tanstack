/**
 * Unit tests for JobQueueService (Trigger.dev v3 integration)
 *
 * Generated: 2026-05-07T09:31:28.704Z
 * Project: crm-app
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobQueueService } from '../../../src/modules/jobs/job-queue.service';

vi.mock('../../../src/trigger/email.task', () => ({
  sendEmailTask: { trigger: vi.fn().mockResolvedValue({ id: 'email-run-abc123' }) },
}));

vi.mock('../../../src/trigger/report.task', () => ({
  generateReportTask: { trigger: vi.fn().mockResolvedValue({ id: 'report-run-def456' }) },
}));

vi.mock('../../../src/trigger/sync.task', () => ({
  syncEntityTask: { trigger: vi.fn().mockResolvedValue({ id: 'sync-run-ghi789' }) },
}));

import { sendEmailTask } from '../../../src/trigger/email.task';
import { generateReportTask } from '../../../src/trigger/report.task';
import { syncEntityTask } from '../../../src/trigger/sync.task';

const mockEmailTrigger = vi.mocked(sendEmailTask.trigger);
const mockReportTrigger = vi.mocked(generateReportTask.trigger);
const mockSyncTrigger = vi.mocked(syncEntityTask.trigger);

describe('JobQueueService', () => {
  let service: JobQueueService;

  beforeEach(() => {
    service = new JobQueueService();
    vi.clearAllMocks();
    mockEmailTrigger.mockResolvedValue({ id: 'email-run-abc123' });
    mockReportTrigger.mockResolvedValue({ id: 'report-run-def456' });
    mockSyncTrigger.mockResolvedValue({ id: 'sync-run-ghi789' });
  });

  describe('addEmailJob()', () => {
    it('returns the Trigger.dev run ID', async () => {
      const data = {
        to: 'user@example.com',
        subject: 'Test Email',
        template: 'test-template',
      };

      const runId = await service.addEmailJob(data);

      expect(runId).toBe('email-run-abc123');
    });

    it('calls sendEmailTask.trigger with the email payload', async () => {
      const data = {
        to: 'user@example.com',
        subject: 'Notification',
        template: 'notification',
        data: { key: 'value' },
      };

      await service.addEmailJob(data);

      expect(mockEmailTrigger).toHaveBeenCalledWith(data);
    });

    it('triggers exactly once per call', async () => {
      const data = { to: 'test@example.com', subject: 'Test', template: 'test' };

      await service.addEmailJob(data);

      expect(mockEmailTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('addReportJob()', () => {
    it('returns the Trigger.dev run ID', async () => {
      const data = {
        reportType: 'summary',
        params: { year: 2026 },
        userId: 'user-001',
      };

      const runId = await service.addReportJob(data);

      expect(runId).toBe('report-run-def456');
    });

    it('calls generateReportTask.trigger with the report payload', async () => {
      const data = {
        reportType: 'quarterly',
        params: { quarter: 'Q1', year: 2026 },
        userId: 'manager-001',
      };

      await service.addReportJob(data);

      expect(mockReportTrigger).toHaveBeenCalledWith(data);
    });
  });

  describe('addSyncJob()', () => {
    it('returns the Trigger.dev run ID', async () => {
      const data = {
        entityType: 'bus_company',
        entityId: 'entity-uuid-001',
        action: 'create' as const,
      };

      const runId = await service.addSyncJob(data);

      expect(runId).toBe('sync-run-ghi789');
    });

    it('handles all action types', async () => {
      for (const action of ['create', 'update', 'delete'] as const) {
        const data = {
          entityType: 'bus_entity',
          entityId: 'entity-uuid',
          action,
        };

        const runId = await service.addSyncJob(data);

        expect(runId).toBe('sync-run-ghi789');
      }
    });
  });

  describe('getJobStatus()', () => {
    it('returns an object with the provided jobId', async () => {
      const status = await service.getJobStatus('email', 'some-run-id-123');

      expect(status.id).toBe('some-run-id-123');
    });

    it('returns status as "triggered"', async () => {
      const status = await service.getJobStatus('reports', 'report-run-id');

      expect(status.status).toBe('triggered');
    });

    it('returns a message referencing the Trigger.dev dashboard', async () => {
      const status = await service.getJobStatus('sync', 'sync-run-id');

      expect(status.message).toContain('Trigger.dev');
    });
  });
});
