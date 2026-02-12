import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { GraphAPIClient } from '@/lib/microsoft-graph';
import { getDatabase, saveMonitoredChannel, getAllMonitoredChannels } from '@/lib/db';
import { channelSelectionSchema } from '@/lib/validation';
import { ValidationError } from '@/lib/errors';

/**
 * GET /api/channels - List available teams and channels
 */
export async function GET() {
  try {
    const session = await requireAuth();
    const client = new GraphAPIClient(session.accessToken!);

    const teams = await client.getJoinedTeams();
    const teamsWithChannels = await Promise.all(
      teams.map(async (team) => ({
        ...team,
        channels: await client.getChannels(team.id),
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        teams: teamsWithChannels,
        monitored: getAllMonitoredChannels(getDatabase()),
      },
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

/**
 * POST /api/channels - Save a channel to monitor
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    const validated = channelSelectionSchema.parse(body);
    const db = getDatabase();

    const id = saveMonitoredChannel(db, {
      teamId: validated.teamId,
      channelId: validated.channelId,
      channelName: validated.channelName,
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
