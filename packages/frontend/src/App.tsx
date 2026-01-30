import { Routes, Route, Navigate } from 'react-router-dom';
import InterviewPage from './pages/InterviewPage';

// Demo tokens — in production these come from the backend
// Each session has 2 tokens: one maps to interviewer, one to candidate
const DEMO_TOKENS: Record<string, 'interviewer' | 'candidate'> = {
  'int_abc123': 'interviewer',
  'cnd_xyz789': 'candidate',
};

export function resolveRole(token: string): 'interviewer' | 'candidate' | null {
  // In production: GET /api/session/resolve?token=xxx → { role, sessionId }
  return DEMO_TOKENS[token] ?? null;
}

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/interview/:token" element={<InterviewPage />} />
        <Route path="*" element={<Navigate to="/interview/int_abc123" replace />} />
      </Routes>
    </div>
  );
}
