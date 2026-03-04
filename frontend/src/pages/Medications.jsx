import { useEffect, useState } from 'react';
import { Plus, Pill, Edit2, Trash2, X, Loader2, Package, AlertTriangle } from 'lucide-react';
import { medications as medApi } from '../api';
import { useApp } from '../App';

const COLORS = ['#22d3ee','#a78bfa','#34d399','#fb923c','#f472b6','#60a5fa','#fbbf24','#f87171'];
const PILL_TYPES = ['tablet','capsule','liquid','injection','patch','inhaler','drops'];
const UNITS = ['mg','mcg','g','ml','IU','%','units'];

function MedModal({ med, meds, onSave, onClose }) {
  const [form, setForm] = useState({
    name: med?.name || '', dosage: med?.dosage || '', unit: med?.unit || 'mg',
    color: med?.color || '#22d3ee', pill_type: med?.pill_type || 'tablet',
    notes: med?.notes || '', stock: med?.stock || 0, low_stock_alert: med?.low_stock_alert || 10,
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ ...form, dosage: parseFloat(form.dosage), stock: parseInt(form.stock), low_stock_alert: parseInt(form.low_stock_alert) });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>{med ? 'Edit Medication' : 'Add Medication'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Medication Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Metformin" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Dosage *</label>
              <input type="number" step="0.1" min="0" value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500" required />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={form.unit} onChange={set('unit')}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Pill Type</label>
              <select value={form.pill_type} onChange={set('pill_type')}>
                {PILL_TYPES.map(t => <option key={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Current Stock</label>
              <input type="number" min="0" value={form.stock} onChange={set('stock')} />
            </div>
          </div>
          <div className="form-group">
            <label>Color</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                  outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                  boxShadow: form.color === c ? `0 0 10px ${c}80` : 'none',
                  transition: 'var(--transition)', transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Take with food, avoid grapefruit..." style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={14} className="spinner" /> : (med ? 'Save Changes' : 'Add Medication')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MedCard({ med, onEdit, onDelete }) {
  const stockPct = med.low_stock_alert > 0 ? (med.stock / (med.low_stock_alert * 3)) * 100 : 100;
  const isLow = med.stock > 0 && med.stock <= med.low_stock_alert;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: med.color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Pill size={20} color={med.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{med.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {med.dosage}{med.unit} · {med.pill_type}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(med)}><Edit2 size={13} /></button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(med.id)}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Stock bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Package size={11} /> Stock
            {isLow && <span style={{ color: 'var(--orange)', fontSize: 11 }}>· Low!</span>}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: isLow ? 'var(--orange)' : 'var(--text-dim)' }}>
            {med.stock} pills
          </span>
        </div>
        <div style={{ height: 5, background: 'var(--surface)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 10,
            background: isLow ? 'var(--orange)' : med.color,
            width: `${Math.min(100, Math.max(2, stockPct))}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {med.notes && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 8, padding: '6px 10px' }}>
          {med.notes}
        </div>
      )}
    </div>
  );
}

export default function Medications() {
  const { toast } = useApp();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | med object

  const load = () => {
    medApi.getAll()
      .then(r => setMeds(r.data))
      .catch(() => toast('Failed to load medications.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async data => {
    try {
      if (modal && modal !== 'add') {
        await medApi.update(modal.id, data);
        toast('Medication updated!');
      } else {
        await medApi.create(data);
        toast('Medication added! 💊');
      }
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save.', 'error');
      throw err;
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this medication and all its schedules?')) return;
    try {
      await medApi.delete(id);
      toast('Medication deleted.');
      setMeds(m => m.filter(x => x.id !== id));
    } catch {
      toast('Failed to delete.', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Medications</h1>
          <p className="page-subtitle">{meds.length} medication{meds.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>
          <Plus size={15} /> Add Medication
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="spinner" color="var(--cyan)" />
        </div>
      ) : meds.length === 0 ? (
        <div className="empty-state">
          <Pill size={48} className="empty-icon" />
          <h3>No medications yet</h3>
          <p>Add your first medication to start tracking your health</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setModal('add')}>
            <Plus size={14} /> Add Medication
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {meds.map(m => (
            <MedCard key={m.id} med={m} onEdit={setModal} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal && (
        <MedModal
          med={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
