import { useState } from 'react';
import { createSession, type CreateSessionResult } from '../../services/adminApi';

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2BC573" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

const INTERVIEWERS = [
  { id: '1', name: 'Mehmet Can Özdemir', initials: 'MÖ' },
  { id: '2', name: 'Utku Bekçi', initials: 'UB' },
];

export default function SuperadminAssignPage() {
  const [candidateName, setCandidateName] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<CreateSessionResult | null>(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedInterviewer = INTERVIEWERS.find(i => i.id === interviewerId);

  const handleCreate = async () => {
    if (!candidateName.trim() || !interviewerId) return;
    setIsCreating(true);
    setError('');
    setResult(null);

    try {
      const data = await createSession(candidateName.trim());
      setResult(data);
    } catch {
      setError('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewSession = () => {
    setResult(null);
    setCandidateName('');
    setInterviewerId('');
    setNotes('');
    setError('');
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div className="admin-content--centered" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, paddingTop: 68 }}>
      {/* Form Card */}
      <div className="admin-form-card">
        <h2 className="admin-form-card__title">Create Interview Session</h2>

        <div>
          <label className="admin-field-label">Candidate Name</label>
          <input
            className="admin-input"
            placeholder="Enter candidate name"
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            disabled={!!result}
          />
        </div>

        <div>
          <label className="admin-field-label">Select Interviewer</label>
          <div style={{ position: 'relative' }}>
            <select
              className="admin-select"
              value={interviewerId}
              onChange={e => setInterviewerId(e.target.value)}
              disabled={!!result}
              style={{
                paddingLeft: selectedInterviewer ? 44 : 12,
              }}
            >
              <option value="">Choose an interviewer...</option>
              {INTERVIEWERS.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            {selectedInterviewer && (
              <div
                className="admin-avatar"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                {selectedInterviewer.initials}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="admin-field-label">Notes (Optional)</label>
          <textarea
            className="admin-textarea"
            placeholder="Add any additional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={!!result}
          />
        </div>

        {error && (
          <div style={{ color: '#F23A3C', fontSize: 14 }}>{error}</div>
        )}

        {!result && (
          <button
            className="admin-btn admin-btn--primary admin-btn--full"
            onClick={handleCreate}
            disabled={!candidateName.trim() || !interviewerId || isCreating}
            style={{ opacity: (!candidateName.trim() || !interviewerId) ? 0.6 : 1 }}
          >
            {isCreating ? 'Creating...' : 'Create Session'}
          </button>
        )}
      </div>

      {/* Success Card — inline below form */}
      {result && (
        <div className="admin-form-card" style={{ marginTop: 16, borderLeft: '4px solid #2BC573' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <CheckCircleIcon />
            <h3 style={{ margin: 0, fontSize: 16, color: '#2C3345' }}>Session Created!</h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6F76A7' }}>
            Share the links below with the interviewer and candidate.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="admin-field-label">Interviewer Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="admin-input"
                  readOnly
                  value={result.interviewer_url}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  className="admin-btn admin-btn--secondary"
                  style={{ whiteSpace: 'nowrap', minWidth: 80 }}
                  onClick={() => copyToClipboard(result.interviewer_url, 'interviewer')}
                >
                  {copiedField === 'interviewer' ? 'Copied!' : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>

            <div>
              <label className="admin-field-label">Candidate Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="admin-input"
                  readOnly
                  value={result.candidate_url}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  className="admin-btn admin-btn--secondary"
                  style={{ whiteSpace: 'nowrap', minWidth: 80 }}
                  onClick={() => copyToClipboard(result.candidate_url, 'candidate')}
                >
                  {copiedField === 'candidate' ? 'Copied!' : <><CopyIcon /> Copy</>}
                </button>
              </div>
            </div>
          </div>

          <button
            className="admin-btn admin-btn--primary admin-btn--full"
            style={{ marginTop: 20 }}
            onClick={handleNewSession}
          >
            Create Another Session
          </button>
        </div>
      )}
    </div>
  );
}
