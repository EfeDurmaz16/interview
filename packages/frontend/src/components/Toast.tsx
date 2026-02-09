import { useEffect, useState } from 'react';

type ToastMessage = { id: number; text: string };

let nextId = 0;
let lastText = '';
let lastTime = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

export function showToast(text: string) {
  const now = Date.now();
  if (text === lastText && now - lastTime < 2000) return;
  lastText = text;
  lastTime = now;
  const msg = { id: ++nextId, text };
  listeners.forEach((fn) => fn(msg));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 4000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#F23A3C',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(242, 58, 60, 0.3)',
            animation: 'toast-slide-in 0.25s ease-out',
            pointerEvents: 'auto',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
