import { useState, useEffect, useCallback, useRef } from 'react';
import { WSMessage, WSMessageType } from '@jotform-interview/shared';
import { env } from 'process';


const WS_URL = env.VITE_WS_URL || 'ws://localhost:8000/ws';

export function useWebSocket(sessionId: string, userId: string, role: 'interviewer' | 'interviewee') {
    const [messages, setMessages] = useState<WSMessage<any>[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [error, setError] = useState<Error | null>(null);
    const [lastMessage, setLastMessage] = useState<WSMessage<any> | null>(null);

    const ws = useRef<WebSocket | null>(null);

    // - Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
    // - Send `JOIN_SESSION` on connect with `{ sessionId, userId, role }`
    // - Message queue for offline buffering
    // - Expose: `sendMessage(msg)`, `lastMessage`, `connectionStatus`

    useEffect(() => {
        ws.current = new WebSocket(WS_URL);
    }, []);

    useEffect(() => {
        if (ws.current) {
            ws.current.onopen = () => {
                setConnectionStatus('connected');
            };
        }

        if (ws.current) {
            ws.current.onclose = () => {
                setConnectionStatus('disconnected');
            };
        }
        
        if (ws.current) {
            ws.current.onerror = (error) => {
                setError(error as unknown as Error);
            };
        }
        
        if (ws.current) {
            ws.current.onmessage = (event) => {
                setLastMessage(JSON.parse(event.data));
            };
        }
        
        
    }, [ws.current]);

    function sendMessage(msg: WSMessage<any>) {
        if (ws.current) {
            ws.current.send(JSON.stringify(msg));
        }
    }

    return {
        sendMessage,
        lastMessage,
        connectionStatus,
        error
    }
}
