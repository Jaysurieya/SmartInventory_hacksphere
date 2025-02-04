import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onerror = (error) => {
      toast({
        title: 'WebSocket Error',
        description: 'Failed to connect to chat server',
        variant: 'destructive',
      });
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [user]);

  const sendMessage = useCallback((chatId: number, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ chatId, content }));
    }
  }, []);

  return {
    sendMessage,
    subscribe: (callback: (message: any) => void) => {
      if (wsRef.current) {
        wsRef.current.onmessage = (event) => {
          callback(JSON.parse(event.data));
        };
      }
    },
  };
}
