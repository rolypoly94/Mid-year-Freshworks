import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MidYearCheckin, Employee, GreatReflection, GreatPillar } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Award, 
  TrendingUp, 
  Target, 
  Info, 
  Save, 
  Loader2,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Share2,
  ExternalLink,
  BookOpen,
  Sparkles
} from 'lucide-react';

import { AuditTrailSection } from './AuditTrailSection';
import { OverrideModal } from './OverrideModal';
import { User } from 'firebase/auth';
import { getLevelForGrade, getPillarSlug } from '../../lib/great-questions';
import { getLeadershipBehaviors } from '../../lib/leadership-behaviors';
import { PROMOTION_READINESS_OPTIONS } from '../../lib/promotion-readiness';

interface MidYearFormProps {
  employee: Employee;
  onSave: (data: MidYearCheckin, status: 'Draft' | 'Submitted') => void;
  onShare: () => void;
  onSaveDraft: (data: MidYearCheckin) => void;
  isSaving: boolean;
  isSavingDraft: boolean;
  isSharing: boolean;
  isAdmin?: boolean;
  onAdminOverride?: (employeeId: string, data: MidYearCheckin, reason: string, user: User | null) => Promise<boolean>;
  isOverriding?: boolean;
  user?: User | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const emptyMidYearData = (): MidYearCheckin => ({
  key_contributions: '',
  development_evolution: '',
  leadership_mastery: '',
  performance_trending_rating: '',
  promotion_readiness: null,
  additional_notes: '',
  great_reflections: [],
});

const hydrateFromEmployee = (employee: Employee): MidYearCheckin => {
  const c = employee.mid_year_checkin;
  if (!c) return emptyMidYearData();
  return {
    key_contributions: c.key_contributions || '',
    development_evolution: c.development_evolution || '',
    leadership_mastery: c.leadership_mastery || '',
    performance_trending_rating: c.performance_trending_rating || '',
    promotion_readiness: c.promotion_readiness || null,
    additional_notes: c.additional_notes || '',
    great_reflections: c.great_reflections || [],
  };
};

export const MidYearForm = ({
  employee,
  onSave,
  onShare,
  onSaveDraft,
  isSaving,
  isSavingDraft,
  isSharing,
  isAdmin,
  onAdminOverride,
  isOverriding,
  user,
  showToast,
}: MidYearFormProps) => {
  const [midYearData, setMidYearData] = React.useState<MidYearCheckin>(() => hydrateFromEmployee(employee));

  // Baseline against which we detect "dirty" state. Reset when the
  // selected employee changes so each report's form starts clean.
  const initialDataStrRef = React.useRef<string>(JSON.stringify(midYearData));

  // Re-hydrate only when the selected employee changes — never on background
  // snapshot updates of the same employee, so in-progress edits are safe.
  React.useEffect(() => {
    const next = hydrateFromEmployee(employee);
    setMidYearData(next);
    initialDataStrRef.current = JSON.stringify(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const isFormValid =
    midYearData.key_contributions.trim() !== '' &&
    midYearData.development_evolution.trim() !== '' &&
    (midYearData.leadership_mastery?.trim() ?? '') !== '' &&
    midYearData.performance_trending_rating !== '';

  const isDraftValid =
    midYearData.key_contributions.trim() !== '' ||
    midYearData.development_evolution.trim() !== '' ||
    (midYearData.leadership_mastery?.trim() ?? '') !== '' ||
    midYearData.performance_trending_rating !== '' ||
    midYearData.promotion_readiness !== null ||
    (midYearData.additional_notes?.trim() ?? '') !== '' ||
    !!midYearData.great_reflections?.some(r => r.response.trim() !== '' || r.not_applicable);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState(false);
  const [isBehaviorsExpanded, setIsBehaviorsExpanded] = React.useState(false);
  const [refiningField, setRefiningField] = React.useState<string | null>(null);

  const isFinalized = ['Submitted', 'Shared', 'Acknowledged'].includes(employee.status);
  const isShared = ['Shared', 'Acknowledged'].includes(employee.status);

  // Dirty state: have we changed anything since the form was hydrated?
  const isDirty = JSON.stringify(midYearData) !== initialDataStrRef.current;

  // Autosave: debounce-save the draft 3 seconds after the user stops typing.
  // Skip if the review is already finalized, the form is empty, or nothing
  // has changed since the last save.
  React.useEffect(() => {
    if (isFinalized || !isDirty || !isDraftValid || isSavingDraft) return;
    const timer = setTimeout(() => {
      onSaveDraft(midYearData);
      initialDataStrRef.current = JSON.stringify(midYearData);
    }, 3000);
    return () => clearTimeout(timer);
  }, [midYearData, isDirty, isDraftValid, isFinalized, isSavingDraft, onSaveDraft]);

  // Warn before tab close if the user has unsaved edits.
  React.useEffect(() => {
    if (!isDirty || isFinalized) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, isFinalized]);

  const handleRefine = async (fieldName: keyof MidYearCheckin, context: string) => {
    const text = (midYearData[fieldName] as string || '').trim();
    if (!text) return;

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 3 || text.length < 12) {
      showToast('The feedback is too brief. Please enter at least 3 words outlining specific details or points related to this field.', 'error');
      return;
    }
    if (!user) return;

    setRefiningField(fieldName);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/gemini/refine-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ feedback: text, context })
      });

      if (!response.ok) {
        let errorMsg = 'AI refinement failed. Please try again later.';
        const textResponse = await response.text();
        try {
          const errorData = JSON.parse(textResponse);
          if (errorData.error) errorMsg = errorData.error;
        } catch {
          console.error(`Refinement failed with status ${response.status}:`, textResponse);
          if (response.status === 403) {
            errorMsg = 'Permission denied. This often means the API key is missing or invalid.';
          }
        }
        showToast(errorMsg, 'error');
        return;
      }

      const data = await response.json();
      if (data.refinedText) {
        setMidYearData(prev => ({ ...prev, [fieldName]: data.refinedText }));
        showToast('Feedback refined with AI.', 'success');
      }
    } catch (error: any) {
      console.error('Refinement failed:', error);
      showToast('AI refinement failed: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setRefiningField(null);
    }
  };

  // GREAT Level logic
  const levelKey = React.useMemo(() => getLevelForGrade(employee.grade), [employee.grade]);
  const behaviors = React.useMemo(() => getLeadershipBehaviors(levelKey), [levelKey]);

  const handleSaveAttempt = () => {
    if (!isFormValid) {
      showToast('Please fill in all required fields (Contributions, Development, Leadership, and Rating) before submitting.', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleSaveDraftClick = () => {
    if (!isDraftValid) {
      showToast('Please enter at least one field before saving a draft.', 'info');
      return;
    }
    onSaveDraft(midYearData);
  };

  const handleShareAttempt = () => {
    setIsShareModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsConfirmModalOpen(false);
    onSave(midYearData, 'Submitted');
  };

  const handleConfirmShare = () => {
    setIsShareModalOpen(false);
    onShare();
  };

  // Format date helper
  const formatDate = (dateStr?: string | number | Date | null) => {
    if (!dateStr) return 'N/A';
    let targetDate: Date;
    
    const num = Number(dateStr);
    if (!isNaN(num) && num > 10000 && num < 80000) {
      const excelEpoch = new Date(1899, 11, 30);
      targetDate = new Date(excelEpoch.getTime() + num * 86400000);
    } else {
      targetDate = new Date(dateStr);
    }
    
    try {
      if (isNaN(targetDate.getTime())) return String(dateStr);
      return targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Save indicator text — covers "saving now", "unsaved", and "saved Xm ago".
  const saveStatusText = React.useMemo(() => {
    if (isFinalized) return null;
    if (isSavingDraft) return 'Saving…';
    if (isDirty) return 'Unsaved changes — autosaving…';
    if (employee.status !== 'Draft' || !employee.updated_at) return null;
    const updatedAt = new Date(employee.updated_at);
    const diffMs = Date.now() - updatedAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Saved just now';
    if (diffMins < 60) return `Saved ${diffMins}m ago`;
    return `Saved ${formatDate(employee.updated_at)}`;
  }, [employee.updated_at, employee.status, isSavingDraft, isDirty, isFinalized]);

  const handleOverride = async (updatedData: MidYearCheckin, reason: string) => {
    if (!user || !onAdminOverride) return;
    const success = await onAdminOverride(employee.id, updatedData, reason, user);
    if (success) {
      setIsOverrideModalOpen(false);
    }
  };

  // Backward compatibility: check if we should show legacy reflections
  const showLegacyReflections = midYearData.great_reflections && 
                                midYearData.great_reflections.length > 0 && 
                                !midYearData.leadership_mastery;

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={employee.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Record Feedback?"
        description="Feedback is recorded but not shared with employee yet."
        confirmText="Yes, Record"
        cancelText="Keep Editing"
        isLoading={isSaving}
      />

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onConfirm={handleConfirmShare}
        title="Share with Employee?"
        description="Once shared, the employee will be able to view this review and acknowledge it. You can still edit before they acknowledge — but they will see the changes. Continue?"
        confirmText="Yes, Share Review"
        cancelText="Not Yet"
        isLoading={isSharing}
      />

      {isAdmin && isFinalized && (
        <OverrideModal 
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          onConfirm={handleOverride}
          employee={employee}
          isLoading={isOverriding}
        />
      )}
      
      {/* Section 1: Enhanced Identity Profile */}
      <Card className="p-10 bg-white border border-black/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[2rem]">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Stylized Avatar */}
          <div className="shrink-0">
            <div className="w-24 h-24 bg-[var(--color-apple-blue)] rounded-[2rem] flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-[var(--color-apple-blue)]/20">
              {(employee.employee_name || employee.first_name || 'E').charAt(0)}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left pt-1">
            <h3 className="text-3xl font-bold text-[var(--color-apple-black)] tracking-tight mb-2">
              {employee.employee_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'}
            </h3>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
              <span className="text-[12px] font-bold text-[var(--color-apple-gray)] uppercase tracking-wide">
                {employee.job_title} • {getLevelForGrade(employee.grade)?.includes('ic') ? 'IC' : 'MGR'} {employee.grade} • {employee.work_location || 'REMOTE'}
              </span>
            </div>
            <p className="text-[10px] font-black text-[var(--color-apple-gray)]/40 uppercase tracking-[0.2em] mt-3 italic">
              EMPLOYEE ID: {employee.employee_id || 'N/A'}
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end justify-start pt-1">
            <div className="text-center md:text-right mb-4">
              <span className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-1">HRBP</span>
              <span className="text-lg font-bold text-[var(--color-apple-black)] leading-tight">
                {employee.hrbp_name || 'Priya Sharma'}
              </span>
            </div>
            
            <div className={cn(
              "rounded-full px-4 py-1.5 border text-[10px] font-bold uppercase tracking-widest",
              employee.status === 'Acknowledged' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
              employee.status === 'Shared' ? "bg-blue-50 border-blue-100 text-blue-700" :
              employee.status === 'Submitted' ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
              employee.status === 'Draft' ? "bg-amber-50 border-amber-100 text-amber-700" :
              "bg-gray-50 border-gray-200 text-gray-400"
            )}>
              {employee.status === 'Submitted' ? 'Feedback Recorded' : employee.status}
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2: Metrics Grid */}
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/[0.015] border border-black/[0.03] rounded-2xl p-5">
            <span className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-1.5">FW TENURE</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">{employee.tenure_in_freshworks || 'N/A'}</span>
          </div>
          <div className="bg-black/[0.015] border border-black/[0.03] rounded-2xl p-5">
            <span className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-1.5">IN POSITION</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">{employee.tenure_in_position || 'N/A'}</span>
          </div>
          <div className="bg-black/[0.015] border border-black/[0.03] rounded-2xl p-5">
            <span className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-1.5">HIRE DATE</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">{formatDate(employee.hire_date)}</span>
          </div>
          <div className="bg-black/[0.015] border border-black/[0.03] rounded-2xl p-5">
            <span className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-1.5">LAST PROMO</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">{formatDate(employee.last_promotion_date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-8 rounded-[1.5rem] bg-white border border-black/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-3">2024 RATING</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">
              {employee.rating_2024 || '—'}
            </span>
          </Card>
          <Card className="p-8 rounded-[1.5rem] bg-white border border-black/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block mb-3">2025 RATING</span>
            <span className="text-[15px] font-bold text-[var(--color-apple-black)]">
              {employee.rating_2025 || '—'}
            </span>
          </Card>
        </div>
      </div>

      {/* Section: Employee Goals (Set at Start of Year) */}
      {employee.goals && employee.goals.length > 0 ? (
        <Card className="p-8 bg-blue-50/20 border border-blue-500/10 rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-blue-500/11 flex items-center justify-center text-blue-600 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--color-apple-black)] leading-tight">Start of Year Goals (H1 2026)</h4>
              <p className="text-[10px] text-[var(--color-apple-gray)] uppercase tracking-wider font-semibold">Established Objectives for This Cycle</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employee.goals.map((goal, idx) => (
              <div key={idx} className="bg-white border border-black/[0.02] p-5 rounded-2xl flex gap-3 shadow-[0_2px_6px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-black/[0.04] transition-all">
                <span className="text-[12px] font-black text-blue-600 bg-blue-50/80 rounded-lg w-6 h-6 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-[13px] font-medium text-[var(--color-apple-black)] leading-relaxed">{goal}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-8 bg-gray-50/30 border border-black/[0.03] rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
              <Target className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-gray-700 leading-tight">Start of Year Goals</h4>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">No objectives configured for this cycle</p>
            </div>
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed font-semibold">
            Start-of-year goals have not been loaded for this employee. Administrators can use the spreadsheet importer in the HR/BP Admin View to upload these goals.
          </p>
        </Card>
      )}

      {/* Section 3: Review Form */}
      <Card className="p-10 bg-white border border-black/[0.03] shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[2rem] space-y-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-black/[0.03] pb-10">
          <div>
            <h3 className="text-2xl font-bold text-[var(--color-apple-black)] tracking-tight mb-1">Performance Template</h3>
            <p className="text-[10px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest">MID-YEAR CHECK-IN</p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isShared && employee.status !== 'Submitted' && (
              <button
                onClick={handleSaveDraftClick}
                disabled={!isDraftValid || isSavingDraft}
                className="px-5 py-2 rounded-full font-semibold text-[13px] transition-all active:scale-95 bg-black/[0.04] text-[var(--color-apple-black)] hover:bg-black/[0.1] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSavingDraft && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save Draft
              </button>
            )}
            
            {!isShared && (
              <button 
                onClick={() => isFormValid && handleSaveAttempt()} 
                disabled={!isFormValid || isSaving}
                className={cn(
                  "px-5 py-2 rounded-full font-semibold text-[13px] transition-all active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center",
                  employee.status === 'Submitted' ? "bg-emerald-600 hover:opacity-90" : "bg-[var(--color-apple-black)] hover:opacity-90"
                )}
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                {!isSaving && <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                {employee.status === 'Submitted' ? 'Update Feedback' : 'Record Feedback'}
              </button>
            )}

            <button 
              onClick={handleShareAttempt} 
              disabled={employee.status === 'Pending' || employee.status === 'Draft' || isShared || isSharing}
              className={cn(
                "px-5 py-2 rounded-full font-semibold text-[13px] transition-all active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed flex items-center",
                isShared 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 cursor-default" 
                  : "bg-white border-[var(--color-apple-blue)]/20 text-[var(--color-apple-blue)] hover:bg-[var(--color-apple-blue)]/5"
              )}
            >
              {isSharing && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              {!isSharing && <Share2 className="w-3.5 h-3.5 mr-2" />}
              {isShared ? 'Shared with employee' : 'Share with employee'}
            </button>
          </div>
        </div>

        {employee.status === 'Acknowledged' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">Review Acknowledged</p>
              <p className="text-sm text-emerald-700 mt-1 font-medium italic">This review was acknowledged by the employee on {formatDate(employee.acknowledged_at)}.</p>
            </div>
          </div>
        )}

        <div className="space-y-12">
          {/* Key Contributions */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-apple-blue)]/5 border border-[var(--color-apple-blue)]/10 flex items-center justify-center text-[11px] font-black text-[var(--color-apple-blue)]">
                01
              </div>
              <h4 className="font-bold text-[14px] text-[var(--color-apple-black)]">Key Contributions</h4>
            </div>
            <div className="pl-9 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[var(--color-apple-gray)] text-[13px] font-medium leading-relaxed">
                  Quantify this individual's top contributions in H1 and detail their direct impact on team-wide business objectives.
                </p>
                {!isShared && (
                  <button
                    onClick={() => handleRefine('key_contributions', 'Key contributions and business impact')}
                    disabled={refiningField === 'key_contributions' || !midYearData.key_contributions || midYearData.key_contributions.length < 5}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[11px] font-bold hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {refiningField === 'key_contributions' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Refine with AI
                  </button>
                )}
              </div>
              <div className="relative group">
                <textarea
                  className="w-full bg-black/[0.02] border border-black/[0.05] rounded-xl p-4 text-[13px] min-h-[120px] focus:bg-white focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 outline-none transition-all leading-relaxed placeholder:text-[var(--color-apple-gray)]/50 disabled:opacity-70"
                  placeholder="Enter feedback or observations..."
                  value={midYearData.key_contributions}
                  onChange={(e) => setMidYearData(prev => ({ ...prev, key_contributions: e.target.value }))}
                  disabled={isShared}
                />
              </div>
            </div>
          </div>

          {/* Development & Evolution */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-apple-blue)]/5 border border-[var(--color-apple-blue)]/10 flex items-center justify-center text-[11px] font-black text-[var(--color-apple-blue)]">
                02
              </div>
              <h4 className="font-bold text-[14px] text-[var(--color-apple-black)]">Development & Evolution</h4>
            </div>
            <div className="pl-9 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[var(--color-apple-gray)] text-[13px] font-medium leading-relaxed">
                  Reflecting on H1 performance, what specific actions or mindset shifts should this individual adopt to sharpen their execution and efficiency in H2?
                </p>
                {!isShared && (
                  <button
                    onClick={() => handleRefine('development_evolution', 'Future development and mindset shifts')}
                    disabled={refiningField === 'development_evolution' || !midYearData.development_evolution || midYearData.development_evolution.length < 5}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[11px] font-bold hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {refiningField === 'development_evolution' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Refine with AI
                  </button>
                )}
              </div>
              <div className="relative group">
                <textarea
                  className="w-full bg-black/[0.02] border border-black/[0.05] rounded-xl p-4 text-[13px] min-h-[120px] focus:bg-white focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 outline-none transition-all leading-relaxed placeholder:text-[var(--color-apple-gray)]/50 disabled:opacity-70"
                  placeholder="Enter feedback or observations..."
                  value={midYearData.development_evolution}
                  onChange={(e) => setMidYearData(prev => ({ ...prev, development_evolution: e.target.value }))}
                  disabled={isShared}
                />
              </div>
            </div>
          </div>

          {/* Leadership Mastery */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-apple-blue)]/5 border border border-[var(--color-apple-blue)]/10 flex items-center justify-center text-[11px] font-black text-[var(--color-apple-blue)]">
                03
              </div>
              <h4 className="font-bold text-[14px] text-[var(--color-apple-black)]">Leadership Mastery</h4>
            </div>
            <div className="pl-9 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[var(--color-apple-gray)] text-[13px] font-medium leading-relaxed">
                  What are this person's strongest leadership behaviors, drawing on the GREAT framework, and what specific areas need focused development to amplify their impact?
                </p>
                {!isShared && (
                  <button
                    onClick={() => handleRefine('leadership_mastery', 'Leadership behaviors and GREAT framework alignment')}
                    disabled={refiningField === 'leadership_mastery' || !midYearData.leadership_mastery || midYearData.leadership_mastery.length < 5}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[11px] font-bold hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {refiningField === 'leadership_mastery' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Refine with AI
                  </button>
                )}
              </div>
              
              {behaviors && (
                <button
                  onClick={() => setIsBehaviorsExpanded(!isBehaviorsExpanded)}
                  className="text-[10px] font-bold text-[var(--color-apple-blue)] bg-[var(--color-apple-blue)]/5 px-2 py-0.5 rounded-full hover:bg-[var(--color-apple-blue)]/10 transition-colors"
                >
                  {isBehaviorsExpanded ? 'Hide' : 'View'} {levelKey?.includes('ic') ? 'IC' : 'Manager'} Expectations
                </button>
              )}

              <AnimatePresence>
                {isBehaviorsExpanded && behaviors && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[var(--color-apple-blue)]/[0.03] border border-[var(--color-apple-blue)]/10 rounded-xl p-4">
                      <div className="text-[10px] font-black text-[var(--color-apple-blue)] uppercase tracking-widest mb-3">MANAGER NUDGE: {levelKey?.toUpperCase()} EXPECTATIONS</div>
                      <ul className="space-y-2">
                        {behaviors.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1 h-1 bg-[var(--color-apple-blue)]/30 rounded-full mt-1.5 shrink-0" />
                            <p className="text-[12px] leading-relaxed">
                              <span className="font-bold text-[var(--color-apple-black)]">{b.pillar}:</span>{' '}
                              <span className="text-[var(--color-apple-gray)]">{b.description}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <textarea
                className="w-full bg-black/[0.02] border border-black/[0.05] rounded-xl p-4 text-[13px] min-h-[120px] focus:bg-white focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 outline-none transition-all leading-relaxed placeholder:text-[var(--color-apple-gray)]/50 disabled:opacity-70"
                placeholder="Synthesize leadership feedback here..."
                value={midYearData.leadership_mastery || ''}
                onChange={(e) => setMidYearData(prev => ({ ...prev, leadership_mastery: e.target.value }))}
                disabled={isShared}
              />
            </div>
          </div>

          {/* Confidential Metrics (Manager Visibility Only) */}
          <div className="bg-black/[0.02] border border-black/[0.05] rounded-3xl p-8 mt-12 space-y-6">
            <div className="flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-rose-50 border border-rose-100 text-rose-500 rounded-full w-fit">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap">MANAGER VISIBILITY ONLY</span>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[14px] font-bold text-[var(--color-apple-black)]">Performance Trending Rating (H1)</h4>
                  <p className="text-[12px] text-[var(--color-apple-gray)] font-medium leading-relaxed">
                    This selection is a coaching guide visible only to you, designed to help you track your team member's performance.
                  </p>
                  <div className="relative">
                    <select 
                      className="w-full bg-white border border-black/10 rounded-2xl px-5 py-4 text-[13px] font-semibold outline-none focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 appearance-none cursor-pointer shadow-sm disabled:opacity-50"
                      value={midYearData.performance_trending_rating || ''}
                      onChange={(e) => setMidYearData(prev => ({ ...prev, performance_trending_rating: e.target.value }))}
                      disabled={isShared}
                    >
                      <option value="">Select Trending Rating...</option>
                      <option value="Exceptional Results">Exceptional Results</option>
                      <option value="Exceeds Results">Exceeds Results</option>
                      <option value="Delivers Full Results">Delivers Full Results</option>
                      <option value="Delivers Some Results">Delivers Some Results</option>
                      <option value="Does Not Deliver Results">Does Not Deliver Results</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-apple-gray)] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[14px] font-bold text-[var(--color-apple-black)]">Promotion Readiness</h4>
                  <p className="text-[12px] text-[var(--color-apple-gray)] font-medium leading-relaxed">
                    Indicate the forecasted timeline for this individual's next promotion eligibility.
                  </p>
                  <div className="relative">
                    <select 
                      className="w-full bg-white border border-black/10 rounded-2xl px-5 py-4 text-[13px] font-semibold outline-none focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 appearance-none cursor-pointer shadow-sm disabled:opacity-50"
                      value={midYearData.promotion_readiness || ''}
                      onChange={(e) => setMidYearData(prev => ({ ...prev, promotion_readiness: e.target.value as any }))}
                      disabled={isShared}
                    >
                      <option value="">Select Readiness...</option>
                      {PROMOTION_READINESS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-apple-gray)] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 pt-6 border-t border-black/[0.05]">
              <label className="text-[9px] font-bold text-[var(--color-apple-gray)] uppercase tracking-widest block">Additional Calibration Notes</label>
              <textarea
                className="w-full bg-black/[0.02] border border-black/[0.05] rounded-xl p-4 text-[13px] h-24 focus:bg-white focus:ring-4 focus:ring-[var(--color-apple-blue)]/5 focus:border-[var(--color-apple-blue)]/20 outline-none transition-all leading-relaxed placeholder:text-[var(--color-apple-gray)]/50 disabled:opacity-70"
                placeholder="Optional context for calibration committees..."
                value={midYearData.additional_notes}
                onChange={(e) => setMidYearData(prev => ({ ...prev, additional_notes: e.target.value }))}
                disabled={isShared}
              />
            </div>
          </div>
        </div>

        {/* Action Bottom Info (Optional help text) */}
        {!isShared && (
          <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4" />
              Calibrated ratings are hidden from employees
            </div>
            {saveStatusText && (
              <span className="text-[10px] font-bold text-gray-400 italic flex items-center gap-1.5">
                {isSavingDraft && <Loader2 className="w-3 h-3 animate-spin" />}
                {saveStatusText}
              </span>
            )}
          </div>
        )}


        {isAdmin && isFinalized && (
          <div className="pt-10 border-t-2 border-dashed border-gray-100 mt-10">
            <div className="flex flex-col gap-6">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Administrative Console</p>
                <p className="text-sm font-bold text-blue-900 leading-tight">Audit Trail Visibility</p>
                <p className="text-xs text-blue-800 mt-1 opacity-70 italic">As an administrator, you have access to the immutable correction history for this record.</p>
              </div>
              <AuditTrailSection employeeId={employee.id} initialExpanded={isAdmin} />
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  </AnimatePresence>
</div>
);
};
