import Editor from '@monaco-editor/react';
import Header from '../components/Header/Header';
import InterviewerSidebar from '../components/Sidebar/InterviewerSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { WSMessageType } from '@jotform-interview/shared';
import { fetchQuestionBank, type QuestionBankQuestion } from '../services/questionBank';
import type { NavPermission } from '../hooks/useCodeSync';

const FALLBACK_EVAL = [
  { id: 'correctness', label: 'Correctness', max_score: 10 },
  { id: 'efficiency', label: 'Time & space efficiency', max_score: 5 },
  { id: 'clarity', label: 'Code clarity', max_score: 5 },
];

const NAV_OPTIONS: { value: NavPermission; label: string; desc: string }[] = [
  { value: 'none', label: 'Navigasyon Yok', desc: 'Aday sorular arasi gecis yapamaz' },
  { value: 'prev_only', label: 'Sadece Onceki', desc: 'Aday sadece onceki soruya donebilir' },
  { value: 'both', label: 'Serbest', desc: 'Aday tum sorular arasinda gecis yapabilir' },
];

interface InterviewerViewProps {
  onEndSession: () => void;
  candidateToken?: string;
  sessionId: string;
}

export default function InterviewerView({ sessionId, onEndSession, candidateToken }: InterviewerViewProps) {
  const { token } = useParams<{ token: string }>();

  return (
    <EditorProvider token={token ?? ''}>
      <InterviewerContent onEndSession={onEndSession} candidateToken={candidateToken} sessionId={sessionId} />
    </EditorProvider>
  );
}

function InterviewerContent({ sessionId, onEndSession, candidateToken }: InterviewerViewProps) {
  const {
    code,
    output,
    error,
    isRunning,
    executionTime,
    lastMessage,
    currentQuestionId,
    navPermission,
    handleCodeChange,
    handleRun,
    handleSetQuestion,
    handleSetNavPermission,
    handleClear,
    broadcastSessionStarted,
    broadcastSessionEnded,
    wsStatus,
    wsUrl,
    lastRemoteSubmission,
  } = useEditor();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [candidateConnected, setCandidateConnected] = useState(false);
  const didSyncToCandidateRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionBank()
      .then((qs) => {
        if (cancelled) return;
        setQuestions(qs);
        setQuestionsError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setQuestions([]);
        setQuestionsError(e?.message ?? 'Failed to load question bank');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const questionSummaries = useMemo(
    () => questions.map((q) => ({ id: q.id, title: q.title, difficulty: q.difficulty, category: q.category })),
    [questions]
  );

  const activeQuestion = useMemo(
    () => (currentQuestionId ? questions.find((q) => q.id === currentQuestionId) : undefined),
    [questions, currentQuestionId]
  );

  // If interviewer has no active question yet, default to the first one.
  useEffect(() => {
    if (!currentQuestionId && questions.length > 0) {
      handleSetQuestion(questions[0].id, { navPermission });
    }
  }, [currentQuestionId, questions, handleSetQuestion, navPermission]);

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

  // Keep status in sync if another peer broadcasts it.
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
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === WSMessageType.ROOM_STATE) {
      const roles = lastMessage.payload?.roles;
      if (Array.isArray(roles)) {
        setCandidateConnected(roles.includes('candidate'));
      }
      return;
    }

    if (lastMessage.type === WSMessageType.PEER_JOINED && lastMessage.payload?.role === 'candidate') {
      setCandidateConnected(true);
    }
    if (lastMessage.type === WSMessageType.PEER_LEFT && lastMessage.payload?.role === 'candidate') {
      setCandidateConnected(false);
    }
  }, [lastMessage]);

  // When a candidate joins (or reconnects), push current question + navigation permission.
  useEffect(() => {
    if (!candidateConnected) {
      didSyncToCandidateRef.current = false;
      return;
    }
    if (didSyncToCandidateRef.current) return;
    if (!currentQuestionId) return;
    handleSetQuestion(currentQuestionId, { navPermission });
    didSyncToCandidateRef.current = true;
  }, [candidateConnected, currentQuestionId, handleSetQuestion, navPermission]);

  const initialElapsedSeconds = (() => {
    if (sessionStatus !== 'active' || !startedAt) return 0;
    const nowServerMs = Date.now() - serverSkewMs;
    return Math.max(0, Math.floor((nowServerMs - Date.parse(startedAt)) / 1000));
  })();

  const candidateUrl = candidateToken
    ? `${window.location.origin}/interview/${candidateToken}`
    : null;

  const copyLink = () => {
    if (!candidateUrl) return;
    navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  
  const evalCriteria = (activeQuestion?.evaluation_criteria?.length ? activeQuestion.evaluation_criteria : FALLBACK_EVAL)
    .map((c) => ({ id: c.id, label: c.label, max_score: c.max_score }));

  const checklistCompletedCount = (() => {
    if (!activeQuestion) return 0;
    const prefix = `${activeQuestion.id}:`;
    return Object.entries(checked).filter(([k, v]) => v && k.startsWith(prefix)).length;
  })();

  return (
    <>
      <Header
        candidateName="Candidate"
        showTimer={sessionStatus === 'active'}
        initialElapsedSeconds={initialElapsedSeconds}
        sessionId={sessionId}
        showEndSession
        onEndSession={onEndSession}
      />
      {candidateUrl && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--jotform-bg-light, #f5f5f5)',
          borderBottom: '1px solid var(--jotform-border, #e0e0e0)',
          fontSize: '0.8125rem',
        }}>

        
          <span style={{ fontWeight: 600 }}>Aday Davet Linki:</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              borderRadius: 999,
              background: wsStatus === 'connected' ? 'rgba(0, 117, 255, 0.10)' : 'rgba(154, 160, 166, 0.18)',
              color: wsStatus === 'connected' ? 'var(--jotform-primary, #0075ff)' : '#6b7280',
              border: `1px solid ${wsStatus === 'connected' ? 'rgba(0, 117, 255, 0.25)' : 'rgba(154, 160, 166, 0.35)'}`,
              whiteSpace: 'nowrap',
            }}
            title={`WS: ${wsStatus}\n${wsUrl}`}
          >
            WS: {wsStatus}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              borderRadius: 999,
              background: candidateConnected ? 'rgba(40, 167, 69, 0.12)' : 'rgba(220, 53, 69, 0.12)',
              color: candidateConnected ? 'var(--jotform-success, #28a745)' : 'var(--jotform-error, #dc3545)',
              border: `1px solid ${candidateConnected ? 'rgba(40, 167, 69, 0.35)' : 'rgba(220, 53, 69, 0.35)'}`,
              whiteSpace: 'nowrap',
            }}
            title={candidateConnected ? 'Candidate connected' : 'Candidate not connected'}
          >
            {candidateConnected ? 'Bağlı' : 'Bağlı değil'}
          </span>
          {lastRemoteSubmission && (
            <span style={{ fontSize: '0.75rem', color: 'var(--jotform-text-light, #6b7280)', whiteSpace: 'nowrap' }}>
              Aday submit aldı ({lastRemoteSubmission.questionId ?? 'n/a'})
            </span>
          )}
          <code style={{
            flex: 1,
            padding: '0.25rem 0.5rem',
            background: 'var(--jotform-bg, #fff)',
            border: '1px solid var(--jotform-border, #e0e0e0)',
            borderRadius: 4,
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{candidateUrl}</code>
          <button
            onClick={copyLink}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 4,
              border: 'none',
              background: copied ? 'var(--jotform-success, #28a745)' : 'var(--jotform-primary, #0075ff)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? 'Kopyalandi!' : 'Kopyala'}
          </button>

          <button
            disabled={isStarting || sessionStatus !== 'waiting'}
            onClick={async () => {
              if (sessionStatus !== 'waiting') return;
              setIsStarting(true);
              try {
                const res = await fetch(`/api/sessions/${sessionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'start' }),
                });
                if (!res.ok) return;
                const sessionRes = await fetch(`/api/sessions/${sessionId}`);
                if (sessionRes.ok) {
                  const data = await sessionRes.json();
                  setSessionStatus(data?.status ?? 'active');
                  const iso = data?.started_at ?? new Date().toISOString();
                  setStartedAt(iso);
                  if (data?.server_now) setServerSkewMs(Date.now() - Date.parse(data.server_now));
                  broadcastSessionStarted(iso, data?.server_now);
                } else {
                  setSessionStatus('active');
                  const iso = new Date().toISOString();
                  setStartedAt(iso);
                  broadcastSessionStarted(iso);
                }
              } finally {
                setIsStarting(false);
              }
            }}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 4,
              border: 'none',
              background: isStarting || sessionStatus !== 'waiting' ? '#9aa0a6' : 'var(--jotform-success, #28a745)',
              color: '#fff',

              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {isStarting ? 'Başlatılıyor…' : 'Mülakatı Başlat'}
          </button>


          <button
            disabled={isEnding || sessionStatus === 'ended'}
            onClick={async () => {
              if (sessionStatus === 'ended') return;
              if (!window.confirm('Mülakatı sonlandırmak istediğinize emin misiniz?')) return;
              setIsEnding(true);
              try {
                const res = await fetch(`/api/sessions/${sessionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'end' }),
                });
                let serverNow: string | undefined;
                try {
                  const data = await res.json();
                  serverNow = data?.server_now;
                  if (serverNow) setServerSkewMs(Date.now() - Date.parse(serverNow));
                } catch {
                  // ignore
                }
                broadcastSessionEnded('manual_end', serverNow);
              } finally {
                setIsEnding(false);
                onEndSession();
              }
            }}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 4,
              border: 'none',
              background: isEnding || sessionStatus === 'ended' ? '#9aa0a6' : 'var(--jotform-error, #dc3545)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {isEnding ? 'Sonlandırılıyor…' : 'Mülakatı Sonlandır'}
          </button>
        </div>
      )}


      <div className="interview-layout">
        <InterviewerSidebar
          questions={questionSummaries}
          activeQuestionId={currentQuestionId}
          onSelectQuestionId={(id) => handleSetQuestion(id, { navPermission })}
        />
        <div className="center-panel">
          <CodeEditor externalCode={code} onCodeChange={handleCodeChange} onRun={handleRun} onClear = {handleClear}/>
          <OutputPanel output={output} error={error} isRunning={isRunning} executionTime={executionTime} />
        </div>
        <div className="right-panel">
          {/* Navigation Permission */}
          <div className="right-panel__title">Aday Navigasyon Izni</div>
          <div className="nav-permission">
            {NAV_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`nav-permission__option${navPermission === opt.value ? ' nav-permission__option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="navPermission"
                  value={opt.value}
                  checked={navPermission === opt.value}
                  onChange={() => handleSetNavPermission(opt.value)}
                />
                <div>
                  <div className="nav-permission__label">{opt.label}</div>
                  <div className="nav-permission__desc">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Solution Monaco Editor */}
          <div className="right-panel__title" style={{ marginTop: '1rem' }}>Beklenen Cozum</div>
          <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--jotform-border)' }}>
            <Editor
              height="100%"
              language="php"
              value={activeQuestion?.template_code || (questionsError ? `<?php\n// ${questionsError}\n` : "<?php\n// Select a question from the left\n")}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 12,
                fontFamily: "'Fira Code', 'Monaco', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                padding: { top: 8 },
                renderLineHighlight: 'none',
                domReadOnly: true,
              }}
            />
          </div>
          {activeQuestion?.test_cases?.length ? (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="right-panel__title">Test Case'ler</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeQuestion.test_cases.slice(0, 6).map((tc, idx) => (
                  <div
                    key={`${activeQuestion.id}:tc:${idx}`}
                    style={{
                      border: '1px solid var(--jotform-border)',
                      borderRadius: 8,
                      padding: '0.5rem',
                      background: 'var(--jotform-bg, #fff)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong>#{idx + 1}</strong>
                      <span style={{ color: 'var(--jotform-text-light)' }}>{tc.is_hidden ? 'hidden' : 'visible'}</span>
                    </div>
                    <div style={{ color: 'var(--jotform-text-light)' }}>Input</div>
                    <pre style={{ margin: '0.25rem 0 0.5rem 0', whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                    <div style={{ color: 'var(--jotform-text-light)' }}>Expected</div>
                    <pre style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>{tc.expected_output}</pre>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Checklist */}
          <div className="right-panel__title" style={{ marginTop: '1rem' }}>Degerlendirme Kontrol Listesi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {evalCriteria.map((item) => {
              const key = activeQuestion ? `${activeQuestion.id}:${item.id}` : item.id;
              return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  color: checked[key] ? 'var(--jotform-success)' : 'var(--jotform-text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checked[key]}
                  onChange={() => toggle(key)}
                  style={{ accentColor: 'var(--jotform-success)', marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ textDecoration: checked[key] ? 'line-through' : 'none' }}>
                  {item.label} <span style={{ color: 'var(--jotform-text-light)' }}>({item.max_score})</span>
                </span>
              </label>
            )})}
          </div>
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--jotform-text-light)',
          }}>
            {activeQuestion ? `${checklistCompletedCount} / ${evalCriteria.length} tamamlandi` : `0 / ${evalCriteria.length} tamamlandi`}
          </div>

          <div className="right-panel__title" style={{ marginTop: '1rem' }}>Notlar</div>
          <textarea
            className="right-panel__textarea"
            placeholder="Mulakat notlarinizi buraya yazin..."
          />
        </div>
      </div>
    </>
  );
}
