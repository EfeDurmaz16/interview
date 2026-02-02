import Editor from '@monaco-editor/react';
import Header from '../components/Header/Header';
import InterviewerSidebar from '../components/Sidebar/InterviewerSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EditorProvider, useEditor } from '../contexts/EditorContext';

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
}

export default function InterviewerView({ onEndSession, candidateToken }: InterviewerViewProps) {
  const { token } = useParams<{ token: string }>();

  return (
    <EditorProvider token={token ?? ''}>
      <InterviewerContent onEndSession={onEndSession} candidateToken={candidateToken} />
    </EditorProvider>
  );
}

function InterviewerContent({ onEndSession, candidateToken }: InterviewerViewProps) {
  const { code, output, error, isRunning, executionTime, handleCodeChange, handleRun } = useEditor();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [navPermission, setNavPermission] = useState<NavPermission>('none');
  const [copied, setCopied] = useState(false);

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
      <Header candidateName="Candidate" showTimer showEndSession onEndSession={onEndSession} />
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
        </div>
      )}
      <div className="interview-layout">
        <InterviewerSidebar />
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
