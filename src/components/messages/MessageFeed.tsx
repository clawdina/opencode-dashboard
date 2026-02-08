'use client';

import { MessageCard } from './MessageCard';
import { Bell, CheckCheck } from 'lucide-react';
import type { MessageFeedProps } from './types';

export function MessageFeed({ messages, onMarkAsRead, isLoading }: MessageFeedProps) {
  const unreadCount = messages.filter((m) => !m.read && m.read !== 1).length;

  const handleMarkAllAsRead = () => {
    const unreadIds = messages
      .filter((m) => !m.read && m.read !== 1)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Messages
          </h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onMarkAsRead={(id) => onMarkAsRead([id])}
            />
          ))
        )}
      </div>
    </div>
  );
}
