import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertTriangle } from 'lucide-react';
import './TaskCard.css';

interface TaskCardProps {
  id: string;
  timeLabel: string;
  title: string;
  icon: string;
  isCritical?: boolean;
  isCompleted: boolean;
  onToggle: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  id,
  timeLabel,
  title,
  isCritical = false,
  isCompleted,
  onToggle,
}) => {
  return (
    <motion.div
      className={`task-card ${isCritical ? 'critical' : ''} ${isCompleted ? 'completed' : ''}`}
      whileTap={{ scale: 0.985 }}
      onClick={() => onToggle(id)}
    >
      <div className="task-card__check">
        <motion.div
          className={`task-card__circle ${isCompleted ? 'task-card__circle--done' : ''} ${isCritical && !isCompleted ? 'task-card__circle--critical' : ''}`}
          animate={isCompleted ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {isCompleted && <Check size={14} strokeWidth={3} color="white" />}
        </motion.div>
      </div>

      <div className="task-card__body">
        {timeLabel && timeLabel !== 'Anytime' && (
          <span className={`task-card__time ${isCritical ? 'task-card__time--critical' : ''}`}>{timeLabel}</span>
        )}
        <span className={`task-card__title ${isCompleted ? 'task-card__title--done' : ''} ${isCritical ? 'task-card__title--critical' : ''}`}>
          {title}
        </span>
        {isCritical && !isCompleted && (
          <span className="task-card__critical-badge">
            <AlertTriangle size={10} /> Critical
          </span>
        )}
      </div>
    </motion.div>
  );
};
