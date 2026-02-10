import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useCodeSync, type NavPermission } from '../hooks/useCodeSync';
import { WSMessageType } from '@jotform-interview/shared';
import { runPhp } from '../services/phpWasm';
import type { TLEditorSnapshot } from '@tldraw/tldraw';

type CodeOutputResult = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime?: number;
  error?: string;
};

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

const EditorContext = createContext<{
  code: string;
  isRunning: boolean;
  output: string;
  error: string;
  executionTime: number | undefined;
  currentQuestionId: string | undefined;
  navPermission: NavPermission;
  interviewerQuestionId: string | null;
  wsStatus: WebSocketStatus;
  wsUrl: string;
  lastMessage: any | null;
  submitState: { status: 'idle' | 'sending' | 'sent' | 'error'; lastSentAt?: number; error?: string };
  lastRemoteSubmission?: { questionId?: string; at: number } | null;
  whiteboardSnapshot: TLEditorSnapshot | null;
  handleCodeChange: (newCode: string) => void;
  handleRun: () => void;
  handleSubmit: (questionId?: string, autoAdvance?: boolean) => Promise<string | void>;
  handleClear: () => void;
  handleSetQuestion: (questionId: string, opts?: { navPermission?: NavPermission }) => void;
  handleSetNavPermission: (navPermission: NavPermission) => void;
  handleWhiteboardChange: (snapshot: TLEditorSnapshot) => void;
  broadcastSessionStarted: (startedAt?: string, serverNow?: string) => void;
  broadcastSessionEnded: (reason?: string, serverNow?: string) => void;
  getNextQuestionId?: () => string | null;
  setGetNextQuestionId?: (fn: () => string | null) => void;
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
  const [currentQuestionId, setCurrentQuestionId] = useState<string | undefined>(questionId);
  const [navPermission, setNavPermission] = useState<NavPermission>('none');
  const [interviewerQuestionId, setInterviewerQuestionId] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<{
    status: 'idle' | 'sending' | 'sent' | 'error';
    lastSentAt?: number;
    error?: string;
  }>({ status: 'idle' });
  const [lastRemoteSubmission, setLastRemoteSubmission] = useState<{ questionId?: string; at: number } | null>(null);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<TLEditorSnapshot | null>(null);
  const getNextQuestionIdRef = useRef<(() => string | null) | null>(null);

  const {
    sendCodeChange,
    sendRun,
    sendSubmit,
    sendCodeOutput,
    sendSetQuestion,
    sendSetQuestionWithNavPermission,
    sendSessionStarted,
    sendSessionEnded,
    sendWhiteboardSnapshot,
    lastMessage,
    status,
    wsUrl,
  } = useCodeSync(token);
  const debounceTimeoutRef = useRef<number | null>(null);

  // Incoming CODE_CHANGE → code state güncelle (send loop'u tetiklemeden)
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === WSMessageType.CODE_CHANGE) {
      const incomingCode = lastMessage.payload?.code;
      if (incomingCode !== undefined && incomingCode !== code) {
        setCode(incomingCode);
      }
    } else if (lastMessage.type === WSMessageType.CODE_OUTPUT) {
      setIsRunning(false);
      const result: CodeOutputResult | undefined = lastMessage.payload;

      if (typeof result?.executionTime === 'number') setExecutionTime(result.executionTime);
      setOutput(result?.stdout || '');
      if (result?.error) setError(result.error);
      else if (result?.stderr) setError(result.stderr);
      else setError('');
    } else if (lastMessage.type === WSMessageType.SET_QUESTION) {
      const incomingQuestionId = lastMessage.payload?.question_id;
      const incomingNavPermission = lastMessage.payload?.nav_permission as NavPermission | undefined;
      if (incomingQuestionId) setCurrentQuestionId(incomingQuestionId);
      if (incomingNavPermission) setNavPermission(incomingNavPermission);
      if (incomingQuestionId && lastMessage.role === 'interviewer') {
        setInterviewerQuestionId(incomingQuestionId);
      }
    } else if (lastMessage.type === WSMessageType.SUBMIT_CODE) {
      setLastRemoteSubmission({
        questionId: lastMessage.payload?.question_id,
        at: Date.now(),
      });
    } else if (lastMessage.type === WSMessageType.WHITEBOARD_SNAPSHOT) {
      const snapshot = lastMessage.payload?.snapshot;
      console.log('[EditorContext] Received whiteboard snapshot:', snapshot);
      if (snapshot) {
        setWhiteboardSnapshot(snapshot);
      }
    }
  }, [lastMessage, code]);

  // handleCodeChange: local state güncelle + WS CODE_CHANGE gönder (150ms debounce)
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);

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
      const elapsed = Math.round(performance.now() - start);
      setExecutionTime(elapsed);
      setOutput(result.stdout || '');
      setError(result.stderr || '');
      sendCodeOutput({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: elapsed,
      });
    } catch (e: any) {
      const elapsed = Math.round(performance.now() - start);
      setExecutionTime(elapsed);
      setOutput('');
      setError(e?.message ?? 'Execution failed');
      sendCodeOutput({
        error: e.message ?? 'Execution failed',
        executionTime: elapsed,
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, sendRun, sendCodeOutput]);

  // handleSubmit: WS SUBMIT_CODE gönder
  const handleSubmit = useCallback(async (qId?: string, autoAdvance: boolean = true) => {
    const resolvedQuestionId = qId || currentQuestionId || questionId;
    if (!resolvedQuestionId) {
      console.warn('handleSubmit: questionId is required');
      return;
    }
    setSubmitState({ status: 'sending' });
    
    // Get whiteboard snapshot if available
    let whiteboardImage: string | undefined;
    if (typeof (window as any).__exportWhiteboard === 'function') {
      whiteboardImage = await (window as any).__exportWhiteboard();
    }
    
    sendSubmit(code, resolvedQuestionId, whiteboardImage);
    setSubmitState({ status: 'sent', lastSentAt: Date.now() });
    
    // Auto advance to next question if enabled
    if (autoAdvance && getNextQuestionIdRef.current) {
      const nextId = getNextQuestionIdRef.current();
      if (nextId) {
        setTimeout(() => {
          setCurrentQuestionId(nextId);
          sendSetQuestion(nextId);
        }, 500); // Small delay to show submit success
      } else {
        // This was the last question - trigger end interview confirmation
        return 'last_question';
      }
    }
    return 'submitted';
  }, [code, currentQuestionId, questionId, sendSubmit, sendSetQuestion]);

  const handleClear = useCallback(() => {
    setIsRunning(false);
    setOutput('');
    setError('');
    setExecutionTime(undefined);
  }, []);

  const handleSetQuestion = useCallback((newQuestionId: string, opts?: { navPermission?: NavPermission }) => {
    setCurrentQuestionId(newQuestionId);
    if (opts?.navPermission) {
      sendSetQuestionWithNavPermission(newQuestionId, opts.navPermission);
    } else {
      sendSetQuestion(newQuestionId);
    }
  }, [sendSetQuestion, sendSetQuestionWithNavPermission]);

  const handleSetNavPermission = useCallback((next: NavPermission) => {
    setNavPermission(next);
    const resolvedQuestionId = currentQuestionId || questionId;
    if (!resolvedQuestionId) return;
    sendSetQuestionWithNavPermission(resolvedQuestionId, next);
  }, [currentQuestionId, questionId, sendSetQuestionWithNavPermission]);

  const broadcastSessionStarted = useCallback((startedAtIso?: string, serverNowIso?: string) => {
    sendSessionStarted({
      ...(startedAtIso ? { started_at: startedAtIso } : {}),
      ...(serverNowIso ? { server_now: serverNowIso } : {}),
    });
  }, [sendSessionStarted]);

  const broadcastSessionEnded = useCallback((reason?: string, serverNowIso?: string) => {
    sendSessionEnded({
      ...(reason ? { reason } : {}),
      ...(serverNowIso ? { server_now: serverNowIso } : {}),
    });
  }, [sendSessionEnded]);

  const setGetNextQuestionId = useCallback((fn: () => string | null) => {
    getNextQuestionIdRef.current = fn;
  }, []);

  const whiteboardDebounceRef = useRef<number | null>(null);
  
  const handleWhiteboardChange = useCallback((snapshot: TLEditorSnapshot) => {
    console.log('[EditorContext] handleWhiteboardChange called');
    
    // Update local state immediately
    setWhiteboardSnapshot(snapshot);
    
    // Debounce sending to WebSocket
    if (whiteboardDebounceRef.current !== null) {
      clearTimeout(whiteboardDebounceRef.current);
    }
    
    whiteboardDebounceRef.current = window.setTimeout(() => {
      console.log('[EditorContext] Sending whiteboard snapshot after debounce');
      sendWhiteboardSnapshot(snapshot);
      whiteboardDebounceRef.current = null;
    }, 500);
  }, [sendWhiteboardSnapshot]);

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (whiteboardDebounceRef.current !== null) {
        clearTimeout(whiteboardDebounceRef.current);
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
        currentQuestionId,
        navPermission,
        interviewerQuestionId,
        wsStatus: status,
        wsUrl,
        lastMessage,
        submitState,
        lastRemoteSubmission,
        whiteboardSnapshot,
        handleCodeChange,
        handleRun,
        handleSubmit,
        handleClear,
        handleSetQuestion,
        handleSetNavPermission,
        handleWhiteboardChange,
        broadcastSessionStarted,
        broadcastSessionEnded,
        getNextQuestionId: getNextQuestionIdRef.current || undefined,
        setGetNextQuestionId,
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
