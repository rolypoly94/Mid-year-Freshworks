import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, MidYearCheckin } from '../types';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const usePerformanceData = (user: User | null, isAdmin: boolean, proxyEmail: string | null) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerEmployees, setManagerEmployees] = useState<Employee[]>([]);
  const [hrbpEmployees, setHrbpEmployees] = useState<Employee[]>([]);
  const [currentUserEmployee, setCurrentUserEmployee] = useState<Employee | null>(null);
  const [isHRBP, setIsHRBP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEmployees([]);
      setManagerEmployees([]);
      setHrbpEmployees([]);
      setCurrentUserEmployee(null);
      setIsHRBP(false);
      setIsLoading(false);
      return;
    }

    const path = 'employees';
    const email = user.email!.toLowerCase().trim();
    const effectiveEmail = (isAdmin && proxyEmail) ? proxyEmail.toLowerCase().trim() : email;

    setIsLoading(true);

    // Manager Query
    const qManager = query(collection(db, path), where('manager_email', '==', effectiveEmail));
    const unsubManager = onSnapshot(qManager, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setManagerEmployees(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees (manager query)');
    });

    // HRBP Query
    const qHRBP = query(collection(db, path), where('hrbp_email', '==', effectiveEmail));
    const unsubHRBP = onSnapshot(qHRBP, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setHrbpEmployees(data);
      setIsHRBP(data.length > 0);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees (hrbp query)');
    });

    // Admin All Query (if applicable)
    let unsubAll: (() => void) | undefined;
    if (isAdmin && !proxyEmail) {
      const qAll = query(collection(db, path));
      unsubAll = onSnapshot(qAll, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(data);
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'employees (admin all)');
      });
    }

    // Individual Employee Record
    const docRef = doc(db, path, effectiveEmail);
    const unsubSelf = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
      } else {
        setCurrentUserEmployee(null);
      }
    });

    return () => {
      unsubManager();
      unsubHRBP();
      unsubSelf();
      if (unsubAll) unsubAll();
    };
  }, [user, isAdmin, proxyEmail]);

  // Merge lists for non-admin view
  useEffect(() => {
    if (!isAdmin || proxyEmail) {
      const combined = [...managerEmployees];
      hrbpEmployees.forEach(emp => {
        if (!combined.find(e => e.id === emp.id)) combined.push(emp);
      });
      setEmployees(combined);
      setIsLoading(false);
    }
  }, [managerEmployees, hrbpEmployees, isAdmin, proxyEmail]);

  return { 
    employees, 
    managerEmployees, 
    hrbpEmployees, 
    currentUserEmployee, 
    isHRBP, 
    isLoading 
  };
};
