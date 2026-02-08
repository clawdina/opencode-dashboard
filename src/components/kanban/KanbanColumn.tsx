'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumnProps, Todo } from './types';

const statusColors: Record<Todo['status'], string> = {
  pending: 'border-t-slate-400',
  in_progress: 'border-t-blue-500',
  completed: 'border-t-green-500',
  cancelled: 'border-t-red-500',
};

const statusLabels: Record<Todo['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function KanbanColumn({ title, status, todos, onStatusChange }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-h-[500px] rounded-lg border border-t-4 bg-slate-50 dark:bg-slate-900',
        'dark:border-slate-700',
        statusColors[status],
        isOver && 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-900'
      )}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 backdrop-blur-sm p-3 dark:bg-slate-800/80 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {statusLabels[status] || title}
        </h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {todos.length}
        </span>
      </div>

      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {todos.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              No tasks
            </div>
          ) : (
            todos.map((todo) => <KanbanCard key={todo.id} todo={todo} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}
