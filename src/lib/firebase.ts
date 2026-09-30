import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import fallbackStarterConfig from '../../firebase-applet-config.json';

// Direct production configuration for TRUSTLY
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJGtAIjZzwzi07bmhVJ0SBZDdq_tnJvgM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trustly-16be3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trustly-16be3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trustly-16be3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "704788627452",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:704788627452:web:8bc99f0f107c9f5befbc79",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SFZEHRQMLX"
};

// Initialize Firebase SDK with the confirmed project configuration
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom databaseId if specified in env, otherwise default
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Safe memory image upload to couples/{coupleId}/memories/{memoryId}/...
export async function uploadMemoryImage(coupleId: string, memoryId: string, file: File): Promise<string> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `couples/${coupleId}/memories/${memoryId}/${Date.now()}_${sanitizedName}`;
  const fileRef = storageRef(storage, path);
  
  await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: { coupleId, memoryId }
  });
  
  const downloadUrl = await getDownloadURL(fileRef);
  return downloadUrl;
}

export async function deleteMemoryImage(imageUrl?: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('firebasestorage')) return;
  try {
    const fileRef = storageRef(storage, imageUrl);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn("Notice deleting image from storage:", err);
  }
}

export const currentFirebaseProjectId = firebaseConfig.projectId;
export const isUsingCustomFirebase = true;

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
  return Boolean(app && db);
}
testConnection();
