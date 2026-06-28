import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { TabBar } from './components/TabBar';
import { CelebrationModal } from './components/CelebrationModal';
import { HomePage } from './pages/HomePage';
import { RoutinePage } from './pages/RoutinePage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { JournalPage } from './pages/JournalPage';
import { WeeklySummaryPage } from './pages/WeeklySummaryPage';
import { FocusPage } from './pages/FocusPage';
import { QuickNotesPage } from './pages/QuickNotesPage';
import './styles/theme.css';
import './App.css';

function App() {
  const { activeTab, isLoading, showCelebration, setCelebration, initializeApp } = useAppStore();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const renderPage = () => {
    switch (activeTab) {
      case 'home':     return <HomePage />;
      case 'routine':  return <RoutinePage />;
      case 'tasks':    return <TasksPage />;
      case 'focus':    return <FocusPage />;
      case 'settings': return <SettingsPage />;
      case 'stats':    return <StatsPage />;
      case 'journal':  return <JournalPage />;
      case 'week':     return <WeeklySummaryPage />;
      case 'notes':    return <QuickNotesPage />;
      default:         return <HomePage />;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <div className="loading-logo-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M21 3L9 21h9l-3 12L33 15h-10L21 3z" fill="white"/>
            </svg>
          </div>
          <h1>Hustle</h1>
        </div>
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>
        <span className="loading-text">Loading your journey…</span>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="main-content">
        {renderPage()}
      </main>
      <TabBar />
      <CelebrationModal isOpen={showCelebration} onClose={() => setCelebration(false)} />
    </div>
  );
}

export default App;
