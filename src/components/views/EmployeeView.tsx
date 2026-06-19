import React, { useState } from 'react';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Employee, EmployeeAuditEntry, MidYearCheckin } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { formatDate, cn, formatTenure } from '../../lib/utils';
import { User } from 'firebase/auth';
import { AuditTrailSection } from './AuditTrailSection';
import { OverrideModal } from './OverrideModal';
import { GoalCard } from '../ui/GoalCard';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  Award, 
  Target, 
  CheckCircle2, 
  Check,
  ShieldAlert,
  Clock
} from 'lucide-react';

interface EmployeeViewProps {
  employee: Employee | null;
  isAdmin?: boolean;
  user?: User | null;
  onAdminOverride?: (employeeId: string, data: MidYearCheckin, reason: string, user: User | null) => Promise<boolean>;
  isOverriding?: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EmployeeView = ({ 
  employee, 
  isAdmin, 
  user,
  onAdminOverride,
  isOverriding,
  showToast
}: EmployeeViewProps) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const handleAcknowledge = async () => {
    if (!employee || !user) return;
    
    setIsAcknowledging(true);
    try {
      const timestamp = new Date().toISOString();
      const docRef = doc(db, 'employees', employee.id);
      await updateDoc(docRef, {
        acknowledged_at: timestamp
      });

      // Audit Acknowledge
      try {
        const auditRef = collection(db, 'employee_audit');
        const auditEntry: EmployeeAuditEntry = {
          employee_id: employee.id,
          actor_email: user.email?.toLowerCase() || '',
          actor_name: user.displayName || employee.employee_name,
          event_type: 'acknowledge',
          timestamp: timestamp,
          snapshot: employee.mid_year_checkin
        };
        await addDoc(auditRef, auditEntry);
      } catch (auditError) {
        console.error('Audit log failed:', auditError);
      }
      showToast?.('Feedback acknowledged.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${employee.id}`);
      showToast?.('Failed to acknowledge review.', 'error');
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleOverride = async (updatedData: MidYearCheckin, reason: string) => {
    if (!employee || !user || !onAdminOverride) return;
    try {
      const success = await onAdminOverride(employee.id, updatedData, reason, user);
      if (success) {
        setIsOverrideModalOpen(false);
      }
    } catch (err) {
      // onAdminOverride handles its own toast errors
    }
  };

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Record Found</h3>
        <p className="text-gray-500 max-w-md">
          We couldn't find your employee record in the system. Please contact HR if you believe this is an error.
        </p>
      </div>
    );
  }

  const isVisible = ['Shared', 'Acknowledged'].includes(employee.status);
  const isFinalized = ['Submitted', 'Shared', 'Acknowledged'].includes(employee.status);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isAdmin && isFinalized && (
        <OverrideModal 
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          onConfirm={handleOverride}
          employee={employee}
          isLoading={isOverriding}
        />
      )}

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-80 shrink-0 space-y-6">
          <Card className="p-6 text-center bg-white border-none shadow-xl shadow-blue-50/50">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white shadow-lg shadow-blue-200">
              {(employee.employee_name || employee.first_name || 'E').charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{employee.employee_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'}</h2>
            <p className="text-sm text-gray-500 mt-1">{employee.job_title}</p>
            <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">Employee ID</span>
                <span className="font-bold text-gray-700">{employee.employee_id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 font-medium">Location</span>
                <span className="font-bold text-gray-700">{employee.work_location}</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="p-4 bg-white border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Grade</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{employee.job_title || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">Grade: {employee.grade || 'N/A'}</p>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">FPI Ratings</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {employee.rating_2025 || 'N/A'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">2025 Rating</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-600 leading-tight">
                    {employee.rating_2024 || 'N/A'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">2024 Rating</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tenure & Hire</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{formatTenure(employee.tenure_in_freshworks)}</p>
              <p className="text-xs text-gray-500 mt-1">Hired: {formatDate(employee.hire_date)}</p>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</span>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">{employee.job_family || 'N/A'}</p>
            </Card>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {isAdmin && isFinalized && (
            <Card className="p-6 bg-amber-50 border-none shadow-lg shadow-amber-100/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 leading-tight">Review Correction Mode</h4>
                  <p className="text-xs text-amber-700 mt-1">Administrators can correct submitted reviews with mandatory audit reasoning.</p>
                </div>
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 h-10 px-6 shrink-0"
                onClick={() => setIsOverrideModalOpen(true)}
              >
                Correct Review
              </Button>
            </Card>
          )}

          {/* Section: Start of Year Goals */}
          {employee.goals && employee.goals.length > 0 && (
            <Card className="p-8 bg-blue-50/20 border border-blue-500/10 shadow-[0_2px_12px_rgba(0,0,0,0.01)] rounded-[2rem]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-500/11 flex items-center justify-center text-blue-600 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-gray-900 leading-tight">Start of Year Goals (H1 2026)</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Your Objectives for This Fiscal Cycle</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {employee.goals.map((goal, idx) => (
                  <GoalCard key={idx} goal={goal} idx={idx} />
                ))}
              </div>
            </Card>
          )}

          <Card className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 border-b border-gray-50 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                Mid-Year Check-In Feedback
              </div>
            </h3>

            {!isVisible ? (
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 text-center">
                <p className="text-amber-800 font-bold mb-2">Feedback in Progress</p>
                <p className="text-amber-600 text-sm">Your manager is currently working on your mid-year feedback. You will see it here once it is shared with you.</p>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Key Contributions</h4>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{employee.mid_year_checkin?.key_contributions}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Development & Evolution</h4>
                  </div>
                  <div className="bg-gray-50 rounded-3xl p-6 border-l-4 border-amber-500">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{employee.mid_year_checkin?.development_evolution}</p>
                  </div>
                </div>

                {/* Leadership Mastery */}
                {employee.mid_year_checkin?.leadership_mastery && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Leadership Mastery</h4>
                    </div>
                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl p-6">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{employee.mid_year_checkin?.leadership_mastery}</p>
                    </div>
                  </div>
                )}

                {/* GREAT Leadership Reflections (Backward Compatibility) */}
                {employee.mid_year_checkin?.great_reflections && 
                 employee.mid_year_checkin.great_reflections.length > 0 && 
                 !employee.mid_year_checkin.leadership_mastery && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Legacy Leadership Reflections</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {employee.mid_year_checkin.great_reflections.map((r, i) => (
                        <div key={r.question_id || i} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              r.pillar === 'Growth Mindset' ? "bg-cyan-50 text-cyan-700" :
                              r.pillar === 'Vision & Strategy' ? "bg-blue-50 text-blue-700" :
                              r.pillar === 'Champion the Customer' ? "bg-teal-50 text-teal-700" :
                              r.pillar === 'Invest in People' ? "bg-amber-50 text-amber-700" :
                              "bg-orange-50 text-orange-700"
                            )}>
                              {r.pillar}
                            </span>
                            {r.not_applicable && (
                              <span className="text-[10px] font-bold text-amber-600 italic">Not Applicable</span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-400 italic mb-3 leading-snug">{r.question_text}</p>
                          {r.not_applicable ? (
                            <p className="text-sm text-gray-400 italic">
                              This dimension was marked as not applicable for your role {r.not_applicable_reason ? `(${r.not_applicable_reason})` : ''}.
                            </p>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.response || 'No response provided.'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance trending rating, promotion readiness, and
                    calibration notes are intentionally NOT shown in the
                    employee's own view — they are the manager's private
                    calibration data. Even an app admin viewing their own
                    My Performance should not see them here. */}

                <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 leading-tight">Digital Acknowledgement</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee.acknowledged_at 
                        ? `Acknowledged on ${formatDate(employee.acknowledged_at)}`
                        : 'Please acknowledge your mid-year feedback after reviewing.'
                      }
                    </p>
                  </div>
                  {employee.acknowledged_at ? (
                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm">
                      <Check className="w-4 h-4" />
                      Acknowledged
                    </div>
                  ) : (
                    <Button 
                      onClick={handleAcknowledge}
                      isLoading={isAcknowledging}
                      className="w-full sm:w-auto"
                    >
                      Acknowledge Review
                    </Button>
                  )}
                </div>

                {isFinalized && (
                  <div className="pt-8 border-t border-gray-50">
                    <AuditTrailSection
                      employeeId={employee.id}
                      initialExpanded={isAdmin}
                      hideConfidentialFields={user?.email?.toLowerCase() === employee.employee_email.toLowerCase()}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
