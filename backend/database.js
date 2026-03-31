const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running in production mode');
}

const DB_PATH = process.env.DB_PATH || '/tmp/pillpal.db';
console.log('📁 Database path:', DB_PATH);

let _rawDb = null;   
let db = null;      

function persist() {
  if (!_rawDb) return;
  try {
    const data = _rawDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

setInterval(persist, 3000);
process.on('exit', persist);
process.on('SIGINT', () => { persist(); process.exit(0); });
process.on('SIGTERM', () => { persist(); process.exit(0); });

function createShim(rawDb) {
  return {
    pragma: () => {},

    exec(sql) {
      rawDb.run(sql);
      persist();
    },

    prepare(sql) {
      return {
      
        run(...args) {
          const params = flattenParams(args);
          rawDb.run(sql, params);

          const res = rawDb.exec('SELECT last_insert_rowid()');
          const lastInsertRowid = res[0]?.values[0][0] ?? 0;
          persist();
          return { lastInsertRowid, changes: 1 };
        },

        get(...args) {
          const params = flattenParams(args);
          const stmt = rawDb.prepare(sql);
          try {
            stmt.bind(params);
            return stmt.step() ? stmt.getAsObject() : undefined;
          } finally {
            stmt.free();
          }
        },

        all(...args) {
          const params = flattenParams(args);
          const rows = [];
          const stmt = rawDb.prepare(sql);
          try {
            stmt.bind(params);
            while (stmt.step()) rows.push(stmt.getAsObject());
          } finally {
            stmt.free();
          }
          return rows;
        },
      };
    },
  };
}

function flattenParams(args) {
  if (args.length === 0) return [];

  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#22d3ee',
    created_at DATETIME DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    dosage REAL NOT NULL,
    unit TEXT DEFAULT 'mg',
    color TEXT DEFAULT '#22d3ee',
    pill_type TEXT DEFAULT 'tablet',
    notes TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 10,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    time TEXT NOT NULL,
    days_of_week TEXT DEFAULT '1,2,3,4,5,6,7',
    compartment INTEGER DEFAULT 1,
    dose_count INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (medication_id) REFERENCES medications(id)
  );
  CREATE TABLE IF NOT EXISTS dispense_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    schedule_id INTEGER,
    status TEXT DEFAULT 'taken',
    notes TEXT DEFAULT '',
    dispensed_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (medication_id) REFERENCES medications(id)
  );
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    device_id TEXT UNIQUE,
    device_name TEXT DEFAULT 'PillPal Device',
    connected INTEGER DEFAULT 0,
    battery_level INTEGER DEFAULT 100,
    compartment_status TEXT DEFAULT '{}',
    last_seen DATETIME DEFAULT (datetime('now')),
    created_at DATETIME DEFAULT (datetime('now'))
);
`;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _rawDb = new SQL.Database(buf);
    console.log('💾 Loaded existing database from disk');
  } else {
    _rawDb = new SQL.Database();
    console.log('🆕 Created new database');
  }

  db = createShim(_rawDb);
  db.exec(SCHEMA);
  console.log('✅ Database initialised successfully');
}

module.exports = { get db() { return db; }, initDB };
