import { useEffect, useState } from 'react';
import { Pill, X, Volume2, VolumeX, Check } from 'lucide-react';

/**
 * AlarmBanner
 * Shows a dismissable full-screen alarm when a dose is auto-dispensed.
 * Props:
 *   event      — { medication, log, compartment } | null
 *   onDismiss  — () => void
 *   onStop     — () => void (stop alarm sound without dismissing)
 *   muted      — bool
 *   onToggleMute — () => void
 */
export default function AlarmBanner({ event, onDismiss, onStop, muted, onToggleMute }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
    }
  }, [event]);

  if (!event || !visible) return null;

  const med = event.medication;
  const log = event.log;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(6,13,25,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Pulsing ring */}
      <div style={{
        position: 'absolute', width: 340, height: 340, borderRadius: '50%',
        border: `2px solid ${med.color || 'var(--cyan)'}`,
        opacity: 0.2,
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <div style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        border: `2px solid ${med.color || 'var(--cyan)'}`,
        opacity: 0.15,
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) 0.3s infinite',
      }} />

      <div style={{
        background: 'var(--card)', border: `1px solid ${med.color || 'var(--cyan)'}40`,
        borderRadius: 24, padding: '40px 36px', textAlign: 'center',
        maxWidth: 400, width: '100%', position: 'relative',
        boxShadow: `0 0 60px ${med.color || 'var(--cyan)'}30`,
        animation: 'fadeIn 0.35s ease',
      }}>
        {/* Top controls */}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: 7,
            display: 'flex', transition: 'var(--transition)',
          }}>
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button onClick={() => { setVisible(false); onDismiss(); }} title="Dismiss" style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: 7,
            display: 'flex', transition: 'var(--transition)',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: (med.color || 'var(--cyan)') + '22',
          border: `2px solid ${med.color || 'var(--cyan)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: `0 0 30px ${med.color || 'var(--cyan)'}40`,
        }}>
          <Pill size={34} color={med.color || 'var(--cyan)'} />
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: med.color || 'var(--cyan)', marginBottom: 10 }}>
          💊 Time to Take Your Medication
        </div>

        <h2 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.02em' }}>{med.name}</h2>

        <div style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 6 }}>
          {med.dosage}{med.unit}
        </div>

        {event.compartment && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '5px 14px', fontSize: 13,
            color: 'var(--text-muted)', marginBottom: 24,
          }}>
            Compartment <strong style={{ color: 'var(--text)' }}>{event.compartment}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
          <button onClick={() => { setVisible(false); onDismiss(); }} style={{
            flex: 1, border: 'none', borderRadius: 14, cursor: 'pointer', padding: '14px 20px',
            background: med.color || 'var(--cyan)', color: 'var(--bg)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 6px 20px ${med.color || 'var(--cyan)'}40`,
            transition: 'var(--transition)',
          }}>
            <Check size={17} /> Got it!
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          Auto-dispensed at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
