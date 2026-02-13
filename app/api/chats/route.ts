import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import { getDatabase, saveMonitoredChat, getAllMonitoredChats, deactivateMonitoredChat } from '@/lib/db';
import { chatSelectionSchema } from '@/lib/validation';
import { ValidationError } from '@/lib/errors';

/**
 * GET /api/chats - List available chats
 * Query params: daysBack (optional, default 7)
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('daysBack') || '7');

    const client = new GraphAPIClient(session.accessToken!);

    console.log(`[API] Fetching chats (last ${daysBack} days)...`);
    const chats = await client.getChats(daysBack);
    console.log(`[API] Found ${chats.length} chats`);

    // Get ALL monitored chats including ignored ones
    const db = getDatabase();
    const allMonitored = getAllMonitoredChats(db, true); // includeIgnored = true

    return NextResponse.json({
      success: true,
      data: {
        chats: chats,
        monitored: allMonitored.filter(m => m.status !== 'ignored'),
        ignored: allMonitored.filter(m => m.status === 'ignored'),
      },
    });
  } catch (error: any) {
    console.error('[API] Error in GET /api/chats:', error);
    console.error('[API] Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      originalError: error.originalError,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          details: error.statusCode ? `HTTP ${error.statusCode}` : undefined,
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/chats - Save a chat to monitor
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    const validated = chatSelectionSchema.parse(body);
    const db = getDatabase();

    const id = saveMonitoredChat(db, {
      chatId: validated.chatId,
      chatName: validated.chatName,
      chatType: validated.chatType,
      status: validated.status || 'active',
    });

    return NextResponse.json({
      success: true,
      data: { id },
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

/**
 * DELETE /api/chats - Stop monitoring a chat
 * Query params: chatId (required)
 */
export async function DELETE(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Chat ID is required',
          },
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    deactivateMonitoredChat(db, chatId);

    return NextResponse.json({
      success: true,
      data: { message: 'Chat monitoring stopped' },
    });
  } catch (error: any) {
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
