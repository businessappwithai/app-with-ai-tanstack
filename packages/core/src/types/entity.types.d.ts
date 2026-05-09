export interface EntityAttribute {
  name: string;
  type: "string" | "integer" | "decimal" | "boolean" | "date" | "datetime" | "text" | "json";
  required: boolean;
  unique?: boolean;
  default?: any;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
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
export type EntityDefinition = Entity;

import { z } from "zod";
export declare const EntityAttributeSchema: z.ZodObject<
  {
    name: z.ZodString;
    type: z.ZodEnum<
      ["string", "integer", "decimal", "boolean", "date", "datetime", "text", "json"]
    >;
    required: z.ZodBoolean;
    unique: z.ZodOptional<z.ZodBoolean>;
    default: z.ZodOptional<z.ZodAny>;
    maxLength: z.ZodOptional<z.ZodNumber>;
    minLength: z.ZodOptional<z.ZodNumber>;
    pattern: z.ZodOptional<z.ZodString>;
  },
  "strip",
  z.ZodTypeAny,
  {
    name: string;
    type: "string" | "boolean" | "integer" | "decimal" | "date" | "datetime" | "text" | "json";
    required: boolean;
    unique?: boolean | undefined;
    default?: any;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
  },
  {
    name: string;
    type: "string" | "boolean" | "integer" | "decimal" | "date" | "datetime" | "text" | "json";
    required: boolean;
    unique?: boolean | undefined;
    default?: any;
    maxLength?: number | undefined;
    minLength?: number | undefined;
    pattern?: string | undefined;
  }
>;
export declare const EntitySchema: z.ZodObject<
  {
    name: z.ZodString;
    tableName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    attributes: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          type: z.ZodEnum<
            ["string", "integer", "decimal", "boolean", "date", "datetime", "text", "json"]
          >;
          required: z.ZodBoolean;
          unique: z.ZodOptional<z.ZodBoolean>;
          default: z.ZodOptional<z.ZodAny>;
          maxLength: z.ZodOptional<z.ZodNumber>;
          minLength: z.ZodOptional<z.ZodNumber>;
          pattern: z.ZodOptional<z.ZodString>;
        },
        "strip",
        z.ZodTypeAny,
        {
          name: string;
          type:
            | "string"
            | "boolean"
            | "integer"
            | "decimal"
            | "date"
            | "datetime"
            | "text"
            | "json";
          required: boolean;
          unique?: boolean | undefined;
          default?: any;
          maxLength?: number | undefined;
          minLength?: number | undefined;
          pattern?: string | undefined;
        },
        {
          name: string;
          type:
            | "string"
            | "boolean"
            | "integer"
            | "decimal"
            | "date"
            | "datetime"
            | "text"
            | "json";
          required: boolean;
          unique?: boolean | undefined;
          default?: any;
          maxLength?: number | undefined;
          minLength?: number | undefined;
          pattern?: string | undefined;
        }
      >,
      "many"
    >;
    primaryKey: z.ZodString;
    timestamps: z.ZodBoolean;
  },
  "strip",
  z.ZodTypeAny,
  {
    name: string;
    tableName: string;
    attributes: {
      name: string;
      type: "string" | "boolean" | "integer" | "decimal" | "date" | "datetime" | "text" | "json";
      required: boolean;
      unique?: boolean | undefined;
      default?: any;
      maxLength?: number | undefined;
      minLength?: number | undefined;
      pattern?: string | undefined;
    }[];
    primaryKey: string;
    timestamps: boolean;
    description?: string | undefined;
  },
  {
    name: string;
    tableName: string;
    attributes: {
      name: string;
      type: "string" | "boolean" | "integer" | "decimal" | "date" | "datetime" | "text" | "json";
      required: boolean;
      unique?: boolean | undefined;
      default?: any;
      maxLength?: number | undefined;
      minLength?: number | undefined;
      pattern?: string | undefined;
    }[];
    primaryKey: string;
    timestamps: boolean;
    description?: string | undefined;
  }
>;
//# sourceMappingURL=entity.types.d.ts.map
