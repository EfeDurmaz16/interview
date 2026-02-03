import Header from '../components/Header/Header';
import IntervieweeSidebar from '../components/Sidebar/IntervieweeSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { WSMessageType } from '@jotform-interview/shared';

function IntervieweeContent({ sessionId }: { sessionId: string }) {
  const {
    code,
    output,
    error,
    isRunning,
    executionTime,
    lastMessage,
    wsStatus,
    wsUrl,
    submitState,
    handleCodeChange,
    handleRun,
    handleSubmit,
    handleClear,
  } = useEditor();
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const [endedNotice, setEndedNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setSessionStatus(data?.status ?? 'waiting');
        setStartedAt(data?.started_at ?? null);
        if (data?.server_now) setServerSkewMs(Date.now() - Date.parse(data.server_now));
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Fallback polling (in case WS message is missed / reconnect happens)
  useEffect(() => {
    let cancelled = false;
    if (sessionStatus === 'ended') return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.server_now) setServerSkewMs(Date.now() - Date.parse(data.server_now));
        if (data?.started_at) setStartedAt(data.started_at);
        if (data?.status) setSessionStatus(data.status);
      } catch {
        // ignore
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, sessionStatus]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === WSMessageType.SESSION_STARTED) {
      setSessionStatus('active');
      if (lastMessage.payload?.started_at) setStartedAt(lastMessage.payload.started_at);
      if (lastMessage.payload?.server_now) setServerSkewMs(Date.now() - Date.parse(lastMessage.payload.server_now));
    }
    if (lastMessage.type === WSMessageType.SESSION_ENDED) {
      setSessionStatus('ended');
      if (lastMessage.payload?.server_now) setServerSkewMs(Date.now() - Date.parse(lastMessage.payload.server_now));
      setEndedNotice(true);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (sessionStatus === 'ended') setEndedNotice(true);
  }, [sessionStatus]);

  const initialElapsedSeconds = (() => {
    if (sessionStatus !== 'active' || !startedAt) return 0;
    const nowServerMs = Date.now() - serverSkewMs;
    return Math.max(0, Math.floor((nowServerMs - Date.parse(startedAt)) / 1000));
  })();

  const isEnded = endedNotice || sessionStatus === 'ended';

  return (
    <>
      <Header showTimer={sessionStatus === 'active'} initialElapsedSeconds={initialElapsedSeconds} sessionId={sessionId} />
      <div
        style={{
          padding: '0.5rem 1rem',
          background: 'var(--jotform-bg-light, #f5f5f5)',
          borderBottom: '1px solid var(--jotform-border, #e0e0e0)',
          fontSize: '0.8125rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          color: 'var(--jotform-text-light, #6b7280)',
        }}
      >
        <span>WS: {wsStatus}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--jotform-text-light, #6b7280)', whiteSpace: 'nowrap' }}>
          {wsUrl}
        </span>
        <span>
          Submit: {submitState.status}
          {submitState.lastSentAt ? ` (${new Date(submitState.lastSentAt).toLocaleTimeString()})` : ''}
        </span>
      </div>
      {endedNotice && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(220, 53, 69, 0.08)', color: 'var(--jotform-error, #dc3545)' }}>
          Mülakatınız sonlandırılmıştır. Teşekkürler!
        </div>
      )}
      <div className="interview-layout">
        <IntervieweeSidebar />
        <div className="center-panel">
          <CodeEditor
            showSubmit
            externalCode={code}
            readOnly={isEnded}
            disabled={isEnded}
            onCodeChange={isEnded ? undefined : handleCodeChange}
            onRun={isEnded ? undefined : handleRun}
            onSubmit={isEnded ? undefined : () => handleSubmit()}
            onClear={handleClear}
          />
          <OutputPanel output={output} error={error} isRunning={isRunning} executionTime={executionTime} />
        </div>
      </div>
    </>
  );
}

export default function IntervieweeView({ sessionId }: { sessionId: string }) {
  const { token } = useParams<{ token: string }>();

  return (
    <EditorProvider token={token ?? ''} questionId="1">
      <IntervieweeContent sessionId={sessionId}/>
    </EditorProvider>
  );
}
