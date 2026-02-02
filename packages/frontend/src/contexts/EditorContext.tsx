/* ### Task 8.3 — Editor context
**File**: `packages/frontend/src/contexts/EditorContext.tsx`
- `EditorProvider` component
  - State: `code`, `isRunning`, `output`, `error`
  - `handleCodeChange(newCode)`: local state güncelle + WS `CODE_CHANGE` gönder (150ms debounce)
  - Incoming `CODE_CHANGE` → code state güncelle (send loop'u tetiklemeden)
  - `handleRun()`: WS `RUN_CODE` gönder, `isRunning = true`, `CODE_OUTPUT` gelince güncelle
  - `handleSubmit()`: WS `SUBMIT_CODE` gönder */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useCodeSync } from '../hooks/useCodeSync';
import { WSMessageType } from '@jotform-interview/shared';

const EditorContext = createContext<{
  code: string;
  isRunning: boolean;
  output: string;
  error: string;
  handleCodeChange: (newCode: string) => void;
  handleRun: () => void;
  handleSubmit: (questionId: string) => void;
} | undefined>(undefined);

export function EditorProvider({ 
  children, 
  token,
  questionId 
}: { 
  children: React.ReactNode;
  token: string;
  questionId?: string;
}) {
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const { sendCodeChange, sendRun, sendSubmit, lastMessage } = useCodeSync(token);
  const debounceTimeoutRef = useRef<number | null>(null);
  const isLocalChangeRef = useRef(false);

  // Incoming CODE_CHANGE → code state güncelle (send loop'u tetiklemeden)
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === WSMessageType.CODE_CHANGE && !isLocalChangeRef.current) {
      const incomingCode = lastMessage.payload?.code;
      if (incomingCode !== undefined && incomingCode !== code) {
        setCode(incomingCode);
      }
    } else if (lastMessage.type === WSMessageType.CODE_OUTPUT) {
      setIsRunning(false);
      const result = lastMessage.payload;
      if (result?.error) {
        setError(result.error);
        setOutput('');
      } else {
        setError('');
        setOutput(result?.output || result?.stdout || '');
      }
    }

    isLocalChangeRef.current = false;
  }, [lastMessage, code]);

  // handleCodeChange: local state güncelle + WS CODE_CHANGE gönder (150ms debounce)
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    isLocalChangeRef.current = true;

    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      sendCodeChange(newCode);
      debounceTimeoutRef.current = null;
    }, 150);
  }, [sendCodeChange]);

  // handleRun: WS RUN_CODE gönder, isRunning = true, CODE_OUTPUT gelince güncelle
  const handleRun = useCallback(() => {
    setIsRunning(true);
    setError('');
    setOutput('');
    sendRun(code);
  }, [code, sendRun]);

  // handleSubmit: WS SUBMIT_CODE gönder
  const handleSubmit = useCallback((qId?: string) => {
    if (!questionId && !qId) {
      console.warn('handleSubmit: questionId is required');
      return;
    }
    sendSubmit(code, qId || questionId!);
  }, [code, questionId, sendSubmit]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <EditorContext.Provider 
      value={{ 
        code, 
        isRunning, 
        output, 
        error, 
        handleCodeChange, 
        handleRun, 
        handleSubmit 
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
