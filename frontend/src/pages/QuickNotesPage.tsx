import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Check, X, StickyNote } from 'lucide-react';
import { api } from '../utils/api';
import './QuickNotesPage.css';

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.25, 0.46, 0.45, 0.94] },
});

export const QuickNotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const newInputRef = useRef<HTMLTextAreaElement>(null);

  const load = () => api.getQuickNotes().then(setNotes).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const note = await api.createQuickNote(newText.trim());
    setNotes(prev => [note, ...prev]);
    setNewText('');
  };

  const handleDelete = async (id: string) => {
    await api.deleteQuickNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleEditStart = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  const handleEditSave = async () => {
    if (!editingId || !editText.trim()) return;
    const updated = await api.updateQuickNote(editingId, editText.trim());
    setNotes(prev => prev.map(n => n.id === editingId ? updated : n));
    setEditingId(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="notes-page">
      <motion.div className="notes-header" {...fadeUp(0)}>
        <h1>Quick Notes</h1>
        <p className="notes-subtitle">Your personal scratchpad</p>
      </motion.div>

      {/* Add new note */}
      <motion.div className="note-add-card" {...fadeUp(0.05)}>
        <textarea
          ref={newInputRef}
          className="note-add-input"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Dump your thoughts here…"
          rows={3}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.metaKey) handleAdd();
          }}
        />
        <div className="note-add-footer">
          <span className="note-add-hint">⌘↵ to save</span>
          <button
            className={`note-add-btn ${!newText.trim() ? 'disabled' : ''}`}
            onClick={handleAdd}
            disabled={!newText.trim()}
          >
            <Plus size={15} />
            Add Note
          </button>
        </div>
      </motion.div>

      {/* Notes list */}
      {loading ? (
        <div className="notes-empty">Loading…</div>
      ) : notes.length === 0 ? (
        <motion.div className="notes-empty-state" {...fadeUp(0.1)}>
          <StickyNote size={48} color="var(--text-4)" />
          <p>No notes yet. Add your first one above!</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="notes-list">
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                className="note-card"
                {...fadeUp(0.08 + i * 0.04)}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                layout
              >
                {editingId === note.id ? (
                  <div className="note-edit-wrap">
                    <textarea
                      className="note-edit-input"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                      rows={4}
                    />
                    <div className="note-edit-actions">
                      <button className="note-action-btn confirm" onClick={handleEditSave}><Check size={14} /></button>
                      <button className="note-action-btn cancel" onClick={() => setEditingId(null)}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="note-content">{note.content}</p>
                    <div className="note-footer">
                      <span className="note-time">{formatTime(note.updated_at)}</span>
                      <div className="note-actions">
                        <button className="note-action-btn edit" onClick={() => handleEditStart(note)}><Edit3 size={13} /></button>
                        <button className="note-action-btn delete" onClick={() => handleDelete(note.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
