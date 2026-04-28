import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { IS_DEMO_MODE } from '../lib/demo-mode';
import { DEMO_USER } from '../lib/demo-data';
import { useDemo } from '../context/DemoContext';

export const useAuth = () => {
  const demoContext = IS_DEMO_MODE ? useDemo() : null;
  
  const [user, setUser] = useState<User | null>(IS_DEMO_MODE ? (DEMO_USER as any) : null);
  const [isAdmin, setIsAdmin] = useState<boolean>(IS_DEMO_MODE ? true : false);
  const [isAdminLoaded, setIsAdminLoaded] = useState(IS_DEMO_MODE ? true : false);
  const [isAuthReady, setIsAuthReady] = useState(IS_DEMO_MODE ? true : false);

  useEffect(() => {
    if (IS_DEMO_MODE) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const email = currentUser.email?.toLowerCase();
        if (email && email.endsWith('@freshworks.com')) {
          setUser(currentUser);
        } else {
          signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsAdminLoaded(true);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Admin status subscription
  useEffect(() => {
    if (IS_DEMO_MODE) {
      if (demoContext) {
        setIsAdmin(demoContext.activeProfile.isAdmin);
        setUser({ ...DEMO_USER, email: demoContext.activeProfile.email, displayName: demoContext.activeProfile.name } as any);
      }
      return;
    }

    if (!user?.email) {
      if (isAuthReady && !user) {
        setIsAdmin(false);
        setIsAdminLoaded(true);
      }
      return;
    }

    const email = user.email.toLowerCase().trim();
    setIsAdminLoaded(false);

    const unsub = onSnapshot(doc(db, 'admins', email), 
      (docSnap) => {
        setIsAdmin(docSnap.exists());
        setIsAdminLoaded(true);
      },
      (error) => {
        console.error('Admin check failed:', error);
        setIsAdmin(false);
        setIsAdminLoaded(true);
      }
    );

    return () => unsub();
  }, [user, isAuthReady, demoContext?.perspective]);

  const login = () => {
    if (IS_DEMO_MODE) return;
    return signInWithPopup(auth, googleProvider);
  };
  
  const logout = () => {
    if (IS_DEMO_MODE) return;
    return signOut(auth);
  };

  return { user, isAdmin, isAdminLoaded, isAuthReady, login, logout };
};
