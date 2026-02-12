import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/claude/chat - Direct Claude API access for playground
 * Body: { prompt }
 */
export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Prompt is required',
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Claude API is not configured. Please set ANTHROPIC_API_KEY environment variable.',
          },
        },
        { status: 503 }
      );
    }

    const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    const client = new Anthropic({
      apiKey,
    });

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('\n');

    return NextResponse.json({
      success: true,
      data: {
        response: text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      },
    });
  } catch (error: any) {
    console.error('[Claude Chat] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'CLAUDE_API_ERROR',
          message: error.message || 'Failed to get response from Claude API',
        },
      },
      { status: error.status || 500 }
    );
  }
}
