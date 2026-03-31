import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Medications from './pages/Medications';
import Schedule from './pages/Schedule';
import History from './pages/History';
import AuthPage from './pages/Auth';
import Toast from './components/Toast';
import AlarmBanner from './components/AlarmBanner';
import { useSSE } from './hooks/useSSE';
import { useAlarm } from './hooks/useAlarm';
import { createEventSource } from './api';
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";

export const AppContext = createContext({});
export const useApp = () => useContext(AppContext);

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pillpal_user')); } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [alarmEvent, setAlarmEvent] = useState(null);   // current dispense event
  const [muted, setMuted] = useState(() => localStorage.getItem('pillpal_muted') === '1');
  const [lastDispense, setLastDispense] = useState(null); // for dashboard live-feed

  const { playAlarm, stopAlarm, requestNotificationPermission, showNotification } = useAlarm();

  // ── Alarm sound preference ─────────────────────────────────────────────────
  const toggleMute = () => {
    setMuted(m => {
      localStorage.setItem('pillpal_muted', m ? '0' : '1');
      return !m;
    });
  };

  // ── Toast helper ───────────────────────────────────────────────────────────
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  // ── SSE — listen for auto-dispense events ──────────────────────────────────
  useSSE(!!user, {
    dispensed: (data) => {
      setAlarmEvent(data);
      setLastDispense(data);
      if (!muted) playAlarm(3);
      showNotification(
        `💊 Time for ${data.medication.name}`,
        `${data.medication.dosage}${data.medication.unit} — Compartment ${data.compartment}`,
        data.medication.color
      );
      toast(`💊 Auto-dispensed: ${data.medication.name}`, 'success');
    },
  });

const [firebaseAlert, setFirebaseAlert] = useState("");

useEffect(() => {
  const alertRef = ref(db, "pillpal/alert");

  onValue(alertRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      setFirebaseAlert(data);
      window.alert(data);
    }
  });
}, []);
  // ── Auth helpers ───────────────────────────────────────────────────────────
  const login = (token, userData) => {
    localStorage.setItem('pillpal_token', token);
    localStorage.setItem('pillpal_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pillpal_token');
    localStorage.removeItem('pillpal_user');
    setUser(null);
    setPage('dashboard');
  };

  if (!user) return (
    <AppContext.Provider value={{ toast }}>
      <AuthPage onLogin={login} />
      <Toast toasts={toasts} />
    </AppContext.Provider>
  );

  const pages = { dashboard: Dashboard, medications: Medications, schedule: Schedule, history: History };
  const PageComponent = pages[page] || Dashboard;

  return (
    <AppContext.Provider value={{ user, toast, setPage, lastDispense, muted, toggleMute }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar page={page} setPage={setPage} onLogout={logout} user={user} muted={muted} onToggleMute={toggleMute} />
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <PageComponent />
        </main>
      </div>
      <Toast toasts={toasts} />
      {firebaseAlert && (
        <div className="alert-box">
          {firebaseAlert}
        </div>
      )}
      <AlarmBanner
        event={alarmEvent}
        onDismiss={() => { stopAlarm(); setAlarmEvent(null); }}
        onStop={stopAlarm}
        muted={muted}
        onToggleMute={toggleMute}
      />
    </AppContext.Provider>
  );
}

