import React from 'react';
import {
  CheckSquare,
  MessageSquare,
  Clock,
  ArrowRight,
  MoreVertical,
  Plus,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Task, TaskStatus, TaskTag, UserMember, ActivePresence } from '../types';
import { hasPermission } from '../lib/permissions';

interface TaskBoardProps {
  tasks: Task[];
  tags: TaskTag[];
  members: UserMember[];
  activeMember?: UserMember;
  presences: ActivePresence[];
  onSelectTask: (task: Task) => void;
  onAdvanceTaskStatus: (taskId: string, nextStatus: TaskStatus) => void;
  onOpenCreateTask: (defaultStatus: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-slate-300 dark:border-slate-700', dotColor: 'bg-slate-400' },
  { id: 'todo', label: 'To Do', color: 'border-blue-400 dark:border-blue-700', dotColor: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-amber-400 dark:border-amber-700', dotColor: 'bg-amber-500' },
  { id: 'in_review', label: 'In Review', color: 'border-purple-400 dark:border-purple-700', dotColor: 'bg-purple-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-400 dark:border-emerald-700', dotColor: 'bg-emerald-500' },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  tags,
  members,
  activeMember,
  presences,
  onSelectTask,
  onAdvanceTaskStatus,
  onOpenCreateTask,
}) => {
  const [activeMobileColumn, setActiveMobileColumn] = React.useState<TaskStatus | 'all'>('all');

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    switch (current) {
      case 'backlog':
        return 'todo';
      case 'todo':
        return 'in_progress';
      case 'in_progress':
        return 'in_review';
      case 'in_review':
        return 'done';
      case 'done':
        return null;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-850';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-850';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-850';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const canCreate = hasPermission(activeMember, 'canCreateTask');

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Mobile Column Quick Filter Tabs */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-none pb-3 mb-1">
        <button
          onClick={() => setActiveMobileColumn('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeMobileColumn === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Columns ({tasks.length})
        </button>
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          const isSelected = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileColumn(col.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                isSelected
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span>{col.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid Container (Horizontal scroll on mobile when All Columns selected, Grid on desktop) */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-start pb-4 md:pb-0">
        {COLUMNS.filter((col) => activeMobileColumn === 'all' || activeMobileColumn === col.id).map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="shrink-0 w-[85vw] sm:w-[320px] md:w-auto snap-center flex flex-col rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-3 min-h-[450px] sm:min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {col.label}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>
                {canCreate && (
                  <button
                    onClick={() => onOpenCreateTask(col.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Column Task Cards */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-xs">No tasks</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : undefined;
                    const nextStatus = getNextStatus(task.status);
                    const canEdit =
                      hasPermission(activeMember, 'canEditAnyTask', task) ||
                      hasPermission(activeMember, 'canEditAssignedTask', task);

                    // Real-time collaborator inspecting or editing this task
                    const activeViewers = presences
                      .filter((p) => p.currentTaskId === task.id && p.userId !== activeMember?.id)
                      .map((p) => memberMap.get(p.userId || ''))
                      .filter(Boolean);

                    const completedChecklistCount = task.checklist.filter((c) => c.completed).length;

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="group relative rounded-xl bg-white dark:bg-slate-800 p-3.5 shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/80 transition-all cursor-pointer"
                      >
                        {/* Real-time viewer banner */}
                        {activeViewers.length > 0 && (
                          <div className="mb-2 flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-700 dark:text-indigo-300 animate-pulse font-medium">
                            <Eye className="w-3 h-3 shrink-0" />
                            <span>{activeViewers[0]?.name.split(' ')[0]} is viewing live</span>
                          </div>
                        )}

                        {/* Priority & Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyle(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>

                          {task.tagIds.slice(0, 2).map((tid) => {
                            const t = tagMap.get(tid);
                            if (!t) return null;
                            return (
                              <span
                                key={tid}
                                style={{
                                  borderColor: `${t.color}40`,
                                  backgroundColor: `${t.color}15`,
                                  color: t.color,
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                              >
                                {t.name}
                              </span>
                            );
                          })}
                          {task.tagIds.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{task.tagIds.length - 2}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {task.title}
                        </h4>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Checklist progress bar */}
                        {task.checklist.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-slate-400" />
                                Subtasks
                              </span>
                              <span>
                                {completedChecklistCount}/{task.checklist.length}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                style={{
                                  width: `${(completedChecklistCount / task.checklist.length) * 100}%`,
                                }}
                                className="h-full bg-indigo-500 rounded-full transition-all"
                              />
                            </div>
                          </div>
                        )}

                        {/* Bottom Metadata: Assignee, Due Date, Comments, Advance Action */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            {assignee ? (
                              <img
                                src={assignee.avatar}
                                alt={assignee.name}
                                title={`Assigned to ${assignee.name}`}
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                            )}

                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {task.dueDate.slice(5)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {task.comments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                                <MessageSquare className="w-3 h-3" />
                                {task.comments.length}
                              </span>
                            )}

                            {nextStatus && canEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAdvanceTaskStatus(task.id, nextStatus);
                                }}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-slate-500 dark:text-slate-400 transition"
                                title={`Advance to ${nextStatus.replace('_', ' ')}`}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
