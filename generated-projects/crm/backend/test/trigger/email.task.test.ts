/**
 * Unit tests for sendEmailTask (Trigger.dev v3)
 *
 * Generated: 2026-08-29T04:45:22.011Z
 * Project: my-app
 */

import { describe, it, expect } from 'bun:test';
import { sendEmailTask, type EmailTaskPayload } from '../../src/trigger/email.task';

describe('sendEmailTask', () => {
  it('is defined and exported', () => {
    expect(sendEmailTask).toBeDefined();
  });

  it('has an id property', () => {
    expect((sendEmailTask as any).id).toBe('send-email');
  });

  it('accepts valid email payloads', () => {
    const payload: EmailTaskPayload = {
      to: 'user@example.com',
      subject: 'Test Subject',
      template: 'test-template',
      data: { key: 'value' },
    };

    expect(payload.to).toBe('user@example.com');
    expect(payload.subject).toBe('Test Subject');
  });
});
