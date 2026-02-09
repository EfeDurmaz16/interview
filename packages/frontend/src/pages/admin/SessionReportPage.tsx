import { useParams } from 'react-router-dom';

interface ScoreItem {
  label: string;
  score: number;
  max: number;
}

interface QuestionReport {
  id: string;
  title: string;
  level: string;
  difficulty: string;
  scores: ScoreItem[];
  notes: string;
}

// Mock data matching the .pen design (f2743)
const MOCK_REPORT = {
  session: {
    id: 'S2024-002',
    candidateName: 'Bob Smith',
    candidateEmail: 'bob.smith@example.com',
    interviewerName: 'Sarah Lee',
    interviewerRole: 'Senior Engineer',
    duration: '1h 15min',
    durationRange: '9:00 AM - 10:15 AM',
    status: 'Completed' as const,
    date: 'Dec 15, 2024',
  },
  questions: [
    {
      id: '1',
      title: 'Two Sum Algorithm',
      level: 'junior',
      difficulty: 'Easy',
      scores: [
        { label: 'Problem Understanding', score: 8, max: 10 },
      ],
      notes: 'Candidate showed good understanding of the problem. Approached solution methodically with hashmap optimization. Could improve on edge case handling.',
    },
  ] as QuestionReport[],
};

export default function SessionReportPage() {
  const { id: _sessionId } = useParams<{ id: string }>();
  const report = MOCK_REPORT;

  return (
    <>
      {/* Summary Cards */}
      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Candidate</span>
          <span className="admin-summary-card__value">{report.session.candidateName}</span>
          <span className="admin-summary-card__sub">{report.session.candidateEmail}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Interviewer</span>
          <span className="admin-summary-card__value">{report.session.interviewerName}</span>
          <span className="admin-summary-card__sub">{report.session.interviewerRole}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Duration</span>
          <span className="admin-summary-card__value">{report.session.duration}</span>
          <span className="admin-summary-card__sub">{report.session.durationRange}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Status</span>
          <span className="admin-summary-card__value admin-summary-card__value--success">{report.session.status}</span>
          <span className="admin-summary-card__sub">{report.session.date}</span>
        </div>
      </div>

      {/* Question Sections */}
      {report.questions.map(q => (
        <div key={q.id} className="admin-question-section">
          <div className="admin-question-header">
            <h2 className="admin-question-title">{q.title}</h2>
            <div className="admin-question-meta">
              <span className={`admin-badge admin-badge--${q.level}`}>
                {q.level.charAt(0).toUpperCase() + q.level.slice(1)}
              </span>
              <span className={`admin-badge admin-badge--${q.difficulty.toLowerCase()}`} style={{ background: q.difficulty === 'Easy' ? '#2BC57320' : q.difficulty === 'Hard' ? '#F23A3C20' : '#FFB62920' }}>
                {q.difficulty}
              </span>
            </div>
          </div>

          {/* Scores */}
          <div className="admin-scores">
            {q.scores.map((s, i) => (
              <div key={i} className="admin-score-row">
                <span className="admin-score-label">{s.label}</span>
                <div className="admin-score-bar">
                  <div
                    className="admin-score-bar__fill"
                    style={{ width: `${(s.score / s.max) * 100}%` }}
                  />
                </div>
                <span className="admin-score-value">{s.score}/{s.max}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="admin-notes-section">
            <div className="admin-notes-label">Interviewer Notes:</div>
            <p className="admin-notes-text">{q.notes}</p>
          </div>
        </div>
      ))}
    </>
  );
}
