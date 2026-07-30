import { createAPIFileRoute } from "@tanstack/start-api-routes";

export const Route = createAPIFileRoute("/api/db/reverse-engineer")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as { targetDbConnection: string };
      const { targetDbConnection } = body;

      if (!targetDbConnection) {
        return new Response(
          JSON.stringify({ error: "targetDbConnection is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { decryptConnectionString } = await import("../../../lib/encrypt");
      let connStr: string;
      try {
        connStr = decryptConnectionString(targetDbConnection);
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid or corrupted connection string" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const url = new URL(connStr);
      const dbName = url.pathname.slice(1);
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection({
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 3306,
        user: url.username,
        password: url.password,
        database: dbName,
        connectTimeout: 30000,
      });

      try {
        const [tables] = (await connection.execute(
          `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
          [dbName]
        )) as unknown[];

        if (!tables || (tables as unknown[]).length === 0) {
          return new Response(JSON.stringify({ mermaidCode: "erDiagram\n" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const tableNames: string[] = (tables as Array<{ TABLE_NAME: string }>).map(
          (t) => t.TABLE_NAME
        );
        const allColumns: Record<
          string,
          Array<{
            COLUMN_NAME: string;
            DATA_TYPE: string;
            COLUMN_KEY: string;
            IS_NULLABLE: string;
          }>
        > = {};

        for (const tableName of tableNames) {
          const [cols] = (await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
            [dbName, tableName]
          )) as unknown[];
          allColumns[tableName] = cols as Array<{
            COLUMN_NAME: string;
            DATA_TYPE: string;
            COLUMN_KEY: string;
            IS_NULLABLE: string;
          }>;
        }

        // Convert to PascalCase entity name
        const toPascal = (s: string) =>
          s.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());

        const toEmlType = (dt: string) => {
          if (["int", "bigint", "tinyint", "smallint", "mediumint"].includes(dt)) return "int";
          if (["float", "double", "decimal"].includes(dt)) return "float";
          if (dt === "text" || dt === "longtext") return "text";
          if (dt === "date") return "date";
          if (dt === "datetime" || dt === "timestamp") return "datetime";
          if (dt === "boolean" || dt === "bool") return "boolean";
          if (dt === "json") return "json";
          return "string";
        };

        let mmd = "erDiagram\n";
        for (const tableName of tableNames) {
          const entityName = toPascal(tableName);
          const cols = allColumns[tableName] || [];
          mmd += `  ${entityName} {\n`;
          for (const col of cols) {
            const emlType = toEmlType(col.DATA_TYPE);
            const pk = col.COLUMN_KEY === "PRI" ? " PK" : col.COLUMN_KEY === "MUL" ? " FK" : "";
            const optional = col.IS_NULLABLE === "YES" ? " OPTIONAL" : "";
            mmd += `    ${emlType} ${col.COLUMN_NAME}${pk}${optional}\n`;
          }
          mmd += `  }\n`;
        }

        return new Response(JSON.stringify({ mermaidCode: mmd }), {
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await connection.end();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reverse-engineer schema";
      const status =
        msg.includes("connect ECONNREFUSED") || msg.includes("timeout") ? 504 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
