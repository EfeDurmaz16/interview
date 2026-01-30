import { useState, useEffect } from 'react';

interface HeaderProps {
  candidateName?: string;
  showTimer?: boolean;
  showEndSession?: boolean;
  onEndSession?: () => void;
}

export default function Header({ candidateName, showTimer = true, showEndSession, onEndSession }: HeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!showTimer) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [showTimer]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <header className="header">
      <div className="header__brand">
        <img
          className="header__logo"
          src="https://cdn.jotfor.ms/assets/resources/svg/jotform-logo-transparent-W.svg"
          alt="Jotform"
          style={{ width: 120, height: 30 }}
        />
        <span className="header__title">Code Interview Platform</span>
      </div>
      <div className="header__meta">
        {candidateName && <span className="header__candidate">{candidateName}</span>}
        {showTimer && <span className="header__timer">{mm}:{ss}</span>}
        {showEndSession && (
          <button
            className="btn"
            onClick={onEndSession}
            style={{
              background: 'var(--jotform-error)',
              color: 'white',
              fontSize: '0.8125rem',
              padding: '0.375rem 1rem',
            }}
          >
            End Session
          </button>
        )}
      </div>
    </header>
  );
}
