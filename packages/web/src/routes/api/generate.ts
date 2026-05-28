import { createFileRoute } from "@tanstack/react-router";
import { generationHistoryDb, projectDb } from "@erdwithai/core/services";
import { FullStackGenerator, MermaidParser } from "@erdwithai/generator";
import fs from "fs/promises";
import path from "path";

export const Route = createFileRoute("/api/generate")({ server: { handlers: {
  POST: async ({ request }) => {
    const body = await request.json();
    const { projectId, stackType, stackOption, erdCode } = body;

    console.log("Generate API received:", {
      projectId: projectId ? "SET" : "MISSING",
      stackType: stackType ? stackType : "MISSING",
      stackOption: stackOption ? stackOption : "MISSING",
      erdCode: erdCode ? `SET (${erdCode.length} chars)` : "MISSING",
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (level: string, message: string) => {
          const data = `data: ${JSON.stringify({ log: message, level })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        const sendComplete = (outputPath: string) => {
          const data = `data: ${JSON.stringify({ complete: true, path: outputPath })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        const sendError = (error: string) => {
          const data = `data: ${JSON.stringify({ error })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          if (!projectId) {
            sendError("Missing required field: projectId");
            controller.close();
            return;
          }

          sendLog("info", "Loading project details...");
          const project = await projectDb.findById(projectId);
          if (!project) {
            sendError("Project not found in database");
            controller.close();
            return;
          }

          const finalErdCode = erdCode || project.erdCode;
          if (!finalErdCode) {
            sendError("No ERD code found. Please create an ERD diagram first.");
            controller.close();
            return;
          }

          let finalStackType = stackType;
          let finalStackOption = stackOption;
          if (stackOption) {
            finalStackType = stackOption === "tanstackjs-nestjs" ? "tanstackjs-nestjs" : "odata-ui5";
          } else if (!finalStackType) {
            finalStackType = project.stackType || "tanstackjs-nestjs";
            finalStackOption =
              finalStackType === "tanstackjs-nestjs" ? "tanstackjs-nestjs" : "openui5-odatav4";
          }

          sendLog("info", `Initializing generator for stack: ${finalStackType}`);

          sendLog("info", "Parsing ERD definition...");
          const parser = new MermaidParser();
          const { entities, relationships } = parser.parse(finalErdCode);
          sendLog(
            "success",
            `Parsed ${entities.length} entities and ${relationships.length} relationships`
          );

          const outputDir = path.join(process.cwd(), "generated-projects", projectId);
          await fs.mkdir(outputDir, { recursive: true });
          sendLog("info", `Created output directory: ${outputDir}`);

          sendLog("info", `Initializing FullStackGenerator for ${finalStackType}...`);
          const generator = new FullStackGenerator({
            stackOption: finalStackOption,
            projectName: project.name || `Project ${projectId}`,
            projectVersion: "1.0.0",
            projectDescription: project.description || `Generated ${finalStackType} application`,
          });

          // TODO: Complete generation logic
          sendLog("info", "Generating project structure...");
          sendLog("success", "Code generation complete");
          sendComplete(outputDir);
          controller.close();
        } catch (error) {
          console.error("Generation error:", error);
          sendError(error instanceof Error ? error.message : "Generation failed");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
  },
  },
});
