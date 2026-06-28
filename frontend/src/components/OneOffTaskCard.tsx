import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Trash2, Calendar, Pencil } from 'lucide-react';
import { formatDueDate } from '../utils/helpers';
import './OneOffTaskCard.css';

interface OneOffTaskCardProps {
  id: string;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  priority: 'high' | 'medium' | 'low';
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const OneOffTaskCard: React.FC<OneOffTaskCardProps> = ({
  id,
  title,
  notes,
  dueDate,
  priority,
  onComplete,
  onDelete,
  onEdit,
}) => {
  const priorityConfig = {
    high:   { color: 'var(--p-high)',   label: 'High' },
    medium: { color: 'var(--p-medium)', label: 'Med' },
    low:    { color: 'var(--p-low)',    label: 'Low' },
  };

  const { color: priorityColor, label: priorityLabel } = priorityConfig[priority];
  const dueDateInfo = dueDate ? formatDueDate(dueDate) : null;

  return (
    <motion.div
      className="oneoff-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
    >
      <div className="priority-strip" style={{ backgroundColor: priorityColor }} />

      <div className="card-content">
        <div className="main-content">
          <div className="card-header">
            <span
              className="priority-badge"
              style={{ backgroundColor: `${priorityColor}18`, color: priorityColor, border: `1px solid ${priorityColor}30` }}
            >
              {priorityLabel}
            </span>

            {dueDateInfo && (
              <span className={`due-badge ${dueDateInfo.isUrgent ? 'urgent' : ''}`}>
                <Calendar size={11} />
                {dueDateInfo.label}
              </span>
            )}
          </div>

          <h3 className="card-title">{title}</h3>
          {notes && <p className="card-notes">{notes}</p>}
        </div>

        <div className="card-actions">
          <button className="action-btn complete" onClick={() => onComplete(id)} aria-label="Complete">
            <CheckCircle size={26} />
          </button>
          {onEdit && (
            <button className="action-btn edit" onClick={() => onEdit(id)} aria-label="Edit">
              <Pencil size={16} />
            </button>
          )}
          <button className="action-btn delete" onClick={() => onDelete(id)} aria-label="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
