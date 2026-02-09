import { useEffect, useMemo, useState } from 'react';
import { fetchQuestionBank, type QuestionBankQuestion, type Difficulty } from '../services/questionBank';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#2BC573',
  medium: '#FF6100',
  hard: '#F23A3C',
};

const PRESETS: { label: string; key: string; filter: (d: Difficulty) => boolean }[] = [
  { label: 'Intern', key: 'intern', filter: (d) => d === 'easy' },
  { label: 'Junior', key: 'junior', filter: (d) => d === 'easy' || d === 'medium' },
  { label: 'Senior', key: 'senior', filter: (d) => d === 'medium' || d === 'hard' },
];

interface InterviewSetupPageProps {
  sessionId: string;
  candidateName?: string;
  candidateToken?: string;
  onStartInterview: () => void;
}

export default function InterviewSetupPage({ sessionId, candidateName, candidateToken, onStartInterview }: InterviewSetupPageProps) {
  const [bank, setBank] = useState<QuestionBankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchQuestionBank()
      .then((qs) => {
        if (!cancelled) { setBank(qs); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const candidateUrl = candidateToken
    ? `${window.location.origin}/interview/${candidateToken}`
    : null;

  const copyLink = () => {
    if (!candidateUrl) return;
    navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setSelectedIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const removeQuestion = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const applyPreset = (filter: (d: Difficulty) => boolean) => {
    const ids = bank.filter((q) => filter(q.difficulty)).map((q) => q.id);
    setSelectedIds(ids);
  };

  const selectedQuestions = useMemo(
    () => selectedIds.map((id) => bank.find((q) => q.id === id)).filter(Boolean) as QuestionBankQuestion[],
    [selectedIds, bank]
  );

  const handleStart = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Failed to save questions');
      onStartInterview();
    } catch {
      alert('Failed to save question selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--jotform-text)' }}>
        <p>Loading question bank...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--jotform-bg, #f5f6fa)' }}>
      {/* Top Info Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 24px',
        background: 'var(--jotform-surface, #fff)',
        borderBottom: '1px solid var(--jotform-border, #e0e0e0)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--jotform-text)' }}>
          Interview Setup
        </div>
        {candidateName && (
          <div style={{ fontSize: 14, color: 'var(--jotform-text-light)' }}>
            Candidate: <strong style={{ color: 'var(--jotform-text)' }}>{candidateName}</strong>
          </div>
        )}
        {candidateUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--jotform-text-light)' }}>Candidate Link:</span>
            <code style={{ fontSize: 12, background: 'var(--jotform-bg, #f5f6fa)', padding: '2px 8px', borderRadius: 4 }}>
              {candidateUrl.length > 50 ? candidateUrl.slice(0, 50) + '...' : candidateUrl}
            </code>
            <button
              onClick={copyLink}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: copied ? 'var(--jotform-success, #2BC573)' : 'var(--jotform-text-light)',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 24px',
        background: 'var(--jotform-surface, #fff)',
        borderBottom: '1px solid var(--jotform-border, #e0e0e0)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jotform-text)' }}>Presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.filter)}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid var(--jotform-border, #ddd)',
              background: 'var(--jotform-bg, #f5f6fa)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--jotform-text)',
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setSelectedIds([])}
          style={{
            padding: '4px 14px',
            borderRadius: 6,
            border: '1px solid var(--jotform-border, #ddd)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--jotform-text-light)',
          }}
        >
          Clear
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Question Bank */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          borderRight: '1px solid var(--jotform-border, #e0e0e0)',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--jotform-text)' }}>
            Question Bank ({bank.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bank.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              return (
                <label
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? 'var(--jotform-primary, #FF6100)' : 'var(--jotform-border, #e0e0e0)'}`,
                    background: isSelected ? 'rgba(255, 97, 0, 0.04)' : 'var(--jotform-surface, #fff)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleQuestion(q.id)}
                    style={{ accentColor: '#FF6100', marginTop: 3, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--jotform-text)' }}>{q.title}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '1px 8px',
                        borderRadius: 10,
                        color: '#fff',
                        background: DIFFICULTY_COLORS[q.difficulty] ?? '#888',
                        textTransform: 'capitalize',
                      }}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--jotform-text-light)' }}>{q.category}</div>
                  </div>
                </label>
              );
            })}
            {bank.length === 0 && (
              <div style={{ fontSize: 14, color: 'var(--jotform-text-light)', padding: 16 }}>
                No questions in the bank. Add questions from the admin panel first.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Questions */}
        <div style={{
          width: 360,
          flexShrink: 0,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--jotform-text)' }}>
            Selected Questions ({selectedQuestions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {selectedQuestions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--jotform-border, #e0e0e0)',
                  background: 'var(--jotform-surface, #fff)',
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--jotform-text-light)', width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, fontWeight: 500, color: 'var(--jotform-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.title}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 8,
                  color: '#fff',
                  background: DIFFICULTY_COLORS[q.difficulty] ?? '#888',
                  textTransform: 'capitalize',
                  flexShrink: 0,
                }}>
                  {q.difficulty}
                </span>
                <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 0.7, padding: 2 }}>
                  <ChevronUpIcon />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === selectedQuestions.length - 1} style={{ border: 'none', background: 'none', cursor: idx === selectedQuestions.length - 1 ? 'default' : 'pointer', opacity: idx === selectedQuestions.length - 1 ? 0.3 : 0.7, padding: 2 }}>
                  <ChevronDownIcon />
                </button>
                <button onClick={() => removeQuestion(q.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#F23A3C', opacity: 0.7, padding: 2 }}>
                  <RemoveIcon />
                </button>
              </div>
            ))}
            {selectedQuestions.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--jotform-text-light)', padding: 16, textAlign: 'center' }}>
                Select questions from the bank or use a preset.
              </div>
            )}
          </div>

          {/* Start Interview button */}
          <button
            onClick={handleStart}
            disabled={saving || selectedIds.length === 0}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: selectedIds.length === 0 ? '#ccc' : '#FF6100',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              cursor: selectedIds.length === 0 ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : `Start Interview (${selectedIds.length} questions)`}
          </button>
        </div>
      </div>
    </div>
  );
}
