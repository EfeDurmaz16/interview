import Editor from '@monaco-editor/react';
import Header from '../components/Header/Header';
import InterviewerSidebar from '../components/Sidebar/InterviewerSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useState } from 'react';

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
}

export default function InterviewerView({ onEndSession }: InterviewerViewProps) {
  const [output, setOutput] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [navPermission, setNavPermission] = useState<NavPermission>('none');

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <Header candidateName="Candidate" showTimer showEndSession onEndSession={onEndSession} />
      <div className="interview-layout">
        <InterviewerSidebar />
        <div className="center-panel">
          <CodeEditor onRun={(code) => setOutput(`> Running...\n${code.slice(0, 100)}...`)} />
          <OutputPanel output={output} />
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
