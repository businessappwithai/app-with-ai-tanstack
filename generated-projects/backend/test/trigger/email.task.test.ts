/**
 * Unit tests for sendEmailTask (Trigger.dev v3)
 *
 * Generated: 2026-05-07T09:31:28.705Z
 * Project: crm-app
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@trigger.dev/sdk/v3", () => ({
  task: vi.fn().mockImplementation((config: any) => config),
}));

import { type EmailTaskPayload, sendEmailTask } from "../../src/trigger/email.task";

describe("sendEmailTask", () => {
  it("has the correct task id", () => {
    expect((sendEmailTask as any).id).toBe("send-email");
  });

  it("has maxDuration of 60 seconds", () => {
    expect((sendEmailTask as any).maxDuration).toBe(60);
  });

  it("has retry config with 3 max attempts", () => {
    expect((sendEmailTask as any).retry.maxAttempts).toBe(3);
  });

  describe("run()", () => {
    it("returns success=true for a full payload", async () => {
      const payload: EmailTaskPayload = {
        to: "user@example.com",
        subject: "Test Subject",
        template: "test-template",
        data: { key: "value" },
      };

      const result = await (sendEmailTask as any).run(payload);

      expect(result.success).toBe(true);
    });

    it("returns the recipient address in the result", async () => {
      const payload: EmailTaskPayload = {
        to: "admin@example.com",
        subject: "Admin Alert",
        template: "alert",
      };

      const result = await (sendEmailTask as any).run(payload);

      expect(result.to).toBe("admin@example.com");
    });

    it("returns the subject in the result", async () => {
      const payload: EmailTaskPayload = {
        to: "user@example.com",
        subject: "Results Available",
        template: "results",
      };

      const result = await (sendEmailTask as any).run(payload);

      expect(result.subject).toBe("Results Available");
    });

    it("generates a messageId with the msg_ prefix", async () => {
      const payload: EmailTaskPayload = {
        to: "test@example.com",
        subject: "Test",
        template: "test",
      };

      const result = await (sendEmailTask as any).run(payload);

      expect(result.messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it("works without the optional data field", async () => {
      const payload: EmailTaskPayload = {
        to: "billing@example.com",
        subject: "Invoice Ready",
        template: "invoice",
      };

      const result = await (sendEmailTask as any).run(payload);

      expect(result.success).toBe(true);
      expect(result.to).toBe("billing@example.com");
    });
  });
});
