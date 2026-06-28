from fastapi import FastAPI, APIRouter, HTTPException
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
from enum import Enum
import uuid
import json
import logging
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Enums ──────────────────────────────────────────────────────────────────────

class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# ── Request models ─────────────────────────────────────────────────────────────

class CreateRoutineTaskRequest(BaseModel):
    time_label: str
    title: str
    icon: str = "checkbox-outline"
    is_critical: bool = False
    order: int = 0
    day_types: str = "weekday"

class UpdateRoutineTaskRequest(BaseModel):
    time_label: Optional[str] = None
    title: Optional[str] = None
    icon: Optional[str] = None
    is_critical: Optional[bool] = None
    order: Optional[int] = None
    day_types: Optional[str] = None

class ReorderRoutineTasksRequest(BaseModel):
    ordered_ids: List[str]
    day_type: str = "weekday"

class CreateOneOffTaskRequest(BaseModel):
    title: str
    notes: Optional[str] = None
    due_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM

class UpdateOneOffTaskRequest(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[Priority] = None

class ToggleRoutineTaskRequest(BaseModel):
    task_id: str
    date: str

class DailyNoteRequest(BaseModel):
    date: str
    note: str

class PushSubscriptionRequest(BaseModel):
    subscription: dict

class CreateGoalRequest(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[str] = None
    color: str = "#6366F1"

class UpdateGoalRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    color: Optional[str] = None
    is_completed: Optional[bool] = None

class CreateMilestoneRequest(BaseModel):
    goal_id: str
    title: str
    order: int = 0

class UpdateMilestoneRequest(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None

class QuickNoteRequest(BaseModel):
    content: str

class UpdateQuickNoteRequest(BaseModel):
    content: str

class IntentionRequest(BaseModel):
    date: str
    intentions: List[str]

class VisionCardRequest(BaseModel):
    text: str
    emoji: str = "🔥"
    color: str = "#6366F1"

class UpdateVisionCardRequest(BaseModel):
    text: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None

class StreakFreezeRequest(BaseModel):
    date: str

# ── DB pool ────────────────────────────────────────────────────────────────────

_pool: asyncpg.Pool = None

async def get_pool() -> asyncpg.Pool:
    return _pool

async def init_db():
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
                id TEXT PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                total_xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                badges TEXT DEFAULT '[]',
                last_active_date TEXT,
                weekly_completed_days INTEGER DEFAULT 0,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS routine_tasks (
                id TEXT PRIMARY KEY,
                time_label TEXT NOT NULL,
                title TEXT NOT NULL,
                icon TEXT DEFAULT 'checkbox-outline',
                is_critical BOOLEAN DEFAULT FALSE,
                task_order INTEGER DEFAULT 0,
                day_types TEXT DEFAULT 'weekday'
            );

            CREATE TABLE IF NOT EXISTS daily_progress (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                completed_routine_task_ids TEXT DEFAULT '[]',
                day_type TEXT,
                total_xp_earned INTEGER DEFAULT 0,
                is_day_complete BOOLEAN DEFAULT FALSE,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS one_off_tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                notes TEXT,
                due_date TEXT,
                priority TEXT DEFAULT 'medium',
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS daily_notes (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                note TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id TEXT PRIMARY KEY,
                subscription TEXT NOT NULL,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                target_date TEXT,
                color TEXT DEFAULT '#6366F1',
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS milestones (
                id TEXT PRIMARY KEY,
                goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                milestone_order INTEGER DEFAULT 0,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS quick_notes (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS daily_intentions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                intentions TEXT DEFAULT '[]',
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS vision_cards (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                emoji TEXT DEFAULT '🔥',
                color TEXT DEFAULT '#6366F1',
                card_order INTEGER DEFAULT 0,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS streak_freezes (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                used_at TEXT
            );
        """)
    await _seed_defaults()

async def _seed_defaults():
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id FROM user_profile LIMIT 1")
        if not row:
            await conn.execute(
                "INSERT INTO user_profile (id, created_at) VALUES ($1, $2)",
                str(uuid.uuid4()), datetime.utcnow().isoformat()
            )

# ── Helpers ────────────────────────────────────────────────────────────────────

MOTIVATIONAL_QUOTES = [
    {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
    {"text": "It does not matter how slowly you go as long as you do not stop.", "author": "Confucius"},
    {"text": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "author": "Winston Churchill"},
    {"text": "The future belongs to those who believe in the beauty of their dreams.", "author": "Eleanor Roosevelt"},
    {"text": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
    {"text": "The only limit to our realization of tomorrow is our doubts of today.", "author": "Franklin D. Roosevelt"},
    {"text": "Do what you can, with what you have, where you are.", "author": "Theodore Roosevelt"},
    {"text": "The journey of a thousand miles begins with one step.", "author": "Lao Tzu"},
    {"text": "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "author": "Aristotle"},
    {"text": "The harder you work for something, the greater you'll feel when you achieve it.", "author": "Unknown"},
    {"text": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"},
    {"text": "Success usually comes to those who are too busy to be looking for it.", "author": "Henry David Thoreau"},
    {"text": "The only person you are destined to become is the person you decide to be.", "author": "Ralph Waldo Emerson"},
    {"text": "Everything you've ever wanted is on the other side of fear.", "author": "George Addair"},
    {"text": "You are never too old to set another goal or to dream a new dream.", "author": "C.S. Lewis"},
]

def get_day_type(date_str: str) -> str:
    d = datetime.strptime(date_str, "%Y-%m-%d")
    wd = d.weekday()
    if wd == 5: return "saturday"
    if wd == 6: return "sunday"
    return "weekday"

def calculate_level(xp: int) -> int:
    thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]
    for lvl in range(len(thresholds) - 1, -1, -1):
        if xp >= thresholds[lvl]:
            return lvl + 1 if lvl < 9 else 10 + (xp - 4500) // 1000
    return 1

def get_level_title(level: int) -> str:
    titles = {1:"Rookie",2:"Apprentice",3:"Rising Star",4:"Focused Warrior",
              5:"Champion",6:"Master",7:"Legend",8:"Elite",9:"Unstoppable",10:"Grandmaster"}
    if level > 10:
        return f"Grandmaster Level {level - 9}"
    return titles.get(level, "Rookie")

def check_and_award_badges(profile: dict, days_completed: int) -> List[str]:
    current = profile.get("badges", [])
    streak = profile.get("current_streak", 0)
    xp = profile.get("total_xp", 0)
    level = profile.get("level", 1)
    checks = [
        ("first_task",      xp >= 10),
        ("week_streak",     streak >= 7),
        ("two_week_streak", streak >= 14),
        ("month_streak",    streak >= 30),
        ("xp_500",          xp >= 500),
        ("xp_1000",         xp >= 1000),
        ("xp_5000",         xp >= 5000),
        ("level_5",         level >= 5),
        ("level_10",        level >= 10),
        ("perfect_week",    days_completed >= 5),
    ]
    return [bid for bid, cond in checks if cond and bid not in current]

def task_matches_day_type(day_types_str: str, day_type: str) -> bool:
    types = [t.strip() for t in (day_types_str or "weekday").split(",")]
    return day_type in types

def row_to_profile(row) -> dict:
    p = dict(row)
    p["badges"] = json.loads(p["badges"]) if isinstance(p["badges"], str) else (p["badges"] or [])
    p["level_title"] = get_level_title(p["level"])
    return p

# ── Profile ────────────────────────────────────────────────────────────────────

@api_router.get("/profile")
async def get_profile():
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
    if not row:
        return {"id": "", "current_streak": 0, "longest_streak": 0, "total_xp": 0,
                "level": 1, "level_title": "Rookie", "badges": [], "last_active_date": None}
    return row_to_profile(dict(row))

async def _update_streak(conn, date_str: str):
    row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
    if not row: return
    p = dict(row)
    last_active = p.get("last_active_date")
    streak = p.get("current_streak", 0)
    longest = p.get("longest_streak", 0)
    if last_active:
        last_d = datetime.strptime(last_active, "%Y-%m-%d").date()
        cur_d  = datetime.strptime(date_str, "%Y-%m-%d").date()
        diff = (cur_d - last_d).days
        if diff == 1:   streak += 1
        elif diff > 1:  streak = 1
    else:
        streak = 1
    longest = max(longest, streak)
    await conn.execute(
        "UPDATE user_profile SET current_streak=$1, longest_streak=$2, last_active_date=$3 WHERE id=$4",
        streak, longest, date_str, p["id"]
    )

async def _add_xp(conn, xp_amount: int):
    row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
    if not row: return
    p = dict(row)
    badges = json.loads(p["badges"]) if isinstance(p["badges"], str) else (p["badges"] or [])
    new_xp = max(0, p["total_xp"] + xp_amount)
    new_level = calculate_level(new_xp)
    new_badges = check_and_award_badges({**p, "badges": badges, "total_xp": new_xp, "level": new_level},
                                        p.get("weekly_completed_days", 0))
    all_badges = badges + new_badges
    await conn.execute(
        "UPDATE user_profile SET total_xp=$1, level=$2, badges=$3 WHERE id=$4",
        new_xp, new_level, json.dumps(all_badges), p["id"]
    )

@api_router.put("/profile/add-xp")
async def add_xp(xp_amount: int):
    async with _pool.acquire() as conn:
        await _add_xp(conn, xp_amount)
        row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
    return row_to_profile(dict(row))

# ── Routine tasks ──────────────────────────────────────────────────────────────

@api_router.get("/routine-tasks")
async def get_routine_tasks(day_type: Optional[str] = None):
    async with _pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM routine_tasks ORDER BY task_order ASC")
    tasks = []
    for r in rows:
        t = dict(r)
        t["order"] = t.pop("task_order")
        t["day_types"] = t.get("day_types") or "weekday"
        if day_type and not task_matches_day_type(t["day_types"], day_type):
            continue
        tasks.append(t)
    return tasks

@api_router.post("/routine-tasks")
async def create_routine_task(req: CreateRoutineTaskRequest):
    task_id = str(uuid.uuid4())
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT MAX(task_order) as max_order FROM routine_tasks")
        max_order = (row["max_order"] or 0) + 1
        order = req.order if req.order > 0 else max_order
        await conn.execute(
            "INSERT INTO routine_tasks (id, time_label, title, icon, is_critical, task_order, day_types) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            task_id, req.time_label, req.title, req.icon, req.is_critical, order, req.day_types
        )
    return {"id": task_id, **req.model_dump(), "order": order}

@api_router.put("/routine-tasks/reorder")
async def reorder_routine_tasks(req: ReorderRoutineTasksRequest):
    async with _pool.acquire() as conn:
        for idx, task_id in enumerate(req.ordered_ids):
            await conn.execute("UPDATE routine_tasks SET task_order=$1 WHERE id=$2", idx + 1, task_id)
    return {"message": "Reordered"}

@api_router.put("/routine-tasks/{task_id}")
async def update_routine_task(task_id: str, req: UpdateRoutineTaskRequest):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No update data provided")
    if "order" in updates:
        updates["task_order"] = updates.pop("order")
    cols = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
    vals = list(updates.values()) + [task_id]
    async with _pool.acquire() as conn:
        await conn.execute(f"UPDATE routine_tasks SET {cols} WHERE id=${len(vals)}", *vals)
        row = await conn.fetchrow("SELECT * FROM routine_tasks WHERE id=$1", task_id)
    if not row:
        raise HTTPException(404, "Task not found")
    t = dict(row)
    t["order"] = t.pop("task_order")
    t["day_types"] = t.get("day_types") or "weekday"
    return t

@api_router.delete("/routine-tasks/{task_id}")
async def delete_routine_task(task_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM routine_tasks WHERE id=$1", task_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Task not found")
    return {"message": "Task deleted"}

# ── Daily progress ─────────────────────────────────────────────────────────────

@api_router.get("/daily-progress/{date_str}")
async def get_daily_progress(date_str: str):
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM daily_progress WHERE date=$1", date_str)
    if not row:
        return {"id": str(uuid.uuid4()), "date": date_str,
                "completed_routine_task_ids": [], "day_type": get_day_type(date_str),
                "total_xp_earned": 0, "is_day_complete": False}
    p = dict(row)
    p["completed_routine_task_ids"] = json.loads(p["completed_routine_task_ids"])
    return p

@api_router.post("/daily-progress/toggle-task")
async def toggle_routine_task(req: ToggleRoutineTaskRequest):
    day_type = get_day_type(req.date)
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM daily_progress WHERE date=$1", req.date)
        if not row:
            prog_id = str(uuid.uuid4())
            await conn.execute(
                "INSERT INTO daily_progress (id, date, completed_routine_task_ids, day_type, total_xp_earned, is_day_complete, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                prog_id, req.date, "[]", day_type, 0, False, datetime.utcnow().isoformat()
            )
            completed_ids = []
            was_complete = False
            current_xp = 0
        else:
            p = dict(row)
            completed_ids = json.loads(p["completed_routine_task_ids"])
            was_complete = bool(p["is_day_complete"])
            current_xp = p["total_xp_earned"]

        xp_change = 0
        if req.task_id in completed_ids:
            completed_ids.remove(req.task_id)
            xp_change = -10
        else:
            completed_ids.append(req.task_id)
            xp_change = 10
            if len(completed_ids) == 1:
                await _update_streak(conn, req.date)

        all_tasks = await conn.fetch("SELECT id, day_types FROM routine_tasks")
        day_tasks = [r for r in all_tasks if task_matches_day_type(r["day_types"] or "weekday", day_type)]
        total_tasks = len(day_tasks)
        is_day_complete = len(completed_ids) == total_tasks and total_tasks > 0

        if is_day_complete and not was_complete:
            xp_change += 50

        new_xp = max(0, current_xp + xp_change)
        await conn.execute(
            "UPDATE daily_progress SET completed_routine_task_ids=$1, total_xp_earned=$2, is_day_complete=$3 WHERE date=$4",
            json.dumps(completed_ids), new_xp, is_day_complete, req.date
        )

        if xp_change != 0:
            await _add_xp(conn, xp_change)

        if is_day_complete and not was_complete:
            d = datetime.strptime(req.date, "%Y-%m-%d").date()
            week_start = d - timedelta(days=d.weekday())
            completed_weekdays = 0
            for offset in range(5):
                check_date = (week_start + timedelta(days=offset)).strftime("%Y-%m-%d")
                cr = await conn.fetchrow("SELECT is_day_complete FROM daily_progress WHERE date=$1", check_date)
                if cr and cr["is_day_complete"]:
                    completed_weekdays += 1
            profile_row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
            if profile_row:
                pdict = dict(profile_row)
                pdict["badges"] = json.loads(pdict["badges"]) if isinstance(pdict["badges"], str) else []
                await conn.execute("UPDATE user_profile SET weekly_completed_days=$1 WHERE id=$2",
                                   completed_weekdays, pdict["id"])
                new_badges = check_and_award_badges({**pdict, "weekly_completed_days": completed_weekdays}, completed_weekdays)
                if new_badges:
                    all_b = pdict["badges"] + new_badges
                    await conn.execute("UPDATE user_profile SET badges=$1 WHERE id=$2",
                                       json.dumps(all_b), pdict["id"])

        final_row = await conn.fetchrow("SELECT * FROM daily_progress WHERE date=$1", req.date)
        prog = dict(final_row)
        prog["completed_routine_task_ids"] = json.loads(prog["completed_routine_task_ids"])

    return {"progress": prog, "xp_change": xp_change, "is_day_complete": is_day_complete}

# ── One-off tasks ──────────────────────────────────────────────────────────────

@api_router.get("/tasks")
async def get_one_off_tasks(include_completed: bool = False):
    async with _pool.acquire() as conn:
        if include_completed:
            rows = await conn.fetch("SELECT * FROM one_off_tasks")
        else:
            rows = await conn.fetch("SELECT * FROM one_off_tasks WHERE is_completed=FALSE")
    tasks = [dict(r) for r in rows]
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(key=lambda t: (priority_order.get(t.get("priority", "medium"), 1), t.get("due_date") or "9999-12-31"))
    return tasks

@api_router.post("/tasks")
async def create_one_off_task(req: CreateOneOffTaskRequest):
    task_id = str(uuid.uuid4())
    async with _pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO one_off_tasks (id, title, notes, due_date, priority, is_completed, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            task_id, req.title, req.notes, req.due_date, req.priority.value, False, datetime.utcnow().isoformat()
        )
    return {"id": task_id, **req.model_dump(), "is_completed": False}

@api_router.put("/tasks/{task_id}")
async def update_one_off_task(task_id: str, req: UpdateOneOffTaskRequest):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No update data provided")
    if "priority" in updates and hasattr(updates["priority"], "value"):
        updates["priority"] = updates["priority"].value
    cols = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
    vals = list(updates.values()) + [task_id]
    async with _pool.acquire() as conn:
        result = await conn.execute(f"UPDATE one_off_tasks SET {cols} WHERE id=${len(vals)}", *vals)
        if result == "UPDATE 0":
            raise HTTPException(404, "Task not found")
        row = await conn.fetchrow("SELECT * FROM one_off_tasks WHERE id=$1", task_id)
    return dict(row)

@api_router.post("/tasks/{task_id}/complete")
async def complete_one_off_task(task_id: str):
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM one_off_tasks WHERE id=$1", task_id)
        if not row:
            raise HTTPException(404, "Task not found")
        task = dict(row)
        await conn.execute(
            "UPDATE one_off_tasks SET is_completed=TRUE, completed_at=$1 WHERE id=$2",
            datetime.utcnow().isoformat(), task_id
        )
        xp_map = {"high": 25, "medium": 15, "low": 10}
        xp = xp_map.get(task.get("priority", "medium"), 15)
        await _add_xp(conn, xp)
    return {"message": "Task completed!", "xp_earned": xp}

@api_router.delete("/tasks/{task_id}")
async def delete_one_off_task(task_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM one_off_tasks WHERE id=$1", task_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Task not found")
    return {"message": "Task deleted"}

# ── Daily notes ────────────────────────────────────────────────────────────────

@api_router.get("/daily-notes/{date_str}")
async def get_daily_note(date_str: str):
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM daily_notes WHERE date=$1", date_str)
    if not row:
        return {"date": date_str, "note": ""}
    return dict(row)

@api_router.put("/daily-notes")
async def upsert_daily_note(req: DailyNoteRequest):
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM daily_notes WHERE date=$1", req.date)
        if existing:
            await conn.execute("UPDATE daily_notes SET note=$1, updated_at=$2 WHERE date=$3", req.note, now, req.date)
        else:
            await conn.execute(
                "INSERT INTO daily_notes (id, date, note, created_at, updated_at) VALUES ($1,$2,$3,$4,$5)",
                str(uuid.uuid4()), req.date, req.note, now, now
            )
        row = await conn.fetchrow("SELECT * FROM daily_notes WHERE date=$1", req.date)
    return dict(row)

@api_router.get("/daily-notes")
async def get_recent_notes(limit: int = 7):
    async with _pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM daily_notes ORDER BY date DESC LIMIT $1", limit)
    return [dict(r) for r in rows]

# ── Weekly summary ─────────────────────────────────────────────────────────────

@api_router.get("/weekly-summary")
async def get_weekly_summary(week_start: Optional[str] = None):
    if not week_start:
        today = date.today()
        week_start_date = today - timedelta(days=today.weekday())
    else:
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()

    days = []
    total_xp = 0
    completed_days = 0
    total_tasks_completed = 0

    async with _pool.acquire() as conn:
        for offset in range(7):
            day = week_start_date + timedelta(days=offset)
            day_str = day.strftime("%Y-%m-%d")
            row = await conn.fetchrow("SELECT * FROM daily_progress WHERE date=$1", day_str)
            if row:
                p = dict(row)
                completed_ids = json.loads(p["completed_routine_task_ids"])
                xp = p["total_xp_earned"]
                is_complete = bool(p["is_day_complete"])
                tasks_done = len(completed_ids)
            else:
                xp = 0; is_complete = False; tasks_done = 0

            note_row = await conn.fetchrow("SELECT note FROM daily_notes WHERE date=$1", day_str)
            note = note_row["note"] if note_row else ""

            total_xp += xp
            if is_complete: completed_days += 1
            total_tasks_completed += tasks_done
            days.append({
                "date": day_str, "day_name": day.strftime("%a"),
                "xp_earned": xp, "is_complete": is_complete,
                "tasks_completed": tasks_done, "note": note,
                "is_past": day <= date.today(),
            })

    return {"week_start": week_start_date.strftime("%Y-%m-%d"), "days": days,
            "total_xp": total_xp, "completed_days": completed_days,
            "total_tasks_completed": total_tasks_completed}

# ── Analytics ──────────────────────────────────────────────────────────────────

@api_router.get("/analytics")
async def get_analytics(days: int = 30):
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM daily_progress WHERE date >= $1 AND date <= $2 ORDER BY date ASC",
            start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")
        )
        completed_tasks_row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM one_off_tasks WHERE is_completed=TRUE")
        total_tasks_row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM one_off_tasks")
        profile_row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")

    daily_data = []
    for r in rows:
        p = dict(r)
        completed_ids = json.loads(p["completed_routine_task_ids"])
        daily_data.append({
            "date": p["date"], "xp_earned": p["total_xp_earned"],
            "tasks_completed": len(completed_ids), "is_complete": bool(p["is_day_complete"]),
        })

    total_completed = completed_tasks_row["cnt"] if completed_tasks_row else 0
    total_all = total_tasks_row["cnt"] if total_tasks_row else 0
    profile = dict(profile_row) if profile_row else {}

    return {
        "daily_data": daily_data,
        "total_completed_tasks": total_completed,
        "total_tasks": total_all,
        "completion_rate": round(total_completed / total_all * 100) if total_all > 0 else 0,
        "total_xp": profile.get("total_xp", 0),
        "current_streak": profile.get("current_streak", 0),
        "longest_streak": profile.get("longest_streak", 0),
        "days_tracked": len(daily_data),
        "perfect_days": sum(1 for d in daily_data if d["is_complete"]),
    }

# ── Push subscriptions ─────────────────────────────────────────────────────────

@api_router.post("/push/subscribe")
async def save_push_subscription(req: PushSubscriptionRequest):
    async with _pool.acquire() as conn:
        await conn.execute("DELETE FROM push_subscriptions")
        await conn.execute(
            "INSERT INTO push_subscriptions (id, subscription, created_at) VALUES ($1,$2,$3)",
            str(uuid.uuid4()), json.dumps(req.subscription), datetime.utcnow().isoformat()
        )
    return {"message": "Subscription saved"}

@api_router.get("/push/subscription")
async def get_push_subscription():
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM push_subscriptions LIMIT 1")
    if not row:
        return {"subscription": None}
    return {"subscription": json.loads(row["subscription"])}

# ── Goals & Milestones ─────────────────────────────────────────────────────────

@api_router.get("/goals")
async def get_goals():
    async with _pool.acquire() as conn:
        goals_rows = await conn.fetch("SELECT * FROM goals ORDER BY created_at DESC")
        goals = []
        for gr in goals_rows:
            g = dict(gr)
            ms_rows = await conn.fetch(
                "SELECT * FROM milestones WHERE goal_id=$1 ORDER BY milestone_order ASC", g["id"]
            )
            ms = []
            for mr in ms_rows:
                m = dict(mr)
                m["order"] = m.pop("milestone_order")
                ms.append(m)
            g["milestones"] = ms
            goals.append(g)
    return goals

@api_router.post("/goals")
async def create_goal(req: CreateGoalRequest):
    goal_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO goals (id, title, description, target_date, color, is_completed, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
            goal_id, req.title, req.description, req.target_date, req.color, False, now
        )
    return {"id": goal_id, **req.model_dump(), "is_completed": False, "milestones": [], "created_at": now}

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, req: UpdateGoalRequest):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No update data")
    if "is_completed" in updates:
        updates["completed_at"] = datetime.utcnow().isoformat() if updates["is_completed"] else None
    cols = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
    vals = list(updates.values()) + [goal_id]
    async with _pool.acquire() as conn:
        await conn.execute(f"UPDATE goals SET {cols} WHERE id=${len(vals)}", *vals)
        row = await conn.fetchrow("SELECT * FROM goals WHERE id=$1", goal_id)
        if not row:
            raise HTTPException(404, "Goal not found")
        g = dict(row)
        ms_rows = await conn.fetch("SELECT * FROM milestones WHERE goal_id=$1 ORDER BY milestone_order ASC", goal_id)
        ms = []
        for mr in ms_rows:
            m = dict(mr)
            m["order"] = m.pop("milestone_order")
            ms.append(m)
        g["milestones"] = ms
    return g

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM goals WHERE id=$1", goal_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Goal not found")
    return {"message": "Goal deleted"}

@api_router.post("/goals/{goal_id}/milestones")
async def add_milestone(goal_id: str, req: CreateMilestoneRequest):
    ms_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT MAX(milestone_order) as mo FROM milestones WHERE goal_id=$1", goal_id)
        order = (row["mo"] or 0) + 1
        await conn.execute(
            "INSERT INTO milestones (id, goal_id, title, is_completed, milestone_order, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
            ms_id, goal_id, req.title, False, order, now
        )
    return {"id": ms_id, "goal_id": goal_id, "title": req.title, "is_completed": False, "order": order}

@api_router.put("/milestones/{ms_id}")
async def update_milestone(ms_id: str, req: UpdateMilestoneRequest):
    updates = req.model_dump(exclude_none=True)
    cols = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
    vals = list(updates.values()) + [ms_id]
    async with _pool.acquire() as conn:
        await conn.execute(f"UPDATE milestones SET {cols} WHERE id=${len(vals)}", *vals)
        row = await conn.fetchrow("SELECT * FROM milestones WHERE id=$1", ms_id)
    if not row:
        raise HTTPException(404, "Milestone not found")
    m = dict(row)
    m["order"] = m.pop("milestone_order")
    return m

@api_router.delete("/milestones/{ms_id}")
async def delete_milestone(ms_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM milestones WHERE id=$1", ms_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Milestone not found")
    return {"message": "Milestone deleted"}

# ── Quick Notes ────────────────────────────────────────────────────────────────

@api_router.get("/quick-notes")
async def get_quick_notes():
    async with _pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM quick_notes ORDER BY updated_at DESC")
    return [dict(r) for r in rows]

@api_router.post("/quick-notes")
async def create_quick_note(req: QuickNoteRequest):
    note_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO quick_notes (id, content, created_at, updated_at) VALUES ($1,$2,$3,$4)",
            note_id, req.content, now, now
        )
    return {"id": note_id, "content": req.content, "created_at": now, "updated_at": now}

@api_router.put("/quick-notes/{note_id}")
async def update_quick_note(note_id: str, req: UpdateQuickNoteRequest):
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE quick_notes SET content=$1, updated_at=$2 WHERE id=$3", req.content, now, note_id
        )
        if result == "UPDATE 0":
            raise HTTPException(404, "Note not found")
        row = await conn.fetchrow("SELECT * FROM quick_notes WHERE id=$1", note_id)
    return dict(row)

@api_router.delete("/quick-notes/{note_id}")
async def delete_quick_note(note_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM quick_notes WHERE id=$1", note_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Note not found")
    return {"message": "Note deleted"}

# ── Daily Intentions ───────────────────────────────────────────────────────────

@api_router.get("/intentions/{date_str}")
async def get_intentions(date_str: str):
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM daily_intentions WHERE date=$1", date_str)
    if not row:
        return {"date": date_str, "intentions": []}
    r = dict(row)
    r["intentions"] = json.loads(r["intentions"])
    return r

@api_router.put("/intentions")
async def save_intentions(req: IntentionRequest):
    now = datetime.utcnow().isoformat()
    intentions_json = json.dumps(req.intentions[:3])
    async with _pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM daily_intentions WHERE date=$1", req.date)
        if existing:
            await conn.execute("UPDATE daily_intentions SET intentions=$1, updated_at=$2 WHERE date=$3",
                               intentions_json, now, req.date)
        else:
            await conn.execute(
                "INSERT INTO daily_intentions (id, date, intentions, created_at, updated_at) VALUES ($1,$2,$3,$4,$5)",
                str(uuid.uuid4()), req.date, intentions_json, now, now
            )
        row = await conn.fetchrow("SELECT * FROM daily_intentions WHERE date=$1", req.date)
    r = dict(row)
    r["intentions"] = json.loads(r["intentions"])
    return r

# ── Vision Board ───────────────────────────────────────────────────────────────

@api_router.get("/vision-cards")
async def get_vision_cards():
    async with _pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM vision_cards ORDER BY card_order ASC")
    return [dict(r) for r in rows]

@api_router.post("/vision-cards")
async def create_vision_card(req: VisionCardRequest):
    card_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT MAX(card_order) as mo FROM vision_cards")
        order = (row["mo"] or 0) + 1
        await conn.execute(
            "INSERT INTO vision_cards (id, text, emoji, color, card_order, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
            card_id, req.text, req.emoji, req.color, order, now
        )
    return {"id": card_id, **req.model_dump(), "card_order": order, "created_at": now}

@api_router.put("/vision-cards/{card_id}")
async def update_vision_card(card_id: str, req: UpdateVisionCardRequest):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No update data")
    cols = ", ".join(f"{k}=${i+1}" for i, k in enumerate(updates))
    vals = list(updates.values()) + [card_id]
    async with _pool.acquire() as conn:
        await conn.execute(f"UPDATE vision_cards SET {cols} WHERE id=${len(vals)}", *vals)
        row = await conn.fetchrow("SELECT * FROM vision_cards WHERE id=$1", card_id)
    if not row:
        raise HTTPException(404, "Card not found")
    return dict(row)

@api_router.delete("/vision-cards/{card_id}")
async def delete_vision_card(card_id: str):
    async with _pool.acquire() as conn:
        result = await conn.execute("DELETE FROM vision_cards WHERE id=$1", card_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Card not found")
    return {"message": "Card deleted"}

# ── Streak Freeze ──────────────────────────────────────────────────────────────

@api_router.get("/streak-freeze/status")
async def get_streak_freeze_status():
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM streak_freezes WHERE used_at >= $1", week_start)
        used_this_week = row["cnt"] if row else 0
        recent = await conn.fetch("SELECT * FROM streak_freezes ORDER BY used_at DESC LIMIT 5")
    return {"freezes_available": max(0, 1 - used_this_week),
            "used_this_week": used_this_week,
            "recent_freezes": [dict(r) for r in recent]}

@api_router.post("/streak-freeze/use")
async def use_streak_freeze(req: StreakFreezeRequest):
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    async with _pool.acquire() as conn:
        row = await conn.fetchrow("SELECT COUNT(*) as cnt FROM streak_freezes WHERE used_at >= $1", week_start)
        if row and row["cnt"] >= 1:
            raise HTTPException(400, "No streak freezes available this week")
        now = datetime.utcnow().isoformat()
        profile_row = await conn.fetchrow("SELECT * FROM user_profile LIMIT 1")
        if profile_row:
            await conn.execute("UPDATE user_profile SET last_active_date=$1 WHERE id=$2",
                               req.date, profile_row["id"])
        await conn.execute(
            "INSERT INTO streak_freezes (id, date, used_at) VALUES ($1,$2,$3)",
            str(uuid.uuid4()), req.date, now
        )
    return {"message": "Streak freeze applied!", "date": req.date}

# ── Quote & Badges ─────────────────────────────────────────────────────────────

@api_router.get("/quote-of-day")
async def get_quote_of_day():
    idx = date.today().timetuple().tm_yday % len(MOTIVATIONAL_QUOTES)
    return MOTIVATIONAL_QUOTES[idx]

@api_router.get("/badges-info")
async def get_badges_info():
    return {
        "week_streak":     {"id": "week_streak",     "name": "7-Day Streak",   "description": "Complete a 7-day streak",      "color": "#CD7F32"},
        "two_week_streak": {"id": "two_week_streak",  "name": "14-Day Streak",  "description": "14-day consistency",            "color": "#C0C0C0"},
        "month_streak":    {"id": "month_streak",     "name": "30-Day Streak",  "description": "Unstoppable 30-day run",        "color": "#FFD700"},
        "first_task":      {"id": "first_task",       "name": "First Step",     "description": "Complete your first task",      "color": "#FF6B35"},
        "xp_500":          {"id": "xp_500",           "name": "XP Hunter",      "description": "Earn 500 XP",                  "color": "#9370DB"},
        "xp_1000":         {"id": "xp_1000",          "name": "XP Master",      "description": "Earn 1000 XP",                 "color": "#4169E1"},
        "xp_5000":         {"id": "xp_5000",          "name": "XP Legend",      "description": "Earn 5000 XP",                 "color": "#FFD700"},
        "level_5":         {"id": "level_5",          "name": "Level 5",        "description": "Reach Level 5",                "color": "#8B5CF6"},
        "level_10":        {"id": "level_10",         "name": "Level 10",       "description": "Reach Level 10",               "color": "#FFD700"},
        "perfect_week":    {"id": "perfect_week",     "name": "Perfect Week",   "description": "Complete all 5 weekdays",      "color": "#10B981"},
    }

@api_router.get("/")
async def root():
    return {"message": "Hustle API", "version": "3.0.0", "db": "Supabase/Postgres"}

# ── App wiring ─────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("Hustle API ready — connected to Supabase/Postgres")
