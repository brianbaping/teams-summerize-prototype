import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import { getDatabase, getMonitoredChat, saveMessage, getMessages } from '@/lib/db';
import { messageFetchSchema } from '@/lib/validation';

/**
 * GET /api/messages - Fetch messages from monitored chat
 * Query params: chatId (required), since (optional ISO date)
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const validated = messageFetchSchema.parse({
      chatId: searchParams.get('chatId'),
      since: searchParams.get('since') || undefined,
    });

    const db = getDatabase();
    const chat = getMonitoredChat(db, validated.chatId);

    if (!chat) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Chat not monitored',
          },
        },
        { status: 404 }
      );
    }

    // Fetch new messages from Graph API (use 'since' to avoid refetching old messages)
    const client = new GraphAPIClient(session.accessToken!);
    const sinceDate = validated.since ? new Date(validated.since) : undefined;
    const newMessages = await client.getChatMessages(
      chat.chatId,
      sinceDate
    );

    // Save to database
    let savedCount = 0;
    for (const msg of newMessages) {
      try {
        saveMessage(db, {
          messageId: msg.id,
          chatId: chat.chatId,
          author: msg.from?.user?.displayName,
          content: msg.body?.content,
          createdAt: msg.createdDateTime,
        });
        savedCount++;
      } catch (error) {
        // Skip duplicates
      }
    }

    // Return ALL cached messages from database (no server-side date filtering)
    // Let the client handle date range filtering for display
    const allMessages = getMessages(db, validated.chatId);

    return NextResponse.json({
      success: true,
      data: {
        messages: allMessages,
        newMessageCount: savedCount,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
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
