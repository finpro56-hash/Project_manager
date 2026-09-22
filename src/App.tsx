import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { TaskBoard } from './components/TaskBoard';
import { TaskListView } from './components/TaskListView';
import { TaskTimelineView } from './components/TaskTimelineView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskCreateModal } from './components/TaskCreateModal';
import { PermissionsModal } from './components/PermissionsModal';
import { TagManagerModal } from './components/TagManagerModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineSimBanner } from './components/OfflineSimBanner';
import { AuthScreen } from './components/AuthScreen';
import { MobileNav } from './components/MobileNav';
import { syncEngine } from './lib/syncEngine';
import { authService } from './lib/authService';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskTag,
  UserMember,
  AppNotification,
  Role,
  PermissionKey,
} from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserMember | null>(authService.getCurrentUser());
  const [authLoading, setAuthLoading] = useState(authService.getIsLoading());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(syncEngine.getTasks());
  const [tags, setTags] = useState<TaskTag[]>(syncEngine.getTags());
  const [members, setMembers] = useState<UserMember[]>(syncEngine.getMembers());
  const [notifications, setNotifications] = useState<AppNotification[]>(syncEngine.getNotifications());
  const [presences, setPresences] = useState(syncEngine.getPresences());

  // Views & UI State
  const [currentView, setCurrentView] = useState<'kanban' | 'list' | 'timeline'>('kanban');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('project_pwa_theme_v1');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | 'all'>('all');

  // Modal States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskStatus>('todo');
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Sync with SyncEngine & AuthService
  useEffect(() => {
    const unsubSync = syncEngine.subscribe(() => {
      setTasks([...syncEngine.getTasks()]);
      setTags([...syncEngine.getTags()]);
      setMembers([...syncEngine.getMembers()]);
      setNotifications([...syncEngine.getNotifications()]);
      setPresences([...syncEngine.getPresences()]);
    });
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
      setAuthLoading(authService.getIsLoading());
    });
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  // Update selected task when tasks refresh
  useEffect(() => {
    if (selectedTask) {
      const refreshed = tasks.find((t) => t.id === selectedTask.id);
      if (refreshed) {
        setSelectedTask(refreshed);
      }
    }
  }, [tasks]);

  // Dark Mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('project_pwa_theme_v1', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('project_pwa_theme_v1', 'light');
    }
  }, [darkMode]);

  const activeUserId = syncEngine.getActiveUserId();
  const activeMember = members.find((m) => m.id === activeUserId) || members[0];

  // Filtering Logic
  const filteredTasks = tasks.filter((task) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchChecklist = task.checklist?.some((c) => c.text.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchChecklist) return false;
    }

    // Priority filter
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
      return false;
    }

    // Assignee filter
    if (selectedAssigneeId !== 'all') {
      if (task.assigneeId !== selectedAssigneeId) return false;
    }

    // Tags multi-filter
    if (selectedTagIds.length > 0) {
      const hasAllTags = selectedTagIds.every((tid) => task.tagIds?.includes(tid));
      if (!hasAllTags) return false;
    }

    return true;
  });

  // Mutator Handlers
  const handleCreateTask = (data: any) => {
    syncEngine.mutate('CREATE_TASK', data);
  };

  const handleUpdateTask = (updated: Partial<Task>) => {
    if (!selectedTask) return;
    syncEngine.mutate('UPDATE_TASK', { id: selectedTask.id, ...updated });
  };

  const handleDeleteTask = (taskId: string) => {
    syncEngine.mutate('DELETE_TASK', { id: taskId });
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleAdvanceStatus = (taskId: string, nextStatus: TaskStatus) => {
    syncEngine.mutate('UPDATE_TASK', { id: taskId, status: nextStatus });
  };

  const handleAddComment = (content: string) => {
    if (!selectedTask || !activeMember) return;
    const comment = {
      id: `comment-${Date.now()}`,
      userId: activeMember.id,
      userName: activeMember.name,
      userAvatar: activeMember.avatar,
      content,
      createdAt: Date.now(),
    };
    syncEngine.mutate('ADD_COMMENT', { taskId: selectedTask.id, comment });
  };

  const handleCreateTag = (tag: Omit<TaskTag, 'id'>) => {
    const newTag: TaskTag = {
      ...tag,
      id: `tag-${Date.now()}`,
    };
    syncEngine.mutate('CREATE_TAG', newTag);
  };

  const handleDeleteTag = (tagId: string) => {
    syncEngine.mutate('DELETE_TAG', { id: tagId });
  };

  const handleUpdateMemberPermissions = (
    memberId: string,
    role: Role,
    customPermissions: Partial<Record<PermissionKey, boolean>>
  ) => {
    syncEngine.mutate('UPDATE_PERMISSIONS', { memberId, role, customPermissions });
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTagIds([]);
    setSelectedPriority('all');
    setSelectedAssigneeId('all');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Restoring workspace session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={() => {
          setCurrentUser(authService.getCurrentUser());
        }}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Offline Mode & Network Sync Simulation Bar */}
      <OfflineSimBanner />

      {/* Global Application Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewTask={() => {
          setCreateInitialStatus('todo');
          setIsCreateOpen(true);
        }}
        onOpenPermissions={() => setIsPermissionsOpen(true)}
        onOpenTags={() => setIsTagsOpen(true)}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Search, Categorization Tags & Attributes Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTagFilter}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={setSelectedAssigneeId}
        members={members}
        onClearFilters={clearFilters}
        totalTasksCount={tasks.length}
        filteredTasksCount={filteredTasks.length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentView === 'kanban' && (
          <TaskBoard
            tasks={filteredTasks}
            tags={tags}
            members={members}
            activeMember={activeMember}
            presences={presences}
            onSelectTask={(task) => setSelectedTask(task)}
            onAdvanceTaskStatus={handleAdvanceStatus}
            onOpenCreateTask={(defaultStatus) => {
              setCreateInitialStatus(defaultStatus);
              setIsCreateOpen(true);
            }}
          />
        )}

        {currentView === 'list' && (
          <TaskListView
            tasks={filteredTasks}
            tags={tags}
            members={members}
            activeMember={activeMember}
            onSelectTask={(task) => setSelectedTask(task)}
            onUpdateStatus={(taskId, status) => handleAdvanceStatus(taskId, status)}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentView === 'timeline' && (
          <TaskTimelineView
            tasks={filteredTasks}
            tags={tags}
            members={members}
            onSelectTask={(task) => setSelectedTask(task)}
          />
        )}
      </main>

      {/* Floating Offline & Sync Status Banner */}
      <OfflineIndicator />

      {/* Mobile Touch Bottom Navigation */}
      <MobileNav
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenNewTask={() => {
          setCreateInitialStatus('todo');
          setIsCreateOpen(true);
        }}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        unreadCount={notifications.filter((n) => !n.read).length}
        activeMember={activeMember}
      />

      {/* Task Detail & Collaborative Workspace Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          tags={tags}
          members={members}
          activeMember={activeMember}
          presences={presences}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onAddComment={handleAddComment}
        />
      )}

      {/* Task Creation Modal */}
      {isCreateOpen && (
        <TaskCreateModal
          initialStatus={createInitialStatus}
          tags={tags}
          members={members}
          activeMember={activeMember}
          onClose={() => setIsCreateOpen(false)}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* Granular Permissions & Access Control Modal */}
      {isPermissionsOpen && (
        <PermissionsModal
          members={members}
          activeMember={activeMember}
          onClose={() => setIsPermissionsOpen(false)}
          onUpdateMemberPermissions={handleUpdateMemberPermissions}
          onAddMember={(name, email, role) => syncEngine.createMember(name, email, role)}
          onDeleteMember={(memberId) => syncEngine.deleteMember(memberId)}
        />
      )}

      {/* Categorization Tag Manager Modal */}
      {isTagsOpen && (
        <TagManagerModal
          tags={tags}
          activeMember={activeMember}
          onClose={() => setIsTagsOpen(false)}
          onCreateTag={handleCreateTag}
          onDeleteTag={handleDeleteTag}
        />
      )}

      {/* Notifications Drawer */}
      <NotificationDrawer
        notifications={notifications}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkRead={(id) => syncEngine.markNotificationRead(id)}
        onMarkAllRead={() => syncEngine.markAllNotificationsRead()}
        onSelectTask={(taskId) => {
          const t = tasks.find((item) => item.id === taskId);
          if (t) setSelectedTask(t);
        }}
      />

      {/* Switch Account / Add User Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg"
            >
              Close
            </button>
            <AuthScreen
              onSuccess={() => setIsAuthModalOpen(false)}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
