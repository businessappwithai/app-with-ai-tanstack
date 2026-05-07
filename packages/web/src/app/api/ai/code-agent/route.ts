import { NextRequest, NextResponse } from 'next/server';
import { codeAgent } from '@erdwithai/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CodeAgentRequest {
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
  try {
    const body: CodeAgentRequest = await request.json();
    const { task, erdCode, stack, options } = body;

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

    // Execute the code agent
    const result = await codeAgent.generate(prompt, {
      maxSteps: 25,
    });

    // Extract the text response
    const responseText = result.text;

    return NextResponse.json({
      success: true,
      result: responseText,
      usage: result.usage,
    });
  } catch (error) {
    console.error('[Code Agent] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute code agent',
      },
      { status: 500 },
    );
  }
}
