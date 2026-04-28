import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MidYearCheckin } from '../../types';
import { cn } from '../../lib/utils';
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
  HelpCircle
} from 'lucide-react';

import { AuditTrailSection } from './AuditTrailSection';
import { OverrideModal } from './OverrideModal';
import { User } from 'firebase/auth';
import { Employee, GreatReflection, GreatPillar } from '../../types';
import { GREAT_QUESTIONS, getLevelForGrade, getPillarSlug } from '../../lib/great-questions';

interface MidYearFormProps {
  employee: Employee;
  midYearData: MidYearCheckin;
  setMidYearData: React.Dispatch<React.SetStateAction<MidYearCheckin>>;
  onSave: () => void;
  onSaveDraft: () => void;
  isSaving: boolean;
  isSavingDraft: boolean;
  isFormValid: boolean;
  isDraftValid: boolean;
  isAdmin?: boolean;
  onAdminOverride?: (employeeId: string, data: MidYearCheckin, reason: string, user: User | null) => Promise<boolean>;
  isOverriding?: boolean;
  user?: User | null;
}

export const MidYearForm = ({
  employee,
  midYearData,
  setMidYearData,
  onSave,
  onSaveDraft,
  isSaving,
  isSavingDraft,
  isFormValid,
  isDraftValid,
  isAdmin,
  onAdminOverride,
  isOverriding,
  user
}: MidYearFormProps) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState(false);
  const [isSoftWarningOpen, setIsSoftWarningOpen] = React.useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = React.useState(false);
  const isSubmitted = employee.status === 'Submitted';

  // GREAT Level logic
  const levelKey = React.useMemo(() => getLevelForGrade(employee.grade), [employee.grade]);
  const questionSet = levelKey ? GREAT_QUESTIONS[levelKey] : null;

  // Initialize GREAT reflections if missing
  React.useEffect(() => {
    if (questionSet && (!midYearData.great_reflections || midYearData.great_reflections.length === 0)) {
      const initialReflections: GreatReflection[] = questionSet.questions.map((q, i) => ({
        question_id: `${questionSet.level_key}__${getPillarSlug(q.pillar)}__${i}`,
        pillar: q.pillar,
        question_text: q.text,
        response: '',
        not_applicable: false
      }));
      setMidYearData(prev => ({
        ...prev,
        great_reflections: initialReflections
      }));
    }
  }, [questionSet, midYearData.great_reflections, setMidYearData]);

  const updateReflection = (index: number, updates: Partial<GreatReflection>) => {
    setMidYearData(prev => ({
      ...prev,
      great_reflections: prev.great_reflections?.map((r, i) => 
        i === index ? { ...r, ...updates } : r
      ) ?? []
    }));
  };

  const unansweredPillars = React.useMemo(() => {
    if (!midYearData.great_reflections) return [];
    return midYearData.great_reflections
      .filter(r => !r.not_applicable && !r.response.trim())
      .map(r => r.pillar);
  }, [midYearData.great_reflections]);

  const handleSaveAttempt = () => {
    if (unansweredPillars.length > 0) {
      setIsSoftWarningOpen(true);
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const handleSoftSubmit = () => {
    setIsSoftWarningOpen(false);
    setIsConfirmModalOpen(true);
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Termination check
  const terminationDate = employee.termination_date ? new Date(employee.termination_date) : null;
  const isTerminating = terminationDate && !isNaN(terminationDate.getTime());

  // Last saved time display
  const lastSavedText = React.useMemo(() => {
    if (employee.status !== 'Draft' || !employee.updated_at) return null;
    const updatedAt = new Date(employee.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 3600));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Last saved ${diffMins}m ago`;
    if (diffHours < 24) return `Last saved ${diffHours}h ago`;
    return `Last saved ${formatDate(employee.updated_at)}`;
  }, [employee.updated_at, employee.status]);

  const handleConfirmSubmit = () => {
    setIsConfirmModalOpen(false);
    onSave();
  };

  const handleOverride = async (updatedData: MidYearCheckin, reason: string) => {
    if (!user || !onAdminOverride) return;
    const success = await onAdminOverride(employee.id, updatedData, reason, user);
    if (success) {
      setIsOverrideModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Complete Review?"
        description="Once submitted, this performance review will be locked and you will not be able to edit it. Ensure all feedback is final."
        confirmText="Yes, Submit Review"
        cancelText="Keep Editing"
        isLoading={isSaving}
      />

      <Modal
        isOpen={isSoftWarningOpen}
        onClose={() => setIsSoftWarningOpen(false)}
        onConfirm={handleSoftSubmit}
        title="Incomplete Reflections"
        description={
          <div className="space-y-4">
            <p>The following pillars have no response and are not marked as not-applicable:</p>
            <div className="flex flex-wrap gap-2">
              {unansweredPillars.map(p => (
                <span key={p} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-100">
                  {p}
                </span>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-500">Submit anyway, or go back to complete them?</p>
          </div>
        }
        confirmText="Submit Anyway"
        cancelText="Go Back"
      />

      {isAdmin && isSubmitted && (
        <OverrideModal 
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          onConfirm={handleOverride}
          employee={employee}
          isLoading={isOverriding}
        />
      )}
      
      {/* Section 1: Identity Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg shrink-0">
            {employee.employee_name.charAt(0)}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">
              {employee.employee_name}
            </h3>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2">
              <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                {employee.job_title}
              </span>
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full whitespace-nowrap">
                Grade {employee.grade}
              </span>
              {employee.work_location && (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                  • {employee.work_location}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-3">
              Employee ID: <span className="text-gray-500">{employee.employee_id || 'N/A'}</span>
            </p>
          </div>

          <div className="md:border-l border-gray-100 md:pl-8 flex flex-col items-center md:items-end shrink-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">HRBP Reference</p>
            <p className="text-sm font-bold text-gray-700">{employee.hrbp_name || 'Unassigned'}</p>
            {employee.hrbp_email && (
              <p className="text-[10px] text-gray-400 font-medium">{employee.hrbp_email}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Section 2: Tenure & Timeline Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tenure / FW</span>
          <span className="text-xs font-bold text-gray-600">{employee.tenure_in_freshworks || 'N/A'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tenure / Position</span>
          <span className="text-xs font-bold text-gray-600">{employee.tenure_in_position || 'N/A'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hire Date</span>
          <span className="text-xs font-bold text-gray-600">{formatDate(employee.hire_date)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Promotion</span>
          <span className="text-xs font-bold text-gray-600">{formatDate(employee.last_promotion_date)}</span>
        </div>
      </div>

      {/* Section 3: Historical Performance Strip */}
      <div className="flex gap-4 px-2 pb-2">
        <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3 px-5 flex flex-col items-start min-w-[120px]">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">2024 RATING</span>
          <span className="text-sm font-black text-gray-500 whitespace-nowrap">{employee.rating_2024 || 'N/A'}</span>
        </div>
        <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3 px-5 flex flex-col items-start min-w-[120px]">
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">2025 RATING</span>
          <span className="text-sm font-black text-gray-500 whitespace-nowrap">{employee.rating_2025 || 'N/A'}</span>
        </div>
        <div className={cn(
          "rounded-2xl p-3 px-5 flex flex-col items-start min-w-[120px] border shadow-sm",
          employee.status === 'Submitted' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
          employee.status === 'Draft' ? "bg-amber-50 border-amber-100 text-amber-700" :
          "bg-gray-50 border-gray-200 text-gray-400"
        )}>
          <span className="text-[8px] font-black opacity-60 uppercase tracking-[0.2em] mb-1">CURRENT STATUS</span>
          <span className="text-sm font-black whitespace-nowrap uppercase tracking-wider">{employee.status}</span>
        </div>
      </div>

      {/* Section 4: Termination Banner (Conditional) */}
      {isTerminating && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500 shadow-lg shadow-amber-900/5">
          <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-black text-amber-900 leading-tight">Upcoming Termination Date</p>
            <p className="text-sm font-bold text-amber-800 opacity-80">
              This employee is set to terminate on <span className="underline decoration-amber-400 decoration-2 underline-offset-2">{formatDate(employee.termination_date)}</span>. 
              Confirm whether a mid-year review is still appropriate before submitting.
            </p>
          </div>
        </div>
      )}

      {/* Section 5: Review Form */}
      <Card className="p-8 space-y-10">
        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Mid-Year Performance Review</h3>
          {isSubmitted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
              Submission Finalized
            </div>
          )}
        </div>

        {isSubmitted && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Submission Locked</p>
              <p className="text-xs text-amber-700 mt-0.5">This review has been submitted and can no longer be modified. Please contact TM for any critical corrections.</p>
            </div>
          </div>
        )}

        <div className="space-y-12">
          {/* Doing Well */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                What are they doing well? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              className="w-full h-40 p-6 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed shadow-inner"
              placeholder="Describe 2-3 specific wins, with context. What did they do, what was the impact, and a concrete example?"
              value={midYearData.doing_well}
              onChange={(e) => setMidYearData(prev => ({ ...prev, doing_well: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>

          {/* Focus to Grow */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                What is one thing they should focus on to grow? <span className="text-red-500">*</span>
              </label>
            </div>
            <textarea
              className="w-full h-40 p-6 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed shadow-inner"
              placeholder="Identify one specific development area. What should they focus on in H2, and why?"
              value={midYearData.focus_to_grow}
              onChange={(e) => setMidYearData(prev => ({ ...prev, focus_to_grow: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>

          {/* GREAT Leadership Reflections */}
          {questionSet ? (
            <div className="space-y-8">
              <div className="border-b border-gray-100 pb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Award className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">GREAT Leadership Reflections</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expectations for: {questionSet.level_label}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Think about specific examples from this cycle. Focus on behaviors and outcomes, not opinions. Skip any pillar that isn't part of this person's role.
                </p>

                {/* About the GREAT Framework */}
                <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">About the GREAT Framework</span>
                    </div>
                    {isAboutExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isAboutExpanded && (
                    <div className="p-4 bg-white space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        The GREAT Leadership Behaviors Framework defines five dimensions Freshworks uses to describe what great looks like at every level — Growth Mindset, Vision & Strategy, Champion the Customer, Invest in People, and Execute with Excellence. The questions below are tailored to this employee's role level.
                      </p>
                      {import.meta.env.VITE_GREAT_GUIDE_URL && (
                        <a 
                          href={import.meta.env.VITE_GREAT_GUIDE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline"
                        >
                          View Great Leadership Guide PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {midYearData.great_reflections?.map((reflection, index) => (
                  <div key={reflection.question_id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        reflection.pillar === 'Growth Mindset' ? "bg-cyan-50 text-cyan-700" :
                        reflection.pillar === 'Vision & Strategy' ? "bg-blue-50 text-blue-700" :
                        reflection.pillar === 'Champion the Customer' ? "bg-teal-50 text-teal-700" :
                        reflection.pillar === 'Invest in People' ? "bg-amber-50 text-amber-700" :
                        "bg-orange-50 text-orange-700",
                        reflection.not_applicable && "opacity-40"
                      )}>
                        {reflection.pillar}
                      </div>

                      <button
                        onClick={() => !isSubmitted && updateReflection(index, { not_applicable: !reflection.not_applicable })}
                        disabled={isSubmitted}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all",
                          reflection.not_applicable 
                            ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" 
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {reflection.not_applicable ? 'Marked N/A' : 'Not Applicable'}
                      </button>
                    </div>

                    <p className={cn(
                      "text-sm font-medium text-gray-700 mb-4 leading-relaxed",
                      reflection.not_applicable && "opacity-40"
                    )}>
                      {reflection.question_text}
                    </p>

                    {reflection.not_applicable ? (
                      <input
                        type="text"
                        className="w-full p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-sm italic text-amber-900 focus:ring-2 focus:ring-amber-500 transition-all"
                        placeholder="Why is this pillar not part of the role? (e.g. 'No direct reports')"
                        value={reflection.not_applicable_reason || ''}
                        onChange={(e) => updateReflection(index, { not_applicable_reason: e.target.value })}
                        disabled={isSubmitted}
                      />
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          className="w-full h-24 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed shadow-inner"
                          placeholder="Describe a specific example..."
                          value={reflection.response}
                          onChange={(e) => updateReflection(index, { response: e.target.value })}
                          disabled={isSubmitted}
                        />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                          Focus on evidence from this cycle.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900 leading-tight">GREAT reflections unavailable</p>
                <p className="text-xs text-amber-800 opacity-80 mt-1">
                  Grade '{employee.grade}' is not mapped to a leadership level. Update src/lib/great-questions.ts to add this grade mapping.
                </p>
              </div>
            </div>
          )}

          {/* Rating Choice */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Performance Trending Rating <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-700 disabled:opacity-70 disabled:cursor-not-allowed appearance-none"
                value={midYearData.performance_trending_rating}
                onChange={(e) => setMidYearData(prev => ({ ...prev, performance_trending_rating: e.target.value }))}
                disabled={isSubmitted}
              >
                <option value="">Select rating...</option>
                <option value="Exceptional Results">Exceptional Results</option>
                <option value="Exceeds Results">Exceeds Results</option>
                <option value="Delivers Full Results">Delivers Full Results</option>
                <option value="Delivers Some Results">Delivers Some Results</option>
                <option value="Does Not Deliver Results">Does Not Deliver Results</option>
              </select>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Additional Notes
              </label>
            </div>
            <textarea
              className="w-full h-32 p-6 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed shadow-inner"
              placeholder="Any other context or feedback (optional)..."
              value={midYearData.additional_notes}
              onChange={(e) => setMidYearData(prev => ({ ...prev, additional_notes: e.target.value }))}
              disabled={isSubmitted}
            />
          </div>
        </div>

        {/* Section 6: Action Footer */}
        <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          {!isSubmitted ? (
            <>
              <div className="flex flex-col items-center md:items-start">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status: Open for changes</p>
                {lastSavedText && (
                  <p className="text-xs font-bold text-amber-600 italic">{lastSavedText}</p>
                )}
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Button 
                  variant="secondary" 
                  onClick={onSaveDraft} 
                  isLoading={isSavingDraft}
                  disabled={!isDraftValid}
                  className="flex-1 md:px-8 bg-gray-100 hover:bg-gray-200"
                >
                  Save Draft
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => isFormValid && handleSaveAttempt()} 
                  isLoading={isSaving}
                  disabled={!isFormValid}
                  className="flex-[2] md:px-12 bg-blue-600 shadow-xl shadow-blue-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Review
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                This review is submitted and synced to database.
              </div>
              {isAdmin && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700 h-10 px-6 shrink-0"
                  onClick={() => setIsOverrideModalOpen(true)}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Correct Review (Admin)
                </Button>
              )}
            </div>
          )}
        </div>

        {isAdmin && isSubmitted && (
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
    </div>
  );
};
