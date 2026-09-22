import React, { useState, useEffect } from 'react';
import {
  Kanban,
  ListFilter,
  Calendar,
  Bell,
  Sun,
  Moon,
  Plus,
  Shield,
  Tag,
  Users,
  Layers,
  ChevronDown,
  LogOut,
  UserCheck,
  UserPlus,
  Circle,
} from 'lucide-react';
import { UserMember, Role } from '../types';
import { syncEngine } from '../lib/syncEngine';
import { authService } from '../lib/authService';
import { hasPermission } from '../lib/permissions';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: 'kanban' | 'list' | 'timeline';
  onViewChange: (view: 'kanban' | 'list' | 'timeline') => void;
  onOpenNewTask: () => void;
  onOpenPermissions: () => void;
  onOpenTags: () => void;
  onToggleNotifications: () => void;
  unreadNotificationsCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenNewTask,
  onOpenPermissions,
  onOpenTags,
  onToggleNotifications,
  unreadNotificationsCount,
  darkMode,
  onToggleDarkMode,
  onOpenAuthModal,
}) => {
  const [members, setMembers] = useState<UserMember[]>(syncEngine.getMembers());
  const [activeUserId, setActiveUserId] = useState<string>(syncEngine.getActiveUserId());
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [presences, setPresences] = useState(syncEngine.getPresences());
  const [currentUser, setCurrentUser] = useState<UserMember | null>(authService.getCurrentUser());

  useEffect(() => {
    const unsubSync = syncEngine.subscribe(() => {
      setMembers(syncEngine.getMembers());
      setActiveUserId(syncEngine.getActiveUserId());
      setPresences(syncEngine.getPresences());
    });
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  const activeMember = currentUser || members.find((m) => m.id === activeUserId) || members[0];
  const canCreate = hasPermission(activeMember, 'canCreateTask');

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'admin':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'member':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight">ProjectPulse</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/90 dark:text-indigo-300">
                  PWA
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Apollo Modernization</p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block mx-1" />

          {/* View Mode Toggle */}
          <nav className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
            <button
              id="view-toggle-kanban"
              onClick={() => onViewChange('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                currentView === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              id="view-toggle-list"
              onClick={() => onViewChange('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                currentView === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              id="view-toggle-timeline"
              onClick={() => onViewChange('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                currentView === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Team Presence, Member Switcher, Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Collaborators Presence Stack */}
          <div className="hidden lg:flex items-center -space-x-1.5" title="Connected Collaborators">
            {members.slice(0, 4).map((m) => {
              const isUserOnline = presences.some((p) => p.userId === m.id) || m.status === 'online';
              return (
                <div key={m.id} className="relative group">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                      isUserOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 whitespace-nowrap px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-medium shadow-md">
                    {m.name} ({m.role}) {isUserOnline ? '• Live' : '• Offline'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Account & Profile Dropdown */}
          <div className="relative">
            <button
              id="btn-member-switcher"
              onClick={() => setShowMemberDropdown(!showMemberDropdown)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
              title="Account & Profile"
            >
              <div className="relative">
                <img
                  src={activeMember?.avatar}
                  alt={activeMember?.name}
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-white dark:ring-slate-900"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                    activeMember?.status === 'busy'
                      ? 'bg-amber-500'
                      : activeMember?.status === 'offline'
                      ? 'bg-slate-400'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[100px] truncate">
                {activeMember?.name.split(' ')[0]}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${getRoleBadgeColor(
                  activeMember?.role || 'member'
                )}`}
              >
                {activeMember?.role}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showMemberDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMemberDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
                {/* User Summary Card */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-800/50">
                  <img
                    src={activeMember?.avatar}
                    alt={activeMember?.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {activeMember?.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getRoleBadgeColor(
                          activeMember?.role || 'member'
                        )}`}
                      >
                        {activeMember?.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {activeMember?.email}
                    </div>
                  </div>
                </div>

                {/* Status Picker */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    Set Presence Status
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['online', 'busy', 'offline'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          authService.updateProfile({ status: st });
                          setShowMemberDropdown(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg text-[11px] font-medium transition ${
                          activeMember?.status === st
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            st === 'online'
                              ? 'bg-emerald-500'
                              : st === 'busy'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="capitalize">{st}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch Workspace Identity (if multiple members exist) */}
                {members.length > 1 && (
                  <div className="py-1 border-b border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-1">
                      Switch Active Member
                    </div>
                    {members
                      .filter((m) => m.id !== activeMember?.id)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            syncEngine.setActiveUserId(m.id);
                            setShowMemberDropdown(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <div className="truncate">
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {m.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{m.email}</div>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getRoleBadgeColor(
                              m.role
                            )}`}
                          >
                            {m.role}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                {/* Account Actions */}
                <div className="pt-1 pb-0.5 px-1 space-y-0.5">
                  <button
                    id="btn-menu-manage-roles"
                    onClick={() => {
                      setShowMemberDropdown(false);
                      onOpenPermissions();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span>Manage Roles & Permissions</span>
                  </button>

                  {onOpenAuthModal && (
                    <button
                      id="btn-switch-account"
                      onClick={() => {
                        setShowMemberDropdown(false);
                        onOpenAuthModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-500" />
                      <span>Switch Account / Add User</span>
                    </button>
                  )}

                  <button
                    id="btn-sign-out"
                    onClick={() => {
                      setShowMemberDropdown(false);
                      authService.logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
              </>
            )}
          </div>

          {/* Granular Permissions Modal Button */}
          <button
            id="btn-open-permissions-matrix"
            onClick={onOpenPermissions}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            title="Granular Permissions Matrix"
          >
            <Shield className="w-4 h-4 text-purple-500" />
          </button>

          {/* Tag Manager Button */}
          <button
            id="btn-open-tag-manager"
            onClick={onOpenTags}
            className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            title="Task Categorization Tags"
          >
            <Tag className="w-4 h-4 text-cyan-500" />
          </button>

          {/* In-App Notifications Button (Available on mobile via bottom navigation) */}
          <button
            id="btn-notification-drawer"
            onClick={onToggleNotifications}
            className="hidden sm:flex relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dark Mode Switcher */}
          <button
            id="btn-toggle-dark-mode"
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shrink-0"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* New Task Button (Available on mobile via prominent floating center button) */}
          <button
            id="btn-create-task-header"
            onClick={onOpenNewTask}
            disabled={!canCreate}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 ${
              canCreate
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
            }`}
            title={canCreate ? 'Create Task' : 'Your role does not have permission to create tasks'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
