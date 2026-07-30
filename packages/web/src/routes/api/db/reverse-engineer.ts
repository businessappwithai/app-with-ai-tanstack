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

      const { Client } = await import("pg");
      const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 30000 });
      await client.connect();

      try {
        const tablesRes = await client.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           ORDER BY table_name`
        );

        if (tablesRes.rows.length === 0) {
          return new Response(JSON.stringify({ mermaidCode: "erDiagram\n" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const tableNames = tablesRes.rows.map((r) => r.table_name);

        const toEmlType = (dt: string) => {
          if (["integer", "int", "int4", "int2", "int8", "bigint", "smallint"].includes(dt)) return "int";
          if (["numeric", "decimal", "float4", "float8", "real", "double precision"].includes(dt)) return "float";
          if (["text", "character varying", "varchar", "char", "bpchar"].includes(dt)) return "string";
          if (dt === "date") return "date";
          if (["timestamp", "timestamptz", "timestamp with time zone", "timestamp without time zone"].includes(dt))
            return "datetime";
          if (dt === "boolean" || dt === "bool") return "boolean";
          if (dt === "json" || dt === "jsonb") return "json";
          return "string";
        };

        const toPascal = (s: string) =>
          s.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());

        let mmd = "erDiagram\n";
        for (const tableName of tableNames) {
          const colsRes = await client.query<{
            column_name: string;
            data_type: string;
            is_nullable: string;
            constraint_type: string | null;
          }>(
            `SELECT c.column_name, c.data_type, c.is_nullable,
                    tc.constraint_type
             FROM information_schema.columns c
             LEFT JOIN information_schema.key_column_usage kcu
               ON kcu.table_schema = 'public'
              AND kcu.table_name = c.table_name
              AND kcu.column_name = c.column_name
             LEFT JOIN information_schema.table_constraints tc
               ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = 'public'
             WHERE c.table_schema = 'public' AND c.table_name = $1
             ORDER BY c.ordinal_position`,
            [tableName]
          );

          const entityName = toPascal(tableName);
          mmd += `  ${entityName} {\n`;
          for (const col of colsRes.rows) {
            const emlType = toEmlType(col.data_type);
            const pk = col.constraint_type === "PRIMARY KEY" ? " PK" : col.constraint_type === "FOREIGN KEY" ? " FK" : "";
            const optional = col.is_nullable === "YES" ? " OPTIONAL" : "";
            mmd += `    ${emlType} ${col.column_name}${pk}${optional}\n`;
          }
          mmd += `  }\n`;
        }

        return new Response(JSON.stringify({ mermaidCode: mmd }), {
          headers: { "Content-Type": "application/json" },
        });
      } finally {
        await client.end();
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
