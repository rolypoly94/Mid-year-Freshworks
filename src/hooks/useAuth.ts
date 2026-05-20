import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminLoaded, setIsAdminLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
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
    if (!user?.email) {
      if (isAuthReady && !user) {
        setIsAdmin(false);
        setIsAdminLoaded(true);
      }
      return;
    }

    const email = user.email.toLowerCase().trim();
    
    // Hardcoded admin for sumit.yadav@freshworks.com
    if (email === 'sumit.yadav@freshworks.com') {
      setIsAdmin(true);
      setIsAdminLoaded(true);
      return;
    }

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
  }, [user, isAuthReady]);

  const login = () => {
    return signInWithPopup(auth, googleProvider);
  };
  
  const logout = () => {
    return signOut(auth);
  };

  return { user, isAdmin, isAdminLoaded, isAuthReady, login, logout };
};
