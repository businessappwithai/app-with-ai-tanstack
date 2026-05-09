/**
 * Base E2E Test Generator
 * Provides common functionality for generating E2E tests
 */

import type { Entity, Relationship } from "@erdwithai/core/types";

export interface E2ETestConfig {
  entities: Entity[];
  relationships: Relationship[];
  projectName: string;
  outputDir: string;
  apiUrl: string;
}

export abstract class BaseE2ETestGenerator {
  protected config: E2ETestConfig;

  constructor(config: E2ETestConfig) {
    this.config = config;
  }

  /**
   * Generate all E2E tests
   */
  abstract generate(): Promise<void>;

  /**
   * Get test data for entities
   */
  protected generateTestData(): string {
    const lines: string[] = [];
    lines.push("// Test data fixtures");
    lines.push("export const testData = {");

    for (const entity of this.config.entities) {
      lines.push(`  ${entity.name.toLowerCase()}: {`);
      lines.push(`    create: {`);

      // Generate sample data based on attributes
      const sampleData = this.getSampleDataForEntity(entity);
      lines.push(`      ${sampleData},`);
      lines.push(`    },`);
      lines.push(`  },`);
    }

    lines.push("};");
    return lines.join("\n");
  }

  /**
   * Get sample data for an entity
   */
  protected getSampleDataForEntity(entity: Entity): string {
    const fields: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;

      const value = this.getMockValueForType(attr.type, attr.name);
      fields.push(`      ${attr.name}: ${value}`);
    }

    return `{\n${fields.join(",\n")}\n    }`;
  }

  /**
   * Get mock value for a type
   */
  protected getMockValueForType(type: string, fieldName: string): string {
    const typeLower = type.toLowerCase();

    if (
      typeLower.includes("string") ||
      typeLower.includes("text") ||
      typeLower.includes("varchar")
    ) {
      if (fieldName.includes("email")) {
        return `'test@example.com'`;
      }
      if (fieldName.includes("name")) {
        return `'Test Name'`;
      }
      if (fieldName.includes("phone")) {
        return `'+1234567890'`;
      }
      return `'test_value'`;
    }

    if (
      typeLower.includes("int") ||
      typeLower.includes("number") ||
      typeLower.includes("integer")
    ) {
      return `123`;
    }

    if (
      typeLower.includes("decimal") ||
      typeLower.includes("float") ||
      typeLower.includes("double")
    ) {
      return `123.45`;
    }

    if (typeLower.includes("bool") || typeLower.includes("boolean")) {
      return `true`;
    }

    if (typeLower.includes("date") || typeLower.includes("time")) {
      return `new Date().toISOString()`;
    }

    return `'test_value'`;
  }

  /**
   * Generate unique test data
   */
  protected generateUniqueData(entity: Entity, index: number): string {
    const fields: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;

      const value = this.getUniqueMockValue(attr.type, attr.name, index);
      fields.push(`      ${attr.name}: ${value}`);
    }

    return `{\n${fields.join(",\n")}\n    }`;
  }

  protected getUniqueMockValue(type: string, fieldName: string, index: number): string {
    const typeLower = type.toLowerCase();

    if (
      typeLower.includes("string") ||
      typeLower.includes("text") ||
      typeLower.includes("varchar")
    ) {
      if (fieldName.includes("email")) {
        return `'test${index}@example.com'`;
      }
      if (fieldName.includes("name")) {
        return `'Test Name ${index}'`;
      }
      return `'test_value_${index}'`;
    }

    if (
      typeLower.includes("int") ||
      typeLower.includes("number") ||
      typeLower.includes("integer")
    ) {
      return `${100 + index}`;
    }

    if (typeLower.includes("decimal") || typeLower.includes("float")) {
      return `${(100.5 + index).toFixed(2)}`;
    }

    return `'test_${index}'`;
  }
}
