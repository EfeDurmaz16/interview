import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import InterviewPage from './pages/InterviewPage';

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

function CreateSessionRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createAndRedirect() {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.interviewer_token) {
          navigate(`/interview/${data.interviewer_token}`, { replace: true });
        } else {
          setError('Session oluşturulamadı.');
        }
      } catch {
        setError('Sunucuya bağlanılamadı.');
      }
    }
    createAndRedirect();
  }, [navigate]);

  if (error) return <div>{error}</div>;
  return <div>Yeni oturum oluşturuluyor...</div>;
}

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/interview/:token" element={<InterviewPage />} />
        <Route path="*" element={<CreateSessionRedirect />} />
      </Routes>
    </div>
  );
}
