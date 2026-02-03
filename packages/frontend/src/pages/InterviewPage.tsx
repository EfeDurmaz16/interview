import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { resolveToken, type ResolveResult } from '../App';
import InterviewerView from './InterviewerPage';
import IntervieweeView from './IntervieweePage';

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [resolveData, setResolveData] = useState<ResolveResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      const result = await resolveToken(token);
      setResolveData(result);
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
    if (window.confirm('Mülakatı sonlandırmak istediğinize emin misiniz?')) {
      navigate('/');
    }
  };

  if (role === 'interviewer') {
    const candidateToken = resolveData?.other_role === 'candidate' ? resolveData.other_token : undefined;
    return <InterviewerView onEndSession={handleEndSession} candidateToken={candidateToken} sessionId={resolveData!.session_id} />;
  }

  return <IntervieweeView sessionId={resolveData!.session_id} />;
}
