import { useState, useEffect, useRef, useCallback } from 'react';
import { WSMessageType } from '@jotform-interview/shared';

const WS_URL = `ws://${window.location.hostname}:8080`;

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(token: string) {
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  const sendMessage = useCallback((message: any) => {
    const socket = wsRef.current;

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
    }
  }, []);

  useEffect(() => {
    let isUnmounted = false;

    const connect = () => {
      setStatus('connecting');

      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isUnmounted) return;

        setStatus('connected');
        reconnectAttemptsRef.current = 0;

        const joinMessage = {
          type: WSMessageType.JOIN_SESSION,
          payload: { token },
        };
        socket.send(JSON.stringify(joinMessage));

        if (messageQueueRef.current.length > 0) {
          for (const queued of messageQueueRef.current) {
            socket.send(JSON.stringify(queued));
          }
          messageQueueRef.current = [];
        }
      };

      socket.onmessage = event => {
        if (isUnmounted) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          // Ignore non-JSON messages
        }
      };

      const handleDisconnect = () => {
        if (isUnmounted) return;

        setStatus('disconnected');

        if (reconnectTimeoutRef.current !== null) {
          return;
        }

        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        reconnectAttemptsRef.current = attempt + 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      };

      socket.onclose = handleDisconnect;
      socket.onerror = () => {
        handleDisconnect();
      };
    };

    connect();

    return () => {
      isUnmounted = true;

      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token]);

  return {
    sendMessage,
    lastMessage,
    status,
  };
}

