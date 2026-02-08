import { create } from 'zustand';
import type { Todo, Message } from '../types';

interface DashboardState {
  todos: Todo[];
  messages: Message[];
  apiUrl: string;
  isConnected: boolean;
  isLoading: boolean;

  setTodos: (todos: Todo[]) => void;
  setMessages: (messages: Message[]) => void;
  setApiUrl: (url: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  updateTodoStatus: (id: string, status: Todo['status']) => void;
  markMessagesAsRead: (ids: number[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  todos: [],
  messages: [],
  apiUrl: 'http://localhost:3000',
  isConnected: false,
  isLoading: true,

  setTodos: (todos) => set({ todos }),
  setMessages: (messages) => set({ messages }),
  setApiUrl: (url) => set({ apiUrl: url }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsLoading: (loading) => set({ isLoading: loading }),

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
}));
