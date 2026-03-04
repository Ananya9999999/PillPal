import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Loader2, Filter, CheckCircle2, XCircle, SkipForward, X, Zap, RefreshCw } from 'lucide-react';
import { logs as logsApi, medications as medApi } from '../api';
import { useApp } from '../App';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  dispensed: { label: 'Dispensed', color: 'var(--cyan)',   bg: 'var(--cyan-dim)',   icon: Zap },
  taken:     { label: 'Taken',     color: 'var(--green)',  bg: 'var(--green-dim)',  icon: CheckCircle2 },
  skipped:   { label: 'Skipped',   color: 'var(--orange)', bg: 'var(--orange-dim)', icon: SkipForward },
  missed:    { label: 'Missed',    color: 'var(--red)',    bg: 'var(--red-dim)',    icon: XCircle },
};

export default function History() {
  const { toast, lastDispense } = useApp();
  const [data, setData] = useState({ logs: [], total: 0 });
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', medication_id: '' });

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.medication_id) params.medication_id = filter.medication_id;
      const [lRes, mRes] = await Promise.all([logsApi.getAll(params), medApi.getAll()]);
      setData(lRes.data);
      setMeds(mRes.data);
    } catch { toast('Failed to load history.', 'error'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-reload when a new dispense arrives from SSE
  useEffect(() => { if (lastDispense) load(); }, [lastDispense]);

  const markSkipped = async (logId) => {
    try {
      await logsApi.patch(logId, { status: 'skipped' });
      toast('Marked as skipped.');
      load();
    } catch { toast('Failed to update.', 'error'); }
  };

  // Group logs by date
  const grouped = data.logs.reduce((acc, log) => {
    const date = format(parseISO(log.dispensed_at), 'EEEE, MMMM d, yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Dispense History</h1>
          <p className="page-subtitle">{data.total} total event{data.total !== 1 ? 's' : ''} — all auto-logged by PillPal</p>
        </div>
        <button className="btn btn-ghost" onClick={load} title="Refresh">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Auto-dispense info banner */}
      <div style={{
        background: 'var(--cyan-dim)', border: '1px solid rgba(34,211,238,0.25)',
        borderRadius: 12, padding: '11px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Zap size={14} color="var(--cyan)" />
        <span style={{ fontSize: 13, color: 'var(--cyan)' }}>
          Doses are <strong>automatically logged</strong> by the PillPal scheduler at scheduled times. You can mark any dose as <strong>Skipped</strong> if it wasn't actually taken.
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}>
          <option value="">All Statuses</option>
          <option value="dispensed">Dispensed</option>
          <option value="taken">Taken</option>
          <option value="skipped">Skipped</option>
          <option value="missed">Missed</option>
        </select>
        <select value={filter.medication_id} onChange={e => setFilter(f => ({ ...f, medication_id: e.target.value }))}
          style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}>
          <option value="">All Medications</option>
          {meds.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {(filter.status || filter.medication_id) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', medication_id: '' })}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="spinner" color="var(--cyan)" />
        </div>
      ) : data.logs.length === 0 ? (
        <div className="empty-state">
          <ScrollText size={48} className="empty-icon" />
          <h3>No logs yet</h3>
          <p>Logs appear here automatically once your scheduled doses are dispensed</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([date, dayLogs]) => (
            <div key={date}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                {date}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {dayLogs.map((log, i) => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.dispensed;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                      borderBottom: i < dayLogs.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s',
                    }}>
                      {/* Color dot */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: log.color, flexShrink: 0 }} />

                      {/* Name + dose */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{log.medication_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {log.dosage}{log.unit}
                          {log.notes && log.notes !== 'Auto-dispensed by PillPal' && (
                            <span> · {log.notes}</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: cfg.bg, borderRadius: 20, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        <Icon size={11} />
                        {cfg.label}
                      </div>

                      {/* Time */}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                        {format(parseISO(log.dispensed_at), 'h:mm a')}
                      </div>

                      {/* Skip button — only for dispensed */}
                      {log.status === 'dispensed' && (
                        <button
                          onClick={() => markSkipped(log.id)}
                          title="Mark as skipped"
                          style={{
                            background: 'var(--orange-dim)', border: '1px solid rgba(251,146,60,0.2)',
                            borderRadius: 8, color: 'var(--orange)', cursor: 'pointer', fontSize: 11,
                            fontWeight: 600, padding: '4px 10px', flexShrink: 0,
                            transition: 'var(--transition)', fontFamily: 'var(--font-body)',
                          }}
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
