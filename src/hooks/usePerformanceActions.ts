import { useState } from 'react';
import { doc, updateDoc, getDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MidYearCheckin, EmployeeAuditEntry, ManagerPrivateData, Employee } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { User } from 'firebase/auth';

export const usePerformanceActions = (showToast: (msg: string, type?: any) => void) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const saveFeedback = async (employeeId: string, data: MidYearCheckin, status: 'Draft' | 'Submitted', user: User | null) => {
    const isFinal = status === 'Submitted';
    const setSaving = isFinal ? setIsSaving : setIsSavingDraft;
    setSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const docRef = doc(db, 'employees', employeeId);
      const privateRef = doc(db, 'employees', employeeId, 'manager_private', 'current');

      // Fetch employee metadata for hrbp_email
      const empSnap = await getDoc(docRef);
      const empData = empSnap.data() as Employee;
      const hrbp_email = empData?.hrbp_email?.toLowerCase() || '';

      // Separate private and public data
      const { 
        performance_trending_rating = '', 
        promotion_readiness = null, 
        additional_notes = '',
        ...publicData 
      } = data;

      // Update main document
      await updateDoc(docRef, {
        mid_year_checkin: {
          ...publicData,
          submitted_at: isFinal ? timestamp : (publicData.submitted_at || null)
        },
        status: status,
        updated_at: timestamp
      });

      // Update private document
      const privateData: ManagerPrivateData = {
        performance_trending_rating,
        promotion_readiness,
        additional_notes,
        updated_at: timestamp,
        manager_email: user?.email?.toLowerCase() || '',
        hrbp_email
      };
      await setDoc(privateRef, privateData);

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
        }
      }

      showToast(isFinal ? 'Feedback is recorded but not shared with employee yet.' : 'Draft saved!', 'success');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Action failed. Please try again.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const shareReview = async (employeeId: string, user: User | null) => {
    if (!user) return false;
    setIsSharing(true);

    try {
      const timestamp = new Date().toISOString();
      const docRef = doc(db, 'employees', employeeId);
      
      await updateDoc(docRef, {
        status: 'Shared',
        'mid_year_checkin.shared_at': timestamp,
        'mid_year_checkin.shared_by': user.email?.toLowerCase()
      });

      // Audit log
      const auditRef = collection(db, 'employee_audit');
      const auditEntry: EmployeeAuditEntry = {
        employee_id: employeeId,
        actor_email: user.email?.toLowerCase() || '',
        actor_name: user.displayName || null,
        event_type: 'shared',
        timestamp: timestamp,
        notes: 'Review shared with employee'
      };
      
      await addDoc(auditRef, auditEntry);

      // Fire-and-forget Slack notification. The share itself has already
      // succeeded, so a Slack failure must not fail the user-facing action —
      // we just log it and show a softer success message.
      let slackNotified = false;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/slack/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ employee_email: employeeId }),
        });
        if (res.ok) slackNotified = true;
        else console.warn('Slack notify returned', res.status, await res.text());
      } catch (slackErr) {
        console.warn('Slack notify failed (review still shared):', slackErr);
      }

      showToast(
        slackNotified
          ? 'Review shared with employee and Slack notification sent.'
          : 'Review shared with employee successfully!',
        'success',
      );
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Sharing failed.', 'error');
      return false;
    } finally {
      setIsSharing(false);
    }
  };

  const adminOverrideReview = async (employeeId: string, updatedData: MidYearCheckin, reason: string, user: User | null) => {
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
      const { 
        performance_trending_rating = '', 
        promotion_readiness = null, 
        additional_notes = '',
        ...publicData 
      } = updatedData;

      await updateDoc(docRef, {
        mid_year_checkin: publicData,
        updated_at: timestamp
      });

      // update private
      const privateRef = doc(db, 'employees', employeeId, 'manager_private', 'current');
      const hrbp_email = docSnap.data().hrbp_email?.toLowerCase() || '';
      const manager_email = docSnap.data().manager_email?.toLowerCase() || '';

      await setDoc(privateRef, {
        performance_trending_rating,
        promotion_readiness,
        additional_notes,
        updated_at: timestamp,
        manager_email,
        hrbp_email
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

  const skipEmployeeReview = async (employeeId: string, skipReason: string | null, user: User | null) => {
    if (!user) return false;
    setIsSkipping(true);
    try {
      const docRef = doc(db, 'employees', employeeId);
      const timestamp = new Date().toISOString();
      
      const updateData: any = {
        status: skipReason ? 'Skipped' : 'Pending',
        updated_at: timestamp,
      };
      
      if (skipReason) {
        updateData.skip_reason = skipReason;
        updateData.skipped_at = timestamp;
        updateData.skipped_by = user.email?.toLowerCase();
      } else {
        updateData.skip_reason = null;
        updateData.skipped_at = null;
        updateData.skipped_by = null;
      }
      
      await updateDoc(docRef, updateData);
      
      // Audit log
      const auditRef = collection(db, 'employee_audit');
      const auditEntry: EmployeeAuditEntry = {
        employee_id: employeeId,
        actor_email: user.email?.toLowerCase() || '',
        actor_name: user.displayName || null,
        event_type: 'admin_override',
        timestamp: timestamp,
        notes: skipReason ? `Marked as skipped: ${skipReason}` : 'Re-activated from skipped status',
      };
      await addDoc(auditRef, auditEntry);
      
      showToast(skipReason ? `Review skipped: ${skipReason}` : 'Employee re-activated for reviews.', 'success');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Failed to change skip status on employee.', 'error');
      return false;
    } finally {
      setIsSkipping(false);
    }
  };

  const unlockEmployeeReview = async (employeeId: string, user: User | null) => {
    if (!user) return false;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'employees', employeeId);
      const timestamp = new Date().toISOString();
      
      await updateDoc(docRef, {
        status: 'Draft',
        updated_at: timestamp
      });
      
      // Audit log
      const auditRef = collection(db, 'employee_audit');
      const auditEntry: EmployeeAuditEntry = {
        employee_id: employeeId,
        actor_email: user.email?.toLowerCase() || '',
        actor_name: user.displayName || null,
        event_type: 'admin_override',
        timestamp: timestamp,
        notes: 'Feedback unlocked and returned to Draft status for manager re-edit.'
      };
      await addDoc(auditRef, auditEntry);
      
      showToast('Review unlocked successfully and marked as Draft for editing.', 'success');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employeeId}`);
      showToast('Unlock failed.', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { 
    isSaving, 
    isSavingDraft, 
    isSharing, 
    isOverriding, 
    isSkipping,
    saveFeedback, 
    shareReview, 
    adminOverrideReview,
    skipEmployeeReview,
    unlockEmployeeReview
  };
};
