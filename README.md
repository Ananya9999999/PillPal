# 💊 PillPal — Smart Pill Dispenser App

A full-stack IoT-enabled medication management application with real-time tracking, scheduling, and adherence analytics.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Recharts, Lucide    |
| Backend  | Node.js, Express.js                 |
| Database | SQLite (via better-sqlite3)         |
| Auth     | JWT + bcryptjs                      |

## Features

- 🔐 **User Authentication** — Secure register/login with JWT
- 💊 **Medication Management** — Add, edit, delete medications with color coding, stock tracking & low-stock alerts
- ⏰ **Schedule Management** — Set dosing times, days of week, compartment assignments
- 📊 **Dashboard** — Real-time stats, weekly adherence chart, upcoming doses
- 📋 **History & Logs** — Track every dose with status (taken/skipped/missed), filter & search
- 📡 **IoT Device Status** — Device connectivity, battery level, compartment status
- 🎨 **Beautiful Dark UI** — Polished, modern design with smooth animations

## Project Structure

```
pillpal/
├── backend/
│   ├── server.js       # Express API (all routes)
│   ├── database.js     # SQLite setup & schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth.jsx        # Login & Register
│   │   │   ├── Dashboard.jsx   # Overview & stats
│   │   │   ├── Medications.jsx # Medication CRUD
│   │   │   ├── Schedule.jsx    # Schedule CRUD
│   │   │   └── History.jsx     # Dose logs
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Toast.jsx
│   │   ├── App.jsx
│   │   ├── api.js      # Axios API client
│   │   └── index.css   # Global design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm start
# API running at http://localhost:5000
```

For development with auto-reload:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### 3. Open the App

Navigate to **http://localhost:5173** in your browser.

## API Endpoints

### Auth
| Method | Endpoint              | Description       |
|--------|-----------------------|-------------------|
| POST   | /api/auth/register    | Create account    |
| POST   | /api/auth/login       | Sign in           |
| GET    | /api/auth/me          | Get current user  |

### Medications
| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| GET    | /api/medications        | List all medications     |
| POST   | /api/medications        | Add medication           |
| PUT    | /api/medications/:id    | Update medication        |
| DELETE | /api/medications/:id    | Delete medication        |

### Schedules
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | /api/schedules        | List all schedules       |
| POST   | /api/schedules        | Create schedule          |
| PUT    | /api/schedules/:id    | Update schedule          |
| DELETE | /api/schedules/:id    | Delete schedule          |

### Logs
| Method | Endpoint    | Description              |
|--------|-------------|--------------------------|
| GET    | /api/logs   | Get history (paginated)  |
| POST   | /api/logs   | Log a dose               |

### Dashboard & Device
| Method | Endpoint        | Description            |
|--------|-----------------|------------------------|
| GET    | /api/dashboard  | Stats & overview       |
| GET    | /api/device     | IoT device status      |
| PUT    | /api/device     | Update device status   |

## Environment Variables (Optional)

Create `backend/.env`:
```
PORT=5000
JWT_SECRET=your-super-secret-key
```

## Database

SQLite database is auto-created at `backend/pillpal.db` on first run. No setup required.

## IoT Integration

The `/api/device` endpoint accepts status updates from your IoT hardware:
```json
{
  "connected": 1,
  "battery_level": 87,
  "compartment_status": {
    "1": "full", "2": "low", "3": "empty"
  }
}
```

Send a `PUT /api/device` request with your `Authorization: Bearer <token>` header from the hardware.
