import { useState } from 'react';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MidYearCheckin, EmployeeAuditEntry } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { User } from 'firebase/auth';
import { IS_DEMO_MODE } from '../lib/demo-mode';

export const usePerformanceActions = (showToast: (msg: string, type?: any) => void) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  const saveFeedback = async (employeeId: string, data: MidYearCheckin, isFinal: boolean, user: User | null) => {
    const setSaving = isFinal ? setIsSaving : setIsSavingDraft;
    setSaving(true);

    if (IS_DEMO_MODE) {
      await new Promise(r => setTimeout(r, 600));
      showToast(isFinal ? 'Demo Mode — Review submitted (not persisted)' : 'Demo Mode — Draft saved (not persisted)', 'success');
      setSaving(false);
      return true;
    }

    try {
      const timestamp = new Date().toISOString();
      const docRef = doc(db, 'employees', employeeId);
      await updateDoc(docRef, {
        mid_year_checkin: {
          ...data,
          submitted_at: isFinal ? timestamp : null
        },
        status: isFinal ? 'Submitted' : 'Draft',
        updated_at: timestamp
      });

      if (isFinal && user) {
        try {
          const auditRef = collection(db, 'employee_audit');
          const auditEntry: EmployeeAuditEntry = {
            employee_id: employeeId,
            actor_email: user.email?.toLowerCase() || '',
            actor_name: user.displayName || null,
            event_type: 'submit',
            timestamp: timestamp,
            snapshot: data
          };
          await addDoc(auditRef, auditEntry);
        } catch (auditError) {
          console.error('Audit log failed:', auditError);
          showToast('Review submitted — audit log sync delayed', 'info');
        }
      }

      showToast(isFinal ? 'Review completed successfully!' : 'Draft saved!', 'success');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Action failed. Please try again.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const adminOverrideReview = async (employeeId: string, updatedData: MidYearCheckin, reason: string, user: User | null) => {
    if (IS_DEMO_MODE) {
      setIsOverriding(true);
      await new Promise(r => setTimeout(r, 600));
      showToast('Demo Mode — Override applied (not persisted)', 'success');
      setIsOverriding(false);
      return true;
    }

    if (!user) throw new Error('User must be authenticated for override.');
    if (!reason) throw new Error('Reason is required for override.');

    setIsOverriding(true);
    try {
      const docRef = doc(db, 'employees', employeeId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Employee not found.');
      
      const previousData = docSnap.data().mid_year_checkin as MidYearCheckin;
      const timestamp = new Date().toISOString();

      // update employee
      await updateDoc(docRef, {
        mid_year_checkin: updatedData,
        updated_at: timestamp
      });

      // write audit
      const auditRef = collection(db, 'employee_audit');
      const auditEntry: EmployeeAuditEntry = {
        employee_id: employeeId,
        actor_email: user.email?.toLowerCase() || '',
        actor_name: user.displayName || null,
        event_type: 'admin_override',
        timestamp: timestamp,
        snapshot: updatedData,
        previous_snapshot: previousData,
        notes: reason
      };
      await addDoc(auditRef, auditEntry);

      showToast('Review successfully corrected and audited.', 'success');
      return true;
    } catch (error) {
      console.error('Override failed:', error);
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Override failed.', 'error');
      throw error;
    } finally {
      setIsOverriding(false);
    }
  };

  return { isSaving, isSavingDraft, isOverriding, saveFeedback, adminOverrideReview };
};
