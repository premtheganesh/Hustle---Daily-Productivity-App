import React, { useState } from 'react';
import { Plus, AlertCircle, Clock, ListTodo, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { OneOffTaskCard } from '../components/OneOffTaskCard';
import { AddTaskModal } from '../components/AddTaskModal';
import './TasksPage.css';

export const TasksPage: React.FC = () => {
  const { oneOffTasks, createOneOffTask, completeOneOffTask, deleteOneOffTask, updateOneOffTask } = useAppStore();

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const pendingTasks = oneOffTasks.filter((t) => !t.is_completed);
  const completedTasks = oneOffTasks.filter((t) => t.is_completed);

  const todayTasks = pendingTasks.filter((t) => t.due_date === today);
  const otherTasks = pendingTasks.filter((t) => t.due_date !== today);

  const highPriorityCount = pendingTasks.filter((t) => t.priority === 'high').length;
  const urgentCount = pendingTasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return diff <= 1;
  }).length;

  const handleDelete = (taskId: string) => {
    if (window.confirm('Delete this task?')) deleteOneOffTask(taskId);
  };

  const handleEdit = (taskId: string) => {
    const task = oneOffTasks.find(t => t.id === taskId);
    if (task) setEditingTask(task);
  };

  const handleEditSubmit = (data: any) => {
    if (editingTask) updateOneOffTask(editingTask.id, data);
    setEditingTask(null);
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div>
          <h1>Tasks</h1>
          <p className="tasks-subtitle">{pendingTasks.length} pending{completedTasks.length > 0 ? ` · ${completedTasks.length} done` : ''}</p>
        </div>
        <div className="tasks-badges">
          {urgentCount > 0 && (
            <span className="tasks-badge tasks-badge--urgent">
              <AlertCircle size={12} />
              {urgentCount} urgent
            </span>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="tasks-stats">
        <div className="tasks-stat">
          <div className="tasks-stat__icon tasks-stat__icon--high">
            <AlertCircle size={18} />
          </div>
          <span className="tasks-stat__val">{highPriorityCount}</span>
          <span className="tasks-stat__lbl">High</span>
        </div>
        <div className="tasks-stat-divider" />
        <div className="tasks-stat">
          <div className="tasks-stat__icon tasks-stat__icon--warn">
            <Clock size={18} />
          </div>
          <span className="tasks-stat__val">{urgentCount}</span>
          <span className="tasks-stat__lbl">Due Soon</span>
        </div>
        <div className="tasks-stat-divider" />
        <div className="tasks-stat">
          <div className="tasks-stat__icon tasks-stat__icon--normal">
            <ListTodo size={18} />
          </div>
          <span className="tasks-stat__val">{pendingTasks.length}</span>
          <span className="tasks-stat__lbl">Total</span>
        </div>
      </div>

      {/* Today's tasks */}
      {todayTasks.length > 0 && (
        <div className="task-section">
          <p className="task-section__label">Due Today</p>
          <div className="task-list">
            {todayTasks.map((task) => (
              <OneOffTaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                notes={task.notes}
                dueDate={task.due_date}
                priority={task.priority}
                onComplete={completeOneOffTask}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other pending tasks */}
      {otherTasks.length > 0 ? (
        <div className="task-section">
          {todayTasks.length > 0 && <p className="task-section__label">Other Tasks</p>}
          <div className="task-list">
            {otherTasks.map((task) => (
              <OneOffTaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                notes={task.notes}
                dueDate={task.due_date}
                priority={task.priority}
                onComplete={completeOneOffTask}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      ) : todayTasks.length === 0 ? (
        <motion.div
          className="tasks-empty"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle2 size={52} color="var(--success)" />
          <h2>All clear!</h2>
          <p>No pending tasks. Add one below.</p>
        </motion.div>
      ) : null}

      {/* Completed section */}
      {completedTasks.length > 0 && (
        <div className="completed-section">
          <button
            className="completed-toggle"
            onClick={() => setShowCompleted(v => !v)}
          >
            <CheckCircle2 size={15} color="var(--success)" />
            <span>{completedTasks.length} completed</span>
            {showCompleted ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                className="completed-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {completedTasks.map((task) => (
                  <div key={task.id} className="completed-task-row">
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span className="completed-task-title">{task.title}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* FAB */}
      <motion.button
        className="tasks-fab"
        onClick={() => setShowModal(true)}
        whileTap={{ scale: 0.92 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Plus size={28} />
      </motion.button>

      {/* Add modal */}
      <AddTaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={createOneOffTask}
        mode="add"
      />

      {/* Edit modal */}
      <AddTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEditSubmit}
        initialData={editingTask}
        mode="edit"
      />
    </div>
  );
};
