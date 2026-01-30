import { useState } from 'react';

interface Question {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface EvalCriterion {
  id: string;
  label: string;
  maxScore: number;
  currentScore: number;
}

const SAMPLE_QUESTIONS: Question[] = [
  { id: '1', title: 'Two Sum', difficulty: 'easy', category: 'Arrays' },
  { id: '2', title: 'Valid Parentheses', difficulty: 'easy', category: 'Strings' },
  { id: '3', title: 'Merge Intervals', difficulty: 'medium', category: 'Arrays' },
  { id: '4', title: 'LRU Cache', difficulty: 'hard', category: 'Design' },
  { id: '5', title: 'Binary Tree Level Order', difficulty: 'medium', category: 'Trees' },
];

const EVAL_CRITERIA: EvalCriterion[] = [
  { id: 'e1', label: 'Problem Understanding', maxScore: 5, currentScore: 0 },
  { id: 'e2', label: 'Code Quality', maxScore: 5, currentScore: 0 },
  { id: 'e3', label: 'Optimization', maxScore: 5, currentScore: 0 },
  { id: 'e4', label: 'Communication', maxScore: 5, currentScore: 0 },
];

interface InterviewerSidebarProps {
  onSelectQuestion?: (question: Question) => void;
}

export default function InterviewerSidebar({ onSelectQuestion }: InterviewerSidebarProps) {
  const [activeId, setActiveId] = useState<string>('1');
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(EVAL_CRITERIA.map((c) => [c.id, 0]))
  );

  const handleSelect = (q: Question) => {
    setActiveId(q.id);
    onSelectQuestion?.(q);
  };

  return (
    <aside className="sidebar sidebar--interviewer">
      <div className="sidebar-section">
        <div className="sidebar-section__title">Questions</div>
        {SAMPLE_QUESTIONS.map((q) => (
          <div
            key={q.id}
            className={`question-item${q.id === activeId ? ' question-item--active' : ''}`}
            onClick={() => handleSelect(q)}
          >
            <span className="question-item__title">{q.title}</span>
            <span className={`badge badge--${q.difficulty}`}>{q.difficulty}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section__title">Evaluation</div>
        {EVAL_CRITERIA.map((c) => (
          <div key={c.id} className="eval-item">
            <div className="eval-item__label">{c.label}</div>
            <input
              type="range"
              className="eval-item__slider"
              min={0}
              max={c.maxScore}
              value={scores[c.id]}
              onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
            />
            <div className="eval-item__score">{scores[c.id]} / {c.maxScore}</div>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section__title">Question Bank</div>
        {['Arrays', 'Strings', 'Trees', 'Design', 'Dynamic Programming'].map((cat) => (
          <div key={cat} style={{ fontSize: '0.8125rem', padding: '0.375rem 0', color: 'var(--jotform-text-light)' }}>
            {cat}
          </div>
        ))}
      </div>
    </aside>
  );
}
