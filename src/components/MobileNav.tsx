import React from 'react';
import { Kanban, ListFilter, Calendar, Plus, Bell } from 'lucide-react';
import { UserMember } from '../types';
import { hasPermission } from '../lib/permissions';

interface MobileNavProps {
  currentView: 'kanban' | 'list' | 'timeline';
  onViewChange: (view: 'kanban' | 'list' | 'timeline') => void;
  onOpenNewTask: () => void;
  onToggleNotifications: () => void;
  unreadCount: number;
  activeMember?: UserMember;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onToggleNotifications,
  unreadCount,
  activeMember,
}) => {
  const canCreate = hasPermission(activeMember, 'canCreateTask');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around shadow-lg">
      {/* Board Tab */}
      <button
        id="mobile-nav-kanban"
        onClick={() => onViewChange('kanban')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
          currentView === 'kanban'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Kanban className="w-5 h-5" />
        <span className="text-[10px]">Board</span>
      </button>

      {/* List Tab */}
      <button
        id="mobile-nav-list"
        onClick={() => onViewChange('list')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
          currentView === 'list'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <ListFilter className="w-5 h-5" />
        <span className="text-[10px]">List</span>
      </button>

      {/* Floating Center Primary Action Button: New Task */}
      <button
        id="mobile-nav-create-task"
        onClick={onOpenNewTask}
        disabled={!canCreate}
        className={`-mt-5 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition active:scale-95 ${
          canCreate
            ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-500/30'
            : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
        title={canCreate ? 'Create Task' : 'No permission to create tasks'}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Timeline Tab */}
      <button
        id="mobile-nav-timeline"
        onClick={() => onViewChange('timeline')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
          currentView === 'timeline'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">Timeline</span>
      </button>

      {/* Notifications Tab */}
      <button
        id="mobile-nav-notifications"
        onClick={onToggleNotifications}
        className="relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px]">Alerts</span>
      </button>
    </div>
  );
};
