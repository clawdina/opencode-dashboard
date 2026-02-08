import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import type { Todo } from '../types';

interface KanbanBoardProps {
  todos: Todo[];
  onStatusChange: (id: string, status: Todo['status']) => void;
}

const COLUMNS: { status: Todo['status']; title: string; color: string }[] = [
  { status: 'pending', title: 'Pending', color: '#94a3b8' },
  { status: 'in_progress', title: 'In Progress', color: '#3b82f6' },
  { status: 'completed', title: 'Completed', color: '#22c55e' },
];

const PRIORITY_COLORS: Record<Todo['priority'], { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#dc2626' },
  medium: { bg: '#fef3c7', text: '#d97706' },
  low: { bg: '#dcfce7', text: '#16a34a' },
};

function TodoCard({
  todo,
  onStatusChange,
  isDark,
}: {
  todo: Todo;
  onStatusChange: (id: string, status: Todo['status']) => void;
  isDark: boolean;
}) {
  const priorityColor = PRIORITY_COLORS[todo.priority];
  const nextStatuses: Todo['status'][] = ['pending', 'in_progress', 'completed'];

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <Text style={[styles.cardContent, isDark && styles.textDark]} numberOfLines={3}>
        {todo.content}
      </Text>

      <View style={styles.cardMeta}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
          <Text style={[styles.priorityText, { color: priorityColor.text }]}>
            {todo.priority}
          </Text>
        </View>

        {todo.agent && (
          <Text style={[styles.agentText, isDark && styles.textMuted]}>
            {todo.agent}
          </Text>
        )}
      </View>

      <Text style={[styles.timestamp, isDark && styles.textMuted]}>
        {formatDistanceToNow(todo.updated_at * 1000, { addSuffix: true })}
      </Text>

      <View style={styles.statusButtons}>
        {nextStatuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              todo.status === status && styles.statusButtonActive,
            ]}
            onPress={() => onStatusChange(todo.id, status)}
          >
            <Text
              style={[
                styles.statusButtonText,
                todo.status === status && styles.statusButtonTextActive,
              ]}
            >
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function KanbanColumn({
  title,
  color,
  todos,
  onStatusChange,
  isDark,
}: {
  title: string;
  color: string;
  todos: Todo[];
  onStatusChange: (id: string, status: Todo['status']) => void;
  isDark: boolean;
}) {
  return (
    <View style={[styles.column, isDark && styles.columnDark]}>
      <View style={[styles.columnHeader, { borderTopColor: color }]}>
        <Text style={[styles.columnTitle, isDark && styles.textDark]}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{todos.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.columnContent}>
        {todos.length === 0 ? (
          <Text style={[styles.emptyText, isDark && styles.textMuted]}>No tasks</Text>
        ) : (
          todos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onStatusChange={onStatusChange}
              isDark={isDark}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function KanbanBoard({ todos, onStatusChange }: KanbanBoardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          title={column.title}
          color={column.color}
          todos={todos.filter((t) => t.status === column.status)}
          onStatusChange={onStatusChange}
          isDark={isDark}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  column: {
    width: 280,
    marginRight: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 4,
  },
  columnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  countBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  columnContent: {
    flex: 1,
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDark: {
    backgroundColor: '#334155',
  },
  cardContent: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  agentText: {
    fontSize: 11,
    color: '#64748b',
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#3b82f6',
  },
  statusButtonText: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  textDark: {
    color: '#f1f5f9',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
