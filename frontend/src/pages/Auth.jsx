import { useState } from 'react';
import { Pill, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { auth } from '../api';
import { useApp } from '../App';

export default function AuthPage({ onLogin }) {
  const { toast } = useApp();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const fn = mode === 'login' ? auth.login : auth.register;
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await fn(payload);
      toast(`Welcome${mode === 'register' ? ', ' + data.user.name : ' back'}! 💊`);
      onLogin(data.token, data.user);
    } catch (err) {
      toast(err.response?.data?.error || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        top: -100, left: -100, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
        bottom: 0, right: 0, pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: 'var(--cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 0 40px var(--cyan-glow)',
          }}>
            <Pill size={30} color="var(--bg)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 34, marginBottom: 6, letterSpacing: '-0.02em' }}>PillPal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your smart medication companion</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--surface)', borderRadius: 10,
            padding: 4, marginBottom: 28, gap: 4,
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600,
                padding: '8px 0', transition: 'var(--transition)',
                background: mode === m ? 'var(--card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                textTransform: 'capitalize',
              }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              </div>
            )}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" required />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={set('password')}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                  required style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', padding: 4,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
              {loading
                ? <Loader2 size={16} className="spinner" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
          Secure · Private · IoT-Enabled
        </p>
      </div>
    </div>
  );
}
