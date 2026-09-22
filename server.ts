import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store for projects, tasks, members, tags, notifications, and active sessions
interface UserMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatar: string;
  customPermissions?: Record<string, boolean>;
  status: 'online' | 'offline' | 'busy';
  currentTaskId?: string;
  lastSeen?: number;
}

interface TaskTag {
  id: string;
  name: string;
  color: string;
  category: 'domain' | 'priority' | 'sprint' | 'status' | 'custom';
}

interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: number;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tagIds: string[];
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  estimatedHours?: number;
  comments: TaskComment[];
  checklist: { id: string; text: string; completed: boolean }[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

interface AppNotification {
  id: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'status_changed' | 'sync_complete';
  title: string;
  body: string;
  taskId?: string;
  createdAt: number;
  read: boolean;
}

// Initial seed data: clean fresh workspace
const initialMembers: UserMember[] = [
  {
    id: 'user-1',
    name: 'Workspace Owner',
    email: 'finpro56@gmail.com',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'online',
  },
];

const initialTags: TaskTag[] = [
  { id: 'tag-1', name: 'Feature', color: '#3b82f6', category: 'domain' },
  { id: 'tag-2', name: 'Bug', color: '#ef4444', category: 'domain' },
  { id: 'tag-3', name: 'Design', color: '#8b5cf6', category: 'domain' },
  { id: 'tag-4', name: 'High Priority', color: '#f59e0b', category: 'priority' },
];

const initialTasks: Task[] = [];

const initialNotifications: AppNotification[] = [];

// App State
let state = {
  project: {
    id: 'proj-1',
    name: 'Project Workspace',
    description: 'Offline-capable collaborative project management progressive web app with real-time sync.',
    createdAt: Date.now(),
  },
  tasks: [...initialTasks],
  members: [...initialMembers],
  tags: [...initialTags],
  notifications: [...initialNotifications],
  lastUpdated: Date.now(),
};

// Map of active WebSocket clients
interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  currentTaskId?: string;
  lastPing: number;
}
const clients = new Set<ConnectedClient>();

function broadcast(msg: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(msg);
  for (const client of clients) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to send WS message', err);
      }
    }
  }
}

function broadcastPresence() {
  const activePresences = Array.from(clients).map((c) => ({
    userId: c.userId,
    currentTaskId: c.currentTaskId,
    online: true,
  }));
  broadcast({
    type: 'PRESENCE_SYNC',
    presences: activePresences,
  });
}

interface AuthAccount {
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
}

const authAccounts = new Map<string, AuthAccount>();
const activeSessions = new Map<string, string>(); // token -> userId

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

// Pre-register initial owner (finpro56@gmail.com with default password 'password123')
const ownerSalt = 'salt_owner_finpro56';
authAccounts.set('finpro56@gmail.com', {
  userId: 'user-1',
  email: 'finpro56@gmail.com',
  passwordHash: hashPassword('password123', ownerSalt).hash,
  salt: ownerSalt,
});

// REST Endpoints
// Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const member = state.members.find((m) => m.email.toLowerCase() === cleanEmail);
  if (!member) {
    return res.status(401).json({ error: 'No account found with this email' });
  }

  let account = authAccounts.get(cleanEmail);
  if (!account) {
    // If user was invited or existed without password, initialize password on first login
    const { hash, salt } = hashPassword(password);
    account = {
      userId: member.id,
      email: cleanEmail,
      passwordHash: hash,
      salt,
    };
    authAccounts.set(cleanEmail, account);
  } else {
    const { hash } = hashPassword(password, account.salt);
    if (hash !== account.passwordHash) {
      return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
    }
  }

  const token = `token_${crypto.randomBytes(24).toString('hex')}`;
  activeSessions.set(token, member.id);

  member.status = 'online';
  member.lastSeen = Date.now();
  broadcast({ type: 'MEMBER_UPDATED', member });

  res.json({
    success: true,
    token,
    user: member,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (state.members.some((m) => m.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email address already exists' });
  }

  const { hash, salt } = hashPassword(String(password));
  const isOwnerEmail = cleanEmail === 'finpro56@gmail.com';
  const assignedRole = isOwnerEmail ? 'owner' : (role || 'member');
  const newUserId = `user-${Date.now()}`;

  // Avatars from curated professional photo pool
  const avatarPool = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  ];
  const chosenAvatar = avatarPool[state.members.length % avatarPool.length];

  const newMember: UserMember = {
    id: newUserId,
    name: String(name).trim(),
    email: cleanEmail,
    role: assignedRole,
    avatar: chosenAvatar,
    status: 'online',
    lastSeen: Date.now(),
  };

  state.members.push(newMember);
  authAccounts.set(cleanEmail, {
    userId: newUserId,
    email: cleanEmail,
    passwordHash: hash,
    salt,
  });

  const token = `token_${crypto.randomBytes(24).toString('hex')}`;
  activeSessions.set(token, newUserId);

  state.lastUpdated = Date.now();
  broadcast({ type: 'MEMBER_CREATED', member: newMember });

  res.status(201).json({
    success: true,
    token,
    user: newMember,
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const userId = activeSessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const member = state.members.find((m) => m.id === userId);
  if (!member) {
    return res.status(404).json({ error: 'User account not found' });
  }

  res.json({ user: member });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const userId = activeSessions.get(token);
    if (userId) {
      const member = state.members.find((m) => m.id === userId);
      if (member) {
        member.status = 'offline';
        broadcast({ type: 'MEMBER_UPDATED', member });
      }
    }
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

app.put('/api/auth/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = activeSessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const member = state.members.find((m) => m.id === userId);
  if (!member) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.body.name) member.name = String(req.body.name).trim();
  if (req.body.avatar) member.avatar = req.body.avatar;
  if (req.body.status) member.status = req.body.status;
  if (req.body.password && String(req.body.password).length >= 6) {
    const { hash, salt } = hashPassword(String(req.body.password));
    authAccounts.set(member.email.toLowerCase(), {
      userId: member.id,
      email: member.email.toLowerCase(),
      passwordHash: hash,
      salt,
    });
  }

  member.lastSeen = Date.now();
  state.lastUpdated = Date.now();
  broadcast({ type: 'MEMBER_UPDATED', member });

  res.json({ success: true, user: member });
});

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/state', (req, res) => {
  res.json({
    ...state,
    connectedDevicesCount: Math.max(1, clients.size),
  });
});

// Offline Sync endpoint: clients send an array of offline mutations
app.post('/api/sync', (req, res) => {
  const { mutations, clientId, memberId } = req.body || {};
  if (!Array.isArray(mutations)) {
    return res.status(400).json({ error: 'Mutations array required' });
  }

  const appliedMutations: any[] = [];

  for (const mut of mutations) {
    const { type, payload, timestamp } = mut;
    state.lastUpdated = Math.max(state.lastUpdated, timestamp || Date.now());

    switch (type) {
      case 'CREATE_TASK': {
        const newTask: Task = {
          ...payload,
          id: payload.id || `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: payload.createdAt || Date.now(),
          updatedAt: Date.now(),
          version: 1,
        };
        // Avoid duplicate ID
        const existingIdx = state.tasks.findIndex((t) => t.id === newTask.id);
        if (existingIdx >= 0) {
          state.tasks[existingIdx] = newTask;
        } else {
          state.tasks.unshift(newTask);
        }
        appliedMutations.push(newTask);
        broadcast({ type: 'TASK_CREATED', task: newTask });
        break;
      }
      case 'UPDATE_TASK': {
        const idx = state.tasks.findIndex((t) => t.id === payload.id);
        if (idx >= 0) {
          const existing = state.tasks[idx];
          // Last-write-wins based on timestamp
          if (!timestamp || timestamp >= existing.updatedAt) {
            state.tasks[idx] = {
              ...existing,
              ...payload,
              updatedAt: Date.now(),
              version: (existing.version || 1) + 1,
            };
            appliedMutations.push(state.tasks[idx]);
            broadcast({ type: 'TASK_UPDATED', task: state.tasks[idx] });
          }
        }
        break;
      }
      case 'DELETE_TASK': {
        const idx = state.tasks.findIndex((t) => t.id === payload.id);
        if (idx >= 0) {
          state.tasks.splice(idx, 1);
          appliedMutations.push({ id: payload.id, deleted: true });
          broadcast({ type: 'TASK_DELETED', taskId: payload.id });
        }
        break;
      }
      case 'ADD_COMMENT': {
        const task = state.tasks.find((t) => t.id === payload.taskId);
        if (task) {
          task.comments.push(payload.comment);
          task.updatedAt = Date.now();
          broadcast({ type: 'COMMENT_ADDED', taskId: payload.taskId, comment: payload.comment });
        }
        break;
      }
      case 'UPDATE_PERMISSIONS': {
        const member = state.members.find((m) => m.id === payload.memberId || (payload.email && m.email?.toLowerCase() === payload.email?.toLowerCase()));
        if (member) {
          if (payload.role) member.role = payload.role;
          if (payload.customPermissions) member.customPermissions = payload.customPermissions;
          broadcast({ type: 'MEMBER_UPDATED', member });
        }
        break;
      }
      case 'CREATE_MEMBER': {
        if (!state.members.some((m) => m.id === payload.id)) {
          state.members.push(payload);
          broadcast({ type: 'MEMBER_CREATED', member: payload });
        }
        break;
      }
      case 'DELETE_MEMBER': {
        if (payload.memberId !== 'user-1') {
          state.members = state.members.filter((m) => m.id !== payload.memberId);
          broadcast({ type: 'MEMBER_DELETED', memberId: payload.memberId });
        }
        break;
      }
      case 'CREATE_TAG': {
        const existing = state.tags.find((t) => t.id === payload.id || t.name.toLowerCase() === payload.name.toLowerCase());
        if (!existing) {
          state.tags.push(payload);
          broadcast({ type: 'TAG_CREATED', tag: payload });
        }
        break;
      }
      case 'DELETE_TAG': {
        state.tags = state.tags.filter((t) => t.id !== payload.id);
        broadcast({ type: 'TAG_DELETED', tagId: payload.id });
        break;
      }
    }
  }

  res.json({
    success: true,
    appliedCount: appliedMutations.length,
    state,
    lastSyncTime: Date.now(),
  });
});

// Single task mutation route
app.post('/api/tasks', (req, res) => {
  const newTask: Task = {
    ...req.body,
    id: req.body.id || `task-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    comments: req.body.comments || [],
    checklist: req.body.checklist || [],
  };
  state.tasks.unshift(newTask);
  state.lastUpdated = Date.now();
  broadcast({ type: 'TASK_CREATED', task: newTask });
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Task not found' });

  const updated: Task = {
    ...state.tasks[idx],
    ...req.body,
    updatedAt: Date.now(),
    version: (state.tasks[idx].version || 1) + 1,
  };
  state.tasks[idx] = updated;
  state.lastUpdated = Date.now();
  broadcast({ type: 'TASK_UPDATED', task: updated });
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Task not found' });
  state.tasks.splice(idx, 1);
  state.lastUpdated = Date.now();
  broadcast({ type: 'TASK_DELETED', taskId: id });
  res.json({ success: true, id });
});

// Push notification trigger
app.post('/api/notifications', (req, res) => {
  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    type: req.body.type || 'task_updated',
    title: req.body.title || 'Notification',
    body: req.body.body || '',
    taskId: req.body.taskId,
    createdAt: Date.now(),
    read: false,
  };
  state.notifications.unshift(notif);
  broadcast({ type: 'NOTIFICATION_CREATED', notification: notif });
  res.json(notif);
});

// Member management routes
app.post('/api/members', (req, res) => {
  const newMember: UserMember = {
    id: req.body.id || `user-${Date.now()}`,
    name: req.body.name || 'New Member',
    email: req.body.email || 'user@project.local',
    role: req.body.role || 'member',
    avatar: req.body.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
    status: 'online',
    customPermissions: req.body.customPermissions || {},
  };
  state.members.push(newMember);
  state.lastUpdated = Date.now();
  broadcast({ type: 'MEMBER_CREATED', member: newMember });
  res.status(201).json(newMember);
});

app.delete('/api/members/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'user-1') {
    return res.status(400).json({ error: 'Cannot remove the primary workspace owner' });
  }
  const idx = state.members.findIndex((m) => m.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Member not found' });
  state.members.splice(idx, 1);
  state.lastUpdated = Date.now();
  broadcast({ type: 'MEMBER_DELETED', memberId: id });
  res.json({ success: true, id });
});

// Reset initial data helper
app.post('/api/reset-data', (req, res) => {
  state = {
    project: {
      id: 'proj-1',
      name: 'Project Workspace',
      description: 'Offline-capable collaborative project management progressive web app with real-time sync.',
      createdAt: Date.now(),
    },
    tasks: [],
    members: [...initialMembers],
    tags: [...initialTags],
    notifications: [],
    lastUpdated: Date.now(),
  };
  broadcast({ type: 'FULL_STATE_RESET', state });
  res.json({ success: true, state });
});

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: ConnectedClient = { ws, lastPing: Date.now() };
    clients.add(client);

    // Send initial state & current clients count
    ws.send(
      JSON.stringify({
        type: 'INIT_STATE',
        state,
        connectedDevicesCount: clients.size,
      })
    );

    broadcastPresence();

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'IDENTIFY') {
          client.userId = msg.userId;
          broadcastPresence();
        } else if (msg.type === 'ACTIVE_TASK') {
          client.currentTaskId = msg.taskId;
          broadcastPresence();
        } else if (msg.type === 'TASK_MUTATION') {
          // Process live mutation and broadcast
          const { mutation } = msg;
          if (mutation) {
            // Apply mutation to server state
            if (mutation.type === 'UPDATE_TASK') {
              const idx = state.tasks.findIndex((t) => t.id === mutation.payload.id);
              if (idx >= 0) {
                state.tasks[idx] = {
                  ...state.tasks[idx],
                  ...mutation.payload,
                  updatedAt: Date.now(),
                  version: (state.tasks[idx].version || 1) + 1,
                };
                broadcast({ type: 'TASK_UPDATED', task: state.tasks[idx] }, ws);
              }
            } else if (mutation.type === 'CREATE_TASK') {
              const newTask = {
                ...mutation.payload,
                id: mutation.payload.id || `task-${Date.now()}`,
                updatedAt: Date.now(),
                createdAt: Date.now(),
                version: 1,
              };
              state.tasks.unshift(newTask);
              broadcast({ type: 'TASK_CREATED', task: newTask }, ws);
            }
          }
        } else if (msg.type === 'PING') {
          client.lastPing = Date.now();
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (err) {
        console.error('WS message error', err);
      }
    });

    ws.on('close', () => {
      clients.delete(client);
      broadcastPresence();
    });

    ws.on('error', () => {
      clients.delete(client);
      broadcastPresence();
    });
  });

  // Setup Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PWA Project Management Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
