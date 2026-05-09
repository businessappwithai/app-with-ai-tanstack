/**
 * OData Response Formatter
 *
 * Formats database responses to comply with OData V4 specifications
 * Handles date/timestamp formatting for OpenUI5 compatibility
 */

import { type DatabaseColumn, DatabaseTable } from "./dynamic-schema";

/**
 * Check if a value is a date that needs formatting
 */
function isDateValue(value: any): boolean {
  if (!value && value !== 0) return false;

  // Check for Date objects
  if (value instanceof Date) return true;

  // Check for date strings (ISO 8601 and SQLite formats)
  if (typeof value === "string") {
    // ISO 8601: 2026-04-08T01:54:07Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value))
      return true;
    // SQLite datetime: "2026-04-08 01:54:07" or date-only: "2026-04-08"
    if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(value)) return true;
    return false;
  }

  return false;
}

/**
 * Check if a numeric value could be a Unix timestamp in milliseconds
 * Valid for years 1900-2100 range (to avoid false positives)
 */
function isNumericTimestamp(value: any): boolean {
  if (typeof value !== "number" || value === 0) return false;
  // Milliseconds range for years 1900-2100
  const min = -2208988800000; // 1900-01-01
  const max = 4102444800000; // 2100-01-01
  return value > min && value < max && Number.isInteger(value);
}

/**
 * Format a date value to OData V4 DateTimeOffset format
 * Using simpler format without milliseconds for better OpenUI5 compatibility
 */
function formatDateTimeOffset(value: any): string {
  if (value === null || value === undefined) return value;

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else {
    // Normalize SQLite date strings "2026-04-08 01:54:07" → ISO format
    const normalized = typeof value === "string" ? value.replace(" ", "T") : value;
    date = new Date(normalized);
  }

  if (isNaN(date.getTime())) {
    return value; // Return original if invalid
  }

  // Format to ISO 8601 WITHOUT milliseconds for better OpenUI5 compatibility
  // Format: YYYY-MM-DDTHH:mm:ssZ
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

/**
 * Format a date value to OData V4 Date format (no time component)
 */
function formatDate(value: any): string {
  if (value === null || value === undefined) return value;

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Transform an object's date fields to OData V4 format
 * @param obj The object to transform
 * @param columns Column definitions to identify date fields
 */
export function transformDatesInObject(obj: any, columns?: DatabaseColumn[]): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const result = { ...obj };

  if (columns) {
    // Use column definitions to determine which fields to transform
    for (const column of columns) {
      const value = result[column.columnName];
      const isDate = column.dataType === "Edm.Date";
      const isDateTime = column.dataType === "Edm.DateTimeOffset";

      if (!isDate && !isDateTime) continue;

      if (isDateValue(value) || isNumericTimestamp(value) || typeof value === "number") {
        if (isDateTime) {
          result[column.columnName] = formatDateTimeOffset(value);
        } else if (isDate) {
          result[column.columnName] = formatDate(value);
        }
      }
    }
  } else {
    // Auto-detect date fields by naming convention
    const dateFieldPattern = /(?:^|_)(date|time|at|on)(?:_|$)|_date$|^date_|_at$|_time$/i;
    for (const key in result) {
      const value = result[key];
      if (isDateValue(value)) {
        // Format ISO strings and SQLite date strings
        if (key.endsWith("_at") || key.includes("datetime") || key.includes("time")) {
          result[key] = formatDateTimeOffset(value);
        } else if (
          key.toLowerCase().includes("date") ||
          key.toLowerCase().includes("time") ||
          key.endsWith("_at")
        ) {
          result[key] = formatDate(value);
        } else {
          result[key] = formatDateTimeOffset(value);
        }
      } else if (isNumericTimestamp(value) && dateFieldPattern.test(key)) {
        // Handle SQLite-stored numeric timestamps for date-like fields
        const dateStr =
          key.endsWith("_at") || key.includes("datetime") || key.includes("time")
            ? formatDateTimeOffset(new Date(value as number))
            : formatDate(new Date(value as number));
        result[key] = dateStr;
      }
    }
  }

  return result;
}

/**
 * Transform an array of objects' date fields to OData V4 format
 * @param results Array of objects to transform
 * @param columns Column definitions to identify date fields (optional)
 */
export function transformDatesInResults(results: any[], columns?: DatabaseColumn[]): any[] {
  if (!Array.isArray(results)) {
    return results;
  }

  const dateTransformed = results.map((result) => transformDatesInObject(result, columns));
  return dateTransformed.map((result) => convertIntegerBooleans(result, columns));
}

/**
 * Transform a single result object's date fields to OData V4 format
 * @param result Single object to transform
 * @param columns Column definitions to identify date fields (optional)
 */
export function transformSingleResult(result: any, columns?: DatabaseColumn[]): any {
  const transformed = transformDatesInObject(result, columns);
  return convertIntegerBooleans(transformed, columns);
}

/**
 * Convert integer booleans (0/1) to actual booleans (true/false) for UI5 compatibility
 * SQLite stores booleans as integers, but UI5 expects true/false
 */
function convertIntegerBooleans(obj: any, columns?: DatabaseColumn[]): any {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const result = { ...obj };

  // Boolean field patterns to look for
  const booleanPatterns = [
    /^is_/i,
    /^has_/i,
    /_active$/i,
    /_enabled$/i,
    /_visible$/i,
    /_required$/i,
    /_read_only$/i,
    /is_vip$/i,
    /is_active$/i,
  ];

  for (const key in result) {
    const value = result[key];

    // Check if this is a boolean field (by name pattern or column definition)
    const isBooleanField =
      booleanPatterns.some((pattern) => pattern.test(key)) ||
      columns?.find((col) => col.columnName === key && col.dataType === "Edm.Boolean");

    if (isBooleanField && typeof value === "number") {
      // Convert 0 → false, 1 → true
      result[key] = value === 1;
    }
  }

  return result;
}

/**
 * Convert integer booleans in an array of results
 */
export function convertIntegerBooleansInResults(results: any[], columns?: DatabaseColumn[]): any[] {
  if (!Array.isArray(results)) {
    return results;
  }

  return results.map((result) => convertIntegerBooleans(result, columns));
}
