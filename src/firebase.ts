import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Build-time override (lab deploys set VITE_FIRESTORE_DATABASE_ID).
// Falls back to the value baked into firebase-applet-config.json for prod.
const dbIdFromEnv = ((import.meta.env.VITE_FIRESTORE_DATABASE_ID as string) || '').trim();
const dbIdFromConfig = (firebaseConfig.firestoreDatabaseId || '').trim();
const dbId = dbIdFromEnv || dbIdFromConfig || undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
