import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sun, Moon, Stars, ChevronRight, CheckCircle2, AlertCircle, Send, Info, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import './SettingsPage.css';

const DEFAULT_TIMES = {
  morning: '08:00',
  evening: '19:30',
  night:   '22:00',
};

const STORAGE_KEY = 'hustle_notif_settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_TIMES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_TIMES };
}

function saveSettings(s: typeof DEFAULT_TIMES) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function getDayType() {
  const day = new Date().getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

function taskMatchesDayType(task: { day_types: string }, dayType: string) {
  if (!task.day_types || task.day_types === 'all') return true;
  return task.day_types === dayType || task.day_types === 'all';
}

function fmt12(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

let notifInterval: ReturnType<typeof setInterval> | null = null;

function startNotifLoop(
  times: typeof DEFAULT_TIMES,
  routineTasks: any[],
  oneOffTasks: any[],
  completedIds: string[]
) {
  if (notifInterval) clearInterval(notifInterval);

  function check() {
    if (Notification.permission !== 'granted') return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const today = now.toISOString().split('T')[0];
    const dayType = getDayType();
    const todayKey = `hustle_fired_${today}`;
    const fired: Set<string> = new Set(JSON.parse(localStorage.getItem(todayKey) || '[]'));

    const todayRoutine = routineTasks.filter(t => taskMatchesDayType(t, dayType));
    const todayOneOff = oneOffTasks.filter(t => !t.is_completed && t.due_date === today);
    const allTitles = [...todayRoutine.map(t => t.title), ...todayOneOff.map(t => t.title)];
    const pendingRoutine = todayRoutine.filter(t => !completedIds.includes(t.id));
    const doneCount = todayRoutine.length - pendingRoutine.length;
    const totalCount = todayRoutine.length + todayOneOff.length;

    const slots = [
      {
        id: 'morning',
        time: times.morning,
        build: () => ({
          title: '⚡ Good morning — here\'s your day',
          body: totalCount === 0
            ? 'No tasks scheduled today. Enjoy your day!'
            : `${totalCount} task${totalCount > 1 ? 's' : ''} today: ${allTitles.slice(0, 3).join(' · ')}${allTitles.length > 3 ? ` +${allTitles.length - 3} more` : ''}`,
        }),
      },
      {
        id: 'evening',
        time: times.evening,
        build: () => ({
          title: `⚡ Evening check-in — ${doneCount}/${todayRoutine.length} done`,
          body: pendingRoutine.length === 0
            ? 'All routine tasks complete! Great work today.'
            : `Still pending: ${pendingRoutine.slice(0, 3).map(t => t.title).join(' · ')}`,
        }),
      },
      {
        id: 'night',
        time: times.night,
        build: () => ({
          title: `⚡ Day wrap — ${doneCount} task${doneCount !== 1 ? 's' : ''} crushed`,
          body: 'Tomorrow\'s routine is ready. Rest up and come back stronger.',
        }),
      },
    ];

    slots.forEach(slot => {
      if (fired.has(slot.id)) return;
      const [sh, sm] = slot.time.split(':').map(Number);
      const slotMin = sh * 60 + sm;
      if (nowMin >= slotMin && nowMin < slotMin + 30) {
        const { title, body } = slot.build();
        new Notification(title, { body, icon: '/icons/icon-192.png', tag: slot.id });
        fired.add(slot.id);
      }
    });

    localStorage.setItem(todayKey, JSON.stringify([...fired]));
  }

  check();
  notifInterval = setInterval(check, 10 * 60 * 1000); // every 10 min
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

export const SettingsPage: React.FC = () => {
  const { routineTasks, oneOffTasks, dailyProgress } = useAppStore();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [times, setTimes] = useState(loadSettings);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  const completedIds = dailyProgress?.completed_routine_task_ids ?? [];

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    const stored = localStorage.getItem('notifications_enabled') === 'true';
    setEnabled(stored);
  }, []);

  const restartLoop = useCallback((t: typeof DEFAULT_TIMES) => {
    if (enabled && permission === 'granted') {
      startNotifLoop(t, routineTasks, oneOffTasks, completedIds);
    }
  }, [enabled, permission, routineTasks, oneOffTasks, completedIds]);

  useEffect(() => {
    restartLoop(times);
    return () => { if (notifInterval) clearInterval(notifInterval); };
  }, [restartLoop, times]);

  const handleToggle = async () => {
    if (!('Notification' in window)) { alert('This browser does not support notifications'); return; }
    if (!enabled) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') {
        setEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        startNotifLoop(times, routineTasks, oneOffTasks, completedIds);
      } else {
        alert('Please enable notifications in your browser settings.');
      }
    } else {
      setEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
      if (notifInterval) clearInterval(notifInterval);
    }
  };

  const handleTimeChange = (slot: keyof typeof DEFAULT_TIMES, val: string) => {
    const next = { ...times, [slot]: val };
    setTimes(next);
    saveSettings(next);
    restartLoop(next);
  };

  const handleTest = () => {
    if (permission !== 'granted') return;
    const dayType = getDayType();
    const today = new Date().toISOString().split('T')[0];
    const todayRoutine = routineTasks.filter(t => taskMatchesDayType(t, dayType));
    const todayOneOff = oneOffTasks.filter(t => !t.is_completed && t.due_date === today);
    const total = todayRoutine.length + todayOneOff.length;
    const allTitles = [...todayRoutine.map(t => t.title), ...todayOneOff.map(t => t.title)];
    new Notification('⚡ Good morning — here\'s your day', {
      body: total === 0 ? 'No tasks today!' : `${total} tasks: ${allTitles.slice(0, 3).join(' · ')}${allTitles.length > 3 ? ` +${allTitles.length - 3} more` : ''}`,
      icon: '/icons/icon-192.png',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const SLOTS = [
    {
      id: 'morning',
      icon: <Sun size={18} color="#F59E0B" />,
      iconBg: 'rgba(245,158,11,0.12)',
      iconBorder: 'rgba(245,158,11,0.22)',
      label: 'Morning overview',
      desc: "Today's tasks & routine",
    },
    {
      id: 'evening',
      icon: <Moon size={18} color="var(--primary)" />,
      iconBg: 'rgba(91,91,214,0.1)',
      iconBorder: 'rgba(91,91,214,0.2)',
      label: 'Evening review',
      desc: 'Progress check-in',
    },
    {
      id: 'night',
      icon: <Stars size={18} color="#8B5CF6" />,
      iconBg: 'rgba(139,92,246,0.1)',
      iconBorder: 'rgba(139,92,246,0.2)',
      label: 'Night wrap-up',
      desc: "What you did · tomorrow's plan",
    },
  ] as const;

  return (
    <div className="settings-page">
      <motion.div className="settings-header" {...fadeUp(0)}>
        <h1>Settings</h1>
        <p className="settings-subtitle">Customize your experience</p>
      </motion.div>

      {/* Notifications master toggle */}
      <motion.div className="settings-card" {...fadeUp(0.06)}>
        <div className="settings-card__header">
          <div className="settings-card__icon">
            <Bell size={18} color="var(--primary-light)" />
          </div>
          <h2>Notifications</h2>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Daily Reminders</span>
            <span className="setting-desc">3 smart notifications per day</span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={enabled} onChange={handleToggle} />
            <span className="toggle__track"><span className="toggle__thumb" /></span>
          </label>
        </div>

        {enabled && permission === 'granted' && (
          <div className="notification-status">
            <CheckCircle2 size={14} color="var(--success)" />
            <span>3 daily reminders active — pulling from your real tasks</span>
          </div>
        )}

        {permission === 'denied' && (
          <div className="notification-blocked">
            <AlertCircle size={14} color="var(--error)" />
            <span>Notifications blocked. Update your browser settings to enable them.</span>
          </div>
        )}
      </motion.div>

      {/* Notification slots */}
      {enabled && permission === 'granted' && (
        <motion.div className="settings-card notif-slots-card" {...fadeUp(0.1)}>
          {SLOTS.map((slot, i) => (
            <React.Fragment key={slot.id}>
              <div
                className={`notif-slot ${expandedSlot === slot.id ? 'notif-slot--open' : ''}`}
                onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}
              >
                <div
                  className="notif-slot__icon"
                  style={{ background: slot.iconBg, border: `1px solid ${slot.iconBorder}` }}
                >
                  {slot.icon}
                </div>
                <div className="notif-slot__body">
                  <span className="notif-slot__label">{slot.label}</span>
                  <span className="notif-slot__desc">{slot.desc}</span>
                </div>
                <div className="notif-slot__right">
                  <span className="notif-slot__time">{fmt12(times[slot.id as keyof typeof times])}</span>
                  <ChevronRight
                    size={16}
                    color="var(--text-4)"
                    style={{ transform: expandedSlot === slot.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </div>
              </div>

              <AnimatePresence>
                {expandedSlot === slot.id && (
                  <motion.div
                    className="notif-slot__picker"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="time-picker-label">Set time</label>
                    <input
                      type="time"
                      className="time-picker-input"
                      value={times[slot.id as keyof typeof times]}
                      onChange={e => handleTimeChange(slot.id as keyof typeof DEFAULT_TIMES, e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {i < SLOTS.length - 1 && <div className="notif-divider" />}
            </React.Fragment>
          ))}

          <button
            className={`test-btn ${permission !== 'granted' ? 'test-btn--disabled' : ''} ${testSent ? 'test-btn--sent' : ''}`}
            onClick={handleTest}
            disabled={permission !== 'granted'}
          >
            {testSent ? <CheckCircle2 size={16} /> : <Send size={16} />}
            {testSent ? 'Sent!' : 'Preview Morning Notification'}
          </button>
        </motion.div>
      )}

      {/* About */}
      <motion.div className="settings-card" {...fadeUp(0.14)}>
        <div className="settings-card__header">
          <div className="settings-card__icon settings-card__icon--accent">
            <Info size={18} color="var(--accent)" />
          </div>
          <h2>About</h2>
        </div>
        {[
          { label: 'App',      value: 'Hustle' },
          { label: 'Version',  value: '3.0.0' },
          { label: 'Platform', value: 'Progressive Web App' },
          { label: 'Backend',  value: 'FastAPI + SQLite' },
        ].map(item => (
          <div key={item.label} className="about-row">
            <span className="about-label">{item.label}</span>
            <span className="about-value">{item.value}</span>
          </div>
        ))}
      </motion.div>

      <motion.div className="settings-footer" {...fadeUp(0.18)}>
        <Zap size={20} color="var(--primary)" />
        <p>Stay consistent. Your future self will thank you.</p>
      </motion.div>
    </div>
  );
};
