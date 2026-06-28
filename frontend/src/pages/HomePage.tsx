import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ChevronRight, Zap, Calendar, ListTodo, AlertTriangle, Plus, Check, X, Snowflake, Target, Flag, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ProgressRing } from '../components/ProgressRing';
import {
  getTimeGreeting,
  getTodayString,
  getDayName,
  isWeekday,
  getProgressMessage,
  getXPProgressInLevel,
  getXPForNextLevel,
} from '../utils/helpers';
import { api } from '../utils/api';
import './HomePage.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

export const HomePage: React.FC = () => {
  const { profile, routineTasks, dailyProgress, quote, oneOffTasks, setActiveTab, toggleRoutineTask } = useAppStore();

  const today = getTodayString();
  const dayName = getDayName(today);
  const isWeekdayToday = isWeekday(today);

  const getDayType = () => {
    const d = new Date();
    const day = d.getDay();
    if (day === 6) return 'saturday';
    if (day === 0) return 'sunday';
    return 'weekday';
  };

  const taskMatchesDayType = (dayTypes: string) => {
    if (!dayTypes) return true;
    const todayType = getDayType();
    return dayTypes.split(',').map(s => s.trim()).includes(todayType);
  };

  const todayRoutineTasks = routineTasks?.filter(t => taskMatchesDayType(t.day_types)) || [];
  const completedTaskIds = new Set(dailyProgress?.completed_routine_task_ids || []);

  const completedTasks = todayRoutineTasks.filter(t => completedTaskIds.has(t.id)).length;
  const totalTasks = todayRoutineTasks.length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // Tasks due today (deadline === today)
  const dueTodayTasks = oneOffTasks?.filter(t => !t.is_completed && t.due_date === today) || [];

  const pendingCount = oneOffTasks?.filter(t => !t.is_completed)?.length || 0;
  const urgentCount = oneOffTasks?.filter(t => {
    if (!t.due_date) return false;
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return diff <= 1;
  })?.length || 0;

  const xpProgress = profile ? getXPProgressInLevel(profile.total_xp, profile.level) : 0;
  const xpForNext = profile ? getXPForNextLevel(profile.level) : 100;
  const xpInLevel = profile ? profile.total_xp - (profile.level > 1 ? getXPForNextLevel(profile.level - 1) : 0) : 0;
  const xpRemaining = xpForNext - (profile?.total_xp || 0);
  const streak = profile?.current_streak || 0;

  // Daily intentions
  const [intentions, setIntentions] = useState<string[]>([]);
  const [intentionInput, setIntentionInput] = useState('');
  const [showIntentionAdd, setShowIntentionAdd] = useState(false);
  const [intentionsSaved, setIntentionsSaved] = useState(false);

  // Streak freeze
  const [freezeStatus, setFreezeStatus] = useState<any>(null);
  const [freezeUsed, setFreezeUsed] = useState(false);

  // Goals
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    api.getIntentions(today).then(d => setIntentions(d.intentions || []));
    api.getStreakFreezeStatus().then(setFreezeStatus);
    api.getGoals().then(all => setGoals(all.filter((g: any) => !g.is_completed)));
  }, [today]);

  const handleAddIntention = async () => {
    if (!intentionInput.trim() || intentions.length >= 3) return;
    const next = [...intentions, intentionInput.trim()];
    setIntentions(next);
    setIntentionInput('');
    setShowIntentionAdd(false);
    await api.saveIntentions(today, next);
    setIntentionsSaved(true);
    setTimeout(() => setIntentionsSaved(false), 2000);
  };

  const handleRemoveIntention = async (idx: number) => {
    const next = intentions.filter((_, i) => i !== idx);
    setIntentions(next);
    await api.saveIntentions(today, next);
  };

  const handleUseFreeze = async () => {
    try {
      await api.useStreakFreeze(today);
      setFreezeUsed(true);
      setFreezeStatus((prev: any) => ({ ...prev, freezes_available: 0 }));
    } catch {
      alert('No streak freeze available this week.');
    }
  };

  return (
    <div className="home-page">
      {/* Hero */}
      <motion.div className="home-hero" {...fadeUp(0)}>
        <div className="home-hero__left">
          <p className="home-hero__greeting">Good {getTimeGreeting()}</p>
          <h1 className="home-hero__name">Stay on fire</h1>
          <p className="home-hero__date">{dayName}, {today}</p>
        </div>
        <div className="home-hero__right">
          <div className={`streak-badge ${streak >= 7 ? 'streak-badge--hot' : ''}`}>
            <Flame
              size={22}
              color={streak === 0 ? 'var(--text-4)' : streak < 3 ? 'var(--flame1)' : streak < 7 ? 'var(--flame2)' : 'var(--flame3)'}
              fill={streak > 0 ? 'currentColor' : 'none'}
              className="streak-badge__icon"
            />
            <span className="streak-badge__count">{streak}</span>
            <span className="streak-badge__label">day streak</span>
          </div>
        </div>
      </motion.div>

      {/* Streak freeze nudge — only show if streak > 0 and freeze available and yesterday was missed */}
      {streak > 0 && freezeStatus?.freezes_available > 0 && !freezeUsed && streak === (profile?.longest_streak || 0) && streak >= 3 && (
        <motion.div className="freeze-banner" {...fadeUp(0.03)}>
          <Snowflake size={16} color="#60a5fa" />
          <div className="freeze-banner__text">
            <span>Protect your {streak}-day streak</span>
            <span className="freeze-banner__sub">1 freeze available this week</span>
          </div>
          <button className="freeze-btn" onClick={handleUseFreeze}>Use Freeze</button>
        </motion.div>
      )}

      {/* Quote */}
      {quote && (
        <motion.div className="home-quote" {...fadeUp(0.05)}>
          <span className="home-quote__mark">"</span>
          <p className="home-quote__text">{quote.text}</p>
          <span className="home-quote__author">— {quote.author}</span>
        </motion.div>
      )}

      {/* Level + XP */}
      <motion.div className="home-level-card" {...fadeUp(0.1)}>
        <div className="home-level-card__header">
          <div className="home-level-card__badge">
            <Zap size={14} color="var(--accent)" />
            <span>Level {profile?.level || 1}</span>
          </div>
          <span className="home-level-card__title">{profile?.level_title || 'Rookie'}</span>
          <span className="home-level-card__xp-text">{xpInLevel} / {xpForNext} XP</span>
        </div>
        <div className="xp-bar-track">
          <motion.div
            className="xp-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress * 100}%` }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          />
        </div>
        <p className="home-level-card__next">{xpRemaining > 0 ? `${xpRemaining} XP to Level ${(profile?.level || 1) + 1}` : 'Level up!'}</p>
      </motion.div>

      {/* Daily Intentions */}
      <motion.div className="home-intentions" {...fadeUp(0.13)}>
        <div className="home-intentions__header">
          <div>
            <p className="home-intentions__title">Today's Intentions</p>
            <p className="home-intentions__sub">Your 3 most important things</p>
          </div>
          {intentionsSaved && <span className="intentions-saved"><Check size={11} /> Saved</span>}
        </div>

        <div className="intentions-list">
          {intentions.map((intent, i) => (
            <motion.div
              key={i}
              className="intention-row"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="intention-dot" style={{ background: ['var(--primary)','var(--secondary)','var(--accent)'][i] }} />
              <span className="intention-text">{intent}</span>
              <button className="intention-remove" onClick={() => handleRemoveIntention(i)}><X size={11} /></button>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showIntentionAdd && intentions.length < 3 && (
            <motion.div className="intention-add-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <input
                className="intention-input"
                value={intentionInput}
                onChange={e => setIntentionInput(e.target.value)}
                placeholder="What's most important today?"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddIntention()}
              />
              <button className="intention-add-btn" onClick={handleAddIntention}><Check size={14} /></button>
              <button className="intention-cancel-btn" onClick={() => setShowIntentionAdd(false)}><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {intentions.length < 3 && !showIntentionAdd && (
          <button className="intention-new-btn" onClick={() => setShowIntentionAdd(true)}>
            <Plus size={13} /> Add intention
          </button>
        )}
      </motion.div>

      {/* Today's Progress */}
      {totalTasks > 0 ? (
        <motion.div className="home-progress-card" {...fadeUp(0.16)}>
          <div className="home-progress-card__top">
            <div>
              <h2>Today's Routine</h2>
              <p className="home-progress-card__msg">{getProgressMessage(completedTasks, totalTasks)}</p>
            </div>
            <ProgressRing progress={progress} completed={completedTasks} total={totalTasks} size={80} strokeWidth={7} />
          </div>

          {/* Routine task list */}
          <div className="home-task-list">
            {todayRoutineTasks.map(task => {
              const done = completedTaskIds.has(task.id);
              return (
                <button
                  key={task.id}
                  className={`home-task-row ${done ? 'home-task-row--done' : ''}`}
                  onClick={() => { toggleRoutineTask(task.id); }}
                >
                  <div className={`home-task-check ${done ? 'home-task-check--done' : ''}`}>
                    {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </div>
                  <span className="home-task-title">{task.title}</span>
                  {task.time_label && (
                    <span className="home-task-time">
                      <Clock size={11} />
                      {task.time_label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tasks due today */}
          {dueTodayTasks.length > 0 && (
            <div className="home-due-today">
              <p className="home-due-today__label">Due Today</p>
              {dueTodayTasks.map(task => (
                <button
                  key={task.id}
                  className="home-task-row home-task-row--due"
                  onClick={() => setActiveTab('tasks')}
                >
                  <div className="home-task-check home-task-check--due">
                    <AlertTriangle size={14} />
                  </div>
                  <span className="home-task-title">{task.title}</span>
                  <span className="home-task-time home-task-time--due">tap to open</span>
                </button>
              ))}
            </div>
          )}

          <div className="home-progress-card__footer">
            <span>{completedTasks} of {totalTasks} done</span>
            <button className="home-progress-card__link" onClick={() => setActiveTab('tasks')}>
              Add Task <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div className="home-rest-card" {...fadeUp(0.16)} onClick={() => setActiveTab('tasks')}>
          <span className="home-rest-card__emoji">📋</span>
          <div>
            <h3>No tasks today</h3>
            <p>Tap to add a task</p>
          </div>
          <ChevronRight size={16} color="var(--text-4)" style={{ marginLeft: 'auto' }} />
        </motion.div>
      )}

      {/* Goals widget */}
      {goals.length > 0 && (
        <motion.div {...fadeUp(0.19)}>
          <div className="home-section-label" style={{ marginBottom: 'var(--space-3)' }}>
            <span className="section-label">Active Goals</span>
          </div>
          <div className="home-goals-list">
            {goals.slice(0, 3).map((goal, i) => {
              const doneMs = goal.milestones.filter((m: any) => m.is_completed).length;
              const totalMs = goal.milestones.length;
              const pct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;
              const days = goal.target_date
                ? Math.ceil((new Date(goal.target_date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
                : null;
              return (
                <motion.button
                  key={goal.id}
                  className="home-goal-row"
                  style={{ borderColor: `${goal.color}30` }}
                  onClick={() => setActiveTab('focus')}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div className="home-goal-strip" style={{ background: goal.color }} />
                  <div className="home-goal-body">
                    <div className="home-goal-top">
                      <span className="home-goal-title">{goal.title}</span>
                      {days !== null && (
                        <span className={`home-goal-days ${days < 0 ? 'overdue' : days <= 7 ? 'soon' : ''}`}>
                          <Flag size={10} />
                          {days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'Today!' : `${days}d`}
                        </span>
                      )}
                    </div>
                    {totalMs > 0 && (
                      <>
                        <div className="home-goal-bar-track">
                          <motion.div
                            className="home-goal-bar-fill"
                            style={{ background: goal.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="home-goal-pct">{doneMs}/{totalMs} milestones · {pct}%</span>
                      </>
                    )}
                    {totalMs === 0 && <span className="home-goal-pct">No milestones yet</span>}
                  </div>
                  <ChevronRight size={14} color="var(--text-4)" />
                </motion.button>
              );
            })}
            {goals.length > 3 && (
              <button className="home-goal-more" onClick={() => setActiveTab('focus')}>
                +{goals.length - 3} more goals
              </button>
            )}
          </div>
        </motion.div>
      )}

      {goals.length === 0 && (
        <motion.button className="home-goals-empty" {...fadeUp(0.19)} onClick={() => setActiveTab('focus')}>
          <Target size={18} color="var(--text-4)" />
          <span>Set your first goal</span>
          <ChevronRight size={14} color="var(--text-4)" />
        </motion.button>
      )}

      {/* Quick Actions */}
      <motion.div className="home-section-label" {...fadeUp(0.2)}><span className="section-label">Quick Actions</span></motion.div>

      <motion.div className="home-quick-grid" {...fadeUp(0.22)}>
        <button className="home-quick-btn" onClick={() => setActiveTab('routine')}>
          <div className="home-quick-btn__icon home-quick-btn__icon--primary"><Calendar size={22} /></div>
          <span>Routine</span>
        </button>
        <button className="home-quick-btn" onClick={() => setActiveTab('tasks')}>
          <div className="home-quick-btn__icon home-quick-btn__icon--secondary"><ListTodo size={22} /></div>
          <span>Tasks</span>
          {pendingCount > 0 && <span className="home-quick-btn__badge">{pendingCount}</span>}
        </button>
      </motion.div>

      {/* Pending Tasks Summary */}
      {pendingCount > 0 && (
        <motion.button className="home-tasks-summary" {...fadeUp(0.25)} onClick={() => setActiveTab('tasks')}>
          <div className="home-tasks-summary__left">
            {urgentCount > 0 ? <AlertTriangle size={20} color="var(--warning)" /> : <ListTodo size={20} color="var(--primary-light)" />}
            <div>
              <p className="home-tasks-summary__title">
                {urgentCount > 0 ? `${urgentCount} task${urgentCount > 1 ? 's' : ''} due soon!` : `${pendingCount} pending task${pendingCount > 1 ? 's' : ''}`}
              </p>
              <p className="home-tasks-summary__sub">Tap to view</p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-3)" />
        </motion.button>
      )}
    </div>
  );
};
