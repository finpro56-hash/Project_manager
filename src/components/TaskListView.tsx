import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, TaskTag, UserMember } from '../types';
import { Clock, CheckSquare, MessageSquare, ArrowUpDown, Trash2, Edit2 } from 'lucide-react';
import { hasPermission } from '../lib/permissions';

interface TaskListViewProps {
  tasks: Task[];
  tags: TaskTag[];
  members: UserMember[];
  activeMember?: UserMember;
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  tags,
  members,
  activeMember,
  onSelectTask,
  onUpdateStatus,
  onDeleteTask,
}) => {
  const [sortField, setSortField] = useState<'title' | 'status' | 'priority' | 'dueDate' | 'updatedAt'>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const canDeleteGlobal = hasPermission(activeMember, 'canDeleteTask');

  const sortedTasks = [...tasks].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    } else if (sortField === 'priority') {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      cmp = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    } else if (sortField === 'dueDate') {
      cmp = (a.dueDate || '').localeCompare(b.dueDate || '');
    } else if (sortField === 'updatedAt') {
      cmp = a.updatedAt - b.updatedAt;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900';
      case 'high':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      case 'medium':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-900';
      case 'low':
        return 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'backlog':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      case 'todo':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300';
      case 'in_progress':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300';
      case 'in_review':
        return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300';
      case 'done':
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Sort Options Bar for Mobile */}
      <div className="flex md:hidden items-center justify-between gap-2 mb-3 px-1">
        <span className="text-xs text-slate-500 font-medium">Sort by:</span>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as any)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
        >
          <option value="updatedAt">Recently Updated</option>
          <option value="title">Task Title</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
        </select>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400">
            No tasks match the selected filters.
          </div>
        ) : (
          sortedTasks.map((task) => {
            const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : undefined;
            const canEdit =
              hasPermission(activeMember, 'canEditAnyTask', task) ||
              hasPermission(activeMember, 'canEditAssignedTask', task);
            const canDelete = hasPermission(activeMember, 'canDeleteTask');
            const completedCount = task.checklist.filter((c) => c.completed).length;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-indigo-400 transition cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                    {task.title}
                  </h4>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyle(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {/* Status selector */}
                  <select
                    value={task.status}
                    disabled={!canEdit}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold border-0 ${getStatusBadge(
                      task.status
                    )} focus:ring-1 focus:ring-indigo-500`}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>

                  {/* Assignee */}
                  {assignee && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">
                      <img src={assignee.avatar} alt={assignee.name} className="w-4 h-4 rounded-full object-cover" />
                      <span className="truncate max-w-[80px]">{assignee.name.split(' ')[0]}</span>
                    </div>
                  )}

                  {/* Checklist count */}
                  {task.checklist.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>
                        {completedCount}/{task.checklist.length}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{task.dueDate}</span>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {task.tagIds?.map((tid) => {
                      const tag = tagMap.get(tid);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="px-2 py-0.2 rounded-full text-[9px] font-semibold border"
                          style={{
                            borderColor: tag.color,
                            color: tag.color,
                            backgroundColor: `${tag.color}15`,
                          }}
                        >
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(task);
                      }}
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                      title="Open Task Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete task?')) onDeleteTask(task.id);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Task Title</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('priority')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Assignee</th>
                <th
                  onClick={() => toggleSort('dueDate')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Subtasks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No tasks match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedTasks.map((task) => {
                  const assignee = task.assigneeId ? memberMap.get(task.assigneeId) : undefined;
                  const canEdit =
                    hasPermission(activeMember, 'canEditAnyTask', task) ||
                    hasPermission(activeMember, 'canEditAssignedTask', task);
                  const canDelete = hasPermission(activeMember, 'canDeleteTask');
                  const completedCount = task.checklist.filter((c) => c.completed).length;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs">
                        <div className="truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {canEdit ? (
                          <select
                            value={task.status}
                            onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-transparent focus:border-indigo-400 focus:outline-hidden ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="done">Done</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${getStatusBadge(
                              task.status
                            )}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {task.tagIds.map((tid) => {
                            const t = tagMap.get(tid);
                            if (!t) return null;
                            return (
                              <span
                                key={tid}
                                style={{
                                  backgroundColor: `${t.color}15`,
                                  borderColor: `${t.color}35`,
                                  color: t.color,
                                }}
                                className="px-1.5 py-0.2 rounded text-[10px] font-medium border"
                              >
                                {t.name}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {assignee.name.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {task.dueDate}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No date</span>
                        )}
                      </td>

                      {/* Subtasks */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.checklist.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                style={{
                                  width: `${(completedCount / task.checklist.length) * 100}%`,
                                }}
                                className="h-full bg-indigo-500 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {completedCount}/{task.checklist.length}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectTask(task)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit task details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete task "${task.title}"?`)) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
