import { NextRequest } from 'next/server';
import { codeAgent } from '@erdwithai/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CodeAgentStreamRequest {
  task: string;
  erdCode?: string;
  stack?: 'tanstackjs-nestjs' | 'openui5-odata';
  options?: {
    includeTests?: boolean;
    includeMigrations?: boolean;
    outputFormat?: 'files' | 'preview';
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const body: CodeAgentStreamRequest = await request.json();
  const { task, erdCode, stack, options } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial status
        sendEvent('status', {
          step: 'initializing',
          message: 'Initializing code generation environment...',
          progress: 5,
        });

        // Build the prompt with context
        let prompt = `Task: ${task}\n`;

        if (erdCode) {
          prompt += `\nCurrent ERD Diagram:\n${erdCode}\n`;
        }

        if (stack) {
          prompt += `\nTarget Stack: ${stack}\n`;
        }

        if (options) {
          prompt += `\nOptions:\n`;
          if (options.includeTests) prompt += `- Include unit tests\n`;
          if (options.includeMigrations) prompt += `- Include database migrations\n`;
          if (options.outputFormat) prompt += `- Output format: ${options.outputFormat}\n`;
        }

        sendEvent('status', {
          step: 'analyzing',
          message: 'Analyzing requirements and ERD structure...',
          progress: 15,
        });

        // Execute the code agent with streaming
        const result = await codeAgent.stream(prompt, {
          maxSteps: 25,
        });

        sendEvent('status', {
          step: 'generating',
          message: 'Generating code structure and files...',
          progress: 30,
        });

        let fullResponse = '';
        let stepCount = 0;
        const totalSteps = 25;

        for await (const chunk of result.fullStream) {
          stepCount++;
          const progress = 30 + Math.floor((stepCount / totalSteps) * 50);

          if (chunk.type === 'text-delta') {
            fullResponse += chunk.payload.text;
          } else if (chunk.type === 'tool-call') {
            sendEvent('status', {
              step: 'executing',
              message: `Executing: ${chunk.payload.toolName}`,
              progress,
            });
          } else if (chunk.type === 'tool-result') {
            sendEvent('status', {
              step: 'tool-result',
              message: `Completed: ${chunk.payload.toolName}`,
              progress: progress + 2,
            });
          }

          // Send partial updates
          if (stepCount % 3 === 0) {
            sendEvent('progress', {
              partial: fullResponse.slice(-500), // Last 500 chars
              progress,
            });
          }
        }

        // Get final result
        const finalText = result.text;

        sendEvent('status', {
          step: 'complete',
          message: 'Code generation complete!',
          progress: 100,
        });

        // Send final result
        sendEvent('complete', {
          result: finalText,
          message: 'Successfully generated code from ERD',
          usage: result.usage,
        });

        controller.close();
      } catch (error) {
        console.error('[Code Agent Stream] Error:', error);

        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Code generation failed',
          error: error instanceof Error ? error.stack : undefined,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
