import { format, parseISO, differenceInDays } from 'date-fns';

export const getTodayString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getDayName = (dateStr: string): string => {
  const date = parseISO(dateStr);
  return format(date, 'EEEE');
};

export const isWeekday = (dateStr: string): boolean => {
  const date = parseISO(dateStr);
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

export const formatDueDate = (dateStr: string): { label: string; isUrgent: boolean } => {
  const date = parseISO(dateStr);
  const today = new Date();
  const diff = differenceInDays(date, today);
  
  if (diff < 0) return { label: 'Overdue', isUrgent: true };
  if (diff === 0) return { label: 'Due Today', isUrgent: true };
  if (diff === 1) return { label: 'Due Tomorrow', isUrgent: true };
  if (diff <= 7) return { label: `Due in ${diff} days`, isUrgent: false };
  return { label: format(date, 'MMM d'), isUrgent: false };
};

export const getProgressMessage = (completed: number, total: number): string => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  if (percentage === 0) return "Let's make today count!";
  if (percentage < 25) return "Great start! Keep the momentum going.";
  if (percentage < 50) return "You're making progress! Stay focused.";
  if (percentage < 75) return "You're in the zone! Keep pushing.";
  if (percentage < 100) return "Almost there! Finish strong.";
  return "Day complete! You showed up for yourself today. 🔥";
};

export const getStreakMessage = (streak: number): string => {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "Day 1 - The beginning of greatness!";
  if (streak < 7) return `${streak} day streak! Building momentum.`;
  if (streak < 14) return `${streak} day streak! You're on fire!`;
  if (streak < 30) return `${streak} day streak! Unstoppable energy!`;
  return `${streak} day streak! You're a LEGEND!`;
};

export const getXPForNextLevel = (level: number): number => {
  const thresholds: Record<number, number> = {
    1: 100, 2: 300, 3: 600, 4: 1000, 5: 1500,
    6: 2100, 7: 2800, 8: 3600, 9: 4500, 10: 5500,
  };
  if (level >= 10) return 4500 + (level - 9) * 1000;
  return thresholds[level] || 100;
};

export const getXPProgressInLevel = (totalXP: number, level: number): number => {
  const prevThreshold = level > 1 ? getXPForNextLevel(level - 1) : 0;
  const currentThreshold = getXPForNextLevel(level);
  const xpInLevel = totalXP - prevThreshold;
  const xpNeededForLevel = currentThreshold - prevThreshold;
  return Math.min(xpInLevel / xpNeededForLevel, 1);
};

export const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};
