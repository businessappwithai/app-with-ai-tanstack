/**
 * Mermaid ERD Parser
 *
 * Parses Mermaid ER diagram syntax and extracts entities and relationships.
 * Supports standard Mermaid ERD notation including:
 * - Entity definitions with attributes
 * - Relationship cardinalities (||--||, ||--o{, }o--||, }o--o{)
 * - Attribute types (string, integer, boolean, date, etc.)
 * - Attribute modifiers (PK, FK, UK, OPTIONAL)
 *
 * @example
 * ```mermaid
 * erDiagram
 *   Customer {
 *     string id PK
 *     string name
 *     string email UK
 *     date created_at
 *   }
 *   Order ||--o{ OrderItem : contains
 * ```
 */

import type {
  Entity,
  EntityAttribute,
  EntityEnum,
  EntityIndex,
  Relationship,
} from "@erdwithai/core/types";
import { getCardinalityKind, getDefaultType, getTypeMap } from "./language-maps";

// Type mapping from Mermaid types to our standard types.
// Sourced from language/erdwithai-language.json at runtime (with a built-in
// fallback) so the parser stays in lockstep with the EML language definition.
const TYPE_MAP: Record<string, EntityAttribute["type"]> = getTypeMap();

export class MermaidParser {
  /**
   * Parse Mermaid ERD syntax
   * @param mermaidSyntax - Raw Mermaid ERD content
   * @returns Parsed entities and relationships
   */
  parse(mermaidSyntax: string): {
    entities: Entity[];
    relationships: Relationship[];
    enums: EntityEnum[];
  } {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Normalize line endings
    const normalizedContent = mermaidSyntax.replace(/\r\n/g, "\n");
    const lines = normalizedContent.split("\n");

    let currentEntity: Partial<Entity> | null = null;
    let currentAttributes: EntityAttribute[] = [];
    let inEntityBlock = false;

    /**
     * `%%index` names its entity, so declarations are collected as they appear
     * and attached at the end. Binding them as we go would depend on the
     * directive following the entity block it refers to, which the language
     * does not require.
     */
    const declaredIndexes: Array<{ entity: string } & EntityIndex> = [];

    /**
     * `%%enum Name: a, b, c` and the `%%field Entity.column enum: Name` lines
     * that bind columns to it. Both are collected as they appear and resolved
     * at the end, for the same reason as `%%index`: the language does not say
     * a directive has to follow the block it refers to.
     */
    const declaredEnums = new Map<string, string[]>();
    const enumBindings: Array<{ entity: string; column: string; enumName: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      // Skip empty lines, comments, and erDiagram declaration. `%%index` is the
      // exception: it is a directive, not prose, and is read before the blanket
      // comment skip that would otherwise swallow it.
      if (!trimmed || trimmed === "erDiagram") {
        continue;
      }
      if (trimmed.startsWith("%%")) {
        const index = this.parseIndexDirective(trimmed);
        if (index) declaredIndexes.push(index);
        const declaredEnum = this.parseEnumDirective(trimmed);
        if (declaredEnum && !declaredEnums.has(declaredEnum.name)) {
          declaredEnums.set(declaredEnum.name, declaredEnum.values);
        }
        const binding = this.parseFieldEnumDirective(trimmed);
        if (binding) enumBindings.push(binding);
        continue;
      }

      // Parse relationship (can appear before or after entity definitions)
      const relationship = this.parseRelationship(trimmed);
      if (relationship) {
        relationships.push(relationship);
        continue;
      }

      // Parse entity start: "EntityName {", "entity_name {", or "bus_entity {"
      const entityStartMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*\{$/);
      if (entityStartMatch?.[1]) {
        // Save previous entity if exists
        if (currentEntity && currentAttributes.length > 0) {
          entities.push(this.completeEntity(currentEntity, currentAttributes));
        }

        currentEntity = {
          name: entityStartMatch[1],
        };
        currentAttributes = [];
        inEntityBlock = true;
        continue;
      }

      // Parse entity end
      if (trimmed === "}") {
        if (currentEntity) {
          entities.push(this.completeEntity(currentEntity, currentAttributes));
          currentEntity = null;
          currentAttributes = [];
        }
        inEntityBlock = false;
        continue;
      }

      // Parse attribute (only if inside entity block)
      if (inEntityBlock && currentEntity) {
        const attr = this.parseAttribute(trimmed);
        if (attr) {
          currentAttributes.push(attr);
        }
      }
    }

    // Handle entity without closing brace (edge case)
    if (currentEntity && currentAttributes.length > 0) {
      entities.push(this.completeEntity(currentEntity, currentAttributes));
    }

    this.attachIndexes(entities, declaredIndexes);
    const enums = this.attachEnums(entities, declaredEnums, enumBindings);

    return { entities, relationships, enums };
  }

  /**
   * `%%index Entity(col)` or `%%index Entity(a, b) unique`.
   *
   * Returns null for any other `%%` line, which is how the caller tells a
   * directive from a comment.
   */
  private parseIndexDirective(line: string): ({ entity: string } & EntityIndex) | null {
    const match = line.match(/^%%index\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(unique)?\s*$/i);
    if (!match?.[1]) return null;

    const columns = (match[2] ?? "")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    if (columns.length === 0) return null;

    return { entity: match[1], columns, unique: Boolean(match[3]) };
  }

  /**
   * Bind each declaration to the entity it names.
   *
   * A declaration naming an unknown entity, or a column the entity does not
   * have, is dropped rather than emitted: the migration would fail at run time
   * on a column that does not exist, and a migration that cannot apply is worse
   * than a missing index. The checker is what reports these to the author.
   */
  private attachIndexes(
    entities: Entity[],
    declared: Array<{ entity: string } & EntityIndex>
  ): void {
    for (const { entity: entityName, columns, unique } of declared) {
      const entity = entities.find((candidate) => candidate.name === entityName);
      if (!entity) continue;

      const known = new Set(entity.attributes.map((attribute) => attribute.name));
      if (!columns.every((column) => known.has(column))) continue;

      entity.indexes = entity.indexes ?? [];
      entity.indexes.push({ columns, unique });
    }
  }

  /** `%%enum OrderStatus: draft, submitted, approved` */
  private parseEnumDirective(line: string): { name: string; values: string[] } | null {
    const match = line.match(/^%%enum\s+([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (!match?.[1] || !match[2]) return null;
    const values = match[2]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return values.length > 0 ? { name: match[1], values } : null;
  }

  /** `%%field Order.status enum: OrderStatus` — the only %%field key read here. */
  private parseFieldEnumDirective(
    line: string
  ): { entity: string; column: string; enumName: string } | null {
    const match = line.match(
      /^%%field\s+([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s+enum\s*:\s*([A-Za-z_]\w*)\s*$/
    );
    if (!match?.[1] || !match[2] || !match[3]) return null;
    return { entity: match[1], column: match[2], enumName: match[3] };
  }

  /**
   * Bind columns to their enums and allocate a sys_reference_id per enum.
   *
   * Ids run from 1000 up in sorted name order, which keeps them stable for a
   * given model: the generated forms render any reference at or above 1000 as a
   * dropdown fed by /sys/ref-list, so this allocation is what turns a modelled
   * enum into a select rather than a free-text box.
   *
   * Only enums something actually binds to get an id. A declared-but-unused
   * enum is documentation, and seeding a reference nothing points at would put
   * a dropdown in the dictionary that no field can ever show.
   */
  private attachEnums(
    entities: Entity[],
    declared: Map<string, string[]>,
    bindings: Array<{ entity: string; column: string; enumName: string }>
  ): EntityEnum[] {
    const used = new Set<string>();
    for (const binding of bindings) {
      if (!declared.has(binding.enumName)) continue;
      const entity = entities.find((candidate) => candidate.name === binding.entity);
      const attribute = entity?.attributes.find((candidate) => candidate.name === binding.column);
      if (attribute) used.add(binding.enumName);
    }

    const referenceIds = new Map<string, number>();
    let nextId = 1000;
    for (const name of [...used].sort()) {
      referenceIds.set(name, nextId++);
    }

    for (const binding of bindings) {
      const values = declared.get(binding.enumName);
      const referenceId = referenceIds.get(binding.enumName);
      if (!values || !referenceId) continue;
      const entity = entities.find((candidate) => candidate.name === binding.entity);
      const attribute = entity?.attributes.find((candidate) => candidate.name === binding.column);
      if (!attribute) continue;
      attribute.enumRef = binding.enumName;
      attribute.enumValues = values;
      attribute.enumReferenceId = referenceId;
    }

    return [...referenceIds.entries()].map(([name, referenceId]) => ({
      name,
      values: declared.get(name) ?? [],
      referenceId,
    }));
  }

  /**
   * Parse a relationship line.
   *
   * Supports all 8 Mermaid ER cardinality operators defined in the EML language
   * spec by delegating operator→kind resolution to getCardinalityKind() so the
   * parser stays in lockstep with erdwithai-language.json.
   *
   * Left side glyphs:  ||  |o  }o  }|
   * Right side glyphs: ||  o|  o{  |{
   */
  private parseRelationship(line: string): Relationship | null {
    // Captures: entity  left--right  entity  optional-label
    const rel =
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s+(\|[|o]|\}[o|])--(o[|{]|\|[|{])\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*"?([^"]*)"?)?$/;
    const match = line.match(rel);
    if (!match?.[1] || !match[4]) return null;

    const [, sourceEntity, left, right, targetEntity, rawLabel] = match;
    const operator = `${left}--${right}`;
    const cardinality = getCardinalityKind(operator);
    if (!cardinality) return null;

    const name = rawLabel?.trim()
      ? this.normalizeRelationshipName(rawLabel.trim())
      : `${sourceEntity.toLowerCase()}_${targetEntity.toLowerCase()}`;

    return {
      name,
      sourceEntity: sourceEntity!,
      targetEntity: targetEntity!,
      cardinality,
      foreignKey: this.generateForeignKey(targetEntity!, cardinality),
    };
  }

  /**
   * Parse an attribute line
   *
   * Format: type name [modifiers]
   * Examples:
   *   string name
   *   integer id PK
   *   string email UK
   *   decimal price OPTIONAL
   *   string customer_id FK
   */
  private parseAttribute(line: string): EntityAttribute | null {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) return null;

    // Split into parts (type, name, modifiers...)
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;

    const rawType = (parts[0] ?? "").toLowerCase();
    const name = parts[1];
    if (!name) return null;
    const modifiers = parts.slice(2).map((m) => m.toUpperCase());

    // Map type to standard type (unknown aliases fall back to the language default)
    const type = TYPE_MAP[rawType] || getDefaultType();

    // Parse modifiers
    const isPrimaryKey = modifiers.includes("PK");
    const isForeignKey = modifiers.includes("FK");
    const isUnique = modifiers.includes("UK") || modifiers.includes("UNIQUE");
    const isOptional = modifiers.includes("OPTIONAL") || modifiers.includes("NULL");

    // Extract max length if specified (e.g., string(255))
    const lengthMatch = (parts[0] ?? "").match(/\((\d+)\)/);
    const maxLength = lengthMatch?.[1] ? parseInt(lengthMatch[1], 10) : undefined;

    return {
      name,
      type,
      required: !isOptional && !isPrimaryKey, // PK is auto-generated
      unique: isUnique || isPrimaryKey,
      maxLength,
      ...(isForeignKey && { isForeignKey: true }),
    };
  }

  /**
   * Complete entity with default values
   */
  private completeEntity(partial: Partial<Entity>, attributes: EntityAttribute[]): Entity {
    const name = partial.name ?? "";
    if (!name) {
      throw new Error("Entity name is required");
    }

    // Convert PascalCase to snake_case for table name
    const tableName = this.toSnakeCase(name);

    // Check if id attribute exists, otherwise auto-add
    const hasIdAttribute = attributes.some(
      (a) => a.name === "id" || (a.unique && a.name.endsWith("_id"))
    );

    if (!hasIdAttribute) {
      // Add id as first attribute
      attributes.unshift({
        name: "id",
        type: "string", // UUID
        required: true,
        unique: true,
      });
    }

    // Find primary key (look for PK modifier or 'id' field)
    const pkAttribute = attributes.find((a) => a.unique && a.name === "id");
    const primaryKey = pkAttribute?.name || "id";

    return {
      name,
      tableName,
      description: ``,
      attributes,
      primaryKey,
      timestamps: true,
    };
  }

  /**
   * Convert PascalCase to snake_case
   * Handles:
   * - PascalCase: PascalCase → pascal_case
   * - camelCase: camelCase → camel_case
   * - CONSTANT_CASE: CONSTANT_CASE → constant_case
   * - snake_case: snake_case → snake_case
   */
  private toSnakeCase(str: string): string {
    // If string is already snake_case format (contains only uppercase letters, numbers, and underscores)
    // just convert to lowercase
    if (/^[A-Z0-9_]+$/.test(str)) {
      return str.toLowerCase();
    }

    // Otherwise, convert PascalCase/camelCase to snake_case
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  /**
   * Normalize relationship name
   */
  private normalizeRelationshipName(name: string): string {
    return name.trim().replace(/\s+/g, "_").toLowerCase();
  }

  /**
   * Generate foreign key name based on relationship
   * Removes bus_ prefix if present to match actual database schema
   */
  private generateForeignKey(
    targetEntity: string,
    _cardinality: Relationship["cardinality"]
  ): string {
    const snakeName = this.toSnakeCase(targetEntity);
    // Remove bus_ prefix if present to match actual database schema
    const cleanName = snakeName.replace(/^bus_/, "");
    return `${cleanName}_id`;
  }
}

export default MermaidParser;
