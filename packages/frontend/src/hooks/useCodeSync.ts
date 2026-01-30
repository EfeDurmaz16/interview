import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import { WSMessageType } from "@jotform-interview/shared";
import { editor } from "monaco-editor";

export function useCodeSync(sessionId: string, userId: string, role: 'interviewer' | 'interviewee') {
    const { sendMessage, lastMessage } = useWebSocket(sessionId, userId, role);

    const [code, setCode] = useState<string>('');
    const [version, setVersion] = useState<number>(0);
    
    
    useEffect(() => {
        if (lastMessage) {
            console.log(lastMessage);
        }
    }, [lastMessage]);

    return {
        sendCodeChange: (code: string) => {
            sendMessage({ type: WSMessageType.CODE_CHANGE, sessionId, userId, role, timestamp: Date.now(), payload: code });
        }
    }

    function onDidChangeModelContent(delta: any) {
        sendMessage({ type: WSMessageType.CODE_CHANGE, sessionId, userId, role, timestamp: Date.now(), payload: delta });
    }

    return {
        onDidChangeModelContent
    }

    function applyEdits(code: string, edits: any[]) {
        const newCode = editor.applyEdits(code, edits);
        return newCode;
    }
}