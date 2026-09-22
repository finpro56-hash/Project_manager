import {
  Task,
  TaskTag,
  UserMember,
  AppNotification,
  OfflineMutation,
  SyncStatus,
  ActivePresence,
  MutationType,
  Role,
} from '../types';
import { dispatchPushNotification } from './pushNotifications';
import {
  subscribeFirestoreTasks,
  subscribeFirestoreMembers,
  subscribeFirestoreTags,
  saveTaskFirestore,
  deleteTaskFirestore,
  saveMemberFirestore,
  deleteMemberFirestore,
  saveTagFirestore,
  deleteTagFirestore,
} from './firebase';

const STORAGE_KEYS = {
  TASKS: 'project_pwa_tasks_v2',
  TAGS: 'project_pwa_tags_v2',
  MEMBERS: 'project_pwa_members_v2',
  NOTIFICATIONS: 'project_pwa_notifications_v2',
  QUEUE: 'project_pwa_offline_queue_v2',
  LAST_SYNC: 'project_pwa_last_sync_v2',
  ACTIVE_USER_ID: 'project_pwa_active_user_id_v2',
  THEME: 'project_pwa_theme_v2',
};

const DEFAULT_MEMBERS: UserMember[] = [
  {
    id: 'user-1',
    name: 'Workspace Owner',
    email: 'finpro56@gmail.com',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'online',
  },
];

const DEFAULT_TAGS: TaskTag[] = [
  { id: 'tag-1', name: 'Feature', color: '#3b82f6', category: 'domain' },
  { id: 'tag-2', name: 'Bug', color: '#ef4444', category: 'domain' },
  { id: 'tag-3', name: 'Design', color: '#8b5cf6', category: 'domain' },
  { id: 'tag-4', name: 'High Priority', color: '#f59e0b', category: 'priority' },
];

class SyncEngine {
  private ws: WebSocket | null = null;
  private syncStatus: SyncStatus = 'synced';
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private clientId: string = `client-${Math.random().toString(36).substring(2, 9)}`;
  private activeUserId: string = 'user-1';
  private currentTaskId: string | null = null;
  private listeners: Set<() => void> = new Set();
  private presences: ActivePresence[] = [];
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  // Local state
  private tasks: Task[] = [];
  private tags: TaskTag[] = [];
  private members: UserMember[] = [];
  private notifications: AppNotification[] = [];
  private offlineQueue: OfflineMutation[] = [];
  private lastSyncTime: number = Date.now();

  constructor() {
    this.loadFromStorage();
    this.setupNetworkListeners();
    this.connectWebSocket();
    this.syncInitialState();
    this.setupFirestoreSubscriptions();
  }

  private setupFirestoreSubscriptions() {
    if (typeof window === 'undefined') return;

    subscribeFirestoreTasks((remoteTasks) => {
      if (remoteTasks.length > 0) {
        this.tasks = remoteTasks;
        this.saveToStorage();
        this.notifyListeners();
      }
    });

    subscribeFirestoreMembers((remoteMembers) => {
      if (remoteMembers.length > 0) {
        this.members = remoteMembers.map((rm) => {
          if (rm.email?.toLowerCase() === 'finpro56@gmail.com') {
            rm.role = 'owner';
          }
          return rm;
        });
        this.saveToStorage();
        this.notifyListeners();
      }
    });

    subscribeFirestoreTags((remoteTags) => {
      if (remoteTags.length > 0) {
        this.tags = remoteTags;
        this.saveToStorage();
        this.notifyListeners();
      }
    });
  }

  private loadFromStorage() {
    // Purge legacy demo data from localStorage
    try {
      [
        'project_pwa_tasks_v1',
        'project_pwa_tags_v1',
        'project_pwa_members_v1',
        'project_pwa_notifications_v1',
        'project_pwa_offline_queue_v1',
        'project_pwa_last_sync_v1',
        'project_pwa_active_user_id_v1',
      ].forEach((k) => localStorage.removeItem(k));
    } catch {}

    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      this.tasks = storedTasks ? JSON.parse(storedTasks) : [];

      const storedTags = localStorage.getItem(STORAGE_KEYS.TAGS);
      this.tags = storedTags ? JSON.parse(storedTags) : [...DEFAULT_TAGS];

      const storedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      this.members = storedMembers ? JSON.parse(storedMembers) : [...DEFAULT_MEMBERS];

      const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = storedNotifs ? JSON.parse(storedNotifs) : [];

      const storedQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (storedQueue) this.offlineQueue = JSON.parse(storedQueue);

      const storedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (storedLastSync) this.lastSyncTime = parseInt(storedLastSync, 10);

      const storedUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
      if (storedUserId && this.members.some((m) => m.id === storedUserId)) {
        this.activeUserId = storedUserId;
      } else {
        this.activeUserId = this.members[0]?.id || 'user-1';
      }
    } catch (err) {
      console.error('Error loading storage cache', err);
      this.tasks = [];
      this.tags = [...DEFAULT_TAGS];
      this.members = [...DEFAULT_MEMBERS];
      this.notifications = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks));
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(this.tags));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(this.offlineQueue));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, this.lastSyncTime.toString());
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, this.activeUserId);
    } catch (err) {
      console.error('Error writing to storage cache', err);
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (!this.isSimulatedOffline) {
        this.connectWebSocket();
        this.flushOfflineQueue();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setSyncStatus('offline');
      if (this.ws) {
        this.ws.close();
      }
    });
  }

  private connectWebSocket() {
    if (this.isEffectiveOffline()) {
      this.setSyncStatus('offline');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setSyncStatus(this.offlineQueue.length > 0 ? 'pending_changes' : 'synced');
        // Identify active user
        this.sendWsMessage({ type: 'IDENTIFY', userId: this.activeUserId });
        if (this.currentTaskId) {
          this.sendWsMessage({ type: 'ACTIVE_TASK', taskId: this.currentTaskId });
        }
        // Flush any offline mutations
        this.flushOfflineQueue();

        // Ping heartbeat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendWsMessage({ type: 'PING' });
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleWsMessage(msg);
        } catch (err) {
          console.error('Failed to parse WS message', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isEffectiveOffline()) {
          this.setSyncStatus('pending_changes');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, falling back to REST sync', err);
      };
    } catch (err) {
      console.warn('Could not establish WebSocket', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isEffectiveOffline()) {
        this.connectWebSocket();
      }
    }, 4000);
  }

  private sendWsMessage(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleWsMessage(msg: any) {
    switch (msg.type) {
      case 'INIT_STATE': {
        if (msg.state) {
          this.mergeRemoteState(msg.state);
        }
        break;
      }
      case 'PRESENCE_SYNC': {
        this.presences = msg.presences || [];
        this.notifyListeners();
        break;
      }
      case 'TASK_CREATED': {
        const existingIdx = this.tasks.findIndex((t) => t.id === msg.task.id);
        if (existingIdx < 0) {
          this.tasks.unshift(msg.task);
          this.notifyListeners();
          dispatchPushNotification('New Task Created', {
            body: `"${msg.task.title}" has been created.`,
            taskId: msg.task.id,
          });
        }
        break;
      }
      case 'TASK_UPDATED': {
        const idx = this.tasks.findIndex((t) => t.id === msg.task.id);
        if (idx >= 0) {
          const oldTask = this.tasks[idx];
          this.tasks[idx] = msg.task;
          this.notifyListeners();

          // If status changed or assigned to current user, send push alert
          if (oldTask.status !== msg.task.status) {
            dispatchPushNotification('Task Status Changed', {
              body: `"${msg.task.title}" moved to ${msg.task.status.replace('_', ' ')}`,
              taskId: msg.task.id,
            });
          } else if (oldTask.assigneeId !== msg.task.assigneeId && msg.task.assigneeId === this.activeUserId) {
            dispatchPushNotification('Task Assigned To You', {
              body: `You were assigned to "${msg.task.title}"`,
              taskId: msg.task.id,
            });
          }
        }
        break;
      }
      case 'TASK_DELETED': {
        this.tasks = this.tasks.filter((t) => t.id !== msg.taskId);
        this.notifyListeners();
        break;
      }
      case 'COMMENT_ADDED': {
        const task = this.tasks.find((t) => t.id === msg.taskId);
        if (task) {
          task.comments.push(msg.comment);
          this.notifyListeners();
          if (msg.comment.userId !== this.activeUserId) {
            dispatchPushNotification('New Comment', {
              body: `${msg.comment.userName}: "${msg.comment.content.slice(0, 50)}..."`,
              taskId: msg.taskId,
            });
          }
        }
        break;
      }
      case 'MEMBER_UPDATED': {
        const idx = this.members.findIndex((m) => m.id === msg.member.id);
        if (idx >= 0) {
          this.members[idx] = msg.member;
          this.notifyListeners();
        }
        break;
      }
      case 'MEMBER_CREATED': {
        if (!this.members.some((m) => m.id === msg.member.id)) {
          this.members.push(msg.member);
          this.notifyListeners();
        }
        break;
      }
      case 'MEMBER_DELETED': {
        this.members = this.members.filter((m) => m.id !== msg.memberId);
        if (this.activeUserId === msg.memberId) {
          this.activeUserId = this.members[0]?.id || 'user-1';
        }
        this.notifyListeners();
        break;
      }
      case 'TAG_CREATED': {
        if (!this.tags.some((t) => t.id === msg.tag.id)) {
          this.tags.push(msg.tag);
          this.notifyListeners();
        }
        break;
      }
      case 'TAG_DELETED': {
        this.tags = this.tags.filter((t) => t.id !== msg.tagId);
        this.notifyListeners();
        break;
      }
      case 'NOTIFICATION_CREATED': {
        this.notifications.unshift(msg.notification);
        this.notifyListeners();
        break;
      }
      case 'FULL_STATE_RESET': {
        if (msg.state) {
          this.tasks = msg.state.tasks || [];
          this.tags = msg.state.tags || [];
          this.members = msg.state.members || [];
          this.notifications = msg.state.notifications || [];
          this.saveToStorage();
          this.notifyListeners();
        }
        break;
      }
    }
  }

  public async syncInitialState() {
    if (this.isEffectiveOffline()) return;

    try {
      this.setSyncStatus('syncing');
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        this.mergeRemoteState(data);
        this.lastSyncTime = Date.now();
        this.saveToStorage();
        this.setSyncStatus(this.offlineQueue.length > 0 ? 'pending_changes' : 'synced');
      }
    } catch (err) {
      console.warn('Initial sync failed, using cached offline data', err);
      this.setSyncStatus(this.offlineQueue.length > 0 ? 'pending_changes' : 'offline');
    }
  }

  private mergeRemoteState(data: { tasks?: Task[]; tags?: TaskTag[]; members?: UserMember[]; notifications?: AppNotification[] }) {
    if (data.tasks) {
      // Last write wins merge with local tasks
      const taskMap = new Map<string, Task>();
      for (const t of data.tasks) {
        taskMap.set(t.id, t);
      }
      // Apply pending offline mutations to preserve local edits
      for (const mut of this.offlineQueue) {
        if (mut.type === 'CREATE_TASK') {
          taskMap.set(mut.payload.id, mut.payload);
        } else if (mut.type === 'UPDATE_TASK') {
          const existing = taskMap.get(mut.payload.id);
          if (existing) {
            taskMap.set(mut.payload.id, { ...existing, ...mut.payload });
          }
        } else if (mut.type === 'DELETE_TASK') {
          taskMap.delete(mut.payload.id);
        }
      }
      this.tasks = Array.from(taskMap.values());
    }

    if (data.tags) {
      this.tags = data.tags.length > 0 ? data.tags : [...DEFAULT_TAGS];
    }
    if (data.members && data.members.length > 0) {
      this.members = data.members;
    }
    if (data.notifications) {
      this.notifications = data.notifications;
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  // Enqueue a mutation. Optimistically applies to local state immediately,
  // then attempts to send via WebSocket or queued for POST /api/sync.
  public mutate(type: MutationType, payload: any) {
    const timestamp = Date.now();
    const mutation: OfflineMutation = {
      id: `mut-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp,
      clientId: this.clientId,
      memberId: this.activeUserId,
    };

    // 1. Optimistic Local State Update & Firestore Sync
    switch (type) {
      case 'CREATE_TASK': {
        const newTask: Task = {
          ...payload,
          id: payload.id || `task-${timestamp}`,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
          comments: payload.comments || [],
          checklist: payload.checklist || [],
        };
        mutation.payload = newTask;
        this.tasks.unshift(newTask);
        saveTaskFirestore(newTask);
        break;
      }
      case 'UPDATE_TASK': {
        const idx = this.tasks.findIndex((t) => t.id === payload.id);
        if (idx >= 0) {
          this.tasks[idx] = {
            ...this.tasks[idx],
            ...payload,
            updatedAt: timestamp,
            version: (this.tasks[idx].version || 1) + 1,
          };
          saveTaskFirestore(this.tasks[idx]);
        }
        break;
      }
      case 'DELETE_TASK': {
        this.tasks = this.tasks.filter((t) => t.id !== payload.id);
        deleteTaskFirestore(payload.id);
        break;
      }
      case 'ADD_COMMENT': {
        const task = this.tasks.find((t) => t.id === payload.taskId);
        if (task) {
          task.comments.push(payload.comment);
          task.updatedAt = timestamp;
          saveTaskFirestore(task);
        }
        break;
      }
      case 'UPDATE_PERMISSIONS': {
        const member = this.members.find((m) => m.id === payload.memberId || (payload.email && m.email?.toLowerCase() === payload.email?.toLowerCase()));
        if (member) {
          if (payload.role) member.role = payload.role;
          if (payload.customPermissions) member.customPermissions = payload.customPermissions;
          saveMemberFirestore(member);
        }
        break;
      }
      case 'CREATE_MEMBER': {
        if (!this.members.some((m) => m.id === payload.id)) {
          this.members.push(payload);
        }
        saveMemberFirestore(payload);
        break;
      }
      case 'DELETE_MEMBER': {
        this.members = this.members.filter((m) => m.id !== payload.memberId);
        if (this.activeUserId === payload.memberId) {
          this.activeUserId = this.members[0]?.id || 'user-1';
        }
        deleteMemberFirestore(payload.memberId);
        break;
      }
      case 'CREATE_TAG': {
        if (!this.tags.some((t) => t.id === payload.id)) {
          this.tags.push(payload);
        }
        saveTagFirestore(payload);
        break;
      }
      case 'DELETE_TAG': {
        this.tags = this.tags.filter((t) => t.id !== payload.id);
        deleteTagFirestore(payload.id);
        break;
      }
    }

    // 2. Queue for persistence
    this.offlineQueue.push(mutation);
    this.saveToStorage();
    this.notifyListeners();

    // 3. Try to sync immediately
    if (this.isEffectiveOffline()) {
      this.setSyncStatus('pending_changes');
    } else {
      // Send live WS event
      this.sendWsMessage({ type: 'TASK_MUTATION', mutation });
      // Flush queue to backend
      this.flushOfflineQueue();
    }
  }

  public async flushOfflineQueue(): Promise<boolean> {
    if (this.isEffectiveOffline() || this.offlineQueue.length === 0) {
      return false;
    }

    this.setSyncStatus('syncing');

    try {
      const queueToSend = [...this.offlineQueue];
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutations: queueToSend,
          clientId: this.clientId,
          memberId: this.activeUserId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Remove synced mutations
        const sentIds = new Set(queueToSend.map((m) => m.id));
        this.offlineQueue = this.offlineQueue.filter((m) => !sentIds.has(m.id));
        this.lastSyncTime = Date.now();
        this.saveToStorage();
        this.setSyncStatus(this.offlineQueue.length > 0 ? 'pending_changes' : 'synced');
        this.notifyListeners();
        return true;
      } else {
        this.setSyncStatus('error');
        return false;
      }
    } catch (err) {
      console.warn('Sync flush failed, keeping mutations in queue', err);
      this.setSyncStatus('pending_changes');
      return false;
    }
  }

  public isEffectiveOffline(): boolean {
    return !this.isOnline || this.isSimulatedOffline;
  }

  public setSimulateOffline(simulate: boolean) {
    this.isSimulatedOffline = simulate;
    if (simulate) {
      if (this.ws) this.ws.close();
      this.setSyncStatus('offline');
    } else {
      this.connectWebSocket();
      this.flushOfflineQueue();
    }
    this.notifyListeners();
  }

  public getSimulateOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public setActiveUserId(userId: string) {
    this.activeUserId = userId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
    this.sendWsMessage({ type: 'IDENTIFY', userId });
    this.notifyListeners();
  }

  public getActiveUserId(): string {
    return this.activeUserId;
  }

  public getActiveMember(): UserMember | undefined {
    return this.members.find((m) => m.id === this.activeUserId);
  }

  public setCurrentTaskId(taskId: string | null) {
    this.currentTaskId = taskId;
    this.sendWsMessage({ type: 'ACTIVE_TASK', taskId });
  }

  public getTasks(): Task[] {
    return this.tasks;
  }

  public getTags(): TaskTag[] {
    return this.tags;
  }

  public getMembers(): UserMember[] {
    return this.members;
  }

  public createMember(name: string, email: string, role: Role) {
    const member: UserMember = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
      status: 'online',
    };
    this.mutate('CREATE_MEMBER', member);
    return member;
  }

  public deleteMember(memberId: string) {
    if (memberId === 'user-1') return;
    this.mutate('DELETE_MEMBER', { memberId });
  }

  public getNotifications(): AppNotification[] {
    return this.notifications;
  }

  public markNotificationRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public markAllNotificationsRead() {
    for (const notif of this.notifications) {
      notif.read = true;
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  private setSyncStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.notifyListeners();
  }

  public getPendingMutationsCount(): number {
    return this.offlineQueue.length;
  }

  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  public getPresences(): ActivePresence[] {
    return this.presences;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.saveToStorage();
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const syncEngine = new SyncEngine();
