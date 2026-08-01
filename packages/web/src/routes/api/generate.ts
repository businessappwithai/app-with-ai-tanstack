import { createFileRoute } from "@tanstack/react-router";
import fs from "fs/promises";
import path from "path";

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
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

              const { projectDb } = await import("@erdwithai/core/services");
              // The shared pipeline, not FullStackGenerator directly: assembling
              // the generator's options here is what let this path drift from
              // the CLI and silently drop the model's entity categories.
              const { generateApplication, parseModel } = await import("@erdwithai/generator");

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

              const finalStackType =
                stackOption || stackType || project.stackType || "tanstackjs-nestjs";
              const finalStackOption =
                finalStackType === "tanstackjs-nestjs" ? "tanstackjs-nestjs" : finalStackType;

              sendLog("info", `Initializing generator for stack: ${finalStackType}`);

              sendLog("info", "Parsing ERD definition...");
              const model = parseModel(finalErdCode);
              sendLog(
                "success",
                `Parsed ${model.entities.length} entities and ${model.relationships.length} relationships`
              );
              sendLog(
                "success",
                `Resolved ${model.categories.length} entity categories: ${model.categories
                  .map((category) => category.name)
                  .sort()
                  .join(", ")}`
              );

              const outputDir = path.join(process.cwd(), "generated-projects", projectId);
              await fs.mkdir(outputDir, { recursive: true });
              sendLog("info", `Created output directory: ${outputDir}`);

              sendLog("info", `Initializing generator for ${finalStackType}...`);
              sendLog(
                "info",
                `Generating ${model.entities.length} entities (${model.relationships.length} relationships)...`
              );
              await generateApplication({
                sources: finalErdCode,
                model,
                stackOption: finalStackOption,
                projectName: project.name || `Project ${projectId}`,
                projectDescription:
                  project.description || `Generated ${finalStackType} application`,
                outputDir,
                port: project.port || 4000,
                manifest: { input: "erdCode", packageManager: "bun" },
              });
              sendLog("success", `Generated ${model.entities.length} entities successfully`);

              await projectDb.update(projectId, {
                generatedPath: outputDir,
                deploymentStatus: "completed",
              });

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
