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

import type { Entity, EntityAttribute, Relationship } from "@erdwithai/core/types";

// Type mapping from Mermaid types to our standard types
const TYPE_MAP: Record<string, EntityAttribute["type"]> = {
  // String types
  string: "string",
  varchar: "string",
  char: "string",
  text: "text",
  longtext: "text",

  // Number types
  int: "integer",
  integer: "integer",
  bigint: "integer",
  smallint: "integer",
  number: "decimal",
  decimal: "decimal",
  float: "decimal",
  double: "decimal",
  money: "decimal",

  // Boolean
  bool: "boolean",
  boolean: "boolean",

  // Date/Time
  date: "date",
  datetime: "datetime",
  timestamp: "datetime",
  time: "datetime",

  // JSON
  json: "json",
  jsonb: "json",
  object: "json",
  array: "json",

  // UUID
  uuid: "string",
  guid: "string",
};

export class MermaidParser {
  /**
   * Parse Mermaid ERD syntax
   * @param mermaidSyntax - Raw Mermaid ERD content
   * @returns Parsed entities and relationships
   */
  parse(mermaidSyntax: string): { entities: Entity[]; relationships: Relationship[] } {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Normalize line endings
    const normalizedContent = mermaidSyntax.replace(/\r\n/g, "\n");
    const lines = normalizedContent.split("\n");

    let currentEntity: Partial<Entity> | null = null;
    let currentAttributes: EntityAttribute[] = [];
    let inEntityBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      // Skip empty lines, comments, and erDiagram declaration
      if (!trimmed || trimmed === "erDiagram" || trimmed.startsWith("%%")) {
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
      if (entityStartMatch && entityStartMatch[1]) {
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

    return { entities, relationships };
  }

  /**
   * Parse a relationship line
   *
   * Mermaid relationship syntax:
   * - ||--|| : one-to-one
   * - ||--o{ : one-to-many
   * - }o--|| : many-to-one
   * - }o--o{ : many-to-many
   * - |o--o| : zero-or-one to zero-or-one
   */
  private parseRelationship(line: string): Relationship | null {
    // Patterns for different relationship types
    const patterns: Array<{
      regex: RegExp;
      cardinality: Relationship["cardinality"];
    }> = [
      // one-to-one: ||--||
      {
        regex:
          /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\|\|--\|\|\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"?([^"]+)"?$/,
        cardinality: "oneToOne",
      },
      // one-to-many: ||--o{ or ||--|{
      {
        regex:
          /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\|\|--o?\{\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"?([^"]+)"?$/,
        cardinality: "oneToMany",
      },
      // many-to-one: }o--|| or }{--||
      {
        regex:
          /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\}o?--\|\|\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"?([^"]+)"?$/,
        cardinality: "manyToOne",
      },
      // many-to-many: }o--o{ or }{--|{
      {
        regex:
          /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\}o?--o?\{\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"?([^"]+)"?$/,
        cardinality: "manyToMany",
      },
      // Also support zero-or-one patterns
      {
        regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\|o--o\|\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"?([^"]+)"?$/,
        cardinality: "oneToOne",
      },
    ];

    for (const { regex, cardinality } of patterns) {
      const match = line.match(regex);
      if (match && match[1] && match[2] && match[3]) {
        return {
          name: this.normalizeRelationshipName(match[3]),
          sourceEntity: match[1],
          targetEntity: match[2],
          cardinality,
          foreignKey: this.generateForeignKey(match[2], cardinality),
        };
      }
    }

    // Try simpler pattern without relationship name
    const simplePatterns: Array<{
      regex: RegExp;
      cardinality: Relationship["cardinality"];
    }> = [
      {
        regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\|\|--\|\|\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
        cardinality: "oneToOne",
      },
      {
        regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\|\|--o?\{\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
        cardinality: "oneToMany",
      },
      {
        regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\}o?--\|\|\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
        cardinality: "manyToOne",
      },
      {
        regex: /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\}o?--o?\{\s+([a-zA-Z_][a-zA-Z0-9_]*)$/,
        cardinality: "manyToMany",
      },
    ];

    for (const { regex, cardinality } of simplePatterns) {
      const match = line.match(regex);
      if (match && match[1] && match[2]) {
        return {
          name: `${match[1].toLowerCase()}_${match[2].toLowerCase()}`,
          sourceEntity: match[1],
          targetEntity: match[2],
          cardinality,
          foreignKey: this.generateForeignKey(match[2], cardinality),
        };
      }
    }

    return null;
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

    // Map type to standard type
    const type = TYPE_MAP[rawType] || "string";

    // Parse modifiers
    const isPrimaryKey = modifiers.includes("PK");
    // Note: FK modifier is used for future reference tracking
    // const isForeignKey = modifiers.includes('FK');
    const isUnique = modifiers.includes("UK") || modifiers.includes("UNIQUE");
    const isOptional = modifiers.includes("OPTIONAL") || modifiers.includes("NULL");

    // Extract max length if specified (e.g., string(255))
    const lengthMatch = (parts[0] ?? "").match(/\((\d+)\)/);
    const maxLength = lengthMatch && lengthMatch[1] ? parseInt(lengthMatch[1], 10) : undefined;

    return {
      name,
      type,
      required: !isOptional && !isPrimaryKey, // PK is auto-generated
      unique: isUnique || isPrimaryKey,
      maxLength,
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
    const hasIdAttribute = attributes.some((a) => a.name === "id" || a.name.endsWith("_id"));

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
