/**
 * The rule and workflow editors a generated application ships are this tool's.
 *
 * They were copies, and they drifted: the generated app's builder lost steps
 * placed after a lifecycle hook, split every `url: https://…` at `https:` so a
 * web-service step reopened empty, wrote a Create step's values where its
 * runtime could not read them, and tested a rule table without unquoting the
 * value typed. Each was fixed here first and not there. `generated-app-parity`
 * compared what the two serialise, which is why the components drifted
 * unnoticed — it never looked at the screen.
 *
 * So the files are held byte-identical. The one deliberate difference is
 * `AutomationHelp.tsx`: each host renders its help in its own frame (a full
 * pane here, the help toaster there).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB = path.resolve(__dirname, "../../..");
const GENERATED = path.resolve(
  __dirname,
  "../../../../../generator/templates/tanstack-start-nestjs/frontend/src"
);

const SHARED_EDITOR_FILES = [
  "components/automation/AutomationBuilder.tsx",
  "components/automation/StepInspector.tsx",
  "components/automation/RuleTableEditor.tsx",
  "components/automation/LadderCard.tsx",
  "components/automation/RailList.tsx",
  "lib/automation/model.ts",
  "lib/automation/rule-content.ts",
  "lib/workflow/bpmn-model.ts",
] as const;

describe("the editors a generated application ships", () => {
  for (const file of SHARED_EDITOR_FILES) {
    it(`ships ${file} exactly as this tool runs it`, () => {
      const here = readFileSync(path.join(WEB, file), "utf8");
      const there = readFileSync(path.join(GENERATED, file), "utf8");
      expect(there === here, `${file} differs; copy packages/web/src/${file} over it`).toBe(true);
    });
  }
});
