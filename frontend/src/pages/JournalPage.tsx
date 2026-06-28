import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Save, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { api } from '../utils/api';
import { getTodayString } from '../utils/helpers';
import './JournalPage.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

function offsetDate(base: string, delta: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

function formatDate(ds: string): string {
  const d = new Date(ds + 'T00:00:00');
  const today = getTodayString();
  if (ds === today) return 'Today';
  if (ds === offsetDate(today, -1)) return 'Yesterday';
  return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

const PROMPTS = [
  "What did you accomplish today?",
  "What's one thing you're proud of?",
  "What could you do better tomorrow?",
  "How are you feeling about your progress?",
  "What's keeping you motivated right now?",
];

export const JournalPage: React.FC = () => {
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptIdx = new Date(today).getDay() % PROMPTS.length;

  useEffect(() => {
    api.getDailyNote(selectedDate).then(data => {
      setNote(data.note || '');
      setSaved(false);
    });
  }, [selectedDate]);

  useEffect(() => {
    api.getRecentNotes(7).then(setRecentNotes);
  }, []);

  const handleNoteChange = (val: string) => {
    setNote(val);
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => autoSave(val), 1500);
  };

  const autoSave = async (text: string) => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.saveDailyNote(selectedDate, text);
      setSaved(true);
      api.getRecentNotes(7).then(setRecentNotes);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.saveDailyNote(selectedDate, note);
      setSaved(true);
      api.getRecentNotes(7).then(setRecentNotes);
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = selectedDate < today;

  return (
    <div className="journal-page">
      <motion.div className="journal-header" {...fadeUp(0)}>
        <h1>Journal</h1>
        <p className="journal-subtitle">Daily reflections</p>
      </motion.div>

      {/* Date nav */}
      <motion.div className="journal-date-nav" {...fadeUp(0.05)}>
        <button className="date-nav-btn" onClick={() => setSelectedDate(d => offsetDate(d, -1))}>
          <ChevronLeft size={18} />
        </button>
        <span className="date-nav-label">{formatDate(selectedDate)}</span>
        <button
          className="date-nav-btn"
          onClick={() => setSelectedDate(d => offsetDate(d, 1))}
          disabled={!canGoNext}
          style={{ opacity: canGoNext ? 1 : 0.3 }}
        >
          <ChevronRight size={18} />
        </button>
      </motion.div>

      {/* Prompt (today only) */}
      {selectedDate === today && (
        <motion.div className="journal-prompt" {...fadeUp(0.08)}>
          <BookOpen size={14} color="var(--primary-light)" />
          <span>{PROMPTS[promptIdx]}</span>
        </motion.div>
      )}

      {/* Editor */}
      <motion.div className="journal-editor-wrap" {...fadeUp(0.1)}>
        <textarea
          className="journal-textarea"
          value={note}
          onChange={e => handleNoteChange(e.target.value)}
          placeholder="Write your thoughts here…"
          rows={8}
        />
        <div className="journal-editor-footer">
          <span className="journal-word-count">{note.trim() ? note.trim().split(/\s+/).length : 0} words</span>
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span
                key="saved"
                className="journal-save-status saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Check size={12} />
                Saved
              </motion.span>
            ) : (
              <motion.button
                key="btn"
                className={`journal-save-btn ${saving ? 'saving' : ''}`}
                onClick={handleManualSave}
                disabled={saving || !note.trim()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Save size={13} />
                {saving ? 'Saving…' : 'Save'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <motion.div {...fadeUp(0.14)}>
          <p className="section-label" style={{ marginBottom: 'var(--space-3)' }}>Recent Entries</p>
          <div className="journal-recent">
            {recentNotes.map((n, i) => (
              <motion.button
                key={n.date}
                className={`journal-recent-item ${n.date === selectedDate ? 'active' : ''}`}
                onClick={() => setSelectedDate(n.date)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16 + i * 0.04 }}
              >
                <div className="journal-recent-date">{formatDate(n.date)}</div>
                <div className="journal-recent-preview">{n.note.slice(0, 80)}{n.note.length > 80 ? '…' : ''}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
