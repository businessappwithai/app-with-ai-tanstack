/**
 * What a rule or workflow must carry before it may be written into the model.
 *
 * A rule saved with no entity became `%%rule name on  event: …`, which the
 * checker reads as a rule on an entity called "event" — a warning, not an
 * error, so the model still checked clean while the rule could never fire.
 * The Logic page asks this before it sends, and the route asks it again
 * because the page is not its only caller.
 */

export interface SectionProblem {
  kind: "rule" | "workflow";
  index: number;
  message: string;
}

interface Named {
  name?: unknown;
  title?: unknown;
  entity?: unknown;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function sectionProblems(
  rules: readonly Named[] = [],
  workflows: readonly Named[] = []
): SectionProblem[] {
  const problems: SectionProblem[] = [];
  const check = (kind: SectionProblem["kind"], items: readonly Named[]) => {
    const noun = kind === "rule" ? "Rule" : "Process";
    items.forEach((item, index) => {
      const label = text(item.title) || text(item.name);
      if (!label) {
        problems.push({ kind, index, message: `${noun} ${index + 1} has no name.` });
      }
      if (!text(item.entity)) {
        problems.push({
          kind,
          index,
          message: `${noun} "${label || index + 1}" has no entity. Choose the entity it runs on.`,
        });
      }
    });
  };
  check("rule", rules);
  check("workflow", workflows);
  return problems;
}
