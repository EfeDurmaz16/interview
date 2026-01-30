import { useParams, useNavigate } from 'react-router-dom';
import { resolveRole } from '../App';
import InterviewerView from './InterviewerPage';
import IntervieweeView from './IntervieweePage';

export default function InterviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const role = resolveRole(token ?? '');

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
    return <InterviewerView onEndSession={handleEndSession} />;
  }

  return <IntervieweeView />;
}
