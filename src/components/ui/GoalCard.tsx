import React from 'react';
import { Clock } from 'lucide-react';
import { EmployeeGoal } from '../../types';
import { cn } from '../../lib/utils';

export interface GoalCardProps {
  goal: EmployeeGoal;
  idx: number;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, idx }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const categoryStyles = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('performance') || c.includes('objective')) {
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
    if (c.includes('audacious') || c.includes('stretch') || c.includes('ambitious') || c.includes('purple')) {
      return 'bg-purple-50 text-purple-600 border border-purple-100';
    }
    return 'bg-gray-50 text-gray-600 border border-gray-100';
  };

  const statusStyles = (stat: string) => {
    const s = (stat || '').toLowerCase();
    if (s.includes('progress') || s.includes('started') || s.includes('ongoing')) {
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
    if (s.includes('complete') || s.includes('done') || s.includes('achieved')) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return 'bg-gray-50 text-gray-500 border border-gray-200';
  };

  const formattedDate = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const date = new Date(dStr);
      if (isNaN(date.getTime())) return dStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  const isLong = goal.goal_description && goal.goal_description.length > 120;
  const displayText = isExpanded ? goal.goal_description : (isLong ? `${goal.goal_description.substring(0, 120)}...` : goal.goal_description);

  return (
    <div className="bg-white border border-black/[0.03] p-5 rounded-2xl flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-black/[0.06] transition-all duration-200 relative group min-h-[160px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", categoryStyles(goal.goal_category))}>
            {goal.goal_category || 'Goal'}
          </span>
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", statusStyles(goal.status))}>
            {goal.status || 'Not Started'}
          </span>
        </div>

        <h5 className="text-[13px] font-bold text-gray-900 leading-snug mb-2 flex items-start gap-2">
          <span className="text-[11px] font-black text-blue-600 bg-blue-50/80 rounded h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
            {idx + 1}
          </span>
          <span className="flex-1">{goal.goal_name}</span>
        </h5>

        {goal.goal_description && (
          <p className="text-[12px] font-semibold text-gray-500 leading-relaxed mb-4 whitespace-pre-wrap">
            {displayText}{' '}
            {isLong && (
              <button 
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 hover:text-blue-700 font-bold ml-1 hover:underline cursor-pointer focus:outline-none"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        )}
      </div>

      {(goal.due_date || goal.weight) && (
        <div className="flex items-center justify-between border-t border-black/[0.02] pt-3.5 mt-auto text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {goal.due_date ? (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Due: {formattedDate(goal.due_date)}</span>
            </div>
          ) : <div />}
          
          {goal.weight !== undefined && (
            <div className="bg-blue-50/50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100/50">
              Weight: {goal.weight}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};
