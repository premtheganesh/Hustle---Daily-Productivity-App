# ⚡ Hustle

A personal productivity app to track your daily routine, manage tasks, and stay consistent every single day.

## Features

- **Daily Routine** — Routine tasks per day type (weekday / Saturday / Sunday), tap to complete, drag to reorder
- **Tasks** — One-off tasks with priority levels and due dates, split into "Due Today" and "Other Tasks"
- **Homepage Dashboard** — Daily progress ring, streak, XP level, today's routine + due tasks at a glance
- **Focus** — Goals with milestones + Vision Board in one page
- **Analytics** — 7/14/30-day XP and completion charts
- **Journal** — Daily journaling with date navigation
- **Weekly Summary** — Week-by-week breakdown of completions and XP
- **Quick Notes** — Fast note capture, any time
- **Smart Notifications** — 3 daily push notifications (morning briefing, evening check-in, night wrap-up) pulling from your actual tasks
- **XP + Levels + Badges** — Earn XP for completing tasks, level up, unlock streak badges
- **PWA** — Installable on home screen (Android/iOS), works offline for static assets

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Animations | Framer Motion |
| State | Zustand |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (frontend) + Railway (backend) |

## Project Structure

```
hustle/
├── frontend/
│   ├── src/
│   │   ├── pages/          # 9 page components
│   │   ├── components/     # 8 reusable components
│   │   ├── store/          # Zustand app store
│   │   ├── utils/          # API client + helpers
│   │   └── styles/         # Global CSS variables (theme.css)
│   └── public/             # PWA manifest, service worker, icons
└── backend/
    └── server.py           # FastAPI app, 42 endpoints, 11 DB tables
```

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create backend/.env with:
# DATABASE_URL=postgresql://...your supabase url...

python -m uvicorn server:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install

# Create frontend/.env.local with:
# VITE_API_URL=http://localhost:8000/api

npm run dev
```

App runs at `http://localhost:5173`.

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | Supabase PostgreSQL connection string |
| `VITE_API_URL` | `frontend/.env.local` | Backend API base URL |

Neither file is committed — both are in `.gitignore`.
