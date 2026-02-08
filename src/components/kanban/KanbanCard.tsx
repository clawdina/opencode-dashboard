'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { GripVertical, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KanbanCardProps, Todo } from './types';

const priorityColors: Record<Todo['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function KanbanCard({ todo, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-white p-3 shadow-sm transition-all',
        'dark:border-slate-700 dark:bg-slate-800',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        dragging && 'opacity-50 shadow-lg rotate-2 scale-105'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-3">
            {todo.content}
          </p>
          
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                priorityColors[todo.priority]
              )}
            >
              {todo.priority}
            </span>
            
            {todo.agent && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <User className="h-3 w-3" />
                {todo.agent}
              </span>
            )}
            
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(todo.updated_at * 1000, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
