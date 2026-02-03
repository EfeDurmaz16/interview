import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useCodeSync } from '../hooks/useCodeSync';
import { WSMessageType } from '@jotform-interview/shared';
import { runPhp } from '../services/phpWasm';

const EditorContext = createContext<{
  code: string;
  isRunning: boolean;
  output: string;
  error: string;
  executionTime: number | undefined;
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
  const [code, setCode] = useState('<?php\n// Write your solution here\nfunction solution() {\n\n}');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [executionTime, setExecutionTime] = useState<number | undefined>();

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
      } else if (result?.stderr) {
        setError(result.stderr);
      } else {
        setError('');
        setOutput(result?.stdout || '');
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

  // handleRun: run PHP locally + broadcast output via WS
  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError('');
    setOutput('');
    setExecutionTime(undefined);
    sendRun(code);
    const start = performance.now();
    try {
      const result = await runPhp(code);
      useCodeSync(token).sendCodeOutput({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: Math.round(performance.now() - start),
      });
    } catch (e: any) {
      useCodeSync(token).sendCodeOutput({
        error: e.message ?? 'Execution failed',
        executionTime: Math.round(performance.now() - start),
      });
    } finally {
      setIsRunning(false);
    }
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
        executionTime,
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
