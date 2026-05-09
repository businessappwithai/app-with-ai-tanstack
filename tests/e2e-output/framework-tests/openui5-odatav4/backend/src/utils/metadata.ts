/**
 * OData Metadata Builder
 *
 * Builds $metadata document dynamically from sys_table and sys_column.
 * Supports runtime schema updates when new entities are added.
 *
 * Generated: 2026-02-09T13:00:26.929Z
 */

import type { Knex } from "knex";

interface EntityTypeProperty {
  name: string;
  type: string;
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface EntityType {
  name: string;
  keys: string[];
  properties: EntityTypeProperty[];
}

interface EntitySet {
  name: string;
  entityType: string;
}

/**
 * OData EDM type mapping from database types
 */
const typeMapping: Record<string, string> = {
  string: "Edm.String",
  text: "Edm.String",
  integer: "Edm.Int32",
  bigint: "Edm.Int64",
  decimal: "Edm.Decimal",
  double: "Edm.Double",
  float: "Edm.Double",
  boolean: "Edm.Boolean",
  date: "Edm.Date",
  datetime: "Edm.DateTimeOffset",
  timestamp: "Edm.DateTimeOffset",
  uuid: "Edm.Guid",
  json: "Edm.String",
  money: "Edm.Decimal",
};

/**
 * Convert database type to OData EDM type
 */
export function toEdmType(dbType: string): string {
  return typeMapping[dbType.toLowerCase()] || "Edm.String";
}

/**
 * Build entity type from sys_table and sys_column
 */
export async function buildEntityType(db: Knex, tableName: string): Promise<EntityType> {
  // Get columns from sys_column
  const columns = await db("sys_column")
    .where("table_name", tableName)
    .where("is_active", true)
    .where("is_deleted", false)
    .orderBy("position");

  const properties: EntityTypeProperty[] = columns.map((col) => ({
    name: col.column_name,
    type: toEdmType(col.data_type),
    nullable: !col.is_mandatory,
    maxLength: col.field_length || undefined,
    precision: col.data_type === "decimal" ? 18 : undefined,
    scale: col.data_type === "decimal" ? 2 : undefined,
  }));

  // Find primary key
  const keyColumn = columns.find((col) => col.is_key);
  const keys = keyColumn ? [keyColumn.column_name] : ["id"];

  return {
    name: pascalCase(tableName),
    keys,
    properties,
  };
}

/**
 * Build full metadata document
 */
export async function buildMetadata(db: Knex): Promise<string> {
  // Get all active tables
  const tables = await db("sys_table")
    .where("is_active", true)
    .where("is_deleted", false)
    .orderBy("table_name");

  const entityTypes: EntityType[] = [];
  const entitySets: EntitySet[] = [];

  // Add system entity types
  const systemEntities = [
    "sys_table",
    "sys_column",
    "sys_window",
    "sys_tab",
    "sys_field",
    "sys_reference",
    "sys_val_rule",
    "sys_user",
    "sys_role",
    "sys_access",
  ];

  for (const sysTable of systemEntities) {
    const entityType = await buildEntityType(db, sysTable);
    entityTypes.push(entityType);
    entitySets.push({
      name: pluralize(entityType.name),
      entityType: `Openui5Odatav4TestApp.${entityType.name}`,
    });
  }

  // Add business entity types
  for (const table of tables) {
    if (!systemEntities.includes(table.table_name)) {
      const entityType = await buildEntityType(db, table.table_name);
      entityTypes.push(entityType);
      entitySets.push({
        name: pluralize(entityType.name),
        entityType: `Openui5Odatav4TestApp.${entityType.name}`,
      });
    }
  }

  return generateEdmx(entityTypes, entitySets);
}

/**
 * Generate EDMX XML document
 */
function generateEdmx(entityTypes: EntityType[], entitySets: EntitySet[]): string {
  const namespace = "Openui5Odatav4TestApp";

  const entityTypesXml = entityTypes
    .map((et) => {
      const keysXml = et.keys.map((k) => `        <PropertyRef Name="${k}" />`).join("\n");
      const propsXml = et.properties
        .map((p) => {
          let prop = `      <Property Name="${p.name}" Type="${p.type}"`;
          if (!p.nullable) prop += ' Nullable="false"';
          if (p.maxLength) prop += ` MaxLength="${p.maxLength}"`;
          if (p.precision) prop += ` Precision="${p.precision}"`;
          if (p.scale) prop += ` Scale="${p.scale}"`;
          prop += " />";
          return prop;
        })
        .join("\n");

      return `    <EntityType Name="${et.name}">
      <Key>
${keysXml}
      </Key>
${propsXml}
    </EntityType>`;
    })
    .join("\n\n");

  const entitySetsXml = entitySets
    .map((es) => `      <EntitySet Name="${es.name}" EntityType="${es.entityType}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="${namespace}" xmlns="http://docs.oasis-open.org/odata/ns/edm">

${entityTypesXml}

      <EntityContainer Name="Container">
${entitySetsXml}
      </EntityContainer>

    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * Convert snake_case to PascalCase
 */
function pascalCase(str: string): string {
  return str
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Simple pluralization (add 's')
 */
function pluralize(str: string): string {
  if (str.endsWith("s")) return str + "es";
  if (str.endsWith("y")) return str.slice(0, -1) + "ies";
  return str + "s";
}
