import { useEffect, useState } from 'react';
import { Plus, CalendarClock, Edit2, Trash2, X, Loader2, ToggleLeft, ToggleRight, Pill } from 'lucide-react';
import { schedules as schedApi, medications as medApi } from '../api';
import { useApp } from '../App';

const DAYS = [
  { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 7, label: 'Sun' },
];

function DayToggle({ selected, onChange }) {
  const days = selected ? selected.split(',').map(Number) : [];
  const toggle = id => {
    const next = days.includes(id) ? days.filter(d => d !== id) : [...days, id].sort((a, b) => a - b);
    onChange(next.join(','));
  };
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {DAYS.map(d => (
        <button key={d.id} type="button" onClick={() => toggle(d.id)} style={{
          width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
          background: days.includes(d.id) ? 'var(--cyan)' : 'var(--surface)',
          color: days.includes(d.id) ? 'var(--bg)' : 'var(--text-muted)',
          transition: 'var(--transition)',
        }}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

function ScheduleModal({ schedule, meds, onSave, onClose }) {
  const [form, setForm] = useState({
    medication_id: schedule?.medication_id || (meds[0]?.id ?? ''),
    time: schedule?.time || '08:00',
    days_of_week: schedule?.days_of_week || '1,2,3,4,5,6,7',
    compartment: schedule?.compartment || 1,
    dose_count: schedule?.dose_count || 1,
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...form, medication_id: parseInt(form.medication_id), compartment: parseInt(form.compartment), dose_count: parseInt(form.dose_count) });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{schedule ? 'Edit Schedule' : 'Add Schedule'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {meds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--text-muted)' }}>Please add a medication first before creating a schedule.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Got it</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Medication *</label>
              <select value={form.medication_id} onChange={set('medication_id')} required>
                {meds.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.dosage}{m.unit}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Time *</label>
                <input type="time" value={form.time} onChange={set('time')} required />
              </div>
              <div className="form-group">
                <label>Compartment (1–7)</label>
                <input type="number" min="1" max="7" value={form.compartment} onChange={set('compartment')} />
              </div>
            </div>
            <div className="form-group">
              <label>Days of Week</label>
              <DayToggle selected={form.days_of_week} onChange={v => setForm(f => ({ ...f, days_of_week: v }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Dose Count (pills per dose)</label>
              <input type="number" min="1" max="10" value={form.dose_count} onChange={set('dose_count')} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 size={14} className="spinner" /> : (schedule ? 'Save Changes' : 'Add Schedule')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule, onEdit, onDelete, onToggle }) {
  const activeDays = schedule.days_of_week ? schedule.days_of_week.split(',').map(Number) : [];
  return (
    <div className="card" style={{ opacity: schedule.active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          background: schedule.color + '22', borderRadius: 12,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Pill size={18} color={schedule.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{schedule.medication_name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{schedule.dosage}{schedule.unit} · {schedule.dose_count} pill{schedule.dose_count > 1 ? 's' : ''}/dose</div>
        </div>
        <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--cyan)', flexShrink: 0 }}>
          {schedule.time}
        </div>
      </div>

      {/* Days */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {DAYS.map(d => (
          <div key={d.id} style={{
            width: 32, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600,
            background: activeDays.includes(d.id) ? schedule.color + '22' : 'var(--surface)',
            color: activeDays.includes(d.id) ? schedule.color : 'var(--text-muted)',
          }}>
            {d.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>Compartment {schedule.compartment}</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onToggle(schedule)} title={schedule.active ? 'Disable' : 'Enable'}>
          {schedule.active ? <ToggleRight size={16} color="var(--green)" /> : <ToggleLeft size={16} />}
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(schedule)}><Edit2 size={13} /></button>
        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(schedule.id)}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

export default function Schedule() {
  const { toast } = useApp();
  const [scheds, setScheds] = useState([]);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = async () => {
    try {
      const [sRes, mRes] = await Promise.all([schedApi.getAll(), medApi.getAll()]);
      setScheds(sRes.data);
      setMeds(mRes.data);
    } catch { toast('Failed to load schedules.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async data => {
    try {
      if (modal && modal !== 'add') {
        await schedApi.update(modal.id, data);
        toast('Schedule updated!');
      } else {
        await schedApi.create(data);
        toast('Schedule added! ⏰');
      }
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save.', 'error');
      throw err;
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await schedApi.delete(id);
      toast('Schedule deleted.');
      setScheds(s => s.filter(x => x.id !== id));
    } catch { toast('Failed to delete.', 'error'); }
  };

  const handleToggle = async s => {
    try {
      await schedApi.update(s.id, { ...s, active: s.active ? 0 : 1 });
      toast(s.active ? 'Schedule paused.' : 'Schedule activated!');
      load();
    } catch { toast('Failed to update.', 'error'); }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">{scheds.filter(s => s.active).length} active reminder{scheds.filter(s => s.active).length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15} /> Add Schedule
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="spinner" color="var(--cyan)" />
        </div>
      ) : scheds.length === 0 ? (
        <div className="empty-state">
          <CalendarClock size={48} className="empty-icon" />
          <h3>No schedules yet</h3>
          <p>Create a schedule to get reminded when it's time to take your medication</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setModal('add')}>
            <Plus size={14} /> Add Schedule
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {scheds.map(s => (
            <ScheduleCard key={s.id} schedule={s} onEdit={setModal} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {modal && (
        <ScheduleModal
          schedule={modal === 'add' ? null : modal}
          meds={meds}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
