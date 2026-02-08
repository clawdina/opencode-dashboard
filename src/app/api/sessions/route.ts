import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

const CreateSessionSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
});

type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;

/**
 * GET /api/sessions
 * Get all sessions
 */
export async function GET(request: NextRequest) {
  try {
    const sessions = db.getAllSessions();

    return NextResponse.json(
      { sessions },
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
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateSessionSchema.parse(body);

    const session = db.createSession({
      id: data.id,
      name: data.name || null,
      ended_at: null,
    });

    return NextResponse.json(
      { session },
      {
        status: 201,
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

    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/sessions
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
