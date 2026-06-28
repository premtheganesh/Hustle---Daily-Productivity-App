const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // Profile
  getProfile: async () => {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  updateStreak: async (date: string) => {
    const res = await fetch(`${API_BASE}/profile/update-streak?date_str=${date}`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to update streak');
    return res.json();
  },

  addXP: async (amount: number) => {
    const res = await fetch(`${API_BASE}/profile/add-xp?xp_amount=${amount}`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to add XP');
    return res.json();
  },

  // Routine Tasks
  getRoutineTasks: async (dayType?: string) => {
    const url = dayType ? `${API_BASE}/routine-tasks?day_type=${dayType}` : `${API_BASE}/routine-tasks`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch routine tasks');
    return res.json();
  },

  createRoutineTask: async (task: any) => {
    const res = await fetch(`${API_BASE}/routine-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create routine task');
    return res.json();
  },

  updateRoutineTask: async (taskId: string, task: any) => {
    const res = await fetch(`${API_BASE}/routine-tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to update routine task');
    return res.json();
  },

  reorderRoutineTasks: async (orderedIds: string[], dayType: string) => {
    const res = await fetch(`${API_BASE}/routine-tasks/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds, day_type: dayType }),
    });
    if (!res.ok) throw new Error('Failed to reorder tasks');
    return res.json();
  },

  deleteRoutineTask: async (taskId: string) => {
    const res = await fetch(`${API_BASE}/routine-tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete routine task');
    return res.json();
  },

  // Daily Progress
  getDailyProgress: async (date: string) => {
    const res = await fetch(`${API_BASE}/daily-progress/${date}`);
    if (!res.ok) throw new Error('Failed to fetch daily progress');
    return res.json();
  },

  toggleRoutineTask: async (taskId: string, date: string) => {
    const res = await fetch(`${API_BASE}/daily-progress/toggle-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, date }),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  // One-off Tasks
  getTasks: async (includeCompleted = false) => {
    const res = await fetch(`${API_BASE}/tasks?include_completed=${includeCompleted}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  createTask: async (task: any) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  updateTask: async (taskId: string, task: any) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  completeTask: async (taskId: string) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to complete task');
    return res.json();
  },

  deleteTask: async (taskId: string) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  // Daily Notes
  getDailyNote: async (date: string) => {
    const res = await fetch(`${API_BASE}/daily-notes/${date}`);
    if (!res.ok) throw new Error('Failed to fetch note');
    return res.json();
  },

  saveDailyNote: async (date: string, note: string) => {
    const res = await fetch(`${API_BASE}/daily-notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, note }),
    });
    if (!res.ok) throw new Error('Failed to save note');
    return res.json();
  },

  getRecentNotes: async (limit = 7) => {
    const res = await fetch(`${API_BASE}/daily-notes?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  // Weekly Summary
  getWeeklySummary: async (weekStart?: string) => {
    const url = weekStart ? `${API_BASE}/weekly-summary?week_start=${weekStart}` : `${API_BASE}/weekly-summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch weekly summary');
    return res.json();
  },

  // Analytics
  getAnalytics: async (days = 30) => {
    const res = await fetch(`${API_BASE}/analytics?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Goals
  getGoals: async () => {
    const res = await fetch(`${API_BASE}/goals`);
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },
  createGoal: async (goal: any) => {
    const res = await fetch(`${API_BASE}/goals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) });
    if (!res.ok) throw new Error('Failed to create goal');
    return res.json();
  },
  updateGoal: async (goalId: string, goal: any) => {
    const res = await fetch(`${API_BASE}/goals/${goalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) });
    if (!res.ok) throw new Error('Failed to update goal');
    return res.json();
  },
  deleteGoal: async (goalId: string) => {
    const res = await fetch(`${API_BASE}/goals/${goalId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete goal');
    return res.json();
  },
  addMilestone: async (goalId: string, title: string) => {
    const res = await fetch(`${API_BASE}/goals/${goalId}/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal_id: goalId, title }) });
    if (!res.ok) throw new Error('Failed to add milestone');
    return res.json();
  },
  updateMilestone: async (msId: string, data: any) => {
    const res = await fetch(`${API_BASE}/milestones/${msId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update milestone');
    return res.json();
  },
  deleteMilestone: async (msId: string) => {
    const res = await fetch(`${API_BASE}/milestones/${msId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete milestone');
    return res.json();
  },

  // Quick Notes
  getQuickNotes: async () => {
    const res = await fetch(`${API_BASE}/quick-notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },
  createQuickNote: async (content: string) => {
    const res = await fetch(`${API_BASE}/quick-notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  },
  updateQuickNote: async (noteId: string, content: string) => {
    const res = await fetch(`${API_BASE}/quick-notes/${noteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },
  deleteQuickNote: async (noteId: string) => {
    const res = await fetch(`${API_BASE}/quick-notes/${noteId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  // Intentions
  getIntentions: async (date: string) => {
    const res = await fetch(`${API_BASE}/intentions/${date}`);
    if (!res.ok) throw new Error('Failed to fetch intentions');
    return res.json();
  },
  saveIntentions: async (date: string, intentions: string[]) => {
    const res = await fetch(`${API_BASE}/intentions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, intentions }) });
    if (!res.ok) throw new Error('Failed to save intentions');
    return res.json();
  },

  // Vision Board
  getVisionCards: async () => {
    const res = await fetch(`${API_BASE}/vision-cards`);
    if (!res.ok) throw new Error('Failed to fetch vision cards');
    return res.json();
  },
  createVisionCard: async (card: any) => {
    const res = await fetch(`${API_BASE}/vision-cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
    if (!res.ok) throw new Error('Failed to create vision card');
    return res.json();
  },
  updateVisionCard: async (cardId: string, card: any) => {
    const res = await fetch(`${API_BASE}/vision-cards/${cardId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card) });
    if (!res.ok) throw new Error('Failed to update vision card');
    return res.json();
  },
  deleteVisionCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/vision-cards/${cardId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete vision card');
    return res.json();
  },

  // Streak Freeze
  getStreakFreezeStatus: async () => {
    const res = await fetch(`${API_BASE}/streak-freeze/status`);
    if (!res.ok) throw new Error('Failed to fetch freeze status');
    return res.json();
  },
  useStreakFreeze: async (date: string) => {
    const res = await fetch(`${API_BASE}/streak-freeze/use`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
    if (!res.ok) throw new Error('Failed to use streak freeze');
    return res.json();
  },

  // Push Notifications
  savePushSubscription: async (subscription: PushSubscription) => {
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    if (!res.ok) throw new Error('Failed to save push subscription');
    return res.json();
  },

  // Quote
  getQuoteOfDay: async () => {
    const res = await fetch(`${API_BASE}/quote-of-day`);
    if (!res.ok) throw new Error('Failed to fetch quote');
    return res.json();
  },

  // Badges
  getBadgesInfo: async () => {
    const res = await fetch(`${API_BASE}/badges-info`);
    if (!res.ok) throw new Error('Failed to fetch badges info');
    return res.json();
  },
};
