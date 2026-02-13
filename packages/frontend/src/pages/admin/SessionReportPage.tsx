import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ReportDto } from '@jotform-interview/shared';

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}min`;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function toImageSrc(base64Png: string): string {
  if (base64Png.startsWith('data:image')) return base64Png;
  return `data:image/png;base64,${base64Png}`;
}

export default function SessionReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setError('Session id missing');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/sessions/${id}/report`);
        if (!res.ok) throw new Error(`Failed to fetch report (${res.status})`);
        const data = (await res.json()) as ReportDto;
        if (!cancelled) setReport(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to fetch report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const whiteboardSrc = useMemo(() => {
    if (!report?.whiteboardSnapshot?.base64Png) return null;
    return toImageSrc(report.whiteboardSnapshot.base64Png);
  }, [report]);

  if (loading) return <div className="admin-empty"><div>Loading report...</div></div>;
  if (error) return <div className="admin-empty"><div>{error}</div></div>;
  if (!report) return <div className="admin-empty"><div>Report not found.</div></div>;

  return (
    <>
      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Candidate</span>
          <span className="admin-summary-card__value">{report.session.candidateName || '-'}</span>
          <span className="admin-summary-card__sub">Session: {report.session.id}</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Interviewer</span>
          <span className="admin-summary-card__value">{report.session.interviewerName || '-'}</span>
          <span className="admin-summary-card__sub">-</span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Duration</span>
          <span className="admin-summary-card__value">{formatDuration(report.session.durationMinutes)}</span>
          <span className="admin-summary-card__sub">
            {formatDate(report.session.startedAt)} - {formatDate(report.session.endedAt)}
          </span>
        </div>
        <div className="admin-summary-card">
          <span className="admin-summary-card__label">Status</span>
          <span className="admin-summary-card__value admin-summary-card__value--success">
            {report.session.status}
          </span>
          <span className="admin-summary-card__sub">{formatDate(report.session.endedAt || report.session.startedAt)}</span>
        </div>
      </div>

      {report.questions.map((q) => {
        const scoreEntries = Object.entries(q.evaluation?.criteriaScores ?? {});
        return (
          <div key={q.id} className="admin-question-section">
            <div className="admin-question-header">
              <h2 className="admin-question-title">{q.title}</h2>
              <div className="admin-question-meta">
                <span className={`admin-badge admin-badge--${q.level}`}>
                  {q.level.charAt(0).toUpperCase() + q.level.slice(1)}
                </span>
                <span className={`admin-badge admin-badge--${q.difficulty.toLowerCase()}`}>
                  {q.difficulty}
                </span>
              </div>
            </div>

            <div className="admin-scores">
              {scoreEntries.length === 0 && <div className="admin-empty"><div>No evaluation scores.</div></div>}
              {scoreEntries.map(([label, score]) => (
                <div key={label} className="admin-score-row">
                  <span className="admin-score-label">{label}</span>
                  <span className="admin-score-value">{String(score)}</span>
                </div>
              ))}
            </div>

            <div className="admin-notes-section">
              <div className="admin-notes-label">Interviewer Notes:</div>
              <p className="admin-notes-text">{q.evaluation?.notes || '-'}</p>
            </div>

            {q.lastSubmission && (
              <div className="admin-notes-section">
                <div className="admin-notes-label">Last Submission:</div>
                <p className="admin-notes-text">{formatDate(q.lastSubmission.submittedAt)}</p>
                {Object.entries(q.lastSubmission.files ?? {}).map(([fileName, content]) => (
                  <div key={`${q.id}-${fileName}`} style={{ marginTop: 10 }}>
                    <div className="admin-notes-label" style={{ marginBottom: 6 }}>{fileName}</div>
                    <pre
                      style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 8,
                        background: '#0f172a',
                        color: '#e2e8f0',
                        overflowX: 'auto',
                        whiteSpace: 'pre',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <code>{content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {whiteboardSrc && (
        <div className="admin-question-section">
          <div className="admin-question-header">
            <h2 className="admin-question-title">Whiteboard Snapshot</h2>
          </div>
          <img src={whiteboardSrc} alt="Whiteboard Snapshot" style={{ width: '100%', borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}
