import type { Relationship } from "@appwithai/core/types";

/**
 * The foreign key constraints the bus-tables migration may add.
 *
 * The migration used to emit one for every `oneToMany` relationship, naming the
 * column `<parent>_id` on the child. A model is free to call the column
 * something else — `relationship_manager_id` on a Household whose parent is an
 * `Advisor` — and then the constraint names a column the table does not have.
 * PostgreSQL refuses it, the migration swallows the refusal, and the result is
 * sixteen `column "advisor_id" referenced in foreign key constraint does not
 * exist` errors in the database log on the first start of a perfectly healthy
 * application, with the relationship quietly left unconstrained.
 *
 * So a constraint is only emitted where both tables exist and the child really
 * carries the column.
 */
export function buildFkConstraints(
  busEntities: Array<{
    tableName: string;
    originalName?: string;
    name: string;
    attributes?: Array<{ name: string; columnName?: string }>;
  }>,
  relationships: Relationship[]
): Array<{ childTable: string; parentTable: string; column: string; name: string }> {
  const byName = new Map(
    busEntities.map((entity) => [(entity.originalName || entity.name).toLowerCase(), entity])
  );
  const constraints: Array<{
    childTable: string;
    parentTable: string;
    column: string;
    name: string;
  }> = [];
  const seen = new Set<string>();

  for (const relationship of relationships) {
    if (relationship.cardinality !== "oneToMany") continue;
    const parent = byName.get(relationship.sourceEntity.toLowerCase());
    const child = byName.get(relationship.targetEntity.toLowerCase());
    if (!parent || !child) continue;

    const column = `${parent.tableName.replace(/^bus_/, "")}_id`;
    const carriesColumn = (child.attributes ?? []).some(
      (attribute) => (attribute.columnName || attribute.name) === column
    );
    if (!carriesColumn) continue;

    const name = `fk_${child.tableName}_${column}`;
    if (seen.has(name)) continue;
    seen.add(name);
    constraints.push({ childTable: child.tableName, parentTable: parent.tableName, column, name });
  }
  return constraints;
}
