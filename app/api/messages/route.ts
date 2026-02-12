import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import { getDatabase, getMonitoredChannel, saveMessage, getMessages } from '@/lib/db';
import { messageFetchSchema } from '@/lib/validation';

/**
 * GET /api/messages - Fetch messages from monitored channel
 * Query params: channelId (required), since (optional ISO date)
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const validated = messageFetchSchema.parse({
      channelId: searchParams.get('channelId'),
      since: searchParams.get('since') || undefined,
    });

    const db = getDatabase();
    const channel = getMonitoredChannel(db, validated.channelId);

    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Channel not monitored',
          },
        },
        { status: 404 }
      );
    }

    // Fetch new messages from Graph API
    const client = new GraphAPIClient(session.accessToken!);
    const sinceDate = validated.since ? new Date(validated.since) : undefined;
    const newMessages = await client.getChannelMessages(
      channel.teamId,
      channel.channelId,
      sinceDate
    );

    // Save to database
    let savedCount = 0;
    for (const msg of newMessages) {
      try {
        saveMessage(db, {
          messageId: msg.id,
          channelId: channel.channelId,
          author: msg.from?.user?.displayName,
          content: msg.body?.content,
          createdAt: msg.createdDateTime,
        });
        savedCount++;
      } catch (error) {
        // Skip duplicates
      }
    }

    // Return all messages
    const allMessages = getMessages(db, validated.channelId, sinceDate);

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
