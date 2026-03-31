import { LayoutDashboard, Pill, CalendarClock, ScrollText, LogOut, Activity, ChevronRight, Volume2, VolumeX } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'history', label: 'History', icon: ScrollText },
];

export default function Sidebar({ page, setPage, onLogout, user, muted, onToggleMute }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'PP';

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '24px 16px', gap: 4, flexShrink: 0,
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px var(--cyan-glow)',
        }}>
          <Pill size={18} color="var(--bg)" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>PillPal</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Smart Dispenser</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px 8px' }}>Main Menu</div>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              alignItems: 'center', background: active ? 'var(--cyan-dim)' : 'transparent',
              border: 'none', borderRadius: 12, color: active ? 'var(--cyan)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', fontFamily: 'var(--font-body)', fontSize: 14,
              fontWeight: active ? 600 : 400, gap: 10, padding: '10px 12px',
              transition: 'var(--transition)', width: '100%',
              borderLeft: active ? '2px solid var(--cyan)' : '2px solid transparent',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
            </button>
          );
        })}
      </div>

      {/* Device Status */}
      <div style={{
        background: 'var(--card)', borderRadius: 12, padding: '12px 14px',
        border: '1px solid var(--border)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Activity size={13} color="var(--green)" />
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Device Status</span>
          <button onClick={onToggleMute} title={muted ? 'Unmute alarm' : 'Mute alarm'} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
            color: muted ? 'var(--red)' : 'var(--text-muted)', display: 'flex', borderRadius: 4,
            transition: 'var(--transition)',
          }}>
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>PILLPAL-001</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Connected · 87% battery</div>
      </div>

      {/* User */}
      <div style={{
        alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, display: 'flex', gap: 10, padding: '10px 12px',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: user?.avatar_color || 'var(--cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--bg)', flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
        </div>
        <button onClick={onLogout} title="Logout" style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex',
          transition: 'var(--transition)',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
