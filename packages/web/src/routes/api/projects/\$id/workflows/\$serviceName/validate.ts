import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/projects/$id/workflows/$serviceName/validate")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { hooks, flowchartCode } = body;

      const validationErrors: string[] = [];

      // Validate hooks array
      if (!hooks || !Array.isArray(hooks)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Hooks must be an array",
            validationErrors: ["hooks is required and must be an array"],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (hooks.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "At least one hook is required",
            validationErrors: ["At least one hook must be defined"],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate each hook
      const validHookTypes = [
        "beforeCreate",
        "afterCreate",
        "beforeUpdate",
        "afterUpdate",
        "beforeDelete",
        "afterDelete",
        "beforeQuery",
        "afterQuery",
        "customValidate",
        "beforeRead",
        "afterRead",
        "beforeList",
        "afterList",
      ];

      hooks.forEach(
        (
          hook: { type?: string; name?: string; entity?: string; code?: string },
          index: number
        ) => {
          // Validate hook type
          if (!hook.type || !validHookTypes.includes(hook.type)) {
            validationErrors.push(`Hook ${index + 1}: Invalid hook type "${hook.type}"`);
          }

          // Validate hook name
          if (!hook.name || typeof hook.name !== "string") {
            validationErrors.push(`Hook ${index + 1}: Hook name is required`);
          } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(hook.name)) {
            validationErrors.push(
              `Hook ${index + 1}: Invalid hook name "${hook.name}". Must start with letter or underscore and contain only letters, numbers, and underscores`
            );
          }

          // Validate entity
          if (!hook.entity || typeof hook.entity !== "string") {
            validationErrors.push(`Hook ${index + 1}: Entity is required`);
          } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(hook.entity)) {
            validationErrors.push(
              `Hook ${index + 1}: Invalid entity name "${hook.entity}". Must start with letter or underscore and contain only letters, numbers, and underscores`
            );
          }

          // Validate code
          if (!hook.code || typeof hook.code !== "string") {
            validationErrors.push(`Hook ${index + 1}: Hook code is required`);
          } else if (hook.code.trim().length === 0) {
            validationErrors.push(`Hook ${index + 1}: Hook code cannot be empty`);
          }

          // Check for duplicate hook names
          const duplicateCount = hooks.filter(
            (h: { type?: string; name?: string }) => h.type === hook.type && h.name === hook.name
          ).length;
          if (duplicateCount > 1) {
            validationErrors.push(`Hook ${index + 1}: Duplicate hook "${hook.type}:${hook.name}"`);
          }
        }
      );

      // Validate flowchart code
      if (!flowchartCode || typeof flowchartCode !== "string") {
        validationErrors.push("Flowchart code is required");
      } else if (!flowchartCode.trim().startsWith("flowchart")) {
        validationErrors.push("Flowchart code must start with 'flowchart' keyword");
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Validation failed",
            validationErrors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Workflow validated successfully",
          hooksCount: hooks.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Validation error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Validation failed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
