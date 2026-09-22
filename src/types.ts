export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type PermissionKey =
  | 'canCreateTask'
  | 'canEditAnyTask'
  | 'canEditAssignedTask'
  | 'canDeleteTask'
  | 'canManageMembers'
  | 'canManageTags'
  | 'canChangeProjectSettings'
  | 'canManagePermissions';

export interface UserMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  customPermissions?: Partial<Record<PermissionKey, boolean>>;
  status: 'online' | 'offline' | 'busy';
  currentTaskId?: string;
  lastSeen?: number;
}

export type TagCategory = 'domain' | 'priority' | 'sprint' | 'status' | 'custom';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
  category: TagCategory;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tagIds: string[];
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  estimatedHours?: number;
  comments: TaskComment[];
  checklist: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface AppNotification {
  id: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'status_changed' | 'sync_complete';
  title: string;
  body: string;
  taskId?: string;
  createdAt: number;
  read: boolean;
}

export type MutationType =
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'ADD_COMMENT'
  | 'UPDATE_PERMISSIONS'
  | 'CREATE_MEMBER'
  | 'DELETE_MEMBER'
  | 'CREATE_TAG'
  | 'DELETE_TAG';

export interface OfflineMutation {
  id: string;
  type: MutationType;
  payload: any;
  timestamp: number;
  clientId: string;
  memberId: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending_changes';

export interface ActivePresence {
  userId?: string;
  currentTaskId?: string;
  online: boolean;
}

export interface ProjectState {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}
