import React from 'react';
import { Task, TaskTag, UserMember } from '../types';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

interface TaskTimelineViewProps {
  tasks: Task[];
  tags: TaskTag[];
  members: UserMember[];
  onSelectTask: (task: Task) => void;
}

export const TaskTimelineView: React.FC<TaskTimelineViewProps> = ({
  tasks,
  tags,
  members,
  onSelectTask,
}) => {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  // Days range: past 2 days to next 10 days
  const today = new Date();
  const days: { date: Date; dateStr: string; label: string; isToday: boolean }[] = [];

  for (let i = -2; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    days.push({
      date: d,
      dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      isToday,
    });
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#f43f5e';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Timeline Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Schedule & Roadmap</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Current Sprint Target: <strong>Sprint 24</strong>
          </span>
        </div>

        {/* Days Header */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-13 border-b border-slate-200 dark:border-slate-800 text-[11px] bg-slate-50 dark:bg-slate-800">
              <div className="col-span-3 p-3 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                Task & Owner
              </div>
              <div className="col-span-10 grid grid-cols-10">
                {days.slice(2, 12).map((day) => (
                  <div
                    key={day.dateStr}
                    className={`py-2 px-1 text-center font-medium border-r border-slate-200/60 dark:border-slate-800/60 ${
                      day.isToday
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div>{day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                    <div className="text-[10px]">{day.date.getDate()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {tasks.map((task) => {
                const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : undefined;
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;

                // Calculate horizontal position
                let dayIndex = 5; // default mid-chart if no date
                if (dueDate) {
                  const diffTime = dueDate.getTime() - today.getTime();
                  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                  dayIndex = Math.max(0, Math.min(9, diffDays + 1));
                }

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="grid grid-cols-13 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition text-xs items-center"
                  >
                    {/* Left info */}
                    <div className="col-span-3 p-3 border-r border-slate-200 dark:border-slate-800 truncate flex items-center gap-2">
                      {assignee ? (
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </span>
                    </div>

                    {/* Right Gantt Bar Grid */}
                    <div className="col-span-10 grid grid-cols-10 h-11 relative items-center px-1">
                      {/* Grid background lines */}
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full border-r border-slate-100 dark:border-slate-800/40 pointer-events-none"
                        />
                      ))}

                      {/* Timeline pill */}
                      <div
                        style={{
                          left: `${Math.max(0, dayIndex * 10 - 5)}%`,
                          width: `${Math.max(15, 24)}%`,
                          backgroundColor: getPriorityColor(task.priority),
                        }}
                        className="absolute h-6 rounded-lg text-white text-[10px] font-semibold px-2 flex items-center justify-between shadow-xs truncate transition-all hover:scale-102"
                      >
                        <span className="truncate">{task.status.replace('_', ' ')}</span>
                        <ChevronRight className="w-3 h-3 shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
