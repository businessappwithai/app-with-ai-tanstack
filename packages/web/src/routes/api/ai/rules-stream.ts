import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import { parseMermaidFlowchart } from "@/lib/mermaid-flowchart-parser";
import { convertToJdm } from "@/lib/jdm-converter";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sse(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

// AI-powered: natural language → Mermaid flowchart TD
async function generateFlowchart(
  description: string,
  currentFlowchartCode: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  sse(controller, encoder, { step: "analyzing", message: "Analyzing business rule description..." });

  const systemPrompt = `You are an expert at converting business rules into Mermaid flowchart diagrams.
Generate ONLY valid Mermaid flowchart syntax using the TD (top-down) direction.

Node types:
- A([text]) — start/end nodes (rounded rectangle with double brackets)
- B{text} — decision nodes (rhombus)
- C[text] — process/action nodes (rectangle)
- D((text)) — sub-process/function nodes (circle)

Edge labels for decisions use |label| syntax: B -->|Yes| C

Rules:
- Always start with "flowchart TD" on the first line
- Use meaningful single-word or short IDs (A, B, C or descriptive like OrderCheck)
- Every flowchart must have at least one start ([...]) and one end node
- Decision nodes must have at least two outgoing edges with labels
- Keep labels concise (under 40 characters)
- Return ONLY the Mermaid code, no markdown fences, no explanation`;

  const userPrompt = currentFlowchartCode?.trim() && currentFlowchartCode !== "flowchart TD"
    ? `Current flowchart:\n${currentFlowchartCode}\n\nUpdate or extend it based on: ${description}`
    : `Create a flowchart for: ${description}`;

  sse(controller, encoder, { step: "generating", message: "Generating Mermaid flowchart..." });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0];
  if (!content || content.type !== "text") throw new Error("Unexpected response type");

  let flowchartCode = (content as { type: "text"; text: string }).text.trim();
  flowchartCode = flowchartCode.replace(/^```(?:mermaid)?\n?/m, "").replace(/```$/m, "").trim();

  if (!flowchartCode.startsWith("flowchart")) {
    flowchartCode = `flowchart TD\n${flowchartCode}`;
  }

  sse(controller, encoder, { step: "complete", message: "Flowchart generated!", flowchartCode });
}

// Pure TypeScript AST-based conversion: Mermaid flowchart → GoRules JDM
function convertToJdmFromMermaid(
  flowchartCode: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  sse(controller, encoder, { step: "analyzing", message: "Parsing flowchart structure..." });

  const ast = parseMermaidFlowchart(flowchartCode);
  const jdm = convertToJdm(ast);

  sse(controller, encoder, { step: "complete", message: "JDM generated!", jdm });
}

export const Route = createFileRoute("/api/ai/rules-stream")({ server: { handlers: {
  POST: async ({ request }) => {
    const encoder = new TextEncoder();

    try {
      const body = (await request.json()) as {
        action: string;
        description?: string;
        currentFlowchartCode?: string;
        flowchartCode?: string;
        projectId?: string;
      };

      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (body.action === "generate-flowchart") {
              if (!body.description) {
                sse(controller, encoder, { step: "error", message: "Description is required" });
              } else {
                await generateFlowchart(
                  body.description,
                  body.currentFlowchartCode ?? "",
                  controller,
                  encoder
                );
              }
            } else if (body.action === "convert-to-jdm") {
              if (!body.flowchartCode) {
                sse(controller, encoder, { step: "error", message: "Flowchart code is required" });
              } else {
                convertToJdmFromMermaid(body.flowchartCode, controller, encoder);
              }
            } else {
              sse(controller, encoder, { step: "error", message: `Unknown action: ${body.action}` });
            }
          } catch (err) {
            sse(controller, encoder, {
              step: "error",
              message: err instanceof Error ? err.message : "Unknown error",
            });
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
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  },
  },
});
