import { useMemo, useState } from 'react';
import type { QuestionBankQuestion } from '../../services/questionBank';

type QuestionSummary = Pick<QuestionBankQuestion, 'id' | 'title' | 'difficulty' | 'category'>;

type EvalCriterion = {
  id: string;
  label: string;
  maxScore: number;
  currentScore: number;
};

const DEFAULT_EVAL_CRITERIA: EvalCriterion[] = [
  { id: 'e1', label: 'Problem Understanding', maxScore: 5, currentScore: 0 },
  { id: 'e2', label: 'Code Quality', maxScore: 5, currentScore: 0 },
  { id: 'e3', label: 'Optimization', maxScore: 5, currentScore: 0 },
  { id: 'e4', label: 'Communication', maxScore: 5, currentScore: 0 },
];

interface InterviewerSidebarProps {
  questions: QuestionSummary[];
  activeQuestionId?: string;
  onSelectQuestionId?: (questionId: string) => void;
}

export default function InterviewerSidebar({ questions, activeQuestionId, onSelectQuestionId }: InterviewerSidebarProps) {
  const activeId = activeQuestionId ?? questions[0]?.id;
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_EVAL_CRITERIA.map((c) => [c.id, 0]))
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      if (q.category) set.add(q.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  return (
    <aside className="sidebar sidebar--interviewer">
      <div className="sidebar-section">
        <div className="sidebar-section__title">Questions</div>
        {questions.length === 0 && (
          <div style={{ fontSize: '0.8125rem', padding: '0.375rem 0', color: 'var(--jotform-text-light)' }}>
            No questions loaded
          </div>
        )}
        {questions.map((q) => (
          <div
            key={q.id}
            className={`question-item${q.id === activeId ? ' question-item--active' : ''}`}
            onClick={() => onSelectQuestionId?.(q.id)}
          >
            <span className="question-item__title">{q.title}</span>
            <span className={`badge badge--${q.difficulty}`}>{q.difficulty}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section__title">Evaluation</div>
        {DEFAULT_EVAL_CRITERIA.map((c) => (
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
        {(categories.length ? categories : ['Arrays', 'Strings', 'Design']).map((cat) => (
          <div key={cat} style={{ fontSize: '0.8125rem', padding: '0.375rem 0', color: 'var(--jotform-text-light)' }}>
            {cat}
          </div>
        ))}
      </div>
    </aside>
  );
}
