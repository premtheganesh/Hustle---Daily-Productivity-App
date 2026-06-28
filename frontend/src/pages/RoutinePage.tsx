import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Check, X, Lock, Zap, GripVertical, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { TaskCard } from '../components/TaskCard';
import { ProgressRing } from '../components/ProgressRing';
import { CalendarStrip } from '../components/CalendarStrip';
import { getTodayString, getDayName, getProgressMessage } from '../utils/helpers';
import { api } from '../utils/api';
import './RoutinePage.css';

function getDayTypeForDate(dateStr: string): 'weekday' | 'saturday' | 'sunday' {
  const d = new Date(dateStr + 'T00:00:00');
  const wd = d.getDay(); // 0=Sun,6=Sat
  if (wd === 6) return 'saturday';
  if (wd === 0) return 'sunday';
  return 'weekday';
}

function taskMatchesDayType(dayTypes: string, dayType: string): boolean {
  return dayTypes.split(',').map(s => s.trim()).includes(dayType);
}

export const RoutinePage: React.FC = () => {
  const { routineTasks, dailyProgress, toggleRoutineTask, addRoutineTask, deleteRoutineTask, updateRoutineTask, reorderRoutineTasks } = useAppStore();

  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedProgress, setSelectedProgress] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const isToday = selectedDate === todayStr;
  const dayName = getDayName(selectedDate);
  const dayType = getDayTypeForDate(selectedDate);
  const isWeekend = dayType === 'saturday' || dayType === 'sunday';

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const todayDateObj = new Date(todayStr + 'T00:00:00');
  const isPast = selectedDateObj < todayDateObj;
  const isFuture = selectedDateObj > todayDateObj;
  const isReadOnly = isPast || isFuture;

  const activeProgress = isToday ? dailyProgress : selectedProgress;
  const completedIds: string[] = activeProgress?.completed_routine_task_ids || [];

  // Filter tasks by day type
  const dayTasks = routineTasks.filter(t => taskMatchesDayType(t.day_types || 'weekday', dayType));
  const completedTasks = completedIds.length;
  const totalTasks = dayTasks.length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // Local order state for drag-to-reorder
  const [localTasks, setLocalTasks] = useState(dayTasks);
  const reorderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalTasks(dayTasks);
  }, [routineTasks, selectedDate]);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newIsCritical, setNewIsCritical] = useState(false);
  const [newDayTypes, setNewDayTypes] = useState<string[]>([dayType]);

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editIsCritical, setEditIsCritical] = useState(false);
  const [editDayTypes, setEditDayTypes] = useState<string[]>(['weekday']);

  useEffect(() => {
    if (isToday) { setSelectedProgress(null); return; }
    const fetch = async () => {
      setLoadingProgress(true);
      try {
        const prog = await api.getDailyProgress(selectedDate);
        setSelectedProgress(prog);
      } catch {
        setSelectedProgress(null);
      } finally {
        setLoadingProgress(false);
      }
    };
    fetch();
  }, [selectedDate, isToday]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const types = newDayTypes.length > 0 ? newDayTypes.join(',') : dayType;
    addRoutineTask({
      title: newTitle.trim(),
      time_label: newTime.trim() || 'Anytime',
      icon: 'checkbox-outline',
      is_critical: newIsCritical,
      day_types: types,
    });
    setNewTitle('');
    setNewTime('');
    setNewIsCritical(false);
    setNewDayTypes([dayType]);
    setShowAddForm(false);
  };

  const handleEditStart = (task: any) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditTime(task.time_label);
    setEditIsCritical(task.is_critical);
    setEditDayTypes((task.day_types || 'weekday').split(',').map((s: string) => s.trim()));
  };

  const handleEditSave = () => {
    if (!editTitle.trim() || !editingId) return;
    updateRoutineTask(editingId, {
      title: editTitle.trim(),
      time_label: editTime.trim() || 'Anytime',
      is_critical: editIsCritical,
      day_types: editDayTypes.join(','),
    });
    setEditingId(null);
  };

  const handleReorder = (newOrder: any[]) => {
    setLocalTasks(newOrder);
    if (reorderTimeout.current) clearTimeout(reorderTimeout.current);
    reorderTimeout.current = setTimeout(() => {
      reorderRoutineTasks(newOrder.map(t => t.id), dayType);
    }, 600);
  };

  const formatSelectedDate = (ds: string) => {
    const d = new Date(ds + 'T00:00:00');
    return format(d, 'EEEE, MMM d');
  };

  const toggleDayTypeInArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  return (
    <div className="routine-page">
      <div className="routine-header">
        <h1>Routine</h1>
        <p className="subtitle">{isToday ? `Today — ${dayName}` : formatSelectedDate(selectedDate)}</p>
      </div>

      <CalendarStrip
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        totalTasks={totalTasks}
      />

      {isReadOnly && (
        <div className={`readonly-banner ${isPast ? 'readonly-banner--past' : 'readonly-banner--future'}`}>
          <Lock size={13} />
          <span>
            {isPast
              ? `${formatSelectedDate(selectedDate)} — read-only`
              : `${formatSelectedDate(selectedDate)} — upcoming`}
          </span>
        </div>
      )}

      <div className="progress-section">
        {loadingProgress ? (
          <p className="progress-loading">Loading…</p>
        ) : (
          <>
            <ProgressRing progress={progress} completed={completedTasks} total={totalTasks} size={96} strokeWidth={8} />
            <div className="progress-info">
              <p className="progress-message">
                {isFuture ? 'Upcoming — stay ready!' : isWeekend ? getProgressMessage(completedTasks, totalTasks) : getProgressMessage(completedTasks, totalTasks)}
              </p>
              {isWeekend && (
                <span className="weekend-pill">Weekend mode</span>
              )}
              {(activeProgress?.total_xp_earned || 0) > 0 && (
                <span className="xp-earned">
                  <Zap size={12} />
                  +{activeProgress.total_xp_earned} XP earned
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="routine-task-list">
        {localTasks.length === 0 ? (
          <div className="routine-empty">
            <p>No tasks for {isWeekend ? 'this weekend day' : 'weekdays'} yet.</p>
            <p className="routine-empty-sub">Add one below!</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={localTasks} onReorder={handleReorder} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence>
              {localTasks.map((task) => {
                const isCompleted = completedIds.includes(task.id);

                if (editingId === task.id) {
                  return (
                    <motion.div
                      key={task.id}
                      className="edit-form"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <input
                        className="edit-input"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Task name"
                        autoFocus
                      />
                      <input
                        className="edit-input"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        placeholder="Time (e.g. 7:30 AM)"
                      />
                      <div className="day-type-picker">
                        <span className="day-type-label">Show on:</span>
                        {(['weekday', 'saturday', 'sunday'] as const).map(dt => (
                          <button
                            key={dt}
                            className={`day-type-chip ${editDayTypes.includes(dt) ? 'active' : ''}`}
                            onClick={() => setEditDayTypes(toggleDayTypeInArray(editDayTypes, dt))}
                          >
                            {dt === 'weekday' ? 'Weekdays' : dt === 'saturday' ? 'Sat' : 'Sun'}
                          </button>
                        ))}
                      </div>
                      <label className="critical-toggle">
                        <input
                          type="checkbox"
                          checked={editIsCritical}
                          onChange={e => setEditIsCritical(e.target.checked)}
                        />
                        <AlertCircle size={13} color="var(--error)" />
                        Mark as critical
                      </label>
                      <div className="edit-actions">
                        <button className="btn-icon btn-confirm" onClick={handleEditSave}><Check size={15} /></button>
                        <button className="btn-icon btn-cancel" onClick={() => setEditingId(null)}><X size={15} /></button>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <Reorder.Item key={task.id} value={task} dragListener={!isReadOnly}>
                    <div className="task-row">
                      {!isReadOnly && (
                        <div className="drag-handle">
                          <GripVertical size={16} color="var(--text-4)" />
                        </div>
                      )}
                      <TaskCard
                        id={task.id}
                        timeLabel={task.time_label}
                        title={task.title}
                        icon={task.icon}
                        isCritical={task.is_critical}
                        isCompleted={isCompleted}
                        onToggle={isToday ? toggleRoutineTask : () => {}}
                      />
                      {!isReadOnly && (
                        <div className="task-actions">
                          <button className="btn-icon btn-edit" onClick={() => handleEditStart(task)} aria-label="Edit"><Pencil size={13} /></button>
                          <button className="btn-icon btn-delete" onClick={() => deleteRoutineTask(task.id)} aria-label="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="add-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <input
              className="edit-input"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task name e.g. Drink protein shake"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              className="edit-input"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              placeholder="Time e.g. 8:00 AM (optional)"
            />
            <div className="day-type-picker">
              <span className="day-type-label">Show on:</span>
              {(['weekday', 'saturday', 'sunday'] as const).map(dt => (
                <button
                  key={dt}
                  className={`day-type-chip ${newDayTypes.includes(dt) ? 'active' : ''}`}
                  onClick={() => setNewDayTypes(toggleDayTypeInArray(newDayTypes, dt))}
                >
                  {dt === 'weekday' ? 'Weekdays' : dt === 'saturday' ? 'Sat' : 'Sun'}
                </button>
              ))}
            </div>
            <label className="critical-toggle">
              <input
                type="checkbox"
                checked={newIsCritical}
                onChange={e => setNewIsCritical(e.target.checked)}
              />
              <AlertCircle size={13} color="var(--error)" />
              Mark as critical
            </label>
            <div className="edit-actions">
              <button className="btn-icon btn-confirm" onClick={handleAdd}><Check size={15} /></button>
              <button className="btn-icon btn-cancel" onClick={() => setShowAddForm(false)}><X size={15} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button className="fab-button" onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}>
        <Plus size={20} />
        Add Task
      </button>
    </div>
  );
};
