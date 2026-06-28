import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap, CheckCircle2, Star } from 'lucide-react';
import { api } from '../utils/api';
import './WeeklySummaryPage.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function offsetWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
}

export const WeeklySummaryPage: React.FC = () => {
  const thisWeek = getMondayOfWeek(new Date());
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isCurrentWeek = weekStart === thisWeek;

  useEffect(() => {
    setLoading(true);
    api.getWeeklySummary(weekStart).then(data => {
      setSummary(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [weekStart]);

  const maxXP = summary ? Math.max(...summary.days.map((d: any) => d.xp_earned), 1) : 1;

  return (
    <div className="weekly-page">
      <motion.div className="weekly-header" {...fadeUp(0)}>
        <h1>Week</h1>
        <p className="weekly-subtitle">Weekly overview</p>
      </motion.div>

      {/* Week nav */}
      <motion.div className="weekly-nav" {...fadeUp(0.05)}>
        <button className="week-nav-btn" onClick={() => setWeekStart(w => offsetWeek(w, -1))}>
          <ChevronLeft size={18} />
        </button>
        <div className="week-nav-center">
          <span className="week-nav-label">{isCurrentWeek ? 'This Week' : formatWeekRange(weekStart)}</span>
          {!isCurrentWeek && <span className="week-nav-range">{formatWeekRange(weekStart)}</span>}
        </div>
        <button
          className="week-nav-btn"
          onClick={() => setWeekStart(w => offsetWeek(w, 1))}
          disabled={isCurrentWeek}
          style={{ opacity: isCurrentWeek ? 0.3 : 1 }}
        >
          <ChevronRight size={18} />
        </button>
      </motion.div>

      {loading ? (
        <div className="weekly-loading">Loading…</div>
      ) : summary ? (
        <>
          {/* Summary chips */}
          <motion.div className="weekly-chips" {...fadeUp(0.08)}>
            <div className="weekly-chip">
              <Zap size={16} color="var(--accent)" />
              <span className="chip-val">{summary.total_xp}</span>
              <span className="chip-lbl">XP</span>
            </div>
            <div className="weekly-chip">
              <CheckCircle2 size={16} color="var(--success)" />
              <span className="chip-val">{summary.completed_days}</span>
              <span className="chip-lbl">Days Done</span>
            </div>
            <div className="weekly-chip">
              <Star size={16} color="var(--primary-light)" />
              <span className="chip-val">{summary.total_tasks_completed}</span>
              <span className="chip-lbl">Tasks</span>
            </div>
          </motion.div>

          {/* Day cards */}
          <div className="weekly-days">
            {summary.days.map((day: any, i: number) => {
              const xpPct = maxXP > 0 ? (day.xp_earned / maxXP) * 100 : 0;
              const isPast = day.is_past;
              return (
                <motion.div
                  key={day.date}
                  className={`weekly-day-card ${day.is_complete ? 'complete' : ''} ${!isPast ? 'future' : ''}`}
                  {...fadeUp(0.1 + i * 0.04)}
                >
                  <div className="weekly-day-top">
                    <div className="weekly-day-name">{day.day_name}</div>
                    <div className="weekly-day-date">{new Date(day.date + 'T00:00:00').getDate()}</div>
                    {day.is_complete && (
                      <CheckCircle2 size={16} color="var(--success)" className="weekly-day-check" />
                    )}
                  </div>

                  {isPast && (
                    <>
                      <div className="weekly-day-bar-track">
                        <motion.div
                          className={`weekly-day-bar ${day.is_complete ? 'complete' : ''}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${xpPct}%` }}
                          transition={{ duration: 0.5, delay: 0.15 + i * 0.06 }}
                        />
                      </div>
                      <div className="weekly-day-stats">
                        <span className="weekly-day-xp">+{day.xp_earned} XP</span>
                        <span className="weekly-day-tasks">{day.tasks_completed} tasks</span>
                      </div>
                    </>
                  )}

                  {!isPast && (
                    <p className="weekly-day-upcoming">Upcoming</p>
                  )}

                  {day.note && (
                    <p className="weekly-day-note">"{day.note.slice(0, 60)}{day.note.length > 60 ? '…' : ''}"</p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Week verdict */}
          <motion.div className="weekly-verdict" {...fadeUp(0.45)}>
            {summary.completed_days >= 5 ? (
              <>
                <span className="verdict-emoji">🔥</span>
                <div>
                  <p className="verdict-title">Perfect Week!</p>
                  <p className="verdict-sub">All 5 weekdays crushed. Unreal.</p>
                </div>
              </>
            ) : summary.completed_days >= 3 ? (
              <>
                <span className="verdict-emoji">⚡</span>
                <div>
                  <p className="verdict-title">Solid Week</p>
                  <p className="verdict-sub">{summary.completed_days}/5 days complete. Keep it up!</p>
                </div>
              </>
            ) : (
              <>
                <span className="verdict-emoji">💪</span>
                <div>
                  <p className="verdict-title">Keep Going</p>
                  <p className="verdict-sub">Every day counts. Make this week count.</p>
                </div>
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </div>
  );
};
