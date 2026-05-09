import { createAPIFileRoute } from "@tanstack/start/api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const GENERATED_HOOKS_BASE_PATH = join(process.cwd(), "generated-projects");

export const Route = createAPIFileRoute(
  "/api/projects/$id/workflows/$serviceName/files/$fileName"
)({
  PUT: async ({ request, params }) => {
    try {
      const projectId = params.id;
      const serviceName = params.serviceName;
      const fileName = params.fileName;
      const entityName = serviceName.replace("Service", "");

      const body = await request.json();
      const { code } = body;

      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Code is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const hooksDir = join(
        GENERATED_HOOKS_BASE_PATH,
        projectId,
        "src",
        "modules",
        entityName.toLowerCase(),
        "hooks"
      );

      await mkdir(hooksDir, { recursive: true });

      const filePath = join(hooksDir, fileName);
      await writeFile(filePath, code, "utf-8");

      return new Response(
        JSON.stringify({
          success: true,
          message: `File ${fileName} saved successfully`,
          fileName,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error saving hook file:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to save file",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
