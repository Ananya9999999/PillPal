const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbModule = require('./database');
const handler = { get(_,p){ const d=dbModule.db; if(!d) throw new Error('DB not ready'); const v=d[p]; return typeof v==='function'?v.bind(d):v; } };
const db = new Proxy({}, handler);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pillpal-super-secret-key-2024';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://pillpal-pro.netlify.app',
    'https://69cb7e2da6a79f5a9bc1435f--pillpal-pro.netlify.app'
  ]
}));
app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const result = db.prepare('INSERT INTO users (name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?)').run(name, email, hash, color);
  
  // Create default device status
  db.prepare('INSERT INTO device_status (user_id) VALUES (?)').run(result.lastInsertRowid);

  const user = { id: result.lastInsertRowid, name, email, avatar_color: color };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });

  const payload = { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── MEDICATIONS ──────────────────────────────────────────────────────────────
app.get('/api/medications', auth, (req, res) => {
  const meds = db.prepare('SELECT * FROM medications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(meds);
});

app.post('/api/medications', auth, (req, res) => {
  const { name, dosage, unit, color, pill_type, notes, stock, low_stock_alert } = req.body;
  if (!name || dosage === undefined)
    return res.status(400).json({ error: 'Medication name and dosage are required.' });

  const result = db.prepare(
    `INSERT INTO medications (user_id, name, dosage, unit, color, pill_type, notes, stock, low_stock_alert)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, name, dosage, unit || 'mg', color || '#22d3ee', pill_type || 'tablet', notes || '', stock || 0, low_stock_alert || 10);

  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(med);
});

app.put('/api/medications/:id', auth, (req, res) => {
  const { name, dosage, unit, color, pill_type, notes, stock, low_stock_alert, active } = req.body;
  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  db.prepare(
    `UPDATE medications SET name=?, dosage=?, unit=?, color=?, pill_type=?, notes=?, stock=?, low_stock_alert=?, active=? WHERE id=?`
  ).run(
    name ?? med.name, dosage ?? med.dosage, unit ?? med.unit,
    color ?? med.color, pill_type ?? med.pill_type, notes ?? med.notes,
    stock ?? med.stock, low_stock_alert ?? med.low_stock_alert,
    active !== undefined ? active : med.active, req.params.id
  );

  const updated = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/medications/:id', auth, (req, res) => {
  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });
  db.prepare('DELETE FROM medications WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Medication deleted.' });
});

// ─── SCHEDULES ────────────────────────────────────────────────────────────────
app.get('/api/schedules', auth, (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.pill_type
    FROM schedules s
    JOIN medications m ON s.medication_id = m.id
    WHERE m.user_id = ?
    ORDER BY s.time ASC
  `).all(req.user.id);
  res.json(schedules);
});

app.post('/api/schedules', auth, (req, res) => {
  const { medication_id, time, days_of_week, compartment, dose_count } = req.body;
  if (!medication_id || !time)
    return res.status(400).json({ error: 'Medication and time are required.' });

  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(medication_id, req.user.id);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  const result = db.prepare(
    `INSERT INTO schedules (medication_id, time, days_of_week, compartment, dose_count)
     VALUES (?, ?, ?, ?, ?)`
  ).run(medication_id, time, days_of_week || '1,2,3,4,5,6,7', compartment || 1, dose_count || 1);

  const schedule = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.pill_type
    FROM schedules s JOIN medications m ON s.medication_id = m.id WHERE s.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(schedule);
});

app.put('/api/schedules/:id', auth, (req, res) => {
  const { time, days_of_week, compartment, dose_count, active } = req.body;
  const schedule = db.prepare(`
    SELECT s.* FROM schedules s JOIN medications m ON s.medication_id = m.id
    WHERE s.id = ? AND m.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });

  db.prepare(`UPDATE schedules SET time=?, days_of_week=?, compartment=?, dose_count=?, active=? WHERE id=?`)
    .run(
      time ?? schedule.time, days_of_week ?? schedule.days_of_week,
      compartment ?? schedule.compartment, dose_count ?? schedule.dose_count,
      active !== undefined ? active : schedule.active, req.params.id
    );

  const updated = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.pill_type
    FROM schedules s JOIN medications m ON s.medication_id = m.id WHERE s.id = ?
  `).get(req.params.id);
  res.json(updated);
});

app.delete('/api/schedules/:id', auth, (req, res) => {
  const schedule = db.prepare(`
    SELECT s.* FROM schedules s JOIN medications m ON s.medication_id = m.id
    WHERE s.id = ? AND m.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── DISPENSE LOGS ────────────────────────────────────────────────────────────
app.get('/api/logs', auth, (req, res) => {
  const { limit = 50, offset = 0, medication_id } = req.query;
  let query = `
    SELECT l.*, m.name AS medication_name, m.dosage, m.unit, m.color
    FROM dispense_logs l JOIN medications m ON l.medication_id = m.id
    WHERE m.user_id = ?
  `;
  const params = [req.user.id];
  if (medication_id) { query += ' AND l.medication_id = ?'; params.push(medication_id); }
  query += ' ORDER BY l.dispensed_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const logs = db.prepare(query).all(...params);
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM dispense_logs l
    JOIN medications m ON l.medication_id = m.id WHERE m.user_id = ?
  `).get(req.user.id).count;

  res.json({ logs, total });
});

app.post('/api/logs', auth, (req, res) => {
  const { medication_id, schedule_id, status, notes } = req.body;
  if (!medication_id) return res.status(400).json({ error: 'Medication ID is required.' });

  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(medication_id, req.user.id);
  if (!med) return res.status(404).json({ error: 'Medication not found.' });

  // Decrease stock if dispensed
  if (status === 'taken' || !status) {
    db.prepare('UPDATE medications SET stock = MAX(0, stock - 1) WHERE id = ?').run(medication_id);
  }

  const result = db.prepare(
    `INSERT INTO dispense_logs (medication_id, schedule_id, status, notes) VALUES (?, ?, ?, ?)`
  ).run(medication_id, schedule_id || null, status || 'taken', notes || '');

  const log = db.prepare(`
    SELECT l.*, m.name AS medication_name, m.dosage, m.unit, m.color
    FROM dispense_logs l JOIN medications m ON l.medication_id = m.id WHERE l.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(log);
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', auth, (req, res) => {
  const totalMeds = db.prepare('SELECT COUNT(*) AS count FROM medications WHERE user_id = ? AND active = 1').get(req.user.id).count;

  const activeSchedules = db.prepare(`
    SELECT COUNT(*) AS count FROM schedules s
    JOIN medications m ON s.medication_id = m.id
    WHERE m.user_id = ? AND s.active = 1 AND m.active = 1
  `).get(req.user.id).count;

  const todayLogs = db.prepare(`
    SELECT COUNT(*) AS count FROM dispense_logs l
    JOIN medications m ON l.medication_id = m.id
    WHERE m.user_id = ? AND DATE(l.dispensed_at) = DATE('now')
  `).get(req.user.id).count;

  const adherenceRow = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) AS taken
    FROM dispense_logs l JOIN medications m ON l.medication_id = m.id
    WHERE m.user_id = ? AND l.dispensed_at >= DATE('now', '-30 days')
  `).get(req.user.id);
  const adherence = adherenceRow.total > 0
    ? Math.round((adherenceRow.taken / adherenceRow.total) * 100) : 100;

  const upcoming = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.pill_type
    FROM schedules s JOIN medications m ON s.medication_id = m.id
    WHERE m.user_id = ? AND s.active = 1 AND m.active = 1
    ORDER BY s.time ASC LIMIT 6
  `).all(req.user.id);

  const recentLogs = db.prepare(`
    SELECT l.*, m.name AS medication_name, m.color
    FROM dispense_logs l JOIN medications m ON l.medication_id = m.id
    WHERE m.user_id = ? ORDER BY l.dispensed_at DESC LIMIT 5
  `).all(req.user.id);

  const lowStock = db.prepare(`
    SELECT * FROM medications WHERE user_id = ? AND stock <= low_stock_alert AND stock > 0 AND active = 1
  `).all(req.user.id);

  const weeklyAdherence = [];
  for (let i = 6; i >= 0; i--) {
    const row = db.prepare(`
      SELECT COUNT(*) AS taken, DATE('now', ?) AS day
      FROM dispense_logs l JOIN medications m ON l.medication_id = m.id
      WHERE m.user_id = ? AND DATE(l.dispensed_at) = DATE('now', ?) AND l.status = 'taken'
    `).get(`-${i} days`, req.user.id, `-${i} days`);
    weeklyAdherence.push({ day: row.day, taken: row.taken });
  }

  res.json({ totalMeds, activeSchedules, todayLogs, adherence, upcoming, recentLogs, lowStock, weeklyAdherence });
});

// ─── DEVICE STATUS ────────────────────────────────────────────────────────────
app.get('/api/device', auth, (req, res) => {
  let device = db.prepare('SELECT * FROM device_status WHERE user_id = ?').get(req.user.id);
  if (!device) {
    db.prepare('INSERT INTO device_status (user_id) VALUES (?)').run(req.user.id);
    device = db.prepare('SELECT * FROM device_status WHERE user_id = ?').get(req.user.id);
  }
  res.json(device);
});

app.put('/api/device', auth, (req, res) => {
  const { connected, battery_level, compartment_status } = req.body;
  db.prepare(`
    UPDATE device_status SET connected=?, battery_level=?, compartment_status=?, last_seen=CURRENT_TIMESTAMP
    WHERE user_id=?
  `).run(
    connected !== undefined ? connected : 0,
    battery_level || 100,
    compartment_status ? JSON.stringify(compartment_status) : '{}',
    req.user.id
  );
  res.json({ success: true });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PillPal API is running', timestamp: new Date().toISOString() });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
dbModule.initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n💊 PillPal Backend running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      const msUntil = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();
      setTimeout(() => {
        runScheduler();
        setInterval(runScheduler, 15000);
        console.log('⏱️  Auto-dispense scheduler started');
      }, msUntil);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialise database:', err);
    process.exit(1);
  });
// ─── PATCH LOG STATUS ─────────────────────────────────────────────────────────
app.patch('/api/logs/:id', auth, (req, res) => {
  const { status } = req.body;
  if (!['skipped', 'dispensed'].includes(status))
    return res.status(400).json({ error: 'Status must be dispensed or skipped.' });
  const log = db.prepare(`
    SELECT l.* FROM dispense_logs l
    JOIN medications m ON l.medication_id = m.id
    WHERE l.id = ? AND m.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!log) return res.status(404).json({ error: 'Log not found.' });
  db.prepare('UPDATE dispense_logs SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ─── NEXT UPCOMING DOSE ───────────────────────────────────────────────────────
app.get('/api/next-dose', auth, (req, res) => {
  const now = new Date();
  const todayDay = now.getDay() === 0 ? 7 : now.getDay();
  const currentTime = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const schedules = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.pill_type
    FROM schedules s JOIN medications m ON s.medication_id = m.id
    WHERE m.user_id = ? AND s.active = 1 AND m.active = 1
    ORDER BY s.time ASC
  `).all(req.user.id);
  let next = schedules.find(s => {
    const days = s.days_of_week.split(',').map(Number);
    return days.includes(todayDay) && s.time > currentTime;
  }) || schedules.find(s => {
    const days = s.days_of_week.split(',').map(Number);
    const tomorrow = todayDay === 7 ? 1 : todayDay + 1;
    return days.includes(tomorrow);
  }) || schedules[0];
  res.json(next || null);
});

// ─── SSE ENDPOINT ─────────────────────────────────────────────────────────────
const sseClients = new Map();
app.get('/api/events', (req, res) => {
  // EventSource can't send headers — accept token via query param too
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).end();
  let reqUser;
  try { reqUser = require('jsonwebtoken').verify(token, JWT_SECRET); }
  catch { return res.status(401).end(); }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  const uid = reqUser.id;
  if (!sseClients.has(uid)) sseClients.set(uid, new Set());
  sseClients.get(uid).add(res);
  req.on('close', () => { clearInterval(heartbeat); sseClients.get(uid)?.delete(res); });
});

function pushEvent(userId, event, data) {
  const clients = sseClients.get(userId);
  if (!clients?.size) return;
  const payload = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
  clients.forEach(res => res.write(payload));
}

// ─── AUTO-DISPENSE SCHEDULER ──────────────────────────────────────────────────
function runScheduler() {
  const now = new Date();
  const currentTime =
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0');

  const todayDay = now.getDay() === 0 ? 7 : now.getDay();
  const todayDate = now.toISOString().split('T')[0];

  const due = db.prepare(`
    SELECT s.*, m.name AS medication_name, m.dosage, m.unit, m.color, m.user_id
    FROM schedules s
    JOIN medications m ON s.medication_id = m.id
    WHERE s.active = 1 AND m.active = 1
      AND s.time <= ?
  `).all(currentTime);

  for (const s of due) {
    const days = s.days_of_week.split(',').map(Number);
    if (!days.includes(todayDay)) continue;

    const already = db.prepare(`
      SELECT id FROM dispense_logs
      WHERE schedule_id = ?
      AND DATE(dispensed_at) = ?
    `).get(s.id, todayDate);

    if (already) continue;

    const result = db.prepare(`
      INSERT INTO dispense_logs
      (medication_id, schedule_id, status, notes)
      VALUES (?, ?, 'dispensed', 'Auto-dispensed by PillPal')
    `).run(s.medication_id, s.id);

    db.prepare(`
      UPDATE medications
      SET stock = MAX(0, stock - ?)
      WHERE id = ?
    `).run(s.dose_count || 1, s.medication_id);

    const log = db.prepare(`
      SELECT l.*, m.name AS medication_name,
      m.dosage, m.unit, m.color
      FROM dispense_logs l
      JOIN medications m ON l.medication_id = m.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    console.log(`💊 [${currentTime}] Auto-dispensed: ${s.medication_name}`);

    pushEvent(s.user_id, 'dispensed', {
      log,
      medication: {
        name: s.medication_name,
        dosage: s.dosage,
        unit: s.unit,
        color: s.color
      },
      compartment: s.compartment
    });
  }
}