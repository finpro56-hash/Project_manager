import { Role, PermissionKey, UserMember, Task } from '../types';

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  owner: {
    canCreateTask: true,
    canEditAnyTask: true,
    canEditAssignedTask: true,
    canDeleteTask: true,
    canManageMembers: true,
    canManageTags: true,
    canChangeProjectSettings: true,
    canManagePermissions: true,
  },
  admin: {
    canCreateTask: true,
    canEditAnyTask: true,
    canEditAssignedTask: true,
    canDeleteTask: true,
    canManageMembers: true,
    canManageTags: true,
    canChangeProjectSettings: true,
    canManagePermissions: true,
  },
  member: {
    canCreateTask: true,
    canEditAnyTask: false,
    canEditAssignedTask: true,
    canDeleteTask: false,
    canManageMembers: false,
    canManageTags: false,
    canChangeProjectSettings: false,
    canManagePermissions: false,
  },
  viewer: {
    canCreateTask: false,
    canEditAnyTask: false,
    canEditAssignedTask: false,
    canDeleteTask: false,
    canManageMembers: false,
    canManageTags: false,
    canChangeProjectSettings: false,
    canManagePermissions: false,
  },
};

export const PERMISSION_METADATA: Record<
  PermissionKey,
  { label: string; description: string; category: 'Tasks' | 'Organization' | 'Security' }
> = {
  canCreateTask: {
    label: 'Create Tasks',
    description: 'Add new tasks, assign team members, and define checklists.',
    category: 'Tasks',
  },
  canEditAnyTask: {
    label: 'Edit Any Task',
    description: 'Modify title, description, tags, status, and deadlines of all project tasks.',
    category: 'Tasks',
  },
  canEditAssignedTask: {
    label: 'Edit Assigned Tasks',
    description: 'Update status, subtasks, and add notes to tasks assigned directly to you.',
    category: 'Tasks',
  },
  canDeleteTask: {
    label: 'Delete Tasks',
    description: 'Permanently remove tasks and associated activity logs.',
    category: 'Tasks',
  },
  canManageTags: {
    label: 'Manage Categorization Tags',
    description: 'Create, modify color palettes, and delete task categorization tags.',
    category: 'Organization',
  },
  canManageMembers: {
    label: 'Manage Team Members',
    description: 'Invite new collaborators and adjust team rosters.',
    category: 'Organization',
  },
  canChangeProjectSettings: {
    label: 'Change Project Settings',
    description: 'Rename project, change archive status, and adjust workspace defaults.',
    category: 'Security',
  },
  canManagePermissions: {
    label: 'Manage Granular Permissions',
    description: 'Adjust role definitions and grant custom capability overrides to members.',
    category: 'Security',
  },
};

export function hasPermission(
  member: UserMember | null | undefined,
  permission: PermissionKey,
  task?: Task
): boolean {
  if (!member) return false;

  // Check if there is an explicit custom override for this member
  if (member.customPermissions && member.customPermissions[permission] !== undefined) {
    const override = member.customPermissions[permission];
    if (override === false) return false;
    if (override === true) {
      if (permission === 'canEditAssignedTask') {
        return !task || task.assigneeId === member.id || member.role === 'owner' || member.role === 'admin';
      }
      return true;
    }
  }

  // Fallback to role-based default
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[member.role] || ROLE_DEFAULT_PERMISSIONS.viewer;
  const isAllowedByDefault = !!roleDefaults[permission];

  if (!isAllowedByDefault) return false;

  // Special check for canEditAssignedTask: member can only edit if task is assigned to them or if they also have canEditAnyTask
  if (permission === 'canEditAssignedTask') {
    if (roleDefaults.canEditAnyTask) return true;
    if (task && task.assigneeId !== member.id && task.creatorId !== member.id) {
      return false;
    }
  }

  return true;
}

export function canModifyTask(member: UserMember | null | undefined, task: Task): boolean {
  if (!member) return false;
  if (hasPermission(member, 'canEditAnyTask', task)) return true;
  if (hasPermission(member, 'canEditAssignedTask', task)) return true;
  return false;
}
