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
import type { Message } from '../types';

interface MessageFeedProps {
  messages: Message[];
  onMarkAsRead: (ids: number[]) => void;
}

const TYPE_CONFIG: Record<Message['type'], { emoji: string; color: string }> = {
  task_complete: { emoji: '✅', color: '#22c55e' },
  error: { emoji: '❌', color: '#ef4444' },
  state_change: { emoji: '🔄', color: '#3b82f6' },
  custom: { emoji: '💬', color: '#a855f7' },
};

function MessageCard({
  message,
  onMarkAsRead,
  isDark,
}: {
  message: Message;
  onMarkAsRead: (id: number) => void;
  isDark: boolean;
}) {
  const config = TYPE_CONFIG[message.type];
  const isRead = message.read === true || message.read === 1;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDark && styles.cardDark,
        !isRead && styles.cardUnread,
        { borderLeftColor: config.color },
      ]}
      onPress={() => !isRead && onMarkAsRead(message.id)}
      activeOpacity={isRead ? 1 : 0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <View style={styles.cardContent}>
          <Text style={[styles.messageText, isDark && styles.textDark]} numberOfLines={3}>
            {message.content}
          </Text>
          <Text style={[styles.timestamp, isDark && styles.textMuted]}>
            {formatDistanceToNow(message.created_at * 1000, { addSuffix: true })}
          </Text>
        </View>
        {!isRead && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

export function MessageFeed({ messages, onMarkAsRead }: MessageFeedProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const unreadCount = messages.filter((m) => !m.read && m.read !== 1).length;

  const handleMarkAllAsRead = () => {
    const unreadIds = messages
      .filter((m) => !m.read && m.read !== 1)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, isDark && styles.textDark]}>Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.list}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={[styles.emptyText, isDark && styles.textMuted]}>
              No messages yet
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onMarkAsRead={(id) => onMarkAsRead([id])}
              isDark={isDark}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  containerDark: {
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  markAllText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  cardDark: {
    backgroundColor: '#334155',
  },
  cardUnread: {
    backgroundColor: '#eff6ff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  textDark: {
    color: '#f1f5f9',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
