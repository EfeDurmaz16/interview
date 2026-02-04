import type { NavPermission } from '../../hooks/useCodeSync';
import type { QuestionBankQuestion } from '../../services/questionBank';

interface IntervieweeSidebarProps {
  question?: QuestionBankQuestion | null;
  questions?: Pick<QuestionBankQuestion, 'id' | 'title' | 'difficulty'>[];
  activeQuestionId?: string;
  navPermission?: NavPermission;
  canSelectQuestionId?: (id: string) => boolean;
  onSelectQuestionId?: (id: string) => void;
}

export default function IntervieweeSidebar({
  question,
  questions = [],
  activeQuestionId,
  navPermission = 'none',
  canSelectQuestionId,
  onSelectQuestionId,
}: IntervieweeSidebarProps) {
  const title = question?.title ?? 'Soru bekleniyor…';
  const difficulty = question?.difficulty ?? 'easy';
  const description = question?.description ?? 'Interviewer bir soru seçtiğinde açıklama burada görünecek.';
  const visibleExamples = (question?.test_cases ?? []).filter((t) => !t.is_hidden).slice(0, 3);

  return (
    <aside className="sidebar sidebar--interviewee">
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          <span className={`badge badge--${difficulty}`}>{difficulty}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--jotform-text-light, #6b7280)', marginBottom: '0.75rem' }}>
          Navigasyon: {navPermission === 'none' ? 'yok' : navPermission === 'prev_only' ? 'sadece önceki' : 'serbest'}
        </div>
        <div className="problem-description">
          {description.split('\n').map((p, i) => (
            <p key={i} style={{ marginBottom: '0.5rem' }}>{p}</p>
          ))}

          {visibleExamples.length > 0 && (
            <>
              <h3>Examples</h3>
              {visibleExamples.map((ex, i) => (
                <pre key={i}>
                  <strong>Input:</strong> {ex.input}{'\n'}
                  <strong>Output:</strong> {ex.expected_output}
                </pre>
              ))}
            </>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section__title">Sorular</div>
          {questions.map((q) => {
            const enabled = canSelectQuestionId ? canSelectQuestionId(q.id) : true;
            const isActive = q.id === activeQuestionId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => enabled && onSelectQuestionId?.(q.id)}
                disabled={!enabled}
                className={`question-item${isActive ? ' question-item--active' : ''}`}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.5,
                }}
              >
                <span className="question-item__title">{q.title}</span>
                <span className={`badge badge--${q.difficulty}`}>{q.difficulty}</span>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
