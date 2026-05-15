import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  collectionGroup,
  or
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, MidYearCheckin, ManagerPrivateData } from '../types';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const usePerformanceData = (user: User | null, isAdmin: boolean, proxyEmail: string | null) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerEmployees, setManagerEmployees] = useState<Employee[]>([]);
  const [hrbpEmployees, setHrbpEmployees] = useState<Employee[]>([]);
  const [currentUserEmployee, setCurrentUserEmployee] = useState<Employee | null>(null);
  const [privateDataMap, setPrivateDataMap] = useState<Record<string, ManagerPrivateData>>({});
  const [isHRBP, setIsHRBP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveUserEmail = useMemo(() => {
    if (!user) return null;
    const email = user.email!.toLowerCase().trim();
    return (isAdmin && proxyEmail) ? proxyEmail.toLowerCase().trim() : email;
  }, [user, isAdmin, proxyEmail]);

  useEffect(() => {
    if (!user || !effectiveUserEmail) {
      setEmployees([]);
      setManagerEmployees([]);
      setHrbpEmployees([]);
      setCurrentUserEmployee(null);
      setPrivateDataMap({});
      setIsHRBP(false);
      setIsLoading(false);
      return;
    }

    const path = 'employees';
    setIsLoading(true);

    // Manager Query
    const qManager = query(collection(db, path), where('manager_email', '==', effectiveUserEmail));
    const unsubManager = onSnapshot(qManager, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setManagerEmployees(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees (manager query)');
    });

    // HRBP Query
    const qHRBP = query(collection(db, path), where('hrbp_email', '==', effectiveUserEmail));
    const unsubHRBP = onSnapshot(qHRBP, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setHrbpEmployees(data);
      setIsHRBP(data.length > 0);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees (hrbp query)');
    });

    // Admin All Query
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
    const docRef = doc(db, path, effectiveUserEmail);
    const unsubSelf = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
      } else {
        setCurrentUserEmployee(null);
      }
    });

    // Fetch Manager Private Data
    // We can use a collectionGroup query if allowed, but for simplicity we'll fetch them individually for the lists
    // Actually, security rules allow reading them if manager_email matches.
    // A collectionGroup query on 'manager_private' where manager_email == effectiveUserEmail would be best.
    // However, it requires an index. I'll stick to fetching manually for now OR assume I can fetch all.
    // Let's try collectionGroup as it's cleaner if indexed.
    let qPrivate;
    if (isAdmin) {
      qPrivate = query(collectionGroup(db, 'manager_private'));
    } else {
      qPrivate = query(collectionGroup(db, 'manager_private'), or(
        where('manager_email', '==', effectiveUserEmail),
        where('hrbp_email', '==', effectiveUserEmail)
      ));
    }
    const unsubPrivate = onSnapshot(qPrivate, (snapshot) => {
      const mapping: Record<string, ManagerPrivateData> = {};
      snapshot.docs.forEach(doc => {
        // The parent path is /employees/{email}/manager_private/current
        const email = doc.ref.parent.parent?.id;
        if (email) {
          mapping[email] = doc.data() as ManagerPrivateData;
        }
      });
      setPrivateDataMap(prev => ({ ...prev, ...mapping }));
    }, (error) => {
      console.warn('Private data access restricted or index missing:', error);
      // Fallback is okay, the form will fetch its own if needed
    });

    return () => {
      unsubManager();
      unsubHRBP();
      unsubSelf();
      unsubPrivate();
      if (unsubAll) unsubAll();
    };
  }, [user, isAdmin, proxyEmail, effectiveUserEmail]);

  // Merge lists and private data
  const mergedEmployees = useMemo(() => {
    const list = isAdmin && !proxyEmail ? employees : [...managerEmployees];
    if (!isAdmin || proxyEmail) {
      hrbpEmployees.forEach(emp => {
        if (!list.find(e => e.id === emp.id)) list.push(emp);
      });
    }

    return list.map(emp => {
      const privateData = privateDataMap[emp.employee_email.toLowerCase()];
      if (privateData) {
        const midYear = emp.mid_year_checkin || {
          key_contributions: '',
          development_evolution: '',
          leadership_mastery: '',
          additional_notes: '',
          great_reflections: []
        };
        return {
          ...emp,
          mid_year_checkin: {
            ...midYear,
            performance_trending_rating: privateData.performance_trending_rating,
            promotion_readiness: privateData.promotion_readiness,
            additional_notes: privateData.additional_notes || ''
          }
        };
      }
      return emp;
    });
  }, [employees, managerEmployees, hrbpEmployees, isAdmin, proxyEmail, privateDataMap]);

  return { 
    employees: mergedEmployees, 
    managerEmployees: mergedEmployees.filter(e => e.manager_email.toLowerCase() === effectiveUserEmail),
    hrbpEmployees: mergedEmployees.filter(e => e.hrbp_email?.toLowerCase() === effectiveUserEmail),
    currentUserEmployee, 
    isHRBP, 
    isLoading,
  };
};
