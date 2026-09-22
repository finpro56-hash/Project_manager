import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, UserMember, TaskTag, Role } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore Database with specific databaseId if provided
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, dbId);

// --- Auth Helper Functions ---

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return { user: null, error: 'cancelled' };
    }
    if (error?.code === 'auth/popup-blocked') {
      return {
        user: null,
        error: 'Sign-in popup was blocked by your browser. Please allow popups for this site.',
      };
    }
    console.warn('Google Auth notice:', error?.message || error);
    return { user: null, error: error?.message || 'Google sign-in failed' };
  }
}

export async function registerWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return { user: res.user, error: null };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      return { user: null, error: 'An account with this email address already exists.' };
    }
    if (error?.code === 'auth/weak-password') {
      return { user: null, error: 'Password must be at least 6 characters long.' };
    }
    if (error?.code === 'auth/invalid-email') {
      return { user: null, error: 'Please enter a valid email address.' };
    }
    console.warn('Email Registration notice:', error?.message || error);
    return { user: null, error: error?.message || 'Registration failed' };
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return { user: res.user, error: null };
  } catch (error: any) {
    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential'
    ) {
      return { user: null, error: 'Invalid email or password.' };
    }
    console.warn('Email Login notice:', error?.message || error);
    return { user: null, error: error?.message || 'Login failed' };
  }
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// --- Firestore Real-Time CRUD Operations ---

// Tasks
export function subscribeFirestoreTasks(callback: (tasks: Task[]) => void) {
  const q = query(collection(db, 'tasks'));
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      // Sort tasks by createdAt desc
      tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(tasks);
    },
    (err) => {
      console.warn('Firestore tasks snapshot error:', err);
    }
  );
}

export async function saveTaskFirestore(task: Task) {
  try {
    await setDoc(doc(db, 'tasks', task.id), task, { merge: true });
  } catch (err) {
    console.error('Error saving task to Firestore:', err);
  }
}

export async function deleteTaskFirestore(taskId: string) {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    console.error('Error deleting task from Firestore:', err);
  }
}

// Members
export function subscribeFirestoreMembers(callback: (members: UserMember[]) => void) {
  const q = query(collection(db, 'members'));
  return onSnapshot(
    q,
    (snapshot) => {
      const members: UserMember[] = [];
      snapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() } as UserMember);
      });
      if (members.length > 0) {
        callback(members);
      }
    },
    (err) => {
      console.warn('Firestore members snapshot error:', err);
    }
  );
}

export async function saveMemberFirestore(member: UserMember) {
  try {
    await setDoc(doc(db, 'members', member.id), member, { merge: true });
  } catch (err) {
    console.error('Error saving member to Firestore:', err);
  }
}

export async function deleteMemberFirestore(memberId: string) {
  try {
    await deleteDoc(doc(db, 'members', memberId));
  } catch (err) {
    console.error('Error deleting member from Firestore:', err);
  }
}

// Tags
export function subscribeFirestoreTags(callback: (tags: TaskTag[]) => void) {
  const q = query(collection(db, 'tags'));
  return onSnapshot(
    q,
    (snapshot) => {
      const tags: TaskTag[] = [];
      snapshot.forEach((doc) => {
        tags.push({ id: doc.id, ...doc.data() } as TaskTag);
      });
      if (tags.length > 0) {
        callback(tags);
      }
    },
    (err) => {
      console.warn('Firestore tags snapshot error:', err);
    }
  );
}

export async function saveTagFirestore(tag: TaskTag) {
  try {
    await setDoc(doc(db, 'tags', tag.id), tag, { merge: true });
  } catch (err) {
    console.error('Error saving tag to Firestore:', err);
  }
}

export async function deleteTagFirestore(tagId: string) {
  try {
    await deleteDoc(doc(db, 'tags', tagId));
  } catch (err) {
    console.error('Error deleting tag from Firestore:', err);
  }
}
