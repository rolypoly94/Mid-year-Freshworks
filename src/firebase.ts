import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the specific database ID from config, fallback to default if empty
const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '') 
  ? firebaseConfig.firestoreDatabaseId.trim() 
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
