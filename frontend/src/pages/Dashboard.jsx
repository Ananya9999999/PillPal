import { useEffect, useState } from 'react';
import { Pill, CalendarClock, CheckCircle2, TrendingUp, AlertTriangle, Clock, Loader2, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboard, logs } from '../api';
import { useApp } from '../App';
import { format, parseISO } from 'date-fns';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function UpcomingDose({ schedule }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: schedule.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Pill size={14} color={schedule.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {schedule.medication_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{schedule.dosage}{schedule.unit} · Compartment {schedule.compartment}</div>
      </div>
      <div style={{
        fontSize: 12, color: 'var(--cyan)', fontWeight: 600,
        background: 'var(--cyan-dim)', padding: '3px 10px', borderRadius: 20,
      }}>
        {schedule.time}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{payload[0].value} doses</div>
    </div>
  );
  return null;
};

export default function Dashboard() {
  const { user, toast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.get()
      .then(r => setData(r.data))
      .catch(() => toast('Failed to load dashboard.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={32} className="spinner" color="var(--cyan)" />
    </div>
  );

  const chartData = (data?.weeklyAdherence || []).map(d => ({
    day: DAY_LABELS[new Date(d.day + 'T00:00:00').getDay()],
    taken: d.taken,
  }));

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your medication overview for today, {format(now, 'MMMM d, yyyy')}</p>
        </div>
        <div style={{ background: 'var(--cyan-dim)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Zap size={14} color="var(--cyan)" />
          <span style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 600 }}>IoT Connected</span>
        </div>
      </div>

      {/* Low stock alert */}
      {data?.lowStock?.length > 0 && (
        <div style={{
          background: 'var(--orange-dim)', border: '1px solid rgba(251,146,60,0.3)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} color="var(--orange)" />
          <span style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 500 }}>
            Low stock alert: {data.lowStock.map(m => m.name).join(', ')} — please refill soon.
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={Pill} label="Active Medications" value={data?.totalMeds ?? 0} sub="Currently tracked" color="var(--cyan)" />
        <StatCard icon={CalendarClock} label="Active Schedules" value={data?.activeSchedules ?? 0} sub="Recurring doses" color="var(--violet)" />
        <StatCard icon={CheckCircle2} label="Taken Today" value={data?.todayLogs ?? 0} sub="Doses logged today" color="var(--green)" />
        <StatCard icon={TrendingUp} label="Adherence (30d)" value={`${data?.adherence ?? 100}%`} sub="Last 30 days" color={data?.adherence >= 80 ? 'var(--green)' : 'var(--orange)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Weekly Chart */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Weekly Activity</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Doses taken over the last 7 days</p>
          {chartData.some(d => d.taken > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="taken" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? 'var(--cyan)' : 'rgba(34,211,238,0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity logged this week yet.</p>
            </div>
          )}
        </div>

        {/* Upcoming doses */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 2 }}>Upcoming Doses</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scheduled for today</p>
            </div>
            <Clock size={16} color="var(--text-muted)" />
          </div>
          {data?.upcoming?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.upcoming.map(s => <UpcomingDose key={s.id} schedule={s} />)}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <CalendarClock size={28} className="empty-icon" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No schedules set up yet.</p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Recent Activity</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Last dispensed medications</p>
          {data?.recentLogs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.recentLogs.map((log, i) => (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < data.recentLogs.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{log.medication_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {log.dosage}{log.unit}
                    </span>
                  </div>
                  <span className={`badge badge-${log.status === 'taken' ? 'green' : log.status === 'skipped' ? 'orange' : 'cyan'}`}>
                    {log.status}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {format(parseISO(log.dispensed_at), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity logged yet. Start tracking your medications!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
