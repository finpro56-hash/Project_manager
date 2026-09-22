import { UserMember, Role } from '../types';
import { syncEngine } from './syncEngine';
import {
  loginWithGoogle as loginWithGoogleFirebase,
  loginWithEmail as loginWithEmailFirebase,
  registerWithEmail as registerWithEmailFirebase,
  logoutFirebase,
  saveMemberFirestore,
} from './firebase';

const AUTH_STORAGE_KEYS = {
  TOKEN: 'project_pwa_auth_token_v2',
  USER: 'project_pwa_auth_user_v2',
  OFFLINE_CREDENTIALS: 'project_pwa_offline_creds_v2',
};

interface StoredCredential {
  email: string;
  passwordHash: string;
  user: UserMember;
}

// Simple deterministic hash for offline credential checking
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

class AuthService {
  private currentUser: UserMember | null = null;
  private token: string | null = null;
  private isLoading: boolean = true;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
    syncEngine.subscribe(() => {
      if (this.currentUser) {
        const activeM = syncEngine.getMembers().find(
          (m) => m.id === this.currentUser?.id || m.email?.toLowerCase() === this.currentUser?.email?.toLowerCase()
        );
        if (activeM && (activeM.role !== this.currentUser.role || JSON.stringify(activeM.customPermissions) !== JSON.stringify(this.currentUser.customPermissions))) {
          this.currentUser = { ...this.currentUser, role: activeM.role, customPermissions: activeM.customPermissions };
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
          this.notifyListeners();
        }
      }
    });
  }

  private async init() {
    try {
      const storedToken = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        this.token = storedToken;
        this.currentUser = JSON.parse(storedUser);
        syncEngine.setActiveUserId(this.currentUser!.id);

        // Attempt silent verification with server if online
        if (navigator.onLine && !syncEngine.isEffectiveOffline()) {
          this.verifySession(storedToken);
        }
      } else {
        // Automatically pre-cache owner account finpro56@gmail.com for seamless offline login
        this.ensureOwnerOfflineCredential();
      }
    } catch (err) {
      console.error('Failed initializing auth', err);
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  private ensureOwnerOfflineCredential() {
    const creds = this.getOfflineCredentials();
    const ownerEmail = 'finpro56@gmail.com';
    if (!creds[ownerEmail]) {
      creds[ownerEmail] = {
        email: ownerEmail,
        passwordHash: simpleHash('password123'),
        user: {
          id: 'user-1',
          name: 'Workspace Owner',
          email: ownerEmail,
          role: 'owner',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          status: 'online',
        },
      };
      this.saveOfflineCredentials(creds);
    }
  }

  private async verifySession(token: string) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(data.user));
          syncEngine.setActiveUserId(data.user.id);
          this.notifyListeners();
        }
      } else if (res.status === 401) {
        // Token expired on server; clear session
        this.logout();
      }
    } catch {
      // Offline fallback: keep cached session
    }
  }

  public async loginWithGoogle(): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
    try {
      const { user: fbUser, error } = await loginWithGoogleFirebase();
      if (error === 'cancelled') {
        return { success: false, cancelled: true };
      }
      if (error || !fbUser) {
        return { success: false, error: error || 'Google Authentication failed' };
      }

      const cleanEmail = (fbUser.email || '').trim().toLowerCase();
      const isOwner = cleanEmail === 'finpro56@gmail.com';
      const existingMember = syncEngine.getMembers().find((m) => m.email.toLowerCase() === cleanEmail);
      const assignedRole: Role = isOwner ? 'owner' : (existingMember ? existingMember.role : 'member');

      const userMember: UserMember = {
        id: existingMember?.id || fbUser.uid,
        name: fbUser.displayName || existingMember?.name || cleanEmail.split('@')[0] || 'Google User',
        email: cleanEmail,
        role: assignedRole,
        customPermissions: existingMember?.customPermissions || {},
        avatar: fbUser.photoURL || existingMember?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        status: 'online',
        lastSeen: Date.now(),
      };

      this.token = await fbUser.getIdToken();
      this.currentUser = userMember;

      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(userMember));

      await saveMemberFirestore(userMember);
      syncEngine.setActiveUserId(userMember.id);
      this.notifyListeners();

      return { success: true };
    } catch (err: any) {
      console.error('Google Auth exception:', err);
      return { success: false, error: err.message || 'Google sign-in failed' };
    }
  }

  public async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Firebase Auth
    if (navigator.onLine && !syncEngine.isEffectiveOffline()) {
      try {
        const { user: fbUser, error: fbErr } = await loginWithEmailFirebase(cleanEmail, password);
        if (fbUser) {
          const isOwner = cleanEmail === 'finpro56@gmail.com';
          const existingMember = syncEngine.getMembers().find((m) => m.email.toLowerCase() === cleanEmail);
          const assignedRole: Role = isOwner ? 'owner' : (existingMember ? existingMember.role : 'member');

          const userMember: UserMember = {
            id: existingMember?.id || fbUser.uid,
            name: fbUser.displayName || existingMember?.name || cleanEmail.split('@')[0] || 'User',
            email: cleanEmail,
            role: assignedRole,
            customPermissions: existingMember?.customPermissions || {},
            avatar: fbUser.photoURL || existingMember?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
            status: 'online',
            lastSeen: Date.now(),
          };

          this.token = await fbUser.getIdToken();
          this.currentUser = userMember;

          localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(userMember));

          this.cacheCredential(cleanEmail, password, userMember);
          await saveMemberFirestore(userMember);
          syncEngine.setActiveUserId(userMember.id);
          this.notifyListeners();
          return { success: true };
        }
      } catch {
        // Fallback to server REST API or offline credential check
      }

      // Try Backend REST API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.user) {
          this.token = data.token;
          this.currentUser = data.user;

          localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.token);
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(data.user));

          this.cacheCredential(cleanEmail, password, data.user);
          saveMemberFirestore(data.user);
          syncEngine.setActiveUserId(data.user.id);
          this.notifyListeners();
          return { success: true };
        }
      } catch (networkErr) {
        console.warn('Network login failed, attempting offline authentication', networkErr);
      }
    }

    // 2. Offline fallback login
    const creds = this.getOfflineCredentials();
    const cred = creds[cleanEmail];

    if (cred && cred.passwordHash === simpleHash(password)) {
      this.currentUser = cred.user;
      this.token = `offline_token_${Date.now()}`;
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(cred.user));

      syncEngine.setActiveUserId(cred.user.id);
      this.notifyListeners();
      return { success: true };
    }

    // Special fallback for initial workspace owner with default password
    if (cleanEmail === 'finpro56@gmail.com' && (password === 'password123' || password === 'admin123')) {
      const ownerUser: UserMember = {
        id: 'user-1',
        name: 'Workspace Owner',
        email: 'finpro56@gmail.com',
        role: 'owner',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        status: 'online',
      };
      this.currentUser = ownerUser;
      this.token = `offline_token_${Date.now()}`;
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(ownerUser));
      this.cacheCredential(cleanEmail, password, ownerUser);
      saveMemberFirestore(ownerUser);

      syncEngine.setActiveUserId(ownerUser.id);
      this.notifyListeners();
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid email or password. (For owner finpro56@gmail.com, default password is password123)',
    };
  }

  public async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const existingMember = syncEngine.getMembers().find((m) => m.email.toLowerCase() === cleanEmail);
    const assignedRole: Role = cleanEmail === 'finpro56@gmail.com' ? 'owner' : (existingMember ? existingMember.role : 'member');

    if (navigator.onLine && !syncEngine.isEffectiveOffline()) {
      try {
        const { user: fbUser, error: fbErr } = await registerWithEmailFirebase(cleanEmail, password);
        if (fbUser) {
          const userMember: UserMember = {
            id: fbUser.uid,
            name: cleanName,
            email: cleanEmail,
            role: assignedRole,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
            status: 'online',
            lastSeen: Date.now(),
          };

          this.token = await fbUser.getIdToken();
          this.currentUser = userMember;

          localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(userMember));

          this.cacheCredential(cleanEmail, password, userMember);
          await saveMemberFirestore(userMember);
          syncEngine.setActiveUserId(userMember.id);
          this.notifyListeners();
          return { success: true };
        }
      } catch (fbErr) {
        console.warn('Firebase registration notice:', fbErr);
      }

      // Try Backend REST API
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password, role: assignedRole }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.user) {
          this.token = data.token;
          this.currentUser = data.user;

          localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.token);
          localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(data.user));

          this.cacheCredential(cleanEmail, password, data.user);
          saveMemberFirestore(data.user);
          syncEngine.setActiveUserId(data.user.id);
          this.notifyListeners();
          return { success: true };
        } else if (!res.ok) {
          return { success: false, error: data.error || 'Registration failed' };
        }
      } catch (networkErr) {
        console.warn('Network registration failed, using offline mode', networkErr);
      }
    }

    // Offline registration fallback
    const newUserId = `user-${Date.now()}`;
    const newUser: UserMember = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      status: 'online',
    };

    this.token = `offline_token_${Date.now()}`;
    this.currentUser = newUser;
    localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, this.token);
    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(newUser));

    this.cacheCredential(cleanEmail, password, newUser);
    syncEngine.createMember(cleanName, cleanEmail, assignedRole);
    saveMemberFirestore(newUser);
    syncEngine.setActiveUserId(newUserId);
    this.notifyListeners();

    return { success: true };
  }

  public async logout() {
    logoutFirebase();
    if (this.token && navigator.onLine && !syncEngine.isEffectiveOffline()) {
      try {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      } catch {}
    }

    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    this.notifyListeners();
  }

  public async updateProfile(data: { name?: string; avatar?: string; status?: 'online' | 'offline' | 'busy' }) {
    if (!this.currentUser) return;

    if (data.name) this.currentUser.name = data.name;
    if (data.avatar) this.currentUser.avatar = data.avatar;
    if (data.status) this.currentUser.status = data.status;

    localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));

    if (this.token && navigator.onLine && !syncEngine.isEffectiveOffline()) {
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('Profile update failed to sync online', err);
      }
    }

    this.notifyListeners();
  }

  public getCurrentUser(): UserMember | null {
    return this.currentUser;
  }

  public updateUserRole(role: Role) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, role };
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
      this.notifyListeners();
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const l of this.listeners) {
      l();
    }
  }

  private getOfflineCredentials(): Record<string, StoredCredential> {
    try {
      const item = localStorage.getItem(AUTH_STORAGE_KEYS.OFFLINE_CREDENTIALS);
      return item ? JSON.parse(item) : {};
    } catch {
      return {};
    }
  }

  private saveOfflineCredentials(creds: Record<string, StoredCredential>) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.OFFLINE_CREDENTIALS, JSON.stringify(creds));
    } catch {}
  }

  private cacheCredential(email: string, pass: string, user: UserMember) {
    const creds = this.getOfflineCredentials();
    creds[email.toLowerCase()] = {
      email: email.toLowerCase(),
      passwordHash: simpleHash(pass),
      user,
    };
    this.saveOfflineCredentials(creds);
  }
}

export const authService = new AuthService();
