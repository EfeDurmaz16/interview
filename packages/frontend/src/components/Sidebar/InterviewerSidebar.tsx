import { useState } from 'react';

type QuestionSummary = {
  id: string;
  title: string;
  difficulty: string;
  category?: string;
};

type EvalCriterion = {
  id: string;
  label: string;
  max_score: number;
};

interface InterviewerSidebarProps {
  questions: QuestionSummary[];
  activeQuestionId?: string;
  onSelectQuestionId?: (questionId: string) => void;
  evaluationCriteria: EvalCriterion[];
  evaluationScores: Record<string, number>;
  onEvaluationScoreChange?: (criterionId: string, score: number) => void;
  evaluationNotes: string;
  onEvaluationNotesChange?: (notes: string) => void;
  evaluationSaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  evaluationSaveError?: string | null;
}

export default function InterviewerSidebar({
  questions,
  activeQuestionId,
  onSelectQuestionId,
  evaluationCriteria,
  evaluationScores,
  onEvaluationScoreChange,
  evaluationNotes,
  onEvaluationNotesChange,
  evaluationSaveStatus = 'idle',
  evaluationSaveError = null,
}: InterviewerSidebarProps) {
  const activeId = activeQuestionId ?? questions[0]?.id;
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_EVAL_CRITERIA.map((c) => [c.id, 0]))
  );

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
        {evaluationCriteria.map((c) => (
          <div key={c.id} className="eval-item">
            <div className="eval-item__label">{c.label}</div>
            <input
              type="range"
              className="eval-item__slider"
              min={0}
              max={c.max_score}
              value={evaluationScores[c.id] ?? 0}
              onChange={(e) => onEvaluationScoreChange?.(c.id, Number(e.target.value))}
            />
            <div className="eval-item__score">{evaluationScores[c.id] ?? 0} / {c.max_score}</div>
          </div>
        ))}

      <div className="right-panel__title" style={{ marginTop: '1rem' }}>Notlar</div>
      <textarea
        className="right-panel__textarea"
        placeholder="Mulakat notlarinizi buraya yazin..."
      />
    </aside>
  );
}
