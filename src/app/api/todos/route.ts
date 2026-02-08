import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';

const CreateTodoSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  agent: z.string().optional(),
  session_id: z.string().optional(),
});

type CreateTodoRequest = z.infer<typeof CreateTodoSchema>;

/**
 * GET /api/todos
 * Get all todos with optional filtering
 * Query params: session_id, status (comma-separated), since (timestamp)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    const statusParam = searchParams.get('status');
    const sinceParam = searchParams.get('since');

    let todos = db.getAllTodos();

    if (sessionId) {
      todos = todos.filter((t) => t.session_id === sessionId);
    }

    if (statusParam) {
      const statuses = statusParam.split(',');
      todos = todos.filter((t) => statuses.includes(t.status));
    }

    if (sinceParam) {
      const since = parseInt(sinceParam, 10);
      if (!isNaN(since)) {
        todos = todos.filter((t) => t.updated_at >= since);
      }
    }

    return NextResponse.json(
      { todos },
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
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos
 * Create or update a todo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateTodoSchema.parse(body);

    let todo;

    if (data.id) {
      todo = db.updateTodo(data.id, {
        content: data.content,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        agent: data.agent || null,
        session_id: data.session_id || null,
        updated_at: Date.now(),
      });
    } else {
      todo = db.createTodo({
        id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: data.content,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        agent: data.agent || null,
        session_id: data.session_id || null,
      });
    }

    return NextResponse.json(
      { todo },
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

    console.error('Error creating/updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create/update todo' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/todos
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
