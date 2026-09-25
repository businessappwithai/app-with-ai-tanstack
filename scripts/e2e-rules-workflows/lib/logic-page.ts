/**
 * The Logic step, driven the way an author drives it.
 *
 * Every control is reached by the words on the screen — "Record type", "Which
 * record", "＋ Add row" — never by position, so a field added to an inspector
 * does not shift every step after it. The builder's inspector wraps each
 * control in its own <label>, which is what makes that possible.
 */

import { expect, type Locator, type Page } from "@playwright/test";

export interface RuleScenario {
  name: string;
  entity: string;
  event: string;
  priority: number;
  inputs: string[];
  outcomes: string[];
  rows: Array<{ when: string[]; then: string[] }>;
  tests: Array<{ values: string[]; expectRow: number }>;
}

export type StepScenario =
  | { type: "A check"; field: string; test: string; value: string }
  | {
      type: "A repeat";
      field: string;
      test: string;
      value: string;
      max: string;
      inside: UpdateInside;
    }
  | { type: "Look up a rule table"; rule: string }
  | { type: "Create a record"; entity: string; values: string; saveAs?: string }
  | { type: "Update a field"; entity: string; target?: string; field: string; value: string }
  | { type: "Delete a record"; entity: string; target: string }
  | { type: "Work out a value"; operation: string; left: string; right: string; saveAs?: string }
  | { type: "Call a web service"; method: string; url: string; body?: string; saveAs?: string };

interface UpdateInside {
  entity: string;
  field: string;
  value: string;
}

export type WorkflowScenario =
  | {
      kind: "lifecycle";
      name: string;
      entity: string;
      hooks: Array<{ when: string; handler: string; field?: string }>;
      expectAfterReload: string[];
    }
  | {
      kind: "status";
      name: string;
      entity: string;
      states: string[];
      transitions: Array<{ from: string; to: string; trigger?: string }>;
      end: string[];
      expectEml: string[];
    }
  | {
      kind: "process";
      name: string;
      entity: string;
      startsFrom: "automatic" | "rule";
      operation?: string;
      steps: StepScenario[];
      expectAfterReload: string[];
      expectStored: string[];
    };

const labelled = (scope: Locator, text: string) =>
  scope.getByLabel(new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)).first();

export class LogicPage {
  constructor(
    readonly page: Page,
    readonly projectId: string
  ) {}

  /** The rail on the left: rules, then processes. */
  get rail(): Locator {
    return this.page.locator("aside").first();
  }

  /** The automation ladder, for Lifecycle and Process workflows. */
  get builder(): Locator {
    return this.page.locator("div.min-h-\\[560px\\]");
  }

  async open(): Promise<void> {
    await this.page.goto(`/projects/${this.projectId}/logic`);
    await expect(this.page.getByRole("heading", { name: "Rules and processes" })).toBeVisible();
    // A cold dev server compiles the route on first request.
    await expect(this.page.getByText("Loading the model…")).toHaveCount(0, { timeout: 60_000 });
  }

  async save(): Promise<void> {
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(this.page.getByText(/Saved to the model/)).toBeVisible({ timeout: 20_000 });
  }

  async select(name: string | RegExp): Promise<void> {
    await this.rail.getByRole("button", { name }).first().click();
  }

  /* ------------------------------------------------------------ rules */

  async createRule(rule: RuleScenario): Promise<void> {
    const page = this.page;
    await this.rail.getByRole("button", { name: "New" }).click();
    await page.getByPlaceholder("Sample expiry guard").fill(rule.name);
    await page.locator("label:has-text('Entity') select").first().selectOption(rule.entity);
    await page.locator("label:has-text('Runs on') select").selectOption(rule.event);
    await page.locator("label:has-text('Priority') input").fill(String(rule.priority));

    for (const [index, field] of rule.inputs.entries()) {
      if (index > 0) await page.getByRole("button", { name: "＋ input" }).click();
      await page.getByLabel(`Input ${index + 1} field`).selectOption(field);
    }
    for (const [index, label] of rule.outcomes.entries()) {
      if (index > 0) await page.getByRole("button", { name: "＋ outcome" }).click();
      await page.getByLabel(`Outcome ${index + 1} field`).selectOption({ label });
    }

    // A new table is only its catch-all; each row added goes above it.
    for (const [r, row] of rule.rows.entries()) {
      await page.getByRole("button", { name: "＋ Add row" }).click();
      for (const [i, field] of rule.inputs.entries()) {
        await page.getByLabel(`Row ${r + 1}, ${field}`, { exact: true }).fill(row.when[i] ?? "");
      }
      for (const [o, label] of rule.outcomes.entries()) {
        const cell = page.getByLabel(new RegExp(`^Row ${r + 1}, \\w+ answer$`)).nth(o);
        const value = row.then[o] ?? "";
        if ((await cell.evaluate((e) => e.tagName)) === "SELECT") await cell.selectOption(value);
        else await cell.fill(value);
        void label;
      }
    }
  }

  /** Type values into Test with values and read which row fits. */
  async testRule(values: string[]): Promise<string> {
    const panel = this.page.locator("section:has-text('Test with values')");
    for (const [i, value] of values.entries()) await panel.locator("input").nth(i).fill(value);
    return panel.locator("p").last().innerText();
  }

  /* ------------------------------------------------------- workflows */

  async createWorkflow(workflow: WorkflowScenario): Promise<void> {
    if (workflow.kind === "status") return this.createStatus(workflow);
    const button = workflow.kind === "lifecycle" ? "Lifecycle" : "Process";
    await this.rail.getByRole("button", { name: button, exact: true }).click();
    const area = this.builder;
    await area.locator("input").first().fill(workflow.name);

    if (workflow.kind === "lifecycle") {
      await area.locator("select").last().selectOption(workflow.entity);
      for (const [index, hook] of workflow.hooks.entries()) {
        if (index === 0) {
          await area.locator("button", { hasText: "When this happens" }).first().click();
        } else {
          await area.getByRole("button", { name: "＋ Add a lifecycle step" }).click();
        }
        await labelled(area, "Handler").fill(hook.handler);
        await labelled(area, "When").selectOption(hook.when);
        if (hook.field) await labelled(area, "Field").selectOption(hook.field);
      }
      return;
    }

    // The trigger panel: record type, then what starts it.
    const header = area.locator("select");
    await header.nth(0).selectOption(workflow.entity);
    await header.nth(1).selectOption(workflow.startsFrom);
    if (workflow.startsFrom === "automatic" && workflow.operation) {
      await header.nth(2).selectOption(workflow.operation);
    }
    for (const step of workflow.steps) await this.addStep(step);
  }

  private async addStep(step: StepScenario): Promise<void> {
    const area = this.builder;
    await area.getByRole("button", { name: "＋ Add a condition or an action" }).last().click();
    await area.locator("button", { hasText: step.type }).first().click();
    const field = (label: string) => labelled(area, label);

    switch (step.type) {
      case "A check":
        await field("Field to look at").selectOption(step.field);
        await field("Test").selectOption(step.test);
        await field("Value").fill(step.value);
        return;
      case "A repeat":
        await field("Field to look at").selectOption(step.field);
        await field("Keep going while").selectOption(step.test);
        await field("Value").fill(step.value);
        await field("Give up after").fill(step.max);
        // A repeat arrives with one step inside it; fill that one in.
        await area.locator("button", { hasText: "Set a field to" }).first().click();
        await field("Record type").selectOption(step.inside.entity);
        await field("Field to write").selectOption(step.inside.field);
        await field("New value").fill(step.inside.value);
        return;
      case "Look up a rule table":
        await field("Rule table").selectOption(step.rule);
        return;
      case "Create a record":
        await field("Record type").selectOption(step.entity);
        await field("Columns to set").fill(step.values);
        if (step.saveAs) await field("Save the answer as").fill(step.saveAs);
        return;
      case "Update a field":
        await field("Record type").selectOption(step.entity);
        if (step.target) await field("Which record").fill(step.target);
        await field("Field to write").selectOption(step.field);
        await field("New value").fill(step.value);
        return;
      case "Delete a record":
        await field("Record type").selectOption(step.entity);
        await field("Which record").fill(step.target);
        return;
      case "Work out a value":
        await field("Operation").selectOption(step.operation);
        await field("Value to work from").fill(step.left);
        await field("And this value").fill(step.right);
        if (step.saveAs) await field("Save the answer as").fill(step.saveAs);
        return;
      case "Call a web service":
        await field("Method").selectOption(step.method);
        await field("URL").fill(step.url);
        if (step.body) await field("Body").fill(step.body);
        if (step.saveAs) await field("Save the answer as").fill(step.saveAs);
        return;
    }
  }

  private async createStatus(
    workflow: Extract<WorkflowScenario, { kind: "status" }>
  ): Promise<void> {
    const page = this.page;
    await this.rail.getByRole("button", { name: "Status", exact: true }).click();
    await page.locator("label:has-text('Name') input").first().fill(workflow.name);
    await page.locator("label:has-text('Entity') select").first().selectOption(workflow.entity);

    // The canvas starts with its first state; rename it, then add the rest.
    const nodes = page.locator(".react-flow__node");
    await nodes.first().click();
    await page.getByPlaceholder("submitted").fill(workflow.states[0] ?? "draft");
    for (const state of workflow.states.slice(1)) {
      await page.getByRole("button", { name: "Add state" }).click();
      await page.getByPlaceholder("submitted").fill(state);
      if (workflow.end.includes(state)) await page.getByText("The process finishes here").click();
    }
    await expect(nodes).toHaveCount(workflow.states.length);

    for (const transition of workflow.transitions) {
      // Adding a state re-fits the canvas over 200ms; let it settle first.
      await page.waitForTimeout(400);
      const from = nodes.filter({ hasText: new RegExp(`^\\W*${transition.from}$`) });
      const to = nodes.filter({ hasText: new RegExp(`^\\W*${transition.to}$`) });
      const source = await from.locator(".react-flow__handle-right").boundingBox();
      const target = await to.locator(".react-flow__handle-left").boundingBox();
      if (!source || !target)
        throw new Error(`no handle for ${transition.from} → ${transition.to}`);
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 12,
      });
      await page.mouse.up();
      if (transition.trigger) {
        const edges = page.locator(".react-flow__edge");
        await edges.last().click({ force: true });
        await page.getByPlaceholder("submit").fill(transition.trigger);
      }
    }
    await expect(page.locator(".react-flow__edge")).toHaveCount(workflow.transitions.length);
  }

  /** The text of Show EML for whatever is selected. */
  async showEml(): Promise<string> {
    await this.page.getByRole("button", { name: "Show EML" }).click();
    return this.page.locator("pre").last().innerText();
  }
}
