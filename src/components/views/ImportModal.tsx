import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  Info,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ImportResult, ImportRow } from '../../types';
import { cn } from '../../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParse: (file: File) => Promise<ImportResult | null>;
  onCommit: (rows: ImportRow[]) => Promise<any>;
  onTemplateDownload: () => void;
  isImporting: boolean;
  isCommitting: boolean;
  commitProgress: { current: number, total: number };
}

export const ImportModal = ({
  isOpen,
  onClose,
  onParse,
  onCommit,
  onTemplateDownload,
  isImporting,
  isCommitting,
  commitProgress
}: ImportModalProps) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [isSimulation, setIsSimulation] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});
  const [commitResult, setCommitResult] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleBucket = (bucket: string) => {
    setExpandedBuckets(prev => ({ ...prev, [bucket]: !prev[bucket] }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSimulation(false);
    const result = await onParse(file);
    if (result) {
      setParseResult(result);
      setStep('preview');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = async () => {
    if (!parseResult) return;
    const allRowsToCommit = [
      ...parseResult.buckets.new,
      ...parseResult.buckets.profile_update_safe,
      ...parseResult.buckets.profile_update_preserve
    ];
    
    const result = await onCommit(allRowsToCommit);
    setCommitResult(result);
    setStep('results');
  };

  const reset = () => {
    setStep('upload');
    setParseResult(null);
    setCommitResult(null);
    setExpandedBuckets({});
  };

  const handleClose = () => {
    if (isCommitting) return;
    reset();
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[120] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    {step === 'upload' && 'Import Performance Data'}
                    {step === 'preview' && 'Import Preview'}
                    {step === 'results' && 'Import Results'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {step === 'upload' && 'Upload your HRIS spreadsheet (Excel/CSV)'}
                    {step === 'preview' && 'Review changes before committing to database'}
                    {step === 'results' && 'Summary of the import operation'}
                  </p>
                </div>
                {!isCommitting && (
                  <button onClick={handleClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 shadow-sm border border-transparent hover:border-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {step === 'upload' && (
                  <div className="space-y-8">
                    <div 
                      onClick={() => !isImporting && fileInputRef.current?.click()}
                      className={cn(
                        "group border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                        isImporting ? "border-blue-200 bg-blue-50/50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                      />
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {isImporting ? 'Analyzing spreadsheet...' : 'Drop file here or click to browse'}
                      </h4>
                      <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                        Supports .xlsx, .xls, and .csv files up to 10MB.
                      </p>
                      {isImporting && (
                        <div className="mt-6 flex items-center gap-2 text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-bold">Processing sheets...</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-amber-900 mb-1">Need the correct format?</p>
                          <p className="text-xs text-amber-700 leading-relaxed mb-4">
                            Ensure your file matches the system headers. Download the latest template with instructions.
                          </p>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-700 h-9"
                            onClick={onTemplateDownload}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Template
                          </Button>
                        </div>
                      </div>
                    </div>

                    {import.meta.env.DEV && (
                      <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Development Tools</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50 font-bold"
                          onClick={() => {
                            const csvContent = [
                              "Employee Name,Employee Email,Manager Email,Performance Trending Rating",
                              "Valid Employee,valid.user@freshworks.com,sumit.yadav@freshworks.com,Exceeds Results",
                              "Warning Row,warning.user@freshworks.com,sumit.yadav@freshworks.com,Superstar Status",
                              "Fatal Row,,sumit.yadav@freshworks.com,Delivers Full Results",
                              "Duplicate Row,valid.user@freshworks.com,sumit.yadav@freshworks.com,Exceeds Results"
                            ].join("\n");
                            
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const file = new File([blob], "simulation_test.csv", { type: 'text/csv' });
                            
                            setIsSimulation(true);
                            // Simulate file change
                            onParse(file).then(result => {
                              if (result) {
                                setParseResult(result);
                                setStep('preview');
                              }
                            });
                          }}
                        >
                          Try simulation with sample data
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {step === 'preview' && parseResult && (
                  <div className="space-y-6">
                    {/* Simulation Banner */}
                    {isSimulation && (
                      <div className="bg-blue-600 p-4 rounded-2xl flex items-center gap-3 text-white shadow-lg shadow-blue-100">
                        <Info className="w-5 h-5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-bold leading-tight">Simulation Mode</p>
                          <p className="text-[10px] font-medium opacity-90">Previewing mock data. Writes to Firestore are disabled.</p>
                        </div>
                      </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1">New Employees</p>
                        <p className="text-2xl font-black text-emerald-700">{parseResult.buckets.new.length}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600 mb-1">Profile Updates</p>
                        <p className="text-2xl font-black text-blue-700">
                          {parseResult.buckets.profile_update_safe.length + parseResult.buckets.profile_update_preserve.length}
                        </p>
                        <p className="text-[10px] text-blue-500 mt-1 font-medium italic">
                          {parseResult.buckets.profile_update_preserve.length} with preserved reviews
                        </p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-rose-600 mb-1">Invalid Rows</p>
                        <p className="text-2xl font-black text-rose-700">{parseResult.buckets.invalid.length}</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mb-1">Duplicates</p>
                        <p className="text-2xl font-black text-amber-700">{parseResult.buckets.duplicate.length}</p>
                      </div>
                    </div>

                    {/* Overall Warnings Count Card */}
                    {(() => {
                      const warningCount = [
                        ...parseResult.buckets.new,
                        ...parseResult.buckets.profile_update_safe,
                        ...parseResult.buckets.profile_update_preserve
                      ].filter(r => r.reasons && r.reasons.some(res => res.includes('Field stripped'))).length;
                      
                      if (warningCount === 0) return null;
                      
                      return (
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <p className="text-sm font-bold text-amber-900">
                            {warningCount} record{warningCount > 1 ? 's' : ''} have warnings (e.g. invalid ratings stripped).
                          </p>
                        </div>
                      );
                    })()}

                    {/* Warning Box */}
                    {parseResult.warnings.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <ul className="text-xs text-amber-800 space-y-1">
                          {parseResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Bucket Lists */}
                    <div className="space-y-3">
                      {/* Invalid List */}
                      {parseResult.buckets.invalid.length > 0 && (
                        <div className="border border-rose-100 rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => toggleBucket('invalid')}
                            className="w-full px-5 py-4 flex items-center justify-between text-left bg-rose-50/50 hover:bg-rose-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-5 h-5 text-rose-600" />
                              <span className="text-sm font-bold text-rose-900">
                                Invalid Records ({parseResult.buckets.invalid.length})
                              </span>
                            </div>
                            {expandedBuckets.invalid ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          {expandedBuckets.invalid && (
                            <div className="px-5 py-3 border-t border-rose-100 space-y-3 max-h-48 overflow-y-auto bg-white">
                              {parseResult.buckets.invalid.map((row, i) => (
                                <div key={i} className="text-xs border-b border-gray-50 pb-2 last:border-0">
                                  <div className="flex justify-between font-bold text-gray-700 mb-1">
                                    <span>{row.employee.employee_name || 'Anonymous'}</span>
                                    <span className="text-rose-500">Row {row.originalIndex + 2}</span>
                                  </div>
                                  <ul className="text-gray-500 list-disc list-inside space-y-0.5">
                                    {row.reasons?.map((r, ri) => <li key={ri}>{r}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Preservation List */}
                      {parseResult.buckets.profile_update_preserve.length > 0 && (
                        <div className="border border-blue-100 rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => toggleBucket('preserve')}
                            className="w-full px-5 py-4 flex items-center justify-between text-left bg-blue-50/50 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Info className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-bold text-blue-900">
                                Feedback Preserved ({parseResult.buckets.profile_update_preserve.length})
                              </span>
                            </div>
                            {expandedBuckets.preserve ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          {expandedBuckets.preserve && (
                            <div className="px-5 py-3 border-t border-blue-100 space-y-2 max-h-48 overflow-y-auto bg-white">
                              <p className="text-[10px] text-blue-600 font-bold mb-2 uppercase">These employees already have reviews in progress. Only profile fields will be updated.</p>
                              {parseResult.buckets.profile_update_preserve.map((row, i) => (
                                <div key={i} className="text-xs flex justify-between py-1 border-b border-gray-50 last:border-0 text-gray-600">
                                  <div>
                                    <span className="font-bold">{row.employee.employee_name}</span>
                                    {row.reasons && row.reasons.some(r => r.includes('stripped')) && (
                                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold">Warning</span>
                                    )}
                                  </div>
                                  <span className="text-gray-400">{row.employee.employee_email}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Duplicates List */}
                      {parseResult.buckets.duplicate.length > 0 && (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => toggleBucket('duplicate')}
                            className="w-full px-5 py-4 flex items-center justify-between text-left bg-gray-50/50 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-5 h-5 text-gray-400" />
                              <span className="text-sm font-bold text-gray-700">
                                Duplicates Found ({parseResult.buckets.duplicate.length})
                              </span>
                            </div>
                            {expandedBuckets.duplicate ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          {expandedBuckets.duplicate && (
                            <div className="px-5 py-3 border-t border-gray-100 space-y-2 max-h-48 overflow-y-auto bg-white">
                              <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase italic">These emails appeared multiple times. Only the first occurrence will be processed.</p>
                              {parseResult.buckets.duplicate.map((row, i) => (
                                <div key={i} className="text-xs flex justify-between py-1 border-b border-gray-100 last:border-0 text-gray-500">
                                  <span>{row.employee.employee_name} ({row.employee.employee_email})</span>
                                  <span className="font-mono">Row {row.originalIndex + 2}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 'results' && commitResult && (
                  <div className="space-y-8 text-center py-8">
                    {commitResult.written > 0 ? (
                      <div className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6",
                        commitResult.failed > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {commitResult.failed > 0 ? <AlertTriangle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <X className="w-10 h-10" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 mb-2">
                        {commitResult.written > 0 
                          ? (commitResult.failed > 0 ? 'Import Completed with Errors' : 'Import Successful!')
                          : 'Import Failed'}
                      </h4>
                      <p className="text-gray-500 font-medium">
                        {commitResult.written > 0 
                          ? `Processed ${commitResult.written} records across all target categories.`
                          : 'No records were successfully written to the database.'}
                      </p>
                    </div>

                    {commitResult.errors.length > 0 && (
                      <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-left">
                        <p className="text-sm font-bold text-rose-900 mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          The following batches failed:
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {commitResult.errors.map((err: string, i: number) => (
                            <p key={i} className="text-xs text-rose-700 bg-white/50 p-2 rounded-xl">{err}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      variant="secondary" 
                      className="w-full max-w-xs"
                      onClick={handleClose}
                    >
                      Close TM Space
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step !== 'results' && (
                <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/50">
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={step === 'preview' ? reset : handleClose}
                    disabled={isCommitting}
                  >
                    {step === 'preview' ? 'Back' : 'Cancel'}
                  </Button>
                  {step === 'preview' && parseResult && (
                    <Button 
                      variant="primary" 
                      className={cn(
                        "flex-[2]",
                        isSimulation ? "bg-gray-400 shadow-none cursor-not-allowed" : "bg-blue-600 shadow-lg shadow-blue-100"
                      )}
                      onClick={handleConfirm}
                      isLoading={isCommitting}
                      disabled={isSimulation}
                    >
                      {isSimulation ? "Commit Disabled (Simulation)" : (isCommitting ? `Writing Data... (${commitProgress.current}/${commitProgress.total})` : `Confirm Import (${parseResult.buckets.new.length + parseResult.buckets.profile_update_safe.length + parseResult.buckets.profile_update_preserve.length} Records)`)}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
