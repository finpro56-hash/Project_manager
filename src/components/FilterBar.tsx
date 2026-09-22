import React from 'react';
import { Search, Tag, X, User, SlidersHorizontal } from 'lucide-react';
import { TaskTag, TaskPriority, UserMember } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tags: TaskTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  selectedPriority: TaskPriority | 'all';
  onPriorityChange: (p: TaskPriority | 'all') => void;
  selectedAssigneeId: string | 'all';
  onAssigneeChange: (id: string | 'all') => void;
  members: UserMember[];
  onClearFilters: () => void;
  totalTasksCount: number;
  filteredTasksCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  tags,
  selectedTagIds,
  onToggleTag,
  selectedPriority,
  onPriorityChange,
  selectedAssigneeId,
  onAssigneeChange,
  members,
  onClearFilters,
  totalTasksCount,
  filteredTasksCount,
}) => {
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedTagIds.length > 0 ||
    selectedPriority !== 'all' ||
    selectedAssigneeId !== 'all';

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="input-task-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, descriptions, or subtasks..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            id="select-filter-priority"
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value as any)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {/* Assignee filter */}
          <select
            id="select-filter-assignee"
            value={selectedAssigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              id="btn-clear-filters"
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          <span className="text-[11px] text-slate-400 ml-auto md:ml-1">
            Showing <strong className="text-slate-700 dark:text-slate-200">{filteredTasksCount}</strong> of{' '}
            {totalTasksCount} tasks
          </span>
        </div>
      </div>

      {/* Quick Tag Pills Bar */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
          <Tag className="w-3 h-3" />
          Tags:
        </span>
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggleTag(tag.id)}
              style={{
                borderColor: isSelected ? tag.color : undefined,
                backgroundColor: isSelected ? `${tag.color}15` : undefined,
              }}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-medium transition border ${
                isSelected
                  ? 'font-semibold text-slate-900 dark:text-white shadow-xs'
                  : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span>{tag.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
