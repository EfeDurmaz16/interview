import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { resolveToken, type ResolveResult } from '../App';
import InterviewerView from './InterviewerPage';
import IntervieweeView from './IntervieweePage';
import InterviewSetupPage from './InterviewSetupPage';

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [resolveData, setResolveData] = useState<ResolveResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [hasSessionQuestions, setHasSessionQuestions] = useState<boolean | null>(null);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const result = await resolveToken(token);
      setResolveData(result);

      if (result?.session_id) {
        try {
          const [sessionRes, questionsRes] = await Promise.all([
            fetch(`/api/sessions/${result.session_id}`),
            fetch(`/api/sessions/${result.session_id}/questions`),
          ]);
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            setSessionStatus(sessionData?.status ?? 'waiting');
          }
          if (questionsRes.ok) {
            const questions = await questionsRes.json();
            setHasSessionQuestions(Array.isArray(questions) && questions.length > 0);
          } else {
            setHasSessionQuestions(false);
          }
        } catch {
          setSessionStatus('waiting');
          setHasSessionQuestions(false);
        }
      }

      setIsLoading(false);
    };
    fetchRole();
  }, [token]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--jotform-text)',
      }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const role = resolveData?.role ?? null;

  if (!role) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--jotform-text)',
      }}>
        <h1 style={{ fontSize: '1.5rem' }}>Geçersiz veya süresi dolmuş bağlantı</h1>
        <p style={{ color: 'var(--jotform-text-light)' }}>
          Bu mülakat bağlantısı geçersiz. Lütfen size gönderilen bağlantıyı kontrol edin.
        </p>
      </div>
    );
  }

  const handleEndSession = () => {
    navigate('/');
  };

  // Interviewer flow: show setup if session is waiting and no questions assigned yet
  if (role === 'interviewer') {
    const candidateToken = resolveData?.other_role === 'candidate' ? resolveData.other_token : undefined;
    const needsSetup = sessionStatus === 'waiting' && !hasSessionQuestions && !setupDone;

    if (needsSetup) {
      return (
        <InterviewSetupPage
          sessionId={resolveData!.session_id}
          candidateToken={candidateToken}
          onStartInterview={() => {
            setSetupDone(true);
            setHasSessionQuestions(true);
          }}
        />
      );
    }

    return <InterviewerView onEndSession={handleEndSession} candidateToken={candidateToken} sessionId={resolveData!.session_id} />;
  }

  return <IntervieweeView sessionId={resolveData!.session_id} />;
}
