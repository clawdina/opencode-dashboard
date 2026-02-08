import { useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboard';

const POLL_INTERVAL = 3000;

export function usePolling() {
  const {
    apiUrl,
    setTodos,
    setMessages,
    setIsConnected,
    setIsLoading,
  } = useDashboardStore();

  const isPollingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const [todosRes, messagesRes] = await Promise.all([
        fetch(`${apiUrl}/api/todos`),
        fetch(`${apiUrl}/api/messages`),
      ]);

      if (todosRes.ok) {
        const todosData = await todosRes.json();
        setTodos(todosData.todos || []);
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      setIsConnected(true);
    } catch (error) {
      console.error('Polling error:', error);
      setIsConnected(false);
    } finally {
      isPollingRef.current = false;
      setIsLoading(false);
    }
  }, [apiUrl, setTodos, setMessages, setIsConnected, setIsLoading]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData]);

  const updateTodoStatus = useCallback(
    async (id: string, status: string) => {
      try {
        await fetch(`${apiUrl}/api/todos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });
        fetchData();
      } catch (error) {
        console.error('Update todo error:', error);
      }
    },
    [apiUrl, fetchData]
  );

  const markMessagesAsRead = useCallback(
    async (ids: number[]) => {
      try {
        await fetch(`${apiUrl}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: ids.map(String) }),
        });
        fetchData();
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    },
    [apiUrl, fetchData]
  );

  return { fetchData, updateTodoStatus, markMessagesAsRead };
}
