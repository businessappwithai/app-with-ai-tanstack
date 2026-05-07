/**
 * Unit tests for generateReportTask (Trigger.dev v3)
 *
 * Generated: 2026-05-07T08:59:26.651Z
 * Project: crm-app
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@trigger.dev/sdk/v3', () => ({
  task: vi.fn().mockImplementation((config: any) => config),
}));

import { generateReportTask, type ReportTaskPayload } from '../../src/trigger/report.task';

describe('generateReportTask', () => {
  it('has the correct task id', () => {
    expect((generateReportTask as any).id).toBe('generate-report');
  });

  it('has maxDuration of 300 seconds', () => {
    expect((generateReportTask as any).maxDuration).toBe(300);
  });

  it('has retry config with 2 max attempts', () => {
    expect((generateReportTask as any).retry.maxAttempts).toBe(2);
  });

  describe('run()', () => {
    it('returns success=true', async () => {
      const payload: ReportTaskPayload = {
        reportType: 'summary',
        params: { year: 2026 },
        userId: 'user-001',
      };

      const result = await (generateReportTask as any).run(payload);

      expect(result.success).toBe(true);
    });

    it('returns the reportType in the result', async () => {
      const payload: ReportTaskPayload = {
        reportType: 'quarterly',
        params: { quarter: 'Q1' },
        userId: 'manager-001',
      };

      const result = await (generateReportTask as any).run(payload);

      expect(result.reportType).toBe('quarterly');
    });

    it('returns the generatedBy userId', async () => {
      const payload: ReportTaskPayload = {
        reportType: 'annual',
        params: {},
        userId: 'admin-001',
      };

      const result = await (generateReportTask as any).run(payload);

      expect(result.generatedBy).toBe('admin-001');
    });

    it('returns a reportUrl', async () => {
      const payload: ReportTaskPayload = {
        reportType: 'census',
        params: {},
        userId: 'user-001',
      };

      const result = await (generateReportTask as any).run(payload);

      expect(result.reportUrl).toMatch(/^\/reports\/census_\d+\.pdf$/);
    });
  });
});
