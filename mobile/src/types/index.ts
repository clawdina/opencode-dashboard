export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  agent?: string | null;
  session_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: number;
  type: 'task_complete' | 'error' | 'state_change' | 'custom';
  content: string;
  todo_id?: string | null;
  session_id?: string | null;
  read: boolean | number;
  created_at: number;
}
