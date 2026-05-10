import { ReferenceType } from "@erdwithai/core/types";
import {
  addBusPrefix,
  addSysPrefix,
  camelCase,
  generateForeignKeyName,
  generatePrimaryKeyName,
  isBusinessTable,
  isSystemTable,
  kebabCase,
  pascalCase,
  plural,
  removeTablePrefix,
  singular,
  snakeCase,
  tableNameToControllerName,
  tableNameToDtoName,
  tableNameToEntityName,
  tableNameToEntitySetName,
  tableNameToModelName,
  tableNameToModuleName,
  tableNameToRoutePath,
  tableNameToServiceName,
} from "@erdwithai/core/utils";
import { promises as fs } from "fs";
import Handlebars from "handlebars";
import path from "path";

export class TemplateLoader {
  private cache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private templateDir: string) {
    this.registerHelpers();
  }

  async load(templatePath: string): Promise<HandlebarsTemplateDelegate> {
    if (this.cache.has(templatePath)) {
      return this.cache.get(templatePath) as HandlebarsTemplateDelegate;
    }

    const fullPath = path.join(this.templateDir, templatePath);
    const source = await fs.readFile(fullPath, "utf-8");
    const template = Handlebars.compile(source, { noEscape: true });

    this.cache.set(templatePath, template);
    return template;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private registerHelpers(): void {
    // ========================================================================
    // String Case Helpers
    // ========================================================================
    Handlebars.registerHelper("pascalCase", pascalCase);
    Handlebars.registerHelper("camelCase", camelCase);
    Handlebars.registerHelper("snakeCase", snakeCase);
    Handlebars.registerHelper("kebabCase", kebabCase);
    Handlebars.registerHelper("plural", plural);
    Handlebars.registerHelper("singular", singular);
    Handlebars.registerHelper("upperCase", (str: string) => str?.toUpperCase() || "");
    Handlebars.registerHelper("lowerCase", (str: string) => str?.toLowerCase() || "");
    Handlebars.registerHelper("capitalize", (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : ""
    );

    // ========================================================================
    // Comparison Helpers
    // ========================================================================
    Handlebars.registerHelper("eq", (a, b) => a === b);
    Handlebars.registerHelper("ne", (a, b) => a !== b);
    Handlebars.registerHelper("lt", (a, b) => a < b);
    Handlebars.registerHelper("lte", (a, b) => a <= b);
    Handlebars.registerHelper("gt", (a, b) => a > b);
    Handlebars.registerHelper("gte", (a, b) => a >= b);
    Handlebars.registerHelper("and", (...args) => args.slice(0, -1).every(Boolean));
    Handlebars.registerHelper("or", (...args) => args.slice(0, -1).some(Boolean));
    Handlebars.registerHelper("not", (value) => !value);

    // ========================================================================
    // Table Naming Helpers (sys_ and bus_ prefixes)
    // ========================================================================
    Handlebars.registerHelper("addBusPrefix", addBusPrefix);
    Handlebars.registerHelper("addSysPrefix", addSysPrefix);
    Handlebars.registerHelper("removeTablePrefix", removeTablePrefix);
    Handlebars.registerHelper("isSystemTable", isSystemTable);
    Handlebars.registerHelper("isBusinessTable", isBusinessTable);
    Handlebars.registerHelper("tableToEntity", tableNameToEntityName);
    Handlebars.registerHelper("tableToModel", tableNameToModelName);
    Handlebars.registerHelper("tableToController", tableNameToControllerName);
    Handlebars.registerHelper("tableToService", tableNameToServiceName);
    Handlebars.registerHelper("tableToModule", tableNameToModuleName);
    Handlebars.registerHelper("tableToDto", tableNameToDtoName);
    Handlebars.registerHelper("tableToRoute", tableNameToRoutePath);
    Handlebars.registerHelper("tableToEntitySet", tableNameToEntitySetName);
    Handlebars.registerHelper("primaryKeyName", generatePrimaryKeyName);
    Handlebars.registerHelper("foreignKeyName", generateForeignKeyName);

    // ========================================================================
    // Random Sequence Generator (for initial field ordering)
    // ========================================================================
    Handlebars.registerHelper(
      "randomSeq",
      (index: number) => (index + 1) * 10 + Math.floor(Math.random() * 5)
    );

    // ========================================================================
    // TypeScript Type Mapping
    // ========================================================================
    Handlebars.registerHelper("tsType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "string",
        [ReferenceType.INTEGER]: "number",
        [ReferenceType.AMOUNT]: "number",
        [ReferenceType.ID]: "string",
        [ReferenceType.TEXT]: "string",
        [ReferenceType.DATE]: "Date",
        [ReferenceType.DATETIME]: "Date",
        [ReferenceType.LIST]: "string",
        [ReferenceType.TABLE]: "string",
        [ReferenceType.TABLE_DIRECT]: "string",
        [ReferenceType.YES_NO]: "boolean",
        [ReferenceType.JSON]: "Record<string, unknown>",
        [ReferenceType.URL]: "string",
        [ReferenceType.IMAGE]: "string",
        [ReferenceType.FILE]: "string",
        [ReferenceType.EMAIL]: "string",
        [ReferenceType.PHONE]: "string",
        [ReferenceType.PASSWORD]: "string",
        [ReferenceType.COLOR]: "string",
      };
      return mapping[referenceId] || "string";
    });

    // TypeScript type mapping from string type names (for templates using string types)
    Handlebars.registerHelper("tsTypeFromString", (type: string) => {
      const mapping: Record<string, string> = {
        string: "string",
        varchar: "string",
        text: "string",
        integer: "number",
        int: "number",
        bigint: "number",
        decimal: "number",
        float: "number",
        number: "number",
        boolean: "boolean",
        bool: "boolean",
        date: "Date",
        datetime: "Date",
        timestamp: "Date",
        json: "Record<string, unknown>",
        jsonb: "Record<string, unknown>",
        uuid: "string",
        id: "string",
        email: "string",
        url: "string",
        password: "string",
        phone: "string",
        color: "string",
        file: "string",
        image: "string",
        amount: "number",
      };
      return mapping[type?.toLowerCase()] || "unknown";
    });

    // ========================================================================
    // Zod Schema Type Mapping
    // ========================================================================
    Handlebars.registerHelper("zodType", (referenceId: number, isMandatory: boolean = false) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "z.string()",
        [ReferenceType.INTEGER]: "z.number().int()",
        [ReferenceType.AMOUNT]: "z.number()",
        [ReferenceType.ID]: "z.string().uuid()",
        [ReferenceType.TEXT]: "z.string()",
        [ReferenceType.DATE]: "z.coerce.date()",
        [ReferenceType.DATETIME]: "z.coerce.date()",
        [ReferenceType.LIST]: "z.string()",
        [ReferenceType.TABLE]: "z.string().uuid()",
        [ReferenceType.TABLE_DIRECT]: "z.string().uuid()",
        [ReferenceType.YES_NO]: "z.boolean()",
        [ReferenceType.JSON]: "z.record(z.unknown())",
        [ReferenceType.URL]: "z.string().url()",
        [ReferenceType.IMAGE]: "z.string()",
        [ReferenceType.FILE]: "z.string()",
        [ReferenceType.EMAIL]: "z.string().email()",
        [ReferenceType.PHONE]: "z.string()",
        [ReferenceType.PASSWORD]: "z.string().min(8)",
        [ReferenceType.COLOR]: "z.string()",
      };
      const baseType = mapping[referenceId] || "z.string()";
      return isMandatory ? baseType : `${baseType}.optional()`;
    });

    // ========================================================================
    // SQL Type Mapping (for migrations)
    // ========================================================================
    Handlebars.registerHelper("sqlType", (referenceId: number, fieldLength?: number) => {
      // Handlebars passes options object as last arg, so check if fieldLength is actually a number
      const length = typeof fieldLength === "number" ? fieldLength : undefined;
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: length ? `varchar(${length})` : "varchar(255)",
        [ReferenceType.INTEGER]: "integer",
        [ReferenceType.AMOUNT]: "decimal(18,6)",
        [ReferenceType.ID]: "uuid",
        [ReferenceType.TEXT]: "text",
        [ReferenceType.DATE]: "date",
        [ReferenceType.DATETIME]: "timestamp",
        [ReferenceType.LIST]: "varchar(40)",
        [ReferenceType.TABLE]: "uuid",
        [ReferenceType.TABLE_DIRECT]: "uuid",
        [ReferenceType.YES_NO]: "boolean",
        [ReferenceType.JSON]: "jsonb",
        [ReferenceType.URL]: "varchar(500)",
        [ReferenceType.IMAGE]: "varchar(500)",
        [ReferenceType.FILE]: "varchar(500)",
        [ReferenceType.EMAIL]: "varchar(255)",
        [ReferenceType.PHONE]: "varchar(40)",
        [ReferenceType.PASSWORD]: "varchar(255)",
        [ReferenceType.COLOR]: "varchar(20)",
      };
      return mapping[referenceId] || "varchar(255)";
    });

    // ========================================================================
    // Knex.js Type Mapping
    // ========================================================================
    Handlebars.registerHelper("knexType", (referenceId: number, fieldLength?: number) => {
      // Handlebars passes options object as last arg, so check if fieldLength is actually a number
      const length = typeof fieldLength === "number" ? fieldLength : undefined;
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: length
          ? `string('{{column_name}}', ${length})`
          : "string('{{column_name}}', 255)",
        [ReferenceType.INTEGER]: "integer('{{column_name}}')",
        [ReferenceType.AMOUNT]: "decimal('{{column_name}}', 18, 6)",
        [ReferenceType.ID]: "uuid('{{column_name}}')",
        [ReferenceType.TEXT]: "text('{{column_name}}')",
        [ReferenceType.DATE]: "date('{{column_name}}')",
        [ReferenceType.DATETIME]: "timestamp('{{column_name}}')",
        [ReferenceType.LIST]: "string('{{column_name}}', 40)",
        [ReferenceType.TABLE]: "uuid('{{column_name}}')",
        [ReferenceType.TABLE_DIRECT]: "uuid('{{column_name}}')",
        [ReferenceType.YES_NO]: "boolean('{{column_name}}')",
        [ReferenceType.JSON]: "jsonb('{{column_name}}')",
        [ReferenceType.URL]: "string('{{column_name}}', 500)",
        [ReferenceType.IMAGE]: "string('{{column_name}}', 500)",
        [ReferenceType.FILE]: "string('{{column_name}}', 500)",
        [ReferenceType.EMAIL]: "string('{{column_name}}', 255)",
        [ReferenceType.PHONE]: "string('{{column_name}}', 40)",
        [ReferenceType.PASSWORD]: "string('{{column_name}}', 255)",
        [ReferenceType.COLOR]: "string('{{column_name}}', 20)",
      };
      return mapping[referenceId] || "string('{{column_name}}', 255)";
    });

    // ========================================================================
    // TanStack Helpers (tanstack-start-nestjs: TanStack Start)
    // ========================================================================
    Handlebars.registerHelper("tanstackQueryKey", (entity: string) => `['${entity}', 'list']`);
    Handlebars.registerHelper("tanstackDetailKey", (entity: string, id?: string) => {
      // Handlebars passes options object as last arg, check if id is actually a string
      const idVar = typeof id === "string" ? id : "id";
      return `['${entity}', 'detail', ${idVar}]`;
    });
    Handlebars.registerHelper(
      "tanstackMutationKey",
      (entity: string, action: string) => `['${entity}', '${action}']`
    );

    // TanStack Table column type helper
    Handlebars.registerHelper("tanstackColumnType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "text",
        [ReferenceType.INTEGER]: "number",
        [ReferenceType.AMOUNT]: "number",
        [ReferenceType.DATE]: "date",
        [ReferenceType.DATETIME]: "datetime",
        [ReferenceType.YES_NO]: "boolean",
        [ReferenceType.EMAIL]: "text",
      };
      return mapping[referenceId] || "text";
    });

    // TanStack Form field type helper
    Handlebars.registerHelper("tanstackFieldType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "input",
        [ReferenceType.INTEGER]: "number",
        [ReferenceType.AMOUNT]: "number",
        [ReferenceType.TEXT]: "textarea",
        [ReferenceType.DATE]: "date",
        [ReferenceType.DATETIME]: "datetime-local",
        [ReferenceType.YES_NO]: "checkbox",
        [ReferenceType.LIST]: "select",
        [ReferenceType.TABLE]: "select",
        [ReferenceType.EMAIL]: "email",
        [ReferenceType.URL]: "url",
        [ReferenceType.PASSWORD]: "password",
        [ReferenceType.COLOR]: "color",
      };
      return mapping[referenceId] || "input";
    });

    // ========================================================================
    // NestJS Helpers (tanstack-start-nestjs: Backend)
    // ========================================================================
    Handlebars.registerHelper(
      "nestControllerName",
      (entity: string) => `${pascalCase(entity)}Controller`
    );
    Handlebars.registerHelper(
      "nestServiceName",
      (entity: string) => `${pascalCase(entity)}Service`
    );
    Handlebars.registerHelper("nestModuleName", (entity: string) => `${pascalCase(entity)}Module`);
    Handlebars.registerHelper(
      "nestDtoName",
      (entity: string, prefix: string = "") => `${prefix}${pascalCase(entity)}Dto`
    );
    Handlebars.registerHelper("nestGuardName", (name: string) => `${pascalCase(name)}Guard`);
    Handlebars.registerHelper("nestDecoratorName", (name: string) => `${pascalCase(name)}`);

    // ========================================================================
    // OpenUI5 Helpers (openui5-odatav4: Frontend)
    // ========================================================================
    Handlebars.registerHelper("ui5Type", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "sap.ui.model.type.String",
        [ReferenceType.INTEGER]: "sap.ui.model.type.Integer",
        [ReferenceType.AMOUNT]: "sap.ui.model.odata.type.Decimal",
        [ReferenceType.DATE]: "sap.ui.model.type.Date",
        [ReferenceType.DATETIME]: "sap.ui.model.type.DateTime",
        [ReferenceType.YES_NO]: "sap.ui.model.type.Boolean",
        [ReferenceType.TEXT]: "sap.ui.model.type.String",
      };
      return mapping[referenceId] || "sap.ui.model.type.String";
    });

    Handlebars.registerHelper("ui5ControlType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "sap.m.Input",
        [ReferenceType.INTEGER]: "sap.m.Input",
        [ReferenceType.AMOUNT]: "sap.m.Input",
        [ReferenceType.TEXT]: "sap.m.TextArea",
        [ReferenceType.DATE]: "sap.m.DatePicker",
        [ReferenceType.DATETIME]: "sap.m.DateTimePicker",
        [ReferenceType.YES_NO]: "sap.m.CheckBox",
        [ReferenceType.LIST]: "sap.m.Select",
        [ReferenceType.TABLE]: "sap.m.Select",
        [ReferenceType.EMAIL]: "sap.m.Input",
        [ReferenceType.URL]: "sap.m.Input",
        [ReferenceType.PASSWORD]: "sap.m.Input",
        [ReferenceType.COLOR]: "sap.ui.unified.ColorPicker",
      };
      return mapping[referenceId] || "sap.m.Input";
    });

    Handlebars.registerHelper("ui5InputType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.INTEGER]: "Number",
        [ReferenceType.AMOUNT]: "Number",
        [ReferenceType.EMAIL]: "Email",
        [ReferenceType.URL]: "Url",
        [ReferenceType.PASSWORD]: "Password",
        [ReferenceType.PHONE]: "Tel",
      };
      return mapping[referenceId] || "Text";
    });

    // ========================================================================
    // OData/EDM Type Mapping (openui5-odatav4: Backend)
    // ========================================================================
    Handlebars.registerHelper("edmType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "Edm.String",
        [ReferenceType.INTEGER]: "Edm.Int32",
        [ReferenceType.AMOUNT]: "Edm.Decimal",
        [ReferenceType.ID]: "Edm.Guid",
        [ReferenceType.TEXT]: "Edm.String",
        [ReferenceType.DATE]: "Edm.Date",
        [ReferenceType.DATETIME]: "Edm.DateTimeOffset",
        [ReferenceType.YES_NO]: "Edm.Boolean",
        [ReferenceType.JSON]: "Edm.String",
        [ReferenceType.URL]: "Edm.String",
        [ReferenceType.EMAIL]: "Edm.String",
      };
      return mapping[referenceId] || "Edm.String";
    });

    Handlebars.registerHelper(
      "odataNavigationProperty",
      (relationship: { type: string; targetEntity: string }) => {
        if (relationship.type === "oneToMany") {
          return `Collection(${pascalCase(relationship.targetEntity)})`;
        }
        return pascalCase(relationship.targetEntity);
      }
    );

    // ========================================================================
    // Shadcn UI Helpers (tanstack-start-nestjs: Frontend)
    // ========================================================================
    Handlebars.registerHelper("shadcnInputType", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "text",
        [ReferenceType.INTEGER]: "number",
        [ReferenceType.AMOUNT]: "number",
        [ReferenceType.EMAIL]: "email",
        [ReferenceType.URL]: "url",
        [ReferenceType.PASSWORD]: "password",
        [ReferenceType.PHONE]: "tel",
        [ReferenceType.COLOR]: "color",
      };
      return mapping[referenceId] || "text";
    });

    Handlebars.registerHelper("shadcnComponent", (referenceId: number) => {
      const mapping: Record<number, string> = {
        [ReferenceType.STRING]: "Input",
        [ReferenceType.INTEGER]: "Input",
        [ReferenceType.AMOUNT]: "Input",
        [ReferenceType.TEXT]: "Textarea",
        [ReferenceType.DATE]: "DatePicker",
        [ReferenceType.DATETIME]: "DatePicker",
        [ReferenceType.YES_NO]: "Checkbox",
        [ReferenceType.LIST]: "Select",
        [ReferenceType.TABLE]: "Select",
      };
      return mapping[referenceId] || "Input";
    });

    // ========================================================================
    // JSON Helpers
    // ========================================================================
    Handlebars.registerHelper("json", (context) => JSON.stringify(context, null, 2));
    Handlebars.registerHelper("jsonInline", (context) => JSON.stringify(context));

    // ========================================================================
    // Array/Loop Helpers
    // ========================================================================
    Handlebars.registerHelper("first", (array, property?: string) => {
      const firstItem = array?.[0];
      // If property is specified and is a string (not Handlebars options object)
      if (typeof property === "string" && firstItem) {
        return firstItem[property];
      }
      return firstItem;
    });
    Handlebars.registerHelper("last", (array, property?: string) => {
      const lastItem = array?.[array?.length - 1];
      // If property is specified and is a string (not Handlebars options object)
      if (typeof property === "string" && lastItem) {
        return lastItem[property];
      }
      return lastItem;
    });
    Handlebars.registerHelper("length", (array) => array?.length || 0);
    Handlebars.registerHelper("includes", (array, value) => array?.includes(value));
    Handlebars.registerHelper("join", (array, separator = ", ") => array?.join(separator) || "");
    Handlebars.registerHelper("slice", (array, start, end) => array?.slice(start, end));

    // Index helpers for loops
    Handlebars.registerHelper("indexPlusOne", (index: number) => index + 1);
    Handlebars.registerHelper("isFirst", (index: number) => index === 0);
    Handlebars.registerHelper(
      "isLast",
      (index: number, array: unknown[]) => index === array.length - 1
    );
    Handlebars.registerHelper("isEven", (index: number) => index % 2 === 0);
    Handlebars.registerHelper("isOdd", (index: number) => index % 2 !== 0);

    // ========================================================================
    // Date/Time Helpers
    // ========================================================================
    Handlebars.registerHelper("now", () => new Date().toISOString());
    Handlebars.registerHelper("timestamp", () => Date.now());
    Handlebars.registerHelper("formatDate", (date: Date | string, format?: string) => {
      const d = new Date(date);
      if (format === "iso") return d.toISOString();
      if (format === "date") return d.toISOString().split("T")[0];
      return d.toISOString();
    });

    // ========================================================================
    // String Manipulation Helpers
    // ========================================================================
    Handlebars.registerHelper("trim", (str: string) => str?.trim() || "");
    Handlebars.registerHelper(
      "replace",
      (str: string, search: string, replacement: string) =>
        str?.replace(new RegExp(search, "g"), replacement) || ""
    );
    Handlebars.registerHelper(
      "split",
      (str: string, separator: string) => str?.split(separator) || []
    );
    Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
    Handlebars.registerHelper("substring", (str: string, start: number, length?: number) =>
      length ? str?.substring(start, start + length) : str?.substring(start)
    );
    Handlebars.registerHelper("padStart", (str: string, length: number, char: string = " ") =>
      String(str).padStart(length, char)
    );
    Handlebars.registerHelper("padEnd", (str: string, length: number, char: string = " ") =>
      String(str).padEnd(length, char)
    );

    // ========================================================================
    // Math Helpers
    // ========================================================================
    Handlebars.registerHelper("add", (a: number, b: number) => a + b);
    Handlebars.registerHelper("subtract", (a: number, b: number) => a - b);
    Handlebars.registerHelper("multiply", (a: number, b: number) => a * b);
    Handlebars.registerHelper("divide", (a: number, b: number) => a / b);
    Handlebars.registerHelper("mod", (a: number, b: number) => a % b);
    Handlebars.registerHelper("abs", (a: number) => Math.abs(a));
    Handlebars.registerHelper("ceil", (a: number) => Math.ceil(a));
    Handlebars.registerHelper("floor", (a: number) => Math.floor(a));
    Handlebars.registerHelper("round", (a: number) => Math.round(a));
    Handlebars.registerHelper("min", (...args) => Math.min(...args.slice(0, -1)));
    Handlebars.registerHelper("max", (...args) => Math.max(...args.slice(0, -1)));

    // ========================================================================
    // Conditional Helpers
    // ========================================================================
    Handlebars.registerHelper(
      "ifCond",
      function (
        this: unknown,
        v1: unknown,
        operator: string,
        v2: unknown,
        options: Handlebars.HelperOptions
      ) {
        switch (operator) {
          case "==":
            return v1 == v2 ? options.fn(this) : options.inverse(this);
          case "===":
            return v1 === v2 ? options.fn(this) : options.inverse(this);
          case "!=":
            return v1 != v2 ? options.fn(this) : options.inverse(this);
          case "!==":
            return v1 !== v2 ? options.fn(this) : options.inverse(this);
          case "<":
            return (v1 as number) < (v2 as number) ? options.fn(this) : options.inverse(this);
          case "<=":
            return (v1 as number) <= (v2 as number) ? options.fn(this) : options.inverse(this);
          case ">":
            return (v1 as number) > (v2 as number) ? options.fn(this) : options.inverse(this);
          case ">=":
            return (v1 as number) >= (v2 as number) ? options.fn(this) : options.inverse(this);
          case "&&":
            return v1 && v2 ? options.fn(this) : options.inverse(this);
          case "||":
            return v1 || v2 ? options.fn(this) : options.inverse(this);
          default:
            return options.inverse(this);
        }
      }
    );

    Handlebars.registerHelper(
      "unless",
      function (this: unknown, condition: boolean, options: Handlebars.HelperOptions) {
        return !condition ? options.fn(this) : options.inverse(this);
      }
    );

    Handlebars.registerHelper(
      "switch",
      function (this: unknown, value: unknown, options: Handlebars.HelperOptions) {
        (this as Record<string, unknown>)._switch_value_ = value;
        (this as Record<string, unknown>)._switch_matched_ = false; // Reset match flag
        // Handle case where options might not have fn
        if (options && typeof options.fn === "function") {
          return options.fn(this);
        }
        return "";
      }
    );

    Handlebars.registerHelper(
      "case",
      function (this: Record<string, unknown>, value: unknown, options: Handlebars.HelperOptions) {
        // Only execute if this case matches AND no previous case has matched
        if (value === this._switch_value_ && !this._switch_matched_) {
          (this as Record<string, unknown>)._switch_matched_ = true; // Mark as matched
          // Handle case where options might not have fn
          if (options && typeof options.fn === "function") {
            return options.fn(this);
          }
        }
        return "";
      }
    );

    Handlebars.registerHelper(
      "default",
      function (this: Record<string, unknown>, options: Handlebars.HelperOptions) {
        // Only execute if no previous case has matched
        if (!this._switch_matched_) {
          (this as Record<string, unknown>)._switch_matched_ = true; // Mark as matched
          // Handle case where options might not have fn (non-block usage)
          if (options && typeof options.fn === "function") {
            return options.fn(this);
          }
        }
        return "";
      }
    );

    // ========================================================================
    // UUID Generation Helper
    // ========================================================================
    Handlebars.registerHelper("uuid", () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    });

    // ========================================================================
    // Comment/Documentation Helpers
    // ========================================================================
    Handlebars.registerHelper("comment", (text: string, style: string = "line") => {
      if (style === "block") {
        return `/* ${text} */`;
      }
      return `// ${text}`;
    });

    Handlebars.registerHelper("jsdoc", (description: string, params?: Record<string, string>) => {
      let doc = "/**\n * " + description;
      if (params) {
        doc += "\n *";
        for (const [name, type] of Object.entries(params)) {
          doc += `\n * @param {${type}} ${name}`;
        }
      }
      doc += "\n */";
      return doc;
    });

    // ========================================================================
    // Import Path Helpers
    // ========================================================================
    Handlebars.registerHelper("relativeImport", (from: string, to: string) => {
      const fromParts = from.split("/");
      const toParts = to.split("/");

      // Find common base
      let commonLength = 0;
      for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
        if (fromParts[i] === toParts[i]) {
          commonLength++;
        } else {
          break;
        }
      }

      const upCount = fromParts.length - commonLength - 1;
      const relativeParts = toParts.slice(commonLength);

      if (upCount === 0) {
        return "./" + relativeParts.join("/");
      }

      return "../".repeat(upCount) + relativeParts.join("/");
    });

    // ========================================================================
    // Test Helpers
    // ========================================================================
    Handlebars.registerHelper("typeToReferenceId", (type: string) => {
      const mapping: Record<string, number> = {
        string: 10,
        integer: 11,
        decimal: 12,
        boolean: 20,
        date: 15,
        datetime: 16,
        text: 14,
        json: 28,
      };
      return mapping[type] || 10;
    });

    Handlebars.registerHelper("isExcludedField", (fieldName: string) => {
      const excludedFields = ["id", "created_at", "updated_at", "deleted_at"];
      const lowerFieldName = fieldName?.toLowerCase() || "";

      // Exclude if it's an excluded field name
      if (excludedFields.includes(lowerFieldName)) {
        return true;
      }

      // Exclude if it contains '_id' (foreign keys)
      if (lowerFieldName.includes("_id")) {
        return true;
      }

      return false;
    });

    Handlebars.registerHelper("mockValue", (type: string, fieldName: string) => {
      const typeLower = type?.toLowerCase() || "";
      const nameLower = fieldName?.toLowerCase() || "";

      if (
        typeLower.includes("string") ||
        typeLower.includes("text") ||
        typeLower.includes("varchar")
      ) {
        if (nameLower.includes("email")) {
          return "'test@example.com'";
        }
        if (nameLower.includes("name")) {
          return "'Test Name'";
        }
        if (nameLower.includes("phone")) {
          return "'+1234567890'";
        }
        return "'test_value'";
      }

      if (
        typeLower.includes("int") ||
        typeLower.includes("number") ||
        typeLower.includes("integer")
      ) {
        return "123";
      }

      if (
        typeLower.includes("decimal") ||
        typeLower.includes("float") ||
        typeLower.includes("double")
      ) {
        return "123.45";
      }

      if (typeLower.includes("bool") || typeLower.includes("boolean")) {
        return "true";
      }

      if (typeLower.includes("date") || typeLower.includes("time")) {
        return "new Date().toISOString()";
      }

      return "'test_value'";
    });

    Handlebars.registerHelper(
      "mockUniqueValue",
      (type: string, fieldName: string, index: number) => {
        const typeLower = type?.toLowerCase() || "";
        const nameLower = fieldName?.toLowerCase() || "";

        if (
          typeLower.includes("string") ||
          typeLower.includes("text") ||
          typeLower.includes("varchar")
        ) {
          if (nameLower.includes("email")) {
            return `\`test${index}@example.com\``;
          }
          if (nameLower.includes("name")) {
            return `\`Test Name ${index}\``;
          }
          return `\`test_value_${index}\``;
        }

        if (
          typeLower.includes("int") ||
          typeLower.includes("number") ||
          typeLower.includes("integer")
        ) {
          return `${100 + index}`;
        }

        if (
          typeLower.includes("decimal") ||
          typeLower.includes("float") ||
          typeLower.includes("double")
        ) {
          return `${(100.5 + index).toFixed(2)}`;
        }

        return `\`test_${index}\``;
      }
    );
  }
}
