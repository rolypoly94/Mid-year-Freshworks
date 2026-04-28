import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Send, ShieldCheck, History, Award } from 'lucide-react';
import { Employee, MidYearCheckin, GreatReflection } from '../../types';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { GREAT_QUESTIONS, getLevelForGrade, getPillarSlug } from '../../lib/great-questions';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updatedData: MidYearCheckin, reason: string) => Promise<void>;
  employee: Employee;
  isLoading: boolean;
}

export const OverrideModal = ({
  isOpen,
  onClose,
  onConfirm,
  employee,
  isLoading
}: OverrideModalProps) => {
  const [formData, setFormData] = useState<MidYearCheckin>({
    doing_well: employee.mid_year_checkin?.doing_well || '',
    focus_to_grow: employee.mid_year_checkin?.focus_to_grow || '',
    performance_trending_rating: employee.mid_year_checkin?.performance_trending_rating || '',
    additional_notes: employee.mid_year_checkin?.additional_notes || '',
    great_reflections: employee.mid_year_checkin?.great_reflections || []
  });

  // Initialization for old reviews
  React.useEffect(() => {
    if ((!formData.great_reflections || formData.great_reflections.length === 0)) {
      const levelKey = getLevelForGrade(employee.grade);
      const questionSet = levelKey ? GREAT_QUESTIONS[levelKey] : null;
      
      if (questionSet) {
        const initialReflections: GreatReflection[] = questionSet.questions.map((q, i) => ({
          question_id: `${questionSet.level_key}__${getPillarSlug(q.pillar)}__${i}`,
          pillar: q.pillar,
          question_text: q.text,
          response: '',
          not_applicable: false
        }));
        setFormData(prev => ({ ...prev, great_reflections: initialReflections }));
      }
    }
  }, [employee.grade, formData.great_reflections]);

  const updateReflection = (index: number, updates: Partial<GreatReflection>) => {
    setFormData(prev => ({
      ...prev,
      great_reflections: prev.great_reflections?.map((r, i) => 
        i === index ? { ...r, ...updates } : r
      )
    }));
  };
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');

  const isFormValid = 
    formData.doing_well.trim() !== '' &&
    formData.focus_to_grow.trim() !== '' &&
    formData.performance_trending_rating !== '' &&
    reason.trim() !== '';

  const handleNext = () => {
    if (isFormValid) setStep('confirm');
  };

  const handleFinalConfirm = async () => {
    await onConfirm(formData, reason);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[120] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Admin Correction Flow</h3>
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-widest">Correcting Review for {employee.employee_name}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 border border-transparent hover:border-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {step === 'edit' ? (
                  <div className="space-y-6">
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        You are performing an administrative override on a submitted review. This action will be logged in the permanent audit trail with a snapshot of both the previous and current state.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Wins & Impact</label>
                        <textarea
                          className="w-full h-32 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                          value={formData.doing_well}
                          onChange={(e) => setFormData(prev => ({ ...prev, doing_well: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Growth & Focus</label>
                        <textarea
                          className="w-full h-32 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                          value={formData.focus_to_grow}
                          onChange={(e) => setFormData(prev => ({ ...prev, focus_to_grow: e.target.value }))}
                        />
                      </div>
                      {/* GREAT reflections correction */}
                      {formData.great_reflections && formData.great_reflections.length > 0 && (
                        <div className="space-y-6 pt-6 border-t border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Leadership Reflections</h4>
                          </div>
                          <div className="space-y-4">
                            {formData.great_reflections.map((reflection, index) => (
                              <div key={reflection.question_id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                    reflection.pillar === 'Growth Mindset' ? "bg-cyan-50 text-cyan-700" :
                                    reflection.pillar === 'Vision & Strategy' ? "bg-blue-50 text-blue-700" :
                                    reflection.pillar === 'Champion the Customer' ? "bg-teal-50 text-teal-700" :
                                    reflection.pillar === 'Invest in People' ? "bg-amber-50 text-amber-700" :
                                    "bg-orange-50 text-orange-700"
                                  )}>
                                    {reflection.pillar}
                                  </span>
                                  <button
                                    onClick={() => updateReflection(index, { not_applicable: !reflection.not_applicable })}
                                    className={cn(
                                      "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all",
                                      reflection.not_applicable 
                                        ? "bg-amber-600 text-white" 
                                        : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                    )}
                                  >
                                    {reflection.not_applicable ? 'Marked N/A' : 'Not Applicable'}
                                  </button>
                                </div>
                                <p className="text-[11px] font-medium text-gray-600 leading-tight">{reflection.question_text}</p>
                                {reflection.not_applicable ? (
                                  <input
                                    type="text"
                                    className="w-full p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs italic text-amber-900 focus:ring-1 focus:ring-amber-500"
                                    placeholder="N/A Reason..."
                                    value={reflection.not_applicable_reason || ''}
                                    onChange={(e) => updateReflection(index, { not_applicable_reason: e.target.value })}
                                  />
                                ) : (
                                  <textarea
                                    className="w-full h-20 p-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-xs"
                                    placeholder="Reflection response..."
                                    value={reflection.response}
                                    onChange={(e) => updateReflection(index, { response: e.target.value })}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Trending Rating</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                            value={formData.performance_trending_rating}
                            onChange={(e) => setFormData(prev => ({ ...prev, performance_trending_rating: e.target.value }))}
                          >
                            <option value="Exceptional Results">Exceptional Results</option>
                            <option value="Exceeds Results">Exceeds Results</option>
                            <option value="Delivers Full Results">Delivers Full Results</option>
                            <option value="Delivers Some Results">Delivers Some Results</option>
                            <option value="Does Not Deliver Results">Does Not Deliver Results</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Additional Notes</label>
                          <textarea
                            className="w-full h-12 p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                            value={formData.additional_notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, additional_notes: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2 text-blue-600">
                        Reason for Correction <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        className="w-full h-24 p-4 bg-blue-50/30 border border-blue-100/50 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                        placeholder="Explain why this correction is being made (e.g., calculation error, manager request)..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 py-4">
                    <div className="bg-blue-50 rounded-[2.5rem] p-8 text-center border border-blue-100">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <History className="w-8 h-8 text-blue-600" />
                      </div>
                      <h4 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Confirm Overwrite?</h4>
                      <p className="text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">
                        This will permanently update the submitted review and create a detailed audit entry.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Acting Admin</p>
                        <p className="text-sm font-bold text-gray-900">Verified System Admin</p>
                      </div>
                      <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Impact</p>
                        <p className="text-sm font-bold text-gray-900">Audit Trail Generated</p>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Correction Reason</p>
                      <p className="text-sm text-amber-900 italic font-medium leading-relaxed">"{reason}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={step === 'edit' ? onClose : () => setStep('edit')}
                  disabled={isLoading}
                >
                  {step === 'edit' ? 'Cancel' : 'Back to Edit'}
                </Button>
                <Button 
                  variant="primary" 
                  className={cn(
                    "flex-1",
                    step === 'edit' ? "bg-blue-600" : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={step === 'edit' ? handleNext : handleFinalConfirm}
                  disabled={step === 'edit' && !isFormValid}
                  isLoading={isLoading}
                >
                  {step === 'edit' ? 'Review Correction' : 'Commit Changes'}
                  {step === 'edit' ? null : <Send className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
