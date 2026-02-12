import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDatabase, getMessagesByDateRange, saveSummary } from '@/lib/db';
import { generateSummary, parseSummaryResponse } from '@/lib/ollama';
import { summaryRequestSchema } from '@/lib/validation';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import type { Message } from '@/lib/microsoft-graph';

/**
 * POST /api/summarize - Generate AI summary for a date
 * Body: { channelId, date }
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    const validated = summaryRequestSchema.parse(body);
    const db = getDatabase();

    // Get messages for the date
    const date = new Date(validated.date);
    const messages = getMessagesByDateRange(db, validated.channelId, date, date);

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_MESSAGES',
            message: 'No messages found for this date',
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

    // Generate summary
    const summaryText = await generateSummary(graphMessages, validated.date);
    const parsed = parseSummaryResponse(summaryText);

    // Save to database
    const summaryId = saveSummary(db, {
      channelId: validated.channelId,
      periodStart: date,
      periodEnd: date,
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
