import { create } from 'zustand';
import type { Todo } from '@/components/kanban/types';
import type { Message } from '@/components/messages/types';

interface DashboardState {
  todos: Todo[];
  messages: Message[];
  currentSessionId: string | null;
  isConnected: boolean;
  lastFetchTime: number | null;

  setTodos: (todos: Todo[]) => void;
  setMessages: (messages: Message[]) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setLastFetchTime: (time: number) => void;

  updateTodoStatus: (id: string, status: Todo['status']) => void;
  markMessagesAsRead: (ids: number[]) => void;
  addMessage: (message: Message) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  todos: [],
  messages: [],
  currentSessionId: null,
  isConnected: false,
  lastFetchTime: null,

  setTodos: (todos) => set({ todos }),
  setMessages: (messages) => set({ messages }),
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setLastFetchTime: (time) => set({ lastFetchTime: time }),

  updateTodoStatus: (id, status) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, status, updated_at: Math.floor(Date.now() / 1000) } : todo
      ),
    })),

  markMessagesAsRead: (ids) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        ids.includes(msg.id) ? { ...msg, read: true } : msg
      ),
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [message, ...state.messages],
    })),
}));
