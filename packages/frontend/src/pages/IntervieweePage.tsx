import Header from '../components/Header/Header';
import IntervieweeSidebar from '../components/Sidebar/IntervieweeSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WSMessageType } from '@jotform-interview/shared';
import { fetchQuestionBank, type QuestionBankQuestion } from '../services/questionBank';

function parseQuestions(raw: any[]): QuestionBankQuestion[] {
  return (Array.isArray(raw) ? raw : []).map((q: any) => ({
    id: String(q.id ?? ''),
    title: String(q.title ?? ''),
    description: String(q.description ?? ''),
    difficulty: String(q.difficulty ?? 'easy') as any,
    category: String(q.category ?? ''),
    template_code: String(q.template_code ?? ''),
    test_cases: Array.isArray(q.test_cases) ? q.test_cases : (() => { try { return JSON.parse(q.test_cases); } catch { return []; } })(),
    evaluation_criteria: Array.isArray(q.evaluation_criteria) ? q.evaluation_criteria : (() => { try { return JSON.parse(q.evaluation_criteria); } catch { return []; } })(),
    session_id: String(q.session_id ?? ''),
  })).filter((q: any) => q.id && q.title);
}

function IntervieweeContent({ sessionId }: { sessionId: string }) {
  const {
    code,
    output,
    error,
    isRunning,
    executionTime,
    lastMessage,
    currentQuestionId,
    navPermission,
    interviewerQuestionId,
    handleCodeChange,
    handleRun,
    handleSubmit,
    handleClear,
    handleSetQuestion,
  } = useEditor();
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const [endedNotice, setEndedNotice] = useState(false);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const loadQuestions = useCallback(() => {
    const myFetch = ++fetchCountRef.current;
    const fetchFn = sessionId
      ? fetch(`/api/sessions/${sessionId}/questions`).then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      : fetchQuestionBank();
    fetchFn
      .then((raw: any[]) => {
        if (myFetch !== fetchCountRef.current) return;
        setQuestions(parseQuestions(raw));
        setQuestionsError(null);
      })
      .catch((e: any) => {
        if (myFetch !== fetchCountRef.current) return;
        setQuestions([]);
        setQuestionsError(e?.message ?? 'Failed to load questions');
      });
  }, [sessionId]);

  // Initial load
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Re-fetch when interviewer sets a question we don't have yet
  useEffect(() => {
    if (!currentQuestionId) return;
    const found = questions.some((q) => q.id === currentQuestionId);
    if (!found) loadQuestions();
  }, [currentQuestionId, questions, loadQuestions]);

  const activeQuestion = useMemo(
    () => (currentQuestionId ? questions.find((q) => q.id === currentQuestionId) : undefined),
    [questions, currentQuestionId]
  );

  const questionSummaries = useMemo(
    () => questions.map((q) => ({ id: q.id, title: q.title, difficulty: q.difficulty })),
    [questions]
  );

  const canSelectQuestionId = useMemo(() => {
    const interviewerIndex = interviewerQuestionId ? questions.findIndex((q) => q.id === interviewerQuestionId) : -1;
    const allowedMaxIndex = navPermission === 'both' ? questions.length - 1 : navPermission === 'prev_only' ? interviewerIndex : interviewerIndex;

    return (id: string) => {
      if (!id) return false;
      const idx = questions.findIndex((q) => q.id === id);
      if (idx < 0) return false;
      if (navPermission === 'both') return true;
      if (navPermission === 'prev_only') return allowedMaxIndex >= 0 && idx <= allowedMaxIndex;
      // 'none'
      return interviewerQuestionId ? id === interviewerQuestionId : idx === allowedMaxIndex;
    };
  }, [questions, navPermission, interviewerQuestionId]);

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
  const editorDisabled = isEnded || !activeQuestion;

  return (
    <>
      <Header showTimer={sessionStatus === 'active'} initialElapsedSeconds={initialElapsedSeconds} sessionId={sessionId} />
      {endedNotice && (
        <div className="session-ended-notice">
          Mülakatınız sonlandırılmıştır. Teşekkürler!
        </div>
      )}
      <div className="interview-layout">
        <IntervieweeSidebar
          question={activeQuestion}
          questions={questionSummaries}
          activeQuestionId={currentQuestionId}
          navPermission={navPermission}
          canSelectQuestionId={canSelectQuestionId}
          onSelectQuestionId={(id) => {
            if (!canSelectQuestionId(id)) return;
            handleSetQuestion(id);
          }}
        />
        <div className="center-panel">
          <CodeEditor
            showSubmit
            externalCode={code}
            readOnly={editorDisabled}
            disabled={editorDisabled}
            onCodeChange={editorDisabled ? undefined : handleCodeChange}
            onRun={editorDisabled ? undefined : handleRun}
            onSubmit={editorDisabled ? undefined : () => handleSubmit()}
            onClear={handleClear}
          />
          <OutputPanel output={output} error={error} isRunning={isRunning} executionTime={executionTime} />
          {!activeQuestion && (
            <div style={{ marginTop: '0.5rem', padding: '0 1rem', fontSize: '0.8125rem', color: 'var(--jotform-text-light)' }}>
              {questionsError ? `Sorular yüklenemedi: ${questionsError}` : 'Interviewer bir soru seçtiğinde editör aktif olacak.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function IntervieweeView({ sessionId }: { sessionId: string }) {
  const { token } = useParams<{ token: string }>();

  return (
    <EditorProvider token={token ?? ''}>
      <IntervieweeContent sessionId={sessionId}/>
    </EditorProvider>
  );
}
