import Editor from '@monaco-editor/react';
import Header from '../components/Header/Header';
import InterviewerSidebar from '../components/Sidebar/InterviewerSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { WSMessageType } from '@jotform-interview/shared';

type NavPermission = 'none' | 'prev_only' | 'both';

const SOLUTION_CHECKLIST = [
  { id: 'c1', label: 'Dogru veri yapisi kullanimi (hash map)' },
  { id: 'c2', label: 'Edge case\'leri kontrol etti' },
  { id: 'c3', label: 'Zaman karmasikligini acikladi (O(n))' },
  { id: 'c4', label: 'Alan karmasikligini acikladi (O(n))' },
  { id: 'c5', label: 'Brute force cozumu anlatti' },
  { id: 'c6', label: 'Optimize cozumu implement etti' },
  { id: 'c7', label: 'Kodu test etti' },
  { id: 'c8', label: 'Temiz ve okunabilir kod yazdi' },
];

const SOLUTION_CODE = `<?php
// Two Sum - Optimal Solution O(n)
function twoSum($nums, $target) {
    $map = [];
    foreach ($nums as $i => $num) {
        $complement = $target - $num;
        if (isset($map[$complement])) {
            return [$map[$complement], $i];
        }
        $map[$num] = $i;
    }
    return [];
}`;

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
    <EditorProvider token={token ?? ''} questionId="1">
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
    handleCodeChange,
    handleRun,
    handleSetQuestion,
    broadcastSessionStarted,
    broadcastSessionEnded,
    wsStatus,
    wsUrl,
    lastRemoteSubmission,
  } = useEditor();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [navPermission, setNavPermission] = useState<NavPermission>('none');
  const [copied, setCopied] = useState(false);

  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [candidateConnected, setCandidateConnected] = useState(false);

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
        <InterviewerSidebar onSelectQuestion={(q) => handleSetQuestion(q.id)} />
        <div className="center-panel">
          <CodeEditor externalCode={code} onCodeChange={handleCodeChange} onRun={handleRun} />
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
                  onChange={() => setNavPermission(opt.value)}
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
              value={SOLUTION_CODE}
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

          {/* Checklist */}
          <div className="right-panel__title" style={{ marginTop: '1rem' }}>Degerlendirme Kontrol Listesi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {SOLUTION_CHECKLIST.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  color: checked[item.id] ? 'var(--jotform-success)' : 'var(--jotform-text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={() => toggle(item.id)}
                  style={{ accentColor: 'var(--jotform-success)', marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ textDecoration: checked[item.id] ? 'line-through' : 'none' }}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--jotform-text-light)',
          }}>
            {Object.values(checked).filter(Boolean).length} / {SOLUTION_CHECKLIST.length} tamamlandi
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
