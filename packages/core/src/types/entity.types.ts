export interface EntityAttribute {
  name: string;
  type: "string" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "text" | "json";
  required: boolean;
  unique?: boolean;
  default?: unknown;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  isForeignKey?: boolean;
}

export interface Entity {
  name: string;
  tableName: string;
  description?: string;
  attributes: EntityAttribute[];
  primaryKey: string;
  timestamps: boolean;
}

export interface Relationship {
  name: string;
  sourceEntity: string;
  targetEntity: string;
  cardinality: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";
  foreignKey?: string;
  inverseForeignKey?: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT";
}

// EntityDefinition is an alias for Entity for service layer compatibility
export type EntityDefinition = Entity;

// Zod schema for entity validation
import { z } from "zod";

export const EntityAttributeSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "integer", "decimal", "boolean", "date", "datetime", "text", "json"]),
  required: z.boolean(),
  unique: z.boolean().optional(),
  default: z.any().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  pattern: z.string().optional(),
});

export const EntitySchema = z.object({
  name: z.string(),
  tableName: z.string(),
  description: z.string().optional(),
  attributes: z.array(EntityAttributeSchema),
  primaryKey: z.string(),
  timestamps: z.boolean(),
});
