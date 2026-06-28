import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Calendar, ListTodo, Crosshair, BarChart2, BookOpen, CalendarDays, Settings, X, ChevronUp, StickyNote } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import './TabBar.css';

const mainTabs = [
  { id: 'home',    label: 'Home',    icon: Home },
  { id: 'routine', label: 'Routine', icon: Calendar },
  { id: 'tasks',   label: 'Tasks',   icon: ListTodo },
  { id: 'focus',   label: 'Focus',   icon: Crosshair },
];

const moreTabs = [
  { id: 'stats',   label: 'Analytics', icon: BarChart2 },
  { id: 'journal', label: 'Journal',   icon: BookOpen },
  { id: 'week',    label: 'Week',      icon: CalendarDays },
  { id: 'notes',   label: 'Notes',     icon: StickyNote },
  { id: 'settings',label: 'Settings',  icon: Settings },
];

export const TabBar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreTabs.some(t => t.id === activeTab);

  const handleMoreTab = (id: string) => {
    setActiveTab(id);
    setShowMore(false);
  };

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              className="more-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
            />
            <motion.div
              className="more-sheet"
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="more-sheet__handle" />
              <div className="more-sheet__grid">
                {moreTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className={`more-tab-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleMoreTab(tab.id)}
                    >
                      <div className={`more-tab-icon ${isActive ? 'active' : ''}`}>
                        <Icon size={22} />
                      </div>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="tab-bar">
        <div className="tab-bar__inner">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setShowMore(false); }}
                aria-label={tab.label}
              >
                <div className="tab-icon-wrap">
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="tab-pill"
                        layoutId="tab-pill"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon size={22} className="tab-icon" />
                </div>
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            className={`tab-item ${isMoreActive || showMore ? 'active' : ''}`}
            onClick={() => setShowMore(v => !v)}
            aria-label="More"
          >
            <div className="tab-icon-wrap">
              <AnimatePresence>
                {(isMoreActive || showMore) && !mainTabs.some(t => t.id === activeTab) && (
                  <motion.div
                    className="tab-pill"
                    layoutId="tab-pill"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <motion.div animate={{ rotate: showMore ? 180 : 0 }} transition={{ duration: 0.2 }}>
                {showMore ? <X size={22} className="tab-icon" /> : <ChevronUp size={22} className="tab-icon" />}
              </motion.div>
            </div>
            <span className="tab-label">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
