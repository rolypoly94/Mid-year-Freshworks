// Cycle metadata — bump these per cycle.
export const CYCLE_NAME = 'Mid-Year 2026';
export const CYCLE_DEADLINE = new Date('2026-06-30T23:59:59');

export const getDaysUntilDeadline = (now: Date = new Date()): number => {
  const diffMs = CYCLE_DEADLINE.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const formatDeadline = (): string =>
  CYCLE_DEADLINE.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
