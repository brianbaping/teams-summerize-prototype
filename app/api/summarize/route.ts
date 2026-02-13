import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDatabase, getMessagesByDateRange, saveSummary } from '@/lib/db';
import { summaryRequestSchema } from '@/lib/validation';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import type { Message } from '@/lib/microsoft-graph';

/**
 * POST /api/summarize - Generate AI summary for a date range
 * Body: { chatId, startDate, endDate, provider? }
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    const validated = summaryRequestSchema.parse(body);
    const db = getDatabase();

    // Get provider from request or use environment default
    const provider = body.provider || process.env.AI_PROVIDER || 'ollama';

    // Get messages for the date range
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);
    const messages = getMessagesByDateRange(db, validated.chatId, startDate, endDate);

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_MESSAGES',
            message: 'No messages found for this date range',
          },
        },
        { status: 404 }
      );
    }

    // Convert to Graph API message format
    const graphMessages: Message[] = messages.map((msg) => ({
      id: msg.messageId,
      from: { user: { displayName: msg.author } },
      body: { content: msg.content },
      createdDateTime: typeof msg.createdAt === 'string' ? msg.createdAt : msg.createdAt.toISOString(),
    }));

    // Generate summary using selected LLM provider
    const { getLLMProvider } = require('@/lib/llm-provider');

    // Temporarily override environment variable for this request
    const originalProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = provider;

    const llmProvider = getLLMProvider();
    console.log(`[Summarize] Using LLM provider: ${llmProvider.getName()} (${provider})`);
    const dateRangeLabel = `${validated.startDate} to ${validated.endDate}`;
    const summaryText = await llmProvider.generateSummary(graphMessages, dateRangeLabel);
    const parsed = llmProvider.parseSummaryResponse(summaryText);

    // Restore original environment variable
    process.env.AI_PROVIDER = originalProvider;

    // Save to database
    const summaryId = saveSummary(db, {
      chatId: validated.chatId,
      periodStart: startDate,
      periodEnd: endDate,
      summaryText,
      actionItems: JSON.stringify({
        overview: parsed.overview,
        decisions: parsed.decisions,
        actionItems: parsed.actionItems,
        blockers: parsed.blockers,
        resources: parsed.resources,
      }),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: summaryId,
        summary: summaryText,
        parsed,
        messageCount: messages.length,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}
