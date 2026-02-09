import { Routes, Route, Navigate } from 'react-router-dom';
import ToastContainer from './components/Toast';
import InterviewPage from './pages/InterviewPage';
import AdminLayout from './pages/admin/AdminLayout';
import QuestionBankPage from './pages/admin/QuestionBankPage';
import SessionsListPage from './pages/admin/SessionsListPage';
import SessionReportPage from './pages/admin/SessionReportPage';
import SuperadminAssignPage from './pages/admin/SuperadminAssignPage';

export interface ResolveResult {
  role: 'interviewer' | 'candidate';
  session_id: string;
  other_token?: string;
  other_role?: string;
}

export async function resolveToken(token: string): Promise<ResolveResult | null> {
  try {
    const response = await fetch(`/api/resolve/${token}`);
    const data = await response.json();
    if (!data.role) return null;
    return data as ResolveResult;
  } catch (error) {
    console.error('Error resolving token:', error);
    return null;
  }
}

export default function App() {
  return (
    <div className="app-container">
      <ToastContainer />
      <Routes>
        <Route path="/interview/:token" element={<InterviewPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/questions" replace />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="sessions" element={<SessionsListPage />} />
          <Route path="sessions/:id/report" element={<SessionReportPage />} />
          <Route path="assign" element={<SuperadminAssignPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}
