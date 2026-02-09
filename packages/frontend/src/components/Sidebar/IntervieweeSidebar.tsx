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
  navPermission: _navPermission = 'none',
  canSelectQuestionId,
  onSelectQuestionId,
}: IntervieweeSidebarProps) {
  const description = question?.description ?? 'Interviewer bir soru seçtiğinde açıklama burada görünecek.';
  const visibleExamples = (question?.test_cases ?? []).filter((t) => !t.is_hidden).slice(0, 3);

  // Find index of current question to determine if "Previous" is available
  const currentIdx = activeQuestionId ? questions.findIndex((q) => q.id === activeQuestionId) : -1;
  const prevQuestion = currentIdx > 0 ? questions[currentIdx - 1] : null;
  const canGoPrev = prevQuestion && canSelectQuestionId ? canSelectQuestionId(prevQuestion.id) : false;

  const title = question?.title ?? 'Soru bekleniyor…';
  const difficulty = question?.difficulty ?? 'easy';

  return (
    <aside className="sidebar sidebar--interviewee">
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          <span className={`badge badge--${difficulty}`}>{difficulty}</span>
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

        {/* Previous question button only */}
        {canGoPrev && prevQuestion && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--jotform-border, #e0e0e0)', paddingTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => onSelectQuestionId?.(prevQuestion.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--jotform-border, #ddd)',
                background: 'var(--jotform-surface, #fff)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                color: 'var(--jotform-text)',
                width: '100%',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Önceki Soru
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
