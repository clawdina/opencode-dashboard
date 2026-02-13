import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { checkRateLimit, corsHeaders, validateAuth } from '@/lib/auth/middleware';

const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'blocked',
  'deferred',
  'cancelled',
  'review',
]);

const TaskPrioritySchema = z.enum(['high', 'medium', 'low']);

const DependenciesSchema = z.union([
  z.string(),
  z.array(z.number().int().positive()),
  z.null(),
]).optional();

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dependencies: DependenciesSchema,
  details: z.string().nullable().optional(),
  test_strategy: z.string().nullable().optional(),
  tag: z.string().min(1).optional(),
  complexity_score: z.number().nullable().optional(),
  assigned_agent_id: z.string().nullable().optional(),
  linear_issue_id: z.string().nullable().optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.number().int().positive(),
});

const DeleteTaskSchema = z.object({
  id: z.number().int().positive(),
});

function normalizeDependencies(
  dependencies: string | number[] | null | undefined
): string | null {
  if (dependencies === undefined || dependencies === null) {
    return null;
  }
  if (Array.isArray(dependencies)) {
    return JSON.stringify(dependencies);
  }
  if (dependencies.trim() === '') {
    return null;
  }
  return dependencies;
}

export async function GET(request: NextRequest) {
  const authResult = validateAuth(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get('tag') || 'master';
    const statusParam = searchParams.get('status');
    const statuses = statusParam ? statusParam.split(',').map((value) => value.trim()) : [];

    let tasks = db.getAllTasks(tag);
    if (statuses.length > 0) {
      const statusSet = new Set(statuses);
      tasks = tasks.filter((task) => statusSet.has(task.status));
    }

    return NextResponse.json(
      { tasks },
      {
        status: 200,
        headers: corsHeaders(request),
      }
    );
  } catch (error) {
    console.error('Error fetching v2 tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = validateAuth(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
  }

  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    const headers = new Headers(corsHeaders(request));
    headers.set('Retry-After', String(rateLimitResult.retryAfterSeconds ?? 1));
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const body = await request.json();
    const data = CreateTaskSchema.parse(body);

    const task = db.createTask({
      tag: data.tag || 'master',
      title: data.title,
      description: data.description ?? null,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      dependencies: normalizeDependencies(data.dependencies),
      details: data.details ?? null,
      test_strategy: data.test_strategy ?? null,
      complexity_score: data.complexity_score ?? null,
      assigned_agent_id: data.assigned_agent_id ?? null,
      linear_issue_id: data.linear_issue_id ?? null,
    });

    return NextResponse.json(
      { task },
      {
        status: 201,
        headers: corsHeaders(request),
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    console.error('Error creating v2 task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = validateAuth(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
  }

  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    const headers = new Headers(corsHeaders(request));
    headers.set('Retry-After', String(rateLimitResult.retryAfterSeconds ?? 1));
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const body = await request.json();
    const data = UpdateTaskSchema.parse(body);

    const updates: Partial<Parameters<typeof db.updateTask>[1]> = {
      ...(data.tag !== undefined ? { tag: data.tag } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dependencies !== undefined
        ? { dependencies: normalizeDependencies(data.dependencies) }
        : {}),
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...(data.test_strategy !== undefined ? { test_strategy: data.test_strategy } : {}),
      ...(data.complexity_score !== undefined ? { complexity_score: data.complexity_score } : {}),
      ...(data.assigned_agent_id !== undefined ? { assigned_agent_id: data.assigned_agent_id } : {}),
      ...(data.linear_issue_id !== undefined ? { linear_issue_id: data.linear_issue_id } : {}),
    };

    const task = db.updateTask(data.id, updates);

    return NextResponse.json(
      { task },
      {
        status: 200,
        headers: corsHeaders(request),
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    console.error('Error updating v2 task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = validateAuth(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
  }

  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    const headers = new Headers(corsHeaders(request));
    headers.set('Retry-After', String(rateLimitResult.retryAfterSeconds ?? 1));
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const body = await request.json();
    const data = DeleteTaskSchema.parse(body);
    const deleted = db.deleteTask(data.id);

    return NextResponse.json(
      { success: deleted },
      {
        status: deleted ? 200 : 404,
        headers: corsHeaders(request),
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    console.error('Error deleting v2 task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers(corsHeaders(request));
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  return new NextResponse(null, {
    status: 200,
    headers,
  });
}
