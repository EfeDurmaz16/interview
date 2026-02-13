import type { QuestionBankQuestion } from '../../services/questionBank';

type QuestionSummary = Pick<QuestionBankQuestion, 'id' | 'title' | 'difficulty' | 'category'>;

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

        <div className="sidebar-section__title" style={{ marginTop: '1rem' }}>Notlar</div>
        <textarea
          className="sidebar__notes"
          placeholder="Mulakat notlarinizi buraya yazin..."
          value={evaluationNotes}
          onChange={(e) => onEvaluationNotesChange?.(e.target.value)}
        />

        <div className={`sidebar__save-status sidebar__save-status--${evaluationSaveStatus}`}>
          {evaluationSaveStatus === 'saving' ? 'Degerlendirme kaydediliyor...' : null}
          {evaluationSaveStatus === 'saved' ? 'Degerlendirme kaydedildi' : null}
          {evaluationSaveStatus === 'error' ? (evaluationSaveError || 'Degerlendirme kaydedilemedi') : null}
        </div>
      </div>
    </aside>
  );
}
