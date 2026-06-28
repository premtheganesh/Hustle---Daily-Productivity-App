import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Zap, Flame, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { api } from '../utils/api';
import './StatsPage.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

interface DayData {
  date: string;
  xp_earned: number;
  tasks_completed: number;
  is_complete: boolean;
}

interface Analytics {
  daily_data: DayData[];
  total_completed_tasks: number;
  total_tasks: number;
  completion_rate: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  days_tracked: number;
  perfect_days: number;
}

export const StatsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAnalytics(range).then(data => {
      setAnalytics(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [range]);

  const maxXP = analytics ? Math.max(...analytics.daily_data.map(d => d.xp_earned), 1) : 1;
  const last7 = analytics?.daily_data.slice(-7) || [];

  return (
    <div className="stats-page">
      <motion.div className="stats-header" {...fadeUp(0)}>
        <h1>Analytics</h1>
        <p className="stats-subtitle">Your performance overview</p>
      </motion.div>

      {/* Range selector */}
      <motion.div className="stats-range" {...fadeUp(0.04)}>
        {([7, 14, 30] as const).map(r => (
          <button
            key={r}
            className={`range-btn ${range === r ? 'active' : ''}`}
            onClick={() => setRange(r)}
          >
            {r}D
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="stats-loading">Loading analytics…</div>
      ) : analytics ? (
        <>
          {/* Stat cards */}
          <motion.div className="stats-grid" {...fadeUp(0.08)}>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.25)' }}>
                <Zap size={20} color="var(--accent)" />
              </div>
              <span className="stat-card__val">{analytics.total_xp}</span>
              <span className="stat-card__lbl">Total XP</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <Flame size={20} color="var(--error)" />
              </div>
              <span className="stat-card__val">{analytics.current_streak}</span>
              <span className="stat-card__lbl">Streak</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={20} color="var(--success)" />
              </div>
              <span className="stat-card__val">{analytics.perfect_days}</span>
              <span className="stat-card__lbl">Perfect Days</span>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }}>
                <TrendingUp size={20} color="var(--primary-light)" />
              </div>
              <span className="stat-card__val">{analytics.completion_rate}%</span>
              <span className="stat-card__lbl">Task Rate</span>
            </div>
          </motion.div>

          {/* XP Bar chart - last 7 days */}
          <motion.div className="chart-card" {...fadeUp(0.12)}>
            <div className="chart-card__header">
              <BarChart2 size={16} color="var(--primary-light)" />
              <span>Daily XP — Last 7 Days</span>
            </div>
            <div className="bar-chart">
              {last7.map((d, i) => {
                const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
                const pct = maxXP > 0 ? (d.xp_earned / maxXP) * 100 : 0;
                return (
                  <div key={d.date} className="bar-col">
                    <div className="bar-track">
                      <motion.div
                        className={`bar-fill ${d.is_complete ? 'bar-fill--complete' : ''}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="bar-xp">{d.xp_earned > 0 ? `+${d.xp_earned}` : ''}</span>
                    <span className="bar-label">{label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Activity heatmap */}
          <motion.div className="chart-card" {...fadeUp(0.16)}>
            <div className="chart-card__header">
              <Calendar size={16} color="var(--primary-light)" />
              <span>Activity — {range} Days</span>
            </div>
            <div className="heatmap">
              {analytics.daily_data.map((d) => {
                const intensity = d.tasks_completed > 0 ? Math.min(d.tasks_completed / 10, 1) : 0;
                const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
                return (
                  <div
                    key={d.date}
                    className="heat-cell"
                    title={`${label}: ${d.tasks_completed} tasks, +${d.xp_earned} XP`}
                    style={{
                      background: d.is_complete
                        ? `rgba(16,185,129,${0.3 + intensity * 0.7})`
                        : d.tasks_completed > 0
                        ? `rgba(99,102,241,${0.2 + intensity * 0.6})`
                        : 'rgba(255,255,255,0.04)',
                      borderColor: d.is_complete
                        ? 'rgba(16,185,129,0.4)'
                        : d.tasks_completed > 0
                        ? 'rgba(99,102,241,0.3)'
                        : 'rgba(255,255,255,0.07)',
                    }}
                  />
                );
              })}
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="legend-cells">
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <div key={v} className="legend-cell" style={{ background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(16,185,129,${0.3 + v * 0.7})` }} />
                ))}
              </div>
              <span>More</span>
            </div>
          </motion.div>

          {/* Summary stats */}
          <motion.div className="summary-card" {...fadeUp(0.2)}>
            <div className="summary-row">
              <span className="summary-label">Longest streak</span>
              <span className="summary-val">{analytics.longest_streak} days</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Tasks completed</span>
              <span className="summary-val">{analytics.total_completed_tasks}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Days tracked</span>
              <span className="summary-val">{analytics.days_tracked}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Perfect days</span>
              <span className="summary-val">{analytics.perfect_days}</span>
            </div>
          </motion.div>
        </>
      ) : (
        <div className="stats-loading">No data yet. Start completing tasks!</div>
      )}
    </div>
  );
};
