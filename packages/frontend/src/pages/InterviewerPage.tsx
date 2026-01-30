import Header from '../components/Header/Header';
import InterviewerSidebar from '../components/Sidebar/InterviewerSidebar';
import CodeEditor from '../components/Editor/CodeEditor';
import OutputPanel from '../components/Output/OutputPanel';
import { useState } from 'react';

const SOLUTION_CHECKLIST = [
  { id: 'c1', label: 'Doğru veri yapısı kullanımı (hash map)' },
  { id: 'c2', label: 'Edge case\'leri kontrol etti' },
  { id: 'c3', label: 'Zaman karmaşıklığını açıkladı (O(n))' },
  { id: 'c4', label: 'Alan karmaşıklığını açıkladı (O(n))' },
  { id: 'c5', label: 'Brute force çözümü anlattı' },
  { id: 'c6', label: 'Optimize çözümü implement etti' },
  { id: 'c7', label: 'Kodu test etti' },
  { id: 'c8', label: 'Temiz ve okunabilir kod yazdı' },
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

interface InterviewerViewProps {
  onEndSession: () => void;
}

export default function InterviewerView({ onEndSession }: InterviewerViewProps) {
  const [output, setOutput] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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
          <div className="right-panel__title">Beklenen Çözüm</div>
          <pre style={{
            background: 'var(--jotform-light-gray)',
            borderRadius: 8,
            padding: '0.75rem',
            fontSize: '0.75rem',
            fontFamily: "'Fira Code', monospace",
            overflowX: 'auto',
            marginBottom: '1rem',
            whiteSpace: 'pre-wrap',
          }}>
            {SOLUTION_CODE}
          </pre>

          <div className="right-panel__title">Değerlendirme Kontrol Listesi</div>
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
            {Object.values(checked).filter(Boolean).length} / {SOLUTION_CHECKLIST.length} tamamlandı
          </div>

          <div className="right-panel__title" style={{ marginTop: '1rem' }}>Notlar</div>
          <textarea
            className="right-panel__textarea"
            placeholder="Mülakat notlarınızı buraya yazın..."
          />
        </div>
      </div>
    </>
  );
}
