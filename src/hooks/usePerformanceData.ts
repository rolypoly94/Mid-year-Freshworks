import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  collectionGroup,
  or,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, MidYearCheckin, ManagerPrivateData } from '../types';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

type ShowToast = (msg: string, type?: 'success' | 'error' | 'info') => void;

export const usePerformanceData = (
  user: User | null,
  isAdmin: boolean,
  proxyEmail: string | null,
  showToast?: ShowToast,
) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerEmployees, setManagerEmployees] = useState<Employee[]>([]);
  const [hrbpEmployees, setHrbpEmployees] = useState<Employee[]>([]);
  const [currentUserEmployee, setCurrentUserEmployee] = useState<Employee | null>(null);
  const [privateDataMap, setPrivateDataMap] = useState<Record<string, ManagerPrivateData>>({});
  const [isHRBP, setIsHRBP] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminRefreshKey, setAdminRefreshKey] = useState(0);
  const refreshAdminEmployees = useCallback(() => setAdminRefreshKey(k => k + 1), []);
  const [hrbpRefreshKey, setHrbpRefreshKey] = useState(0);
  const refreshHrbpEmployees = useCallback(() => setHrbpRefreshKey(k => k + 1), []);

  const effectiveUserEmail = useMemo(() => {
    if (!user || !user.email) return null;
    const email = user.email.toLowerCase().trim();
    return (isAdmin && proxyEmail) ? proxyEmail.toLowerCase().trim() : email;
  }, [user, isAdmin, proxyEmail]);

  useEffect(() => {
    if (!user || !user.email || !effectiveUserEmail) {
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
    let cancelled = false;

    // Manager Query
    const qManager = query(collection(db, path), where('manager_email', '==', effectiveUserEmail));
    const unsubManager = onSnapshot(qManager, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setManagerEmployees(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees (manager query)');
      showToast?.('Connection issue — your team list may be out of date. Try refreshing.', 'error');
    });

    // HRBP Query — one-shot fetch. Most users are not HRBPs, so a live
    // listener for the whole session would burn a socket for no gain.
    // For HRBPs, refresh fires when they click into the HRBP tab.
    const qHRBP = query(collection(db, path), where('hrbp_email', '==', effectiveUserEmail));
    getDocs(qHRBP)
      .then(snapshot => {
        if (cancelled) return;
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
        setHrbpEmployees(data);
        setIsHRBP(data.length > 0);
      })
      .catch(error => {
        if (cancelled) return;
        handleFirestoreError(error, OperationType.LIST, 'employees (hrbp query)');
        showToast?.('Failed to check HRBP scope. Try refreshing.', 'error');
      });

    // Admin: fetch the full collection once (no live listener). This avoids
    // every admin tab broadcasting every employee write in real time.
    // Call refreshAdminEmployees() to re-fetch (we trigger that on viewMode
    // change to admin from App.tsx).
    if (isAdmin && !proxyEmail) {
      const qAll = query(collection(db, path));
      getDocs(qAll)
        .then(snapshot => {
          if (cancelled) return;
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
          setEmployees(data);
          setIsLoading(false);
        })
        .catch(error => {
          if (cancelled) return;
          handleFirestoreError(error, OperationType.LIST, 'employees (admin all)');
          showToast?.('Failed to load employees. Try refreshing.', 'error');
          setIsLoading(false);
        });
    }

    // Individual Employee Record
    const docRef = doc(db, path, effectiveUserEmail);
    const unsubSelf = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
        } else {
          setCurrentUserEmployee(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'employees (self)');
        showToast?.('Connection issue — your record may be out of date. Try refreshing.', 'error');
      },
    );

    // Fetch Manager Private Data
    // Collection-group query for the private compartment of each employee
    // record (ratings, promotion readiness, calibration notes). On Standard
    // Firestore this requires the collection-group-scoped indexes on
    // `manager_email` and `hrbp_email` declared in firestore.indexes.json.
    // The production database is on Firestore Enterprise Edition, which
    // auto-indexes and does not accept fieldOverrides via the CLI — see the
    // _note in firestore.indexes.json. Either way, the toast below surfaces
    // failed-precondition errors so we don't silently show blank ratings.
    let qPrivate;
    if (isAdmin) {
      qPrivate = query(collectionGroup(db, 'manager_private'));
    } else {
      qPrivate = query(collectionGroup(db, 'manager_private'), or(
        where('manager_email', '==', effectiveUserEmail),
        where('hrbp_email', '==', effectiveUserEmail)
      ));
    }
    const unsubPrivate = onSnapshot(
      qPrivate,
      (snapshot) => {
        const mapping: Record<string, ManagerPrivateData> = {};
        snapshot.docs.forEach(doc => {
          // The parent path is /employees/{email}/manager_private/current
          const email = doc.ref.parent.parent?.id;
          if (email) {
            mapping[email] = doc.data() as ManagerPrivateData;
          }
        });
        setPrivateDataMap(prev => ({ ...prev, ...mapping }));
      },
      (error) => {
        console.error('manager_private collectionGroup query failed:', error);
        // failed-precondition usually means a Firestore index is missing for
        // this query — surface it so we don't ship the app with managers
        // seeing blank ratings and no idea why.
        const code = (error as { code?: string }).code;
        if (code === 'failed-precondition') {
          showToast?.('Ratings can\'t load — a Firestore index is missing. Please contact your admin.', 'error');
        } else if (code !== 'permission-denied') {
          // permission-denied is expected for non-managers; don't toast.
          showToast?.('Couldn\'t load private review data. Try refreshing.', 'error');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubManager();
      unsubSelf();
      unsubPrivate();
    };
  }, [user, isAdmin, proxyEmail, effectiveUserEmail, adminRefreshKey, hrbpRefreshKey, showToast]);

  // Merge lists and private data
  const mergedEmployees = useMemo(() => {
    let list: Employee[];
    if (isAdmin && !proxyEmail) {
      list = employees;
    } else {
      // Dedup manager + hrbp lists via a Map keyed by id — O(n+m) vs the
      // previous list.find loop which was O(n·m).
      const seen = new Map<string, Employee>();
      managerEmployees.forEach(emp => seen.set(emp.id, emp));
      hrbpEmployees.forEach(emp => { if (!seen.has(emp.id)) seen.set(emp.id, emp); });
      list = Array.from(seen.values());
    }

    return list.map(emp => {
      const emailKey = emp.employee_email?.toLowerCase() || '';
      const privateData = emailKey ? privateDataMap[emailKey] : null;
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
    managerEmployees: mergedEmployees.filter(e => e.manager_email?.toLowerCase() === effectiveUserEmail),
    hrbpEmployees: mergedEmployees.filter(e => e.hrbp_email?.toLowerCase() === effectiveUserEmail),
    currentUserEmployee,
    isHRBP,
    isLoading,
    refreshAdminEmployees,
    refreshHrbpEmployees,
  };
};
