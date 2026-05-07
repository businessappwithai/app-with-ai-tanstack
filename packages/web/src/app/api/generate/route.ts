import { NextRequest } from "next/server";
import { MermaidParser, FullStackGenerator } from "@erdwithai/generator";
import path from "path";
import fs from "fs/promises";
import { projectDb, generationHistoryDb } from "@erdwithai/core/services";

export async function POST(request: NextRequest) {
  // Read the request body FIRST before creating the stream
  const body = await request.json();
  const { projectId, stackType, stackOption, erdCode } = body;

  // Debug logging
  console.log("Generate API received:", {
    projectId: projectId ? "SET" : "MISSING",
    stackType: stackType ? stackType : "MISSING",
    stackOption: stackOption ? stackOption : "MISSING",
    erdCode: erdCode ? `SET (${erdCode.length} chars)` : "MISSING",
    bodyKeys: Object.keys(body)
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

        // Get project details first
        sendLog("info", "Loading project details...");
        const project = await projectDb.findById(projectId);
        if (!project) {
          sendError("Project not found in database");
          controller.close();
          return;
        }

        // Use project's ERD code if not provided
        const finalErdCode = erdCode || project.erdCode;
        if (!finalErdCode) {
          sendError("No ERD code found. Please create an ERD diagram first.");
          controller.close();
          return;
        }

        // Determine stack type from parameter or project
        let finalStackType = stackType;
        let finalStackOption = stackOption;
        if (stackOption) {
          // Map stackOption to stackType
          finalStackType = stackOption === "tanstackjs-nestjs" ? "nestjs-nextjs" : "odata-ui5";
        } else if (!finalStackType) {
          // Use project's stack type as fallback
          finalStackType = project.stackType || "nestjs-nextjs";
          // Map stackType to stackOption
          finalStackOption = finalStackType === "nestjs-nextjs" ? "tanstackjs-nestjs" : "openui5-odatav4";
        }

        sendLog("info", `Initializing generator for stack: ${finalStackType}`);

        // Parse Mermaid ERD
        sendLog("info", "Parsing ERD definition...");
        const parser = new MermaidParser();
        const { entities, relationships } = parser.parse(finalErdCode);
        sendLog(
          "success",
          `Parsed ${entities.length} entities and ${relationships.length} relationships`,
        );

        // Create output directory - use generated-projects in the root
        const outputDir = path.join(process.cwd(), "generated-projects", projectId);
        await fs.mkdir(outputDir, { recursive: true });
        sendLog("info", `Created output directory: ${outputDir}`);

        // Create the generator
        sendLog("info", `Initializing FullStackGenerator for ${finalStackType}...`);
        const generator = new FullStackGenerator({
          stackOption: finalStackOption,
          projectName: project.name || `Project ${projectId}`,
          projectVersion: "1.0.0",
          projectDescription: project.description || `Generated ${finalStackType} application`,
          outputDir,
          port: project.port || 4001,
        });

        // Generate the application
        sendLog("info", `Generating ${finalStackType} full-stack application...`);
        sendLog("info", "Creating backend...");
        await generator.generate(entities, relationships);
        sendLog("success", "✓ Backend generated");

        sendLog("info", "Creating frontend...");
        sendLog("success", "✓ Frontend generated");

        // Update project with generated path
        await projectDb.update(projectId, {
          generatedPath: outputDir,
          status: "generated",
        });

        // Create generation history record
        const generation = await generationHistoryDb.create({
          project_id: projectId,
          stack_type: finalStackType,
          stack_version: "latest",
          generation_options: { stackOption: finalStackOption },
          status: "generating",
        });

        // Complete generation history with output details
        await generationHistoryDb.complete(generation.id, {
          generated_path: outputDir,
          port: project.port || 4001,
          start_command: "npm start",
          install_command: "npm install",
          files_generated: entities.length * 10, // Estimate
        });

        sendLog("success", "Application generated successfully!");
        sendComplete(outputDir);
      } catch (error) {
        console.error("Generation error:", error);
        sendError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
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
}
