import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, AlertCircle, MinusCircle, CheckCircle, Pencil } from 'lucide-react';
import './AddTaskModal.css';

interface TaskData {
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: TaskData) => void;
  initialData?: TaskData & { id?: string };
  mode?: 'add' | 'edit';
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'add',
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setNotes(initialData?.notes || '');
      setDueDate(initialData?.due_date || '');
      setPriority(initialData?.priority || 'medium');
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate || null,
      priority,
    });
    onClose();
  };

  const priorities = [
    { value: 'high' as const,   label: 'High',   icon: AlertCircle,  color: 'var(--p-high)' },
    { value: 'medium' as const, label: 'Med',    icon: MinusCircle,  color: 'var(--p-medium)' },
    { value: 'low' as const,    label: 'Low',    icon: CheckCircle,  color: 'var(--p-low)' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>{mode === 'edit' ? 'Edit Task' : 'New Task'}</h2>
              <button className="close-btn" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                placeholder="Add any details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Due Date (optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <div className="priority-buttons">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    className={`priority-btn ${priority === p.value ? 'active' : ''}`}
                    style={{
                      borderColor: priority === p.value ? p.color : 'var(--border)',
                      backgroundColor: priority === p.value ? `${p.color}18` : 'transparent',
                    }}
                    onClick={() => setPriority(p.value)}
                  >
                    <p.icon size={18} color={priority === p.value ? p.color : 'var(--text-3)'} />
                    <span style={{ color: priority === p.value ? p.color : 'var(--text-3)' }}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`submit-btn ${!title.trim() ? 'disabled' : ''}`}
              onClick={handleSubmit}
              disabled={!title.trim()}
            >
              {mode === 'edit' ? <Pencil size={20} /> : <Plus size={20} />}
              {mode === 'edit' ? 'Save Changes' : 'Add Task'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
