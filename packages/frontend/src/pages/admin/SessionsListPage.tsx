import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSessions, type SessionData } from '../../services/adminApi';

function ReportIcon({ color = '#6F76A7' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  // Filter by date range
  const dateFiltered = useMemo(() => {
    const cutoff = Date.now() - daysFilter * 24 * 60 * 60 * 1000;
    return sessions.filter(s => {
      const created = new Date(s.created_at).getTime();
      return created >= cutoff;
    });
  }, [sessions, daysFilter]);

  // Filter by status
  const filtered = statusFilter === 'all'
    ? dateFiltered
    : dateFiltered.filter(s => s.status === statusFilter);

  // Counts per status
  const counts = useMemo(() => {
    const c = { all: dateFiltered.length, waiting: 0, active: 0, ended: 0 };
    dateFiltered.forEach(s => {
      if (s.status === 'waiting') c.waiting++;
      else if (s.status === 'active') c.active++;
      else if (s.status === 'ended') c.ended++;
    });
    return c;
  }, [dateFiltered]);

  const pills = [
    { key: 'all', label: 'All' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'active', label: 'Active' },
    { key: 'ended', label: 'Ended' },
  ];

  return (
    <>
      {/* Title Row */}
      <div className="admin-title-row">
        <h1 className="admin-page-title">Interview Sessions</h1>
        <select
          className="admin-filter-select"
          style={{ width: 200 }}
          value={daysFilter}
          onChange={e => setDaysFilter(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
          <option value={99999}>All time</option>
        </select>
      </div>

      {/* Status Pills */}
      <div className="admin-pills">
        {pills.map(p => (
          <button
            key={p.key}
            className={`admin-pill${statusFilter === p.key ? ' admin-pill--active' : ''}`}
            onClick={() => setStatusFilter(p.key)}
          >
            {p.label} ({counts[p.key as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table">
        <div className="admin-table-header">
          <span className="admin-table-header-cell admin-col--session-id">Session ID</span>
          <span className="admin-table-header-cell admin-col--candidate">Candidate</span>
          <span className="admin-table-header-cell admin-col--status">Status</span>
          <span className="admin-table-header-cell admin-col--started">Started at</span>
          <span className="admin-table-header-cell admin-col--ended">Ended at</span>
          <span className="admin-table-header-cell admin-col--report">Report</span>
        </div>
        <div className="admin-table-body">
          {loading && (
            <div className="admin-empty"><div>Loading sessions...</div></div>
          )}
          {!loading && filtered.map(s => (
            <div key={s.id} className="admin-table-row">
              <span className="admin-table-cell admin-col--session-id admin-table-cell--link">
                {s.id.length > 16 ? s.id.slice(0, 16) + '...' : s.id}
              </span>
              <span className="admin-table-cell admin-col--candidate">
                {s.candidate_name || 'N/A'}
              </span>
              <span className="admin-table-cell admin-col--status">
                <span className={`admin-badge admin-badge--${s.status}`}>
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
              </span>
              <span className="admin-table-cell admin-col--started">{formatTime(s.started_at)}</span>
              <span className="admin-table-cell admin-col--ended admin-table-cell--muted">{formatTime(s.ended_at)}</span>
              <span className="admin-table-cell admin-col--report" style={{ textAlign: 'center' }}>
                <button
                  className={`admin-icon-btn${s.status === 'ended' ? ' admin-icon-btn--report' : ''}`}
                  title="View Report"
                  onClick={() => navigate(`/admin/sessions/${s.id}/report`)}
                  disabled={s.status !== 'ended'}
                  style={{ opacity: s.status === 'ended' ? 1 : 0.35 }}
                >
                  <ReportIcon color={s.status === 'ended' ? '#FF6100' : '#6F76A7'} />
                </button>
              </span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="admin-empty">
              <div>No sessions found for this filter.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
