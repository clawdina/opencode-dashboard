'use client';

import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, AlertCircle, RefreshCw, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageCardProps, Message } from './types';

const typeConfig: Record<
  Message['type'],
  { icon: typeof CheckCircle; color: string; borderColor: string }
> = {
  task_complete: {
    icon: CheckCircle,
    color: 'text-green-500',
    borderColor: 'border-l-green-500',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    borderColor: 'border-l-red-500',
  },
  state_change: {
    icon: RefreshCw,
    color: 'text-blue-500',
    borderColor: 'border-l-blue-500',
  },
  custom: {
    icon: MessageSquare,
    color: 'text-purple-500',
    borderColor: 'border-l-purple-500',
  },
};

export function MessageCard({ message, onMarkAsRead }: MessageCardProps) {
  const config = typeConfig[message.type];
  const Icon = config.icon;
  const isRead = message.read === true || message.read === 1;

  return (
    <div
      className={cn(
        'group relative rounded-lg border-l-4 bg-white p-3 shadow-sm transition-all',
        'dark:bg-slate-800 border dark:border-slate-700',
        'hover:shadow-md',
        config.borderColor,
        !isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-900 dark:text-slate-100">
            {message.content}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDistanceToNow(message.created_at * 1000, { addSuffix: true })}
            </span>

            {!isRead && (
              <button
                onClick={() => onMarkAsRead(message.id)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Check className="h-3 w-3" />
                Mark read
              </button>
            )}
          </div>
        </div>

        {!isRead && (
          <div className="absolute top-3 right-3">
            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}
