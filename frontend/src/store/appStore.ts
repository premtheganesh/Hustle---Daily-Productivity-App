import { create } from 'zustand';
import { api } from '../utils/api';
import { getTodayString } from '../utils/helpers';

interface Profile {
  id: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  level_title: string;
  badges: string[];
  last_active_date: string | null;
}

interface RoutineTask {
  id: string;
  time_label: string;
  title: string;
  icon: string;
  is_critical: boolean;
  order: number;
  day_types: string;
}

interface DailyProgress {
  id: string;
  date: string;
  completed_routine_task_ids: string[];
  day_type: string;
  total_xp_earned: number;
  is_day_complete: boolean;
}

interface OneOffTask {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  is_completed: boolean;
}

interface Quote {
  text: string;
  author: string;
}

interface AppState {
  profile: Profile | null;
  routineTasks: RoutineTask[];
  dailyProgress: DailyProgress | null;
  oneOffTasks: OneOffTask[];
  quote: Quote | null;
  badgesInfo: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  showCelebration: boolean;
  activeTab: string;

  fetchProfile: () => Promise<void>;
  fetchRoutineTasks: () => Promise<void>;
  fetchDailyProgress: (date?: string) => Promise<void>;
  fetchOneOffTasks: () => Promise<void>;
  fetchQuote: () => Promise<void>;
  fetchBadgesInfo: () => Promise<void>;
  toggleRoutineTask: (taskId: string) => Promise<void>;
  createOneOffTask: (task: any) => Promise<void>;
  updateOneOffTask: (taskId: string, task: any) => Promise<void>;
  completeOneOffTask: (taskId: string) => Promise<void>;
  deleteOneOffTask: (taskId: string) => Promise<void>;
  addRoutineTask: (task: any) => Promise<void>;
  deleteRoutineTask: (taskId: string) => Promise<void>;
  updateRoutineTask: (taskId: string, task: any) => Promise<void>;
  reorderRoutineTasks: (orderedIds: string[], dayType: string) => Promise<void>;
  setCelebration: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  initializeApp: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  routineTasks: [],
  dailyProgress: null,
  oneOffTasks: [],
  quote: null,
  badgesInfo: {},
  isLoading: false,
  error: null,
  showCelebration: false,
  activeTab: 'home',

  fetchProfile: async () => {
    try {
      const profile = await api.getProfile();
      set({ profile });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  },

  fetchRoutineTasks: async () => {
    try {
      const routineTasks = await api.getRoutineTasks();
      set({ routineTasks });
    } catch (error: any) {
      console.error('Error fetching routine tasks:', error);
    }
  },

  fetchDailyProgress: async (date?: string) => {
    try {
      const targetDate = date || getTodayString();
      const dailyProgress = await api.getDailyProgress(targetDate);
      set({ dailyProgress });
    } catch (error: any) {
      console.error('Error fetching daily progress:', error);
    }
  },

  fetchOneOffTasks: async () => {
    try {
      const oneOffTasks = await api.getTasks(true);
      set({ oneOffTasks });
    } catch (error: any) {
      console.error('Error fetching one-off tasks:', error);
    }
  },

  fetchQuote: async () => {
    try {
      const quote = await api.getQuoteOfDay();
      set({ quote });
    } catch (error: any) {
      console.error('Error fetching quote:', error);
    }
  },

  fetchBadgesInfo: async () => {
    try {
      const badgesInfo = await api.getBadgesInfo();
      set({ badgesInfo });
    } catch (error: any) {
      console.error('Error fetching badges info:', error);
    }
  },

  toggleRoutineTask: async (taskId: string) => {
    try {
      const today = getTodayString();
      const result = await api.toggleRoutineTask(taskId, today);
      set({ dailyProgress: result.progress });
      await get().fetchProfile();
      if (result.is_day_complete) {
        set({ showCelebration: true });
      }
    } catch (error: any) {
      console.error('Error toggling routine task:', error);
    }
  },

  createOneOffTask: async (task) => {
    try {
      await api.createTask(task);
      await get().fetchOneOffTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
    }
  },

  updateOneOffTask: async (taskId: string, task: any) => {
    try {
      await api.updateTask(taskId, task);
      await get().fetchOneOffTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
    }
  },

  completeOneOffTask: async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      await get().fetchOneOffTasks();
      await get().fetchProfile();
    } catch (error: any) {
      console.error('Error completing task:', error);
    }
  },

  deleteOneOffTask: async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      await get().fetchOneOffTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
    }
  },

  addRoutineTask: async (task) => {
    try {
      await api.createRoutineTask(task);
      await get().fetchRoutineTasks();
    } catch (error: any) {
      console.error('Error adding routine task:', error);
    }
  },

  deleteRoutineTask: async (taskId: string) => {
    try {
      await api.deleteRoutineTask(taskId);
      await get().fetchRoutineTasks();
    } catch (error: any) {
      console.error('Error deleting routine task:', error);
    }
  },

  updateRoutineTask: async (taskId: string, task: any) => {
    try {
      await api.updateRoutineTask(taskId, task);
      await get().fetchRoutineTasks();
    } catch (error: any) {
      console.error('Error updating routine task:', error);
    }
  },

  reorderRoutineTasks: async (orderedIds: string[], dayType: string) => {
    try {
      await api.reorderRoutineTasks(orderedIds, dayType);
      await get().fetchRoutineTasks();
    } catch (error: any) {
      console.error('Error reordering tasks:', error);
    }
  },

  setCelebration: (show: boolean) => set({ showCelebration: show }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),

  initializeApp: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchProfile(),
        get().fetchRoutineTasks(),
        get().fetchDailyProgress(),
        get().fetchOneOffTasks(),
        get().fetchQuote(),
        get().fetchBadgesInfo(),
      ]);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
