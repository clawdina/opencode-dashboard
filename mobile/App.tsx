import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useDashboardStore } from './src/stores/dashboard';
import { usePolling } from './src/hooks/usePolling';
import { KanbanBoard } from './src/components/KanbanBoard';
import { MessageFeed } from './src/components/MessageFeed';

type Tab = 'kanban' | 'messages';

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [showSettings, setShowSettings] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const { todos, messages, isConnected, isLoading, apiUrl, setApiUrl } = useDashboardStore();
  const { updateTodoStatus, markMessagesAsRead } = usePolling();

  useEffect(() => {
    setUrlInput(apiUrl);
  }, [apiUrl]);

  const handleSaveUrl = () => {
    setApiUrl(urlInput);
    setShowSettings(false);
  };

  const unreadCount = messages.filter((m) => !m.read && m.read !== 1).length;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <View>
            <Text style={[styles.title, isDark && styles.textLight]}>OpenCode</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isConnected && styles.statusDotConnected]} />
              <Text style={[styles.statusText, isDark && styles.textMuted]}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'kanban' && styles.tabActive]}
          onPress={() => setActiveTab('kanban')}
        >
          <Text style={[styles.tabText, activeTab === 'kanban' && styles.tabTextActive]}>
            📋 Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            🔔 Messages
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={[styles.loadingText, isDark && styles.textMuted]}>
              Connecting to dashboard...
            </Text>
          </View>
        ) : activeTab === 'kanban' ? (
          <KanbanBoard
            todos={todos}
            onStatusChange={(id, status) => {
              updateTodoStatus(id, status);
              useDashboardStore.getState().updateTodoStatus(id, status);
            }}
          />
        ) : (
          <MessageFeed
            messages={messages}
            onMarkAsRead={(ids) => {
              markMessagesAsRead(ids);
              useDashboardStore.getState().markMessagesAsRead(ids);
            }}
          />
        )}
      </View>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>Settings</Text>

            <Text style={[styles.inputLabel, isDark && styles.textMuted]}>Dashboard URL</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://localhost:3000"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleSaveUrl}>
                <Text style={styles.buttonSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statusDotConnected: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBarDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 24,
  },
  inputDark: {
    backgroundColor: '#334155',
    color: '#f1f5f9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f1f5f9',
  },
  buttonCancelText: {
    color: '#64748b',
    fontWeight: '500',
  },
  buttonSave: {
    backgroundColor: '#3b82f6',
  },
  buttonSaveText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  textLight: {
    color: '#f1f5f9',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
