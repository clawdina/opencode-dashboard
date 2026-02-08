import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

// Validation schema for events
const EventSchema = z.object({
  type: z.enum(['todo_update', 'error', 'state_change']),
  payload: z.record(z.string(), z.any()),
  sessionId: z.string().optional(),
});

type Event = z.infer<typeof EventSchema>;

/**
 * POST /api/events
 * Receives events from oh-my-opencode
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = EventSchema.parse(body);

    // Handle different event types
    switch (event.type) {
      case 'todo_update': {
        const { id, content, status, priority, agent } = event.payload;
        if (id) {
          db.updateTodo(id, {
            content,
            status,
            priority,
            agent,
            updated_at: Date.now(),
          });
        }
        break;
      }

      case 'error': {
        const { message, sessionId: sid } = event.payload;
        db.createMessage({
          type: 'error',
          content: message || 'Unknown error',
          session_id: event.sessionId || sid || null,
          todo_id: null,
          read: 0,
        });
        break;
      }

      case 'state_change': {
        const { message, sessionId: sid } = event.payload;
        db.createMessage({
          type: 'state_change',
          content: message || 'State changed',
          session_id: event.sessionId || sid || null,
          todo_id: null,
          read: 0,
        });
        break;
      }
    }

    return NextResponse.json(
      { success: true, event },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'localhost:*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    console.error('Event processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process event' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/events
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
