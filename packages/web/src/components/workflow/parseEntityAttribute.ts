/**
 * Parse an entity attribute string into a structured format.
 *
 * Supports multiple formats:
 * 1. "fieldName:type" (e.g., "email:string")
 * 2. "fieldName type" (e.g., "age number")
 * 3. "fieldName" (fallback, type defaults to string)
 */
export function parseEntityAttribute(
  attr: string,
  entityName: string
): {
  name: string;
  type: string;
  entity: string;
} {
  const trimmed = attr.trim();

  // Format 1: colon-separated
  if (trimmed.includes(":")) {
    const colonIndex = trimmed.indexOf(":");
    const fieldName = trimmed.slice(0, colonIndex).trim();
    const fieldType = trimmed.slice(colonIndex + 1).trim() || "string";
    return {
      name: `${entityName}.${fieldName}`,
      type: fieldType,
      entity: entityName,
    };
  }

  // Format 2: space-separated
  const spaceParts = trimmed.split(/\s+/).filter((s) => s.length > 0);
  if (spaceParts.length >= 2) {
    const fieldName = spaceParts[0] ?? trimmed;
    const fieldType = spaceParts[1] ?? "string";
    return {
      name: `${entityName}.${fieldName}`,
      type: fieldType,
      entity: entityName,
    };
  }

  // Format 3: single field name (default to string type)
  return {
    name: `${entityName}.${trimmed}`,
    type: "string",
    entity: entityName,
  };
}
