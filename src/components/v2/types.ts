import type { Task as DbTask, Subtask as DbSubtask } from '@/lib/db/types';

export type Task = DbTask;
export type Subtask = DbSubtask;

export type BoardStatus = 'pending' | 'in_progress' | 'blocked' | 'review' | 'done';

export interface TaskBoardProps {
  tasks: Task[];
  subtasks: Record<number, Subtask[]>;
  onStatusChange: (id: number, status: Task['status']) => void;
  onSelectTask: (task: Task) => void;
  isLoading?: boolean;
}

export interface TaskColumnProps {
  status: BoardStatus;
  tasks: Task[];
  subtasks: Record<number, Subtask[]>;
  onSelectTask: (task: Task) => void;
}

export interface TaskCardProps {
  task: Task;
  subtasks: Subtask[];
  onClick: (task: Task) => void;
  isDragging?: boolean;
}

export interface NewTaskModalProps {
  open: boolean;
  activeTag: string;
  tasks: Task[];
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description?: string | null;
    priority?: Task['priority'];
    tag?: string;
    dependencies?: number[];
  }) => Promise<void>;
}

export interface TaskDetailModalProps {
  open: boolean;
  task: Task | null;
  tasks: Task[];
  subtasks: Subtask[];
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
  onFetchSubtasks: (taskId: number) => Promise<void>;
  onCreateSubtask: (taskId: number, data: {
    title: string;
    description?: string | null;
    status?: Subtask['status'];
    dependencies?: number[];
    details?: string | null;
  }) => Promise<void>;
  onUpdateSubtask: (
    taskId: number,
    subtaskId: number,
    updates: Partial<Subtask>
  ) => Promise<void>;
  onDeleteSubtask: (taskId: number, subtaskId: number) => Promise<void>;
}

export interface TagSwitcherProps {
  tags: string[];
  activeTag: string;
  onChangeTag: (tag: string) => void;
  onCreateTag: (tag: string) => void;
}

export interface NextTaskPanelProps {
  task: Task | null;
  onStartWorking: (task: Task) => Promise<void>;
  onOpenTask: (task: Task) => void;
}
