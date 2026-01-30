import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { WSMessageType } from "@jotform-interview/shared";

export function useCursorSync(sessionId: string, userId: string, role: 'interviewer' | 'interviewee') {
    const { sendMessage, lastMessage } = useWebSocket(sessionId, userId, role);

    const [cursor, setCursor] = useState<{ line: number, column: number }>({ line: 0, column: 0 });
    const [selection, setSelection] = useState<{ startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number }>({ startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 });

    

    useEffect(() => {
        if (lastMessage) {
            console.log(lastMessage);
        }
    }, [lastMessage]);

    return {
        sendCursorMove: (cursor: { line: number, column: number }) => {
            sendMessage({ type: WSMessageType.CURSOR_MOVE, sessionId, userId, role, timestamp: Date.now(), payload: cursor });
        }
    }
 
    function onDidChangeCursorPosition(cursor: { line: number, column: number }) {
        sendMessage({ type: WSMessageType.CURSOR_MOVE, sessionId, userId, role, timestamp: Date.now(), payload: cursor });
    }
    function onDidChangeSelection(selection: { startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number }) {
        sendMessage({ type: WSMessageType.CURSOR_MOVE, sessionId, userId, role, timestamp: Date.now(), payload: selection });
    }

    
}
