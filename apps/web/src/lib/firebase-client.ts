"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firebase's default persistence (indexedDBLocalPersistence) has a known SDK
// bug where a concurrent connection/tab can force-close the IndexedDB
// connection mid-write, rejecting setCurrentUser() with "Database is
// closing/hidden" even after the Google handshake itself already succeeded.
// Forcing the older localStorage-backed persistence avoids that codepath
// entirely. Must resolve before signInWithPopup runs, not just be kicked off.
const persistenceReady = setPersistence(auth, browserLocalPersistence);

export async function signInWithGooglePopup(): Promise<string> {
  await persistenceReady;
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}
