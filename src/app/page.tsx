'use client';

import { useEffect, useState } from 'react';
import { KanbanBoard } from '@/components/kanban';
import { MessageFeed } from '@/components/messages';
import { useDashboardStore } from '@/stores/dashboard';
import { usePolling } from '@/hooks/usePolling';
import { Activity, Moon, Sun, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { todos, messages, isConnected } = useDashboardStore();
  const { updateTodoStatus, markMessagesAsRead } = usePolling();
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark');
    setIsDark(dark);
  }, []);

  useEffect(() => {
    if (todos.length > 0 || messages.length > 0) {
      setIsLoading(false);
    }
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [todos, messages]);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const handleStatusChange = (id: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    updateTodoStatus(id, newStatus);
    useDashboardStore.getState().updateTodoStatus(id, newStatus);
  };

  const handleMarkAsRead = (ids: number[]) => {
    markMessagesAsRead(ids);
    useDashboardStore.getState().markMessagesAsRead(ids);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  OpenCode Dashboard
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agent work tracker
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  )}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              <button
                onClick={toggleDark}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Task Board
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Drag tasks between columns to update status
              </p>
            </div>
            <KanbanBoard
              todos={todos}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
            />
          </div>

          <div
            className={cn(
              'w-full md:w-80 lg:w-96 shrink-0',
              'fixed inset-y-0 right-0 z-40 bg-white dark:bg-slate-900 p-4 pt-20 md:p-0 md:pt-0',
              'md:relative md:bg-transparent md:dark:bg-transparent',
              'transform transition-transform duration-300 ease-in-out',
              'md:transform-none',
              sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
            )}
          >
            <div className="h-full md:sticky md:top-24">
              <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 p-4 shadow-sm">
                <MessageFeed
                  messages={messages}
                  onMarkAsRead={handleMarkAsRead}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>

          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
