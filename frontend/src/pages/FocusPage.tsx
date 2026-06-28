import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp, Target, Flag, Sparkles } from 'lucide-react';
import { api } from '../utils/api';
import './FocusPage.css';

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  is_completed: boolean;
  order: number;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  color: string;
  is_completed: boolean;
  milestones: Milestone[];
}

interface VisionCard {
  id: string;
  text: string;
  emoji: string;
  color: string;
  card_order: number;
}

const GOAL_COLORS = ['#6366F1','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#3B82F6','#14B8A6'];
const VISION_COLORS = ['#6366F1','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#3B82F6','#14B8A6'];
const EMOJIS = ['🔥','🚀','💪','🎯','🌟','💡','✨','🏆','❤️','🙏','💎','⚡','🌈','🦁','🎓','💼'];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
}

type ActiveTab = 'goals' | 'vision';

export const FocusPage: React.FC = () => {
  const [tab, setTab] = useState<ActiveTab>('goals');

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newColor, setNewColor] = useState(GOAL_COLORS[0]);
  const [msInput, setMsInput] = useState<Record<string, string>>({});

  // Vision state
  const [cards, setCards] = useState<VisionCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [showAddVision, setShowAddVision] = useState(false);
  const [newText, setNewText] = useState('');
  const [newEmoji, setNewEmoji] = useState('🔥');
  const [newVisionColor, setNewVisionColor] = useState(VISION_COLORS[0]);

  useEffect(() => {
    api.getGoals().then(setGoals).finally(() => setGoalsLoading(false));
    api.getVisionCards().then(setCards).finally(() => setCardsLoading(false));
  }, []);

  // Goal handlers
  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    const goal = await api.createGoal({ title: newTitle.trim(), description: newDesc.trim() || undefined, target_date: newDate || undefined, color: newColor });
    setGoals(prev => [goal, ...prev]);
    setNewTitle(''); setNewDesc(''); setNewDate(''); setNewColor(GOAL_COLORS[0]);
    setShowAddGoal(false);
    setExpandedId(goal.id);
  };

  const handleDeleteGoal = async (id: string) => {
    await api.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleToggleGoal = async (goal: Goal) => {
    const updated = await api.updateGoal(goal.id, { is_completed: !goal.is_completed });
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, ...updated } : g));
  };

  const handleAddMilestone = async (goalId: string) => {
    const text = msInput[goalId]?.trim();
    if (!text) return;
    const ms = await api.addMilestone(goalId, text);
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones: [...g.milestones, ms] } : g));
    setMsInput(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleToggleMilestone = async (goalId: string, ms: Milestone) => {
    const updated = await api.updateMilestone(ms.id, { is_completed: !ms.is_completed });
    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g, milestones: g.milestones.map(m => m.id === ms.id ? { ...m, ...updated } : m)
    } : g));
  };

  const handleDeleteMilestone = async (goalId: string, msId: string) => {
    await api.deleteMilestone(msId);
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones: g.milestones.filter(m => m.id !== msId) } : g));
  };

  // Vision handlers
  const handleAddVision = async () => {
    if (!newText.trim()) return;
    const card = await api.createVisionCard({ text: newText.trim(), emoji: newEmoji, color: newVisionColor });
    setCards(prev => [...prev, card]);
    setNewText(''); setNewEmoji('🔥'); setNewVisionColor(VISION_COLORS[0]);
    setShowAddVision(false);
  };

  const handleDeleteVision = async (id: string) => {
    await api.deleteVisionCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const active = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);

  return (
    <div className="focus-page">
      {/* Header */}
      <motion.div className="focus-header" {...fadeUp(0)}>
        <h1>Focus</h1>
        <p className="focus-subtitle">Where you're going · Why it matters</p>
      </motion.div>

      {/* Tab switcher */}
      <motion.div className="focus-tabs" {...fadeUp(0.05)}>
        <button className={`focus-tab ${tab === 'goals' ? 'active' : ''}`} onClick={() => setTab('goals')}>
          <Target size={15} /> Goals
        </button>
        <button className={`focus-tab ${tab === 'vision' ? 'active' : ''}`} onClick={() => setTab('vision')}>
          <Sparkles size={15} /> Vision
        </button>
      </motion.div>

      {/* ── GOALS TAB ── */}
      <AnimatePresence mode="wait">
        {tab === 'goals' && (
          <motion.div key="goals" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>

            {/* Add goal form */}
            <AnimatePresence>
              {showAddGoal && (
                <motion.div className="focus-add-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <input className="focus-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Goal title e.g. Get fit by summer" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddGoal()} />
                  <textarea className="focus-input focus-textarea" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2} />
                  <div className="focus-form-row">
                    <div className="focus-form-field">
                      <label className="focus-form-label">Target date</label>
                      <input className="focus-input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="focus-color-row">
                    <span className="focus-form-label">Color</span>
                    <div className="focus-colors">
                      {GOAL_COLORS.map(c => (
                        <button key={c} className={`focus-color-dot ${newColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setNewColor(c)} />
                      ))}
                    </div>
                  </div>
                  <div className="focus-form-actions">
                    <button className="focus-btn focus-btn--primary" onClick={handleAddGoal} disabled={!newTitle.trim()}><Check size={15} /> Save Goal</button>
                    <button className="focus-btn focus-btn--cancel" onClick={() => setShowAddGoal(false)}><X size={15} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAddGoal && (
              <motion.button className="focus-fab" {...fadeUp(0.08)} onClick={() => setShowAddGoal(true)}>
                <Plus size={18} /> New Goal
              </motion.button>
            )}

            {goalsLoading ? (
              <div className="focus-loading">Loading…</div>
            ) : goals.length === 0 ? (
              <motion.div className="focus-empty" {...fadeUp(0.1)}>
                <Target size={48} color="var(--text-4)" />
                <p>No goals yet. Set your first one!</p>
              </motion.div>
            ) : (
              <div className="focus-goal-list">
                {active.map((goal, i) => {
                  const doneMs = goal.milestones.filter(m => m.is_completed).length;
                  const totalMs = goal.milestones.length;
                  const pct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;
                  const days = goal.target_date ? daysUntil(goal.target_date) : null;
                  const isExpanded = expandedId === goal.id;

                  return (
                    <motion.div key={goal.id} className="focus-goal-card" {...fadeUp(0.08 + i * 0.04)} style={{ borderColor: `${goal.color}30` }}>
                      <div className="focus-goal-top">
                        <div className="focus-goal-strip" style={{ background: goal.color }} />
                        <div className="focus-goal-main">
                          <div className="focus-goal-header">
                            <h3 className="focus-goal-title">{goal.title}</h3>
                            <div className="focus-goal-btns">
                              <button className="focus-icon-btn" onClick={() => setExpandedId(isExpanded ? null : goal.id)}>
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                              <button className="focus-icon-btn focus-icon-btn--check" onClick={() => handleToggleGoal(goal)}>
                                <Check size={14} />
                              </button>
                              <button className="focus-icon-btn focus-icon-btn--del" onClick={() => handleDeleteGoal(goal.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {goal.description && <p className="focus-goal-desc">{goal.description}</p>}

                          <div className="focus-goal-meta">
                            {days !== null && (
                              <span className={`focus-goal-days ${days < 0 ? 'overdue' : days <= 7 ? 'soon' : ''}`}>
                                <Flag size={10} />
                                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `${days}d left`}
                              </span>
                            )}
                            {totalMs > 0 && <span className="focus-goal-ms">{doneMs}/{totalMs} milestones</span>}
                          </div>

                          {totalMs > 0 && (
                            <div className="focus-goal-bar-track">
                              <motion.div
                                className="focus-goal-bar-fill"
                                style={{ background: goal.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Milestones */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div className="focus-milestones" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                            {goal.milestones.map(ms => (
                              <div key={ms.id} className={`focus-ms-row ${ms.is_completed ? 'done' : ''}`}>
                                <button className={`focus-ms-check ${ms.is_completed ? 'checked' : ''}`} onClick={() => handleToggleMilestone(goal.id, ms)}>
                                  {ms.is_completed && <Check size={11} color="white" />}
                                </button>
                                <span className="focus-ms-title">{ms.title}</span>
                                <button className="focus-icon-btn focus-icon-btn--del focus-icon-btn--sm" onClick={() => handleDeleteMilestone(goal.id, ms.id)}><Trash2 size={11} /></button>
                              </div>
                            ))}
                            <div className="focus-ms-add-row">
                              <input
                                className="focus-ms-input"
                                value={msInput[goal.id] || ''}
                                onChange={e => setMsInput(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                placeholder="Add milestone…"
                                onKeyDown={e => e.key === 'Enter' && handleAddMilestone(goal.id)}
                              />
                              <button className="focus-ms-add-btn" onClick={() => handleAddMilestone(goal.id)}><Plus size={13} /></button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {completed.length > 0 && (
                  <motion.div {...fadeUp(0.3)}>
                    <p className="focus-section-label">Completed</p>
                    {completed.map(goal => (
                      <div key={goal.id} className="focus-goal-card focus-goal-card--done">
                        <div className="focus-goal-top">
                          <div className="focus-goal-strip" style={{ background: goal.color, opacity: 0.35 }} />
                          <div className="focus-goal-main">
                            <div className="focus-goal-header">
                              <h3 className="focus-goal-title focus-goal-title--done">{goal.title}</h3>
                              <div className="focus-goal-btns">
                                <button className="focus-icon-btn" onClick={() => handleToggleGoal(goal)} title="Reopen"><X size={13} /></button>
                                <button className="focus-icon-btn focus-icon-btn--del" onClick={() => handleDeleteGoal(goal.id)}><Trash2 size={13} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── VISION TAB ── */}
        {tab === 'vision' && (
          <motion.div key="vision" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>

            <AnimatePresence>
              {showAddVision && (
                <motion.div className="focus-add-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="focus-emoji-pick">
                    {EMOJIS.map(e => (
                      <button key={e} className={`focus-emoji-btn ${newEmoji === e ? 'active' : ''}`} onClick={() => setNewEmoji(e)}>{e}</button>
                    ))}
                  </div>
                  <textarea className="focus-input focus-textarea" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Write your vision, affirmation, or dream…" rows={3} autoFocus />
                  <div className="focus-color-row">
                    <span className="focus-form-label">Color</span>
                    <div className="focus-colors">
                      {VISION_COLORS.map(c => (
                        <button key={c} className={`focus-color-dot ${newVisionColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setNewVisionColor(c)} />
                      ))}
                    </div>
                  </div>
                  <div className="focus-form-actions">
                    <button className="focus-btn focus-btn--primary" onClick={handleAddVision} disabled={!newText.trim()}><Check size={15} /> Add Card</button>
                    <button className="focus-btn focus-btn--cancel" onClick={() => setShowAddVision(false)}><X size={15} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAddVision && (
              <motion.button className="focus-fab" {...fadeUp(0.08)} onClick={() => setShowAddVision(true)}>
                <Plus size={18} /> Add Vision Card
              </motion.button>
            )}

            {cardsLoading ? (
              <div className="focus-loading">Loading…</div>
            ) : cards.length === 0 ? (
              <motion.div className="focus-empty" {...fadeUp(0.1)}>
                <Sparkles size={48} color="var(--text-4)" />
                <p>Add cards for your dreams and affirmations</p>
              </motion.div>
            ) : (
              <div className="focus-vision-grid">
                <AnimatePresence>
                  {cards.map((card, i) => (
                    <motion.div
                      key={card.id}
                      className="focus-vision-card"
                      style={{ background: `linear-gradient(135deg, ${card.color}18 0%, ${card.color}08 100%)`, borderColor: `${card.color}35` }}
                      {...fadeUp(0.08 + i * 0.04)}
                      exit={{ opacity: 0, scale: 0.85 }}
                      layout
                    >
                      <button className="focus-vision-delete" onClick={() => handleDeleteVision(card.id)}><Trash2 size={13} /></button>
                      <div className="focus-vision-emoji">{card.emoji}</div>
                      <p className="focus-vision-text">{card.text}</p>
                      <div className="focus-vision-glow" style={{ background: card.color }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
