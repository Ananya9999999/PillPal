import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success'
            ? <CheckCircle2 size={16} color="var(--green)" />
            : <XCircle size={16} color="var(--red)" />
          }
          <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
