import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import fallbackStarterConfig from '../../firebase-applet-config.json';

// Prioritize custom user project environment variables; fallback to starter config if env vars are unset
const customEnvConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if user has provided their own Firebase project credentials via environment variables
const hasUserEnvConfig = Boolean(
  customEnvConfig.apiKey &&
  customEnvConfig.projectId &&
  customEnvConfig.appId
);

const activeConfig = hasUserEnvConfig
  ? {
      apiKey: customEnvConfig.apiKey,
      authDomain: customEnvConfig.authDomain || `${customEnvConfig.projectId}.firebaseapp.com`,
      projectId: customEnvConfig.projectId,
      storageBucket: customEnvConfig.storageBucket || `${customEnvConfig.projectId}.firebasestorage.app`,
      messagingSenderId: customEnvConfig.messagingSenderId || '',
      appId: customEnvConfig.appId,
      measurementId: customEnvConfig.measurementId || '',
    }
  : fallbackStarterConfig;

// Initialize Firebase SDK with the resolved project configuration
const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
export const auth = getAuth(app);

// Use custom databaseId if specified in env, otherwise default or fallback
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || 
  (!hasUserEnvConfig ? (fallbackStarterConfig as any).firestoreDatabaseId : undefined);

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const isUsingCustomFirebase = hasUserEnvConfig;
export const currentFirebaseProjectId = activeConfig.projectId;

// Standard Firestore error handler per guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawMsg = error instanceof Error ? error.message : String(error);
  if (rawMsg.includes('permission-denied') || rawMsg.includes('insufficient permissions')) {
    throw new Error("You don't have permission to access this.");
  }
  throw new Error("Something went wrong. Please try again.");
}

// Connection test
export async function testConnection() {
  // App initialization confirmation
  return Boolean(app && db);
}
testConnection();
