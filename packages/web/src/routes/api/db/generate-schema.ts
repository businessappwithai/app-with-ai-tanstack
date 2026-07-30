import { createAPIFileRoute } from "@tanstack/start-api-routes";

export const Route = createAPIFileRoute("/api/db/generate-schema")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        mermaidCode: string;
        targetDbConnection: string;
      };
      const { mermaidCode, targetDbConnection } = body;

      if (!mermaidCode?.trim()) {
        return new Response(JSON.stringify({ error: "mermaidCode is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!targetDbConnection) {
        return new Response(JSON.stringify({ error: "targetDbConnection is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse ERD
      const { MermaidParser } = await import("@erdwithai/generator");
      const parser = new MermaidParser();
      const schema = parser.parse(mermaidCode);

      if (!schema.entities || schema.entities.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No entities found in ERD. Check your Mermaid syntax.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Decrypt connection string
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

      // Parse connection URL
      const url = new URL(connStr);
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection({
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        connectTimeout: 10000,
      });

      // Generate DDL per entity
      const ddlStatements: string[] = [];
      const tablesCreated: string[] = [];

      for (const entity of schema.entities) {
        const tableName = entity.name
          .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
          .toLowerCase();

        const columns = entity.attributes.map((attr) => {
          const colName = attr.name;
          let colType = "VARCHAR(255)";
          const rawType = (attr.type || "string").toLowerCase();
          if (rawType === "int" || rawType === "integer") colType = "INT";
          else if (rawType === "bigint") colType = "BIGINT";
          else if (rawType === "float" || rawType === "double") colType = "DOUBLE";
          else if (rawType === "decimal") colType = "DECIMAL(10,2)";
          else if (rawType === "boolean" || rawType === "bool") colType = "TINYINT(1)";
          else if (rawType === "text") colType = "TEXT";
          else if (rawType === "date") colType = "DATE";
          else if (rawType === "datetime" || rawType === "timestamp") colType = "DATETIME";
          else if (rawType === "json") colType = "JSON";

          const pk = attr.unique && attr.name === "id" ? " PRIMARY KEY" : "";
          const autoInc =
            attr.unique && colName === "id" ? " AUTO_INCREMENT" : "";
          const notNull =
            attr.required && !(attr.unique && attr.name === "id") ? " NOT NULL" : "";
          return `  \`${colName}\` ${colType}${autoInc}${pk}${notNull}`;
        });

        if (!entity.attributes.some((a) => a.unique && a.name === "id")) {
          columns.unshift("  `id` INT AUTO_INCREMENT PRIMARY KEY");
        }

        const ddl = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n${columns.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        ddlStatements.push(ddl);
        tablesCreated.push(tableName);
      }

      try {
        for (const stmt of ddlStatements) {
          await connection.execute(stmt);
        }
      } finally {
        await connection.end();
      }

      return new Response(JSON.stringify({ success: true, tablesCreated }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to generate schema",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
