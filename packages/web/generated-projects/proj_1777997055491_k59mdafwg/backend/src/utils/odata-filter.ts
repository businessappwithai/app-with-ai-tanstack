/**
 * OData V4 $filter Parser and SQL Where Clause Builder
 * Converts OData filter expressions into SQL WHERE clauses
 */

interface FilterNode {
  type: "binary" | "unary" | "literal" | "property";
  operator?: string;
  left?: FilterNode;
  right?: FilterNode;
  value?: any;
}

/**
 * Parse OData $filter expression into AST
 */
function parseODataFilter(filter: string): FilterNode {
  // Remove whitespace
  filter = filter.replace(/\s+/g, " ").trim();

  // Handle parentheses
  if (filter.startsWith("(") && filter.endsWith(")")) {
    return parseODataFilter(filter.slice(1, -1));
  }

  // Handle logical operators (and, or)
  const orMatch = filter.match(/(.+?)\s+or\s+(.+)/i);
  if (orMatch) {
    return {
      type: "binary",
      operator: "or",
      left: parseODataFilter(orMatch[1]),
      right: parseODataFilter(orMatch[2]),
    };
  }

  const andMatch = filter.match(/(.+?)\s+and\s+(.+)/i);
  if (andMatch) {
    return {
      type: "binary",
      operator: "and",
      left: parseODataFilter(andMatch[1]),
      right: parseODataFilter(andMatch[2]),
    };
  }

  // Handle function calls: contains(field, 'value'), startswith(field, 'value'), endswith(field, 'value')
  const functionMatch = filter.match(/(contains|startswith|endswith)\((.+?),\s*(.+)\)/i);
  if (functionMatch) {
    const functionName = functionMatch[1].toLowerCase();
    const field = functionMatch[2].trim();
    const value = functionMatch[3].trim();

    return {
      type: "binary",
      operator: functionName,
      left: { type: "property", value: field },
      right: { type: "literal", value: parseLiteral(value) },
    };
  }

  // Handle binary comparison operators
  const binaryOperators = [
    {
      regex: /(.+?)\s+(eq|ne|gt|ge|lt|le)\s+(.+)/i,
      types: ["string", "number", "boolean", "date"],
    },
  ];

  for (const op of binaryOperators) {
    const match = filter.match(op.regex);
    if (match) {
      return {
        type: "binary",
        operator: match[2].toLowerCase(),
        left: { type: "property", value: match[1] },
        right: { type: "literal", value: parseLiteral(match[3]) },
      };
    }
  }

  // Handle unary not operator
  if (filter.toLowerCase().startsWith("not ")) {
    return {
      type: "unary",
      operator: "not",
      right: parseODataFilter(filter.slice(4)),
    };
  }

  // Handle simple property or literal
  if (filter.startsWith("'") && filter.endsWith("'")) {
    return { type: "literal", value: filter.slice(1, -1) };
  }

  if (filter === "true" || filter === "false") {
    return { type: "literal", value: filter === "true" };
  }

  if (!isNaN(Number(filter))) {
    return { type: "literal", value: Number(filter) };
  }

  // Default: property
  return { type: "property", value: filter };
}

/**
 * Parse literal value (handles strings, numbers, booleans, dates)
 */
function parseLiteral(value: string): any {
  value = value.trim();

  // String literal
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number
  if (!isNaN(Number(value))) return Number(value);

  // Date (ISO format)
  if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(value);
  }

  return value;
}

/**
 * Convert OData type to simple type for SQL operator mapping
 */
function getSimpleType(odataType: string): string {
  if (odataType.startsWith("Edm.String") || odataType === "string") return "string";
  if (
    odataType.startsWith("Edm.Int") ||
    (odataType.startsWith("Edm.") && odataType.includes("Int"))
  )
    return "number";
  if (odataType === "Edm.Boolean" || odataType === "boolean") return "boolean";
  if (odataType.startsWith("Edm.DateTime") || odataType.startsWith("Edm.Date")) return "date";
  if (
    odataType.startsWith("Edm.Decimal") ||
    odataType.startsWith("Edm.Double") ||
    odataType.startsWith("Edm.Single")
  )
    return "number";
  return "string"; // Default to string
}

/**
 * Get SQL LIKE operator compatible with the current database type.
 * PostgreSQL supports ILIKE (case-insensitive), SQLite uses LIKE (case-insensitive for ASCII).
 */
const likeOperator = (process.env.DB_TYPE || "sqlite") === "postgresql" ? "ILIKE" : "LIKE";

/**
 * Get SQL operator from OData operator
 */
function getSQLOperator(odataOperator: string, valueType: string): string {
  const operators: Record<string, Record<string, string>> = {
    eq: { string: "=", number: "=", boolean: "=", date: "=" },
    ne: { string: "!=", number: "!=", boolean: "!=", date: "!=" },
    gt: { string: ">", number: ">", date: ">" },
    ge: { string: ">=", number: ">=", date: ">=" },
    lt: { string: "<", number: "<", date: "<" },
    le: { string: "<=", number: "<=", date: "<=" },
    contains: {
      string: likeOperator,
      number: likeOperator,
      boolean: likeOperator,
      date: likeOperator,
    },
    startswith: {
      string: likeOperator,
      number: likeOperator,
      boolean: likeOperator,
      date: likeOperator,
    },
    endswith: {
      string: likeOperator,
      number: likeOperator,
      boolean: likeOperator,
      date: likeOperator,
    },
  };

  return operators[odataOperator]?.[valueType] || "=";
}

/**
 * Build SQL WHERE clause from filter AST
 */
export function buildWhereClause(
  ast: FilterNode,
  columnInfo: Map<string, { type: string; columnName: string }>,
  paramOffset: number = 0
): { sql: string; params: any[] } {
  if (!ast) {
    return { sql: "", params: [] };
  }

  switch (ast.type) {
    case "binary": {
      if (ast.operator === "and" || ast.operator === "or") {
        const left = buildWhereClause(ast.left!, columnInfo, paramOffset);
        const right = buildWhereClause(ast.right!, columnInfo, paramOffset + left.params.length);

        return {
          sql: "(" + left.sql + " " + ast.operator.toUpperCase() + " " + right.sql + ")",
          params: [...left.params, ...right.params],
        };
      }

      // Comparison operators
      if (ast.left?.type === "property" && ast.right?.type === "literal") {
        const column = ast.left.value;
        const info = columnInfo.get(column);

        if (!info) {
          throw new Error(`Unknown column: ${column}`);
        }

        const simpleType = getSimpleType(info.type);
        const sqlOp = getSQLOperator(ast.operator!, simpleType);
        let value = ast.right.value;

        // Handle contains, startswith, endswith with wildcards
        if (ast.operator === "contains") {
          value = "%" + value + "%";
        } else if (ast.operator === "startswith") {
          value = value + "%";
        } else if (ast.operator === "endswith") {
          value = "%" + value;
        }

        // Use ? placeholder for Knex
        return {
          sql: `${info.columnName} ${sqlOp} ?`,
          params: [value],
        };
      }

      throw new Error("Invalid binary expression: " + JSON.stringify(ast));
    }

    case "unary": {
      if (ast.operator === "not") {
        const operand = buildWhereClause(ast.right!, columnInfo, paramOffset);
        return {
          sql: "NOT (" + operand.sql + ")",
          params: operand.params,
        };
      }
      throw new Error("Unknown unary operator: " + ast.operator);
    }

    case "literal":
    case "property":
      throw new Error("Unexpected " + ast.type + " in filter expression");

    default:
      throw new Error("Unknown node type: " + (ast as any).type);
  }
}

/**
 * Parse $filter and build SQL WHERE clause
 */
export function parseFilter(
  filter: string | undefined,
  columns: Array<{ columnName: string; dataType: string }>,
  propertyNameMap?: Map<string, string>
): { sql: string; params: any[] } {
  if (!filter) {
    return { sql: "", params: [] };
  }

  // Build column info map with property name mapping support
  const columnInfo = new Map();
  columns.forEach((col) => {
    // Map actual column name
    columnInfo.set(col.columnName, {
      type: col.dataType,
      columnName: col.columnName,
    });

    // Also map PascalCase variant if mapping provided
    if (propertyNameMap) {
      for (const [odataName, dbColName] of propertyNameMap.entries()) {
        if (dbColName === col.columnName && odataName !== col.columnName) {
          columnInfo.set(odataName, {
            type: col.dataType,
            columnName: col.columnName,
          });
        }
      }
    }
  });

  // Parse filter expression
  const ast = parseODataFilter(filter);

  // Build WHERE clause
  return buildWhereClause(ast, columnInfo);
}

/**
 * Extract column names from filter for metadata validation
 */
export function extractFilterColumns(filter: string): string[] {
  const columns: string[] = [];
  const regex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:eq|ne|gt|ge|lt|le|contains|startswith|endswith)/gi;
  let match;

  while ((match = regex.exec(filter)) !== null) {
    if (!columns.includes(match[1])) {
      columns.push(match[1]);
    }
  }

  return columns;
}
