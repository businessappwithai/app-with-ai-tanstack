/**
 * The two transactions behind every write, and the notification that reports them.
 *
 * A save commits the row as a draft; a second transaction — a Trigger.dev run
 * where one is configured — runs the record's rules and workflows and either
 * finalises it or leaves it a draft with the reason. Neither half is observable
 * from this repository: templates are text until they are rendered, and the
 * pieces that hold the two together are wiring rather than logic, so nothing
 * else here notices when one comes loose.
 *
 * Three of them came loose in exactly that way and are pinned below.
 *
 *   - `PromotionDispatcher` triggers a task by the id `entity-promotion`, and
 *     no template generated a task with that id. Every save in an application
 *     with Trigger.dev credentials went to a task that did not exist, so the
 *     dispatch failed and the record stayed a draft citing the job runner.
 *   - The finalisation has to be dispatched, not awaited. `triggerAndPoll`
 *     holds the save's HTTP response open until the run finishes, which
 *     collapses two transactions back into one.
 *   - An updated record has to return to `draft`. Left `final`, a record
 *     finalised once keeps that badge through every later edit, including one
 *     its rules would refuse.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BACKEND = join(import.meta.dirname, "../../../templates/tanstack-start-nestjs/backend");
const FRONTEND = join(import.meta.dirname, "../../../templates/tanstack-start-nestjs/frontend");
const GENERATOR = join(
  import.meta.dirname,
  "../../generators/tanstack-start-nestjs/nestjs-backend.generator.ts"
);

function backend(relative: string): string {
  return readFileSync(join(BACKEND, relative), "utf8");
}

function frontend(relative: string): string {
  return readFileSync(join(FRONTEND, relative), "utf8");
}

describe("the promotion is dispatched, not awaited", () => {
  const dispatcher = backend("src/modules/bus/promotion-dispatcher.service.ts.hbs");

  it("triggers the task rather than polling it to completion", () => {
    expect(dispatcher).toContain("tasks.trigger('entity-promotion'");
    // The call, not the word — the comment explaining the change names it too.
    expect(dispatcher).not.toMatch(/tasks\.triggerAndPoll/);
  });

  it("answers the save immediately, with the record's real state", () => {
    // `queued` is the whole distinction between "not finalised yet" and
    // "finalisation failed", and a client that cannot tell them apart shows a
    // successful save as an error.
    expect(dispatcher).toContain("state: 'queued'");
  });

  it("records the draft before anything can fail", () => {
    // The save is committed by the time the dispatcher runs. If the draft row
    // were written after the trigger, a dispatch that throws would leave the
    // user with a saved record and no notification of it at all.
    const draftAt = dispatcher.indexOf("recordDraftTransaction");
    const triggerAt = dispatcher.indexOf("tasks.trigger");
    expect(draftAt).toBeGreaterThan(-1);
    expect(triggerAt).toBeGreaterThan(draftAt);
  });
});

describe("the task the dispatcher names exists and is generated", () => {
  const task = backend("src/trigger/entity-promotion.task.ts.hbs");

  it("declares the id PromotionDispatcher triggers", () => {
    expect(task).toContain("id: 'entity-promotion'");
  });

  it("runs the same pipeline the API does", () => {
    // Not a reimplementation: the worker resolves the real service out of a
    // Nest context, so the two paths cannot reach different outcomes.
    expect(task).toContain("EntityPromotionService");
    expect(task).toContain("service.promote(");
  });

  it("is written by the generator", () => {
    const generator = readFileSync(GENERATOR, "utf8");
    expect(generator).toContain('"entity-promotion"');
    expect(generator).toContain("src/trigger/promotion-worker.module.ts.hbs");
  });

  it("bootstraps its own root rather than the whole application", () => {
    const module = backend("src/trigger/promotion-worker.module.ts.hbs");
    expect(module).toContain("PromotionWorkerModule");
    expect(module).toContain("DatabaseModule");
    // The application root would drag the HTTP surface, better-auth and the
    // assistant into a worker that runs one database transaction. Asserted on
    // the import, since the comment in the template explains as much in prose.
    expect(module).not.toMatch(/from '\.\.\/app\.module'/);
  });
});

describe("both halves reach the audit trail", () => {
  const promotion = backend("src/modules/bus/entity-promotion.service.ts.hbs");
  const types = backend("src/modules/audit/audit.types.ts");
  const audit = backend("src/modules/audit/audit.service.ts");

  it("declares the two transaction actions the feed reads", () => {
    expect(types).toContain("ENTITY_DRAFT");
    expect(types).toContain("ENTITY_FINALIZE");
    expect(types).toContain("TRANSACTION_ACTIONS");
  });

  it("writes them on a path that waits for the row", () => {
    // `log` defers to setImmediate, which is right in an HTTP request and wrong
    // in a Trigger.dev worker: the process can be torn down the moment the task
    // returns and take the pending write — the user's only notification — with
    // it.
    expect(audit).toContain("async logAndWait(");
    expect(promotion).toContain("auditService.logAndWait");
  });

  it("carries the acting user, since no request is in scope", () => {
    expect(promotion).toContain("PromotionActor");
    const guard = backend("src/modules/auth/guards/session-auth.guard.ts.hbs");
    expect(guard).toContain("actor:");
  });
});

describe("an updated record goes back to draft", () => {
  const bus = backend("src/modules/bus/bus.service.ts.hbs");

  it("clears the status and the stale message in the update itself", () => {
    expect(bus).toContain("doc_status: 'draft'");
    expect(bus).toContain("doc_status_message: null");
  });
});

describe("the notification list is read from the trail and nowhere else", () => {
  const service = backend("src/modules/notifications/notifications.service.ts");
  const controller = backend("src/modules/notifications/notifications.controller.ts");

  it("selects from audit_log", () => {
    expect(service).toContain('selectFrom("audit_log as a")');
  });

  it("stores nothing but the read mark", () => {
    // Any other insert here would be a second copy of what happened, free to
    // disagree with the trail.
    const inserts = service.match(/INSERT INTO (\w+)/g) ?? [];
    expect(new Set(inserts)).toEqual(new Set(["INSERT INTO sys_notification_read"]));
  });

  it("scopes every read to the session, with no user parameter to tamper with", () => {
    expect(controller).toContain("req?.user?.id");
    expect(controller).not.toMatch(/@Query\(["']user_id["']\)/);
  });
});

describe("the bell sits beside Log out", () => {
  it("is mounted next to the sign-out control on the dashboard", () => {
    const dashboard = frontend("src/routes/dashboard.tsx");
    const bellAt = dashboard.indexOf("<NotificationBell />");
    const logoutAt = dashboard.indexOf('title="Log out"');
    expect(bellAt).toBeGreaterThan(-1);
    expect(logoutAt).toBeGreaterThan(bellAt);
  });

  it("shows read and unread differently", () => {
    const bell = frontend("src/components/notifications/notification-bell.tsx");
    expect(bell).toContain('item.read ? "bg-card" : "bg-primary/5"');
    expect(bell).toContain("font-normal");
  });

  it("carries no hard-coded notification text", () => {
    // The bell used to pulse permanently over a hard-coded empty-state line.
    // Asserted on the markup rather than on the sentence, so the template's own
    // note about what it replaced does not fail this.
    const header = frontend("src/components/layout/header.tsx");
    expect(header).not.toMatch(/<div[^>]*>\s*No new notifications/);
    expect(header).toContain("<NotificationBell />");
  });
});
