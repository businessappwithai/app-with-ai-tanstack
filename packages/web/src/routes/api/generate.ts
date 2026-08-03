/**
 * Generate an application from a project's model.
 *
 * The project's EML document is written to disk and handed to the generator
 * CLI, which is the same command a developer runs by hand. Going through the
 * CLI rather than calling the generator in-process means there is one execution
 * path: the pre-flight EML check and auto-fix, the parse, the categories, the
 * manifest and the post-generation setup all happen exactly once, in one place,
 * and the app cannot drift from the command line the way it did when it
 * assembled the generator's options itself.
 *
 * The `.mmd` is kept next to the output so the generated application always has
 * the model that produced it sitting beside it.
 */

import { createFileRoute } from "@tanstack/react-router";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

/** Resolve the generator CLI entry point, preferring the built bundle. */
async function resolveCli(cwd: string): Promise<string | null> {
  const candidates = [
    path.join(cwd, "packages/generator/dist/cli/generate.js"),
    path.join(cwd, "node_modules/@erdwithai/generator/dist/cli/generate.js"),
    path.join(cwd, "packages/generator/src/cli/generate.ts"),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try the next one
    }
  }
  return null;
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const { projectId, stackType, stackOption, erdCode } = body;

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            let closed = false;
            const send = (payload: Record<string, unknown>) => {
              if (closed) return;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };
            const sendLog = (level: string, message: string) => send({ log: message, level });
            const finish = () => {
              if (closed) return;
              closed = true;
              controller.close();
            };

            try {
              if (!projectId) {
                send({ error: "Missing required field: projectId" });
                return finish();
              }

              const { projectDb } = await import("@erdwithai/core/services");
              const { parseModel } = await import("@erdwithai/generator");

              sendLog("info", "Loading project details...");
              const project = await projectDb.findById(projectId);
              if (!project) {
                send({ error: "Project not found in database" });
                return finish();
              }

              const finalErdCode = erdCode || project.erdCode;
              if (!finalErdCode) {
                send({ error: "No ERD code found. Please create an ERD diagram first." });
                return finish();
              }

              const finalStackType =
                stackOption || stackType || project.stackType || "tanstackjs-nestjs";

              // Parse up front so the log names what is about to be generated
              // and an unparseable model fails before anything is written.
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

              const { DEFAULT_APP_PORT } = await import("@/lib/generated-ports");
              const appPort = project.port || DEFAULT_APP_PORT;

              const cwd = process.cwd();
              const outputDir = path.join(cwd, "generated-projects", projectId);
              const modelDir = path.join(cwd, "generated-projects", "models");
              await fs.mkdir(modelDir, { recursive: true });

              const slug =
                (project.name || projectId).toLowerCase().replace(/[^a-z0-9]+/g, "-") || projectId;
              const modelPath = path.join(modelDir, `${slug}.eml.mmd`);
              await fs.writeFile(modelPath, finalErdCode, "utf-8");
              sendLog("info", `Wrote model: ${modelPath}`);

              const cli = await resolveCli(cwd);
              if (!cli) {
                send({
                  error:
                    "Generator CLI not found. Run `bun --filter @erdwithai/generator build` and try again.",
                });
                return finish();
              }

              const args = [
                cli,
                "generate",
                "--input",
                modelPath,
                "--output",
                outputDir,
                "--name",
                project.name || `project-${projectId}`,
                "--description",
                project.description || `Generated ${finalStackType} application`,
                "--stack",
                finalStackType,
                // A project owns an adjacent pair: the app on the port it was
                // allocated, the API one above. Passing only --port set the
                // *backend* port and let the frontend default to one above it,
                // so a project allocated 4003 served its app on 4004 — a port
                // the next project also thought it owned.
                "--frontend-port",
                String(appPort),
                "--port",
                String(appPort + 1),
                "--db",
                project.databaseType === "sqlite" ? "sqlite" : "postgresql",
                "--force",
                // The browser is waiting on this stream: installing dependencies
                // and migrating a database would hold it open for minutes. The
                // generated README documents the setup command.
                "--no-setup",
              ];

              sendLog("info", `Running: erdwithai generate --input ${path.basename(modelPath)}`);

              const exitCode = await new Promise<number>((resolve) => {
                const child = spawn("bun", args, { cwd, env: process.env });

                const relay = (level: string) => (chunk: Buffer) => {
                  for (const line of chunk.toString().split("\n")) {
                    const text = line.replace(/\s+$/, "");
                    if (text.trim()) sendLog(level, text);
                  }
                };

                child.stdout.on("data", relay("info"));
                child.stderr.on("data", relay("warn"));
                child.on("error", (error) => {
                  sendLog("error", `Failed to start the generator CLI: ${error.message}`);
                  resolve(1);
                });
                child.on("close", (code) => resolve(code ?? 1));
              });

              if (exitCode !== 0) {
                send({ error: `Generator CLI exited with code ${exitCode}` });
                return finish();
              }

              await projectDb.update(projectId, {
                generatedPath: outputDir,
                deploymentStatus: "completed",
              });

              sendLog("success", "Code generation complete");
              send({ complete: true, path: outputDir, model: modelPath });
              finish();
            } catch (error) {
              console.error("Generation error:", error);
              send({ error: error instanceof Error ? error.message : "Generation failed" });
              finish();
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
