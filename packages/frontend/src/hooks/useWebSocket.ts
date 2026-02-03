import { useState, useEffect, useRef, useCallback } from 'react';
import { WSMessageType } from '@jotform-interview/shared';

const DEFAULT_WS_PORT = 8080;
const wsPortEnv = import.meta.env.VITE_WS_PORT ? Number(import.meta.env.VITE_WS_PORT) : undefined;
const wsPort = Number.isFinite(wsPortEnv) ? wsPortEnv! : DEFAULT_WS_PORT;
const explicitWsUrl = (import.meta.env.VITE_WS_URL || undefined) as string | undefined;

const DEFAULT_PORT_CANDIDATES = [wsPort, 8080, 8081, 8082];
const uniquePorts = Array.from(new Set(DEFAULT_PORT_CANDIDATES.filter((p) => Number.isFinite(p))));
const wsHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const buildWsUrl = (port: number, path?: string) => `ws://${wsHost}:${port}${path ?? ''}`;
const buildProxyWsUrl = () => `ws://${window.location.host}/ws`;

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(token: string) {
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [wsUrl, setWsUrl] = useState<string>(explicitWsUrl ?? buildProxyWsUrl());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<any[]>([]);
  const candidateIndexRef = useRef(0);
  const connectedUrlRef = useRef<string | null>(null);

  const urlCandidates = useCallback(() => {
    if (explicitWsUrl) return [explicitWsUrl];
    const list = [
      buildProxyWsUrl(),
      ...uniquePorts.flatMap((p) => [buildWsUrl(p), buildWsUrl(p, '/ws')]),
    ];
    return Array.from(new Set(list));
  }, []);

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

      const candidates = urlCandidates();
      const url =
        candidates[Math.min(candidateIndexRef.current, candidates.length - 1)] ??
        buildWsUrl(DEFAULT_WS_PORT);
      setWsUrl(url);
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isUnmounted) return;

        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        connectedUrlRef.current = socket.url;

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

        // If we never managed to connect (common when 8080 is busy), try the next candidate port quickly.
        const connectedUrl = connectedUrlRef.current;
        const isSameAsConnected = connectedUrl && wsRef.current?.url === connectedUrl;
        const candidates = urlCandidates();
        if (!explicitWsUrl && !isSameAsConnected && candidateIndexRef.current < candidates.length - 1) {
          candidateIndexRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 200);
          return;
        }

        // We exhausted candidates. Reset and try again with backoff so we can recover when WS comes up later.
        if (!explicitWsUrl) {
          candidateIndexRef.current = 0;
        }

        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        reconnectAttemptsRef.current = attempt + 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      };

      // soket kapandığında zaman da durmalı
      // soket hatası olduğunda zaman da durmalı
      socket.onclose = handleDisconnect;
      socket.onerror = () => {
        handleDisconnect();
      };
    };
    
    connect();

    return () => {
      isUnmounted = true;
      candidateIndexRef.current = 0;
      connectedUrlRef.current = null;

      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, urlCandidates]);

  return {
    sendMessage,
    lastMessage,
    status,
    wsUrl,
  };
}
