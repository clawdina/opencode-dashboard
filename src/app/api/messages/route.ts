import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

const MarkReadSchema = z.object({
  ids: z.array(z.string()),
});

type MarkReadRequest = z.infer<typeof MarkReadSchema>;

/**
 * GET /api/messages
 * Get messages with optional filtering
 * Query params: unread_only (boolean), since (timestamp)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const sinceParam = searchParams.get('since');

    let messages = db.getMessages();

    if (unreadOnly) {
      messages = messages.filter((m) => m.read === 0);
    }

    if (sinceParam) {
      const since = parseInt(sinceParam, 10);
      if (!isNaN(since)) {
        messages = messages.filter((m) => m.created_at >= since);
      }
    }

    return NextResponse.json(
      { messages },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Mark messages as read
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = MarkReadSchema.parse(body);

    const results = data.ids.map((id) => {
      const messageId = parseInt(id, 10);
      if (!isNaN(messageId)) {
        return db.markMessageAsRead(messageId);
      }
      return false;
    });

    const successCount = results.filter(Boolean).length;

    return NextResponse.json(
      { success: true, marked: successCount, total: data.ids.length },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/messages
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
