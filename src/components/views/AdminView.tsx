import React, { useState } from 'react';
import { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CalibrationChart } from '../charts/CalibrationChart';
import { AdminVisuals } from '../charts/AdminVisuals';
import { cn } from '../../lib/utils';
import { 
  Upload, 
  Download, 
  Clock, 
  Users,
  ChevronRight,
  ChevronDown,
  Eye,
  History,
  AlertCircle,
  Target,
  UserCheck
} from 'lucide-react';
import { ImportModal } from './ImportModal';
import { AuditTrailModal } from './AuditTrailModal';

interface AdminViewProps {
  employees: Employee[];
  isImporting: boolean;
  isCommitting: boolean;
  commitProgress: { current: number, total: number };
  onParse: (file: File) => Promise<any>;
  onCommit: (rows: any[]) => Promise<any>;
  onParseGoals: (file: File) => Promise<any>;
  onCommitGoals: (rows: any[]) => Promise<any>;
  onDownloadReport: (data: Employee[], filename: string) => void;
  onTemplateDownload: () => void;
  onProxyManager: (email: string) => void;
  showToast: (msg: string, type?: any) => void;
  onSkipEmployee?: (employeeId: string, skipReason: string | null) => Promise<boolean>;
}

export const AdminView = ({ 
  employees, 
  isImporting, 
  isCommitting,
  commitProgress,
  onParse,
  onCommit,
  onParseGoals,
  onCommitGoals,
  onDownloadReport, 
  onTemplateDownload,
  onProxyManager,
  showToast,
  onSkipEmployee
}: AdminViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>({});
  const [selectedAuditEmployee, setSelectedAuditEmployee] = useState<Employee | null>(null);

  const [isImportingGoals, setIsImportingGoals] = useState(false);
  const [goalsImportResults, setGoalsImportResults] = useState<{ updated: number; skipped: number; warnings: string[] } | null>(null);
  const [showGoalsResults, setShowGoalsResults] = useState(false);
  const goalsInputRef = React.useRef<HTMLInputElement>(null);

  const handleGoalsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingGoals(true);
    try {
      const parsedRows = await onParseGoals(file);
      if (parsedRows) {
        const result = await onCommitGoals(parsedRows);
        if (result) {
          setGoalsImportResults(result);
          setShowGoalsResults(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Goals import failed: ' + err.message, 'error');
    } finally {
      setIsImportingGoals(false);
      if (goalsInputRef.current) {
        goalsInputRef.current.value = '';
      }
    }
  };

  const handleAdminDownload = () => {
    if (employees.length === 0) {
      showToast('No employees to export.', 'error');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `Mid_Year_Report_All_${today}`;
      onDownloadReport(employees, filename);
      showToast(`Report downloaded with ${employees.length} employees`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate report. Try again or check console for details.', 'error');
    }
  };
  
  const managerStats = React.useMemo(() => {
    const stats: Record<string, { 
      name: string, 
      email: string, 
      total: number, 
      completed: number, 
      pending: number,
      reports: Employee[]
    }> = {};
    employees.forEach(e => {
      const email = e.manager_email;
      if (!stats[email]) {
        stats[email] = { name: e.manager_name || 'N/A', email, total: 0, completed: 0, pending: 0, reports: [] };
      }
      stats[email].total++;
      if (['Submitted', 'Shared', 'Acknowledged'].includes(e.status)) stats[email].completed++;
      if (e.status === 'Pending' || e.status === 'Draft') stats[email].pending++;
      stats[email].reports.push(e);
    });
    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [employees]);

  const toggleManager = (email: string) => {
    setExpandedManagers(prev => ({ ...prev, [email]: !prev[email] }));
  };

  return (
    <div className="space-y-12">
      <AuditTrailModal 
        isOpen={!!selectedAuditEmployee}
        onClose={() => setSelectedAuditEmployee(null)}
        employee={selectedAuditEmployee}
      />
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TM Space</h1>
            <p className="text-gray-500">Global Performance Orchestration & Analytics</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAdminDownload}
              disabled={employees.length === 0}
              title={employees.length === 0 ? "No employees to export" : ""}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setIsModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
            <input 
              type="file" 
              ref={goalsInputRef} 
              className="hidden" 
              accept=".xlsx" 
              onChange={handleGoalsFileChange} 
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goalsInputRef.current?.click()}
              disabled={isImportingGoals || isCommitting}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImportingGoals ? 'Importing Goals...' : 'Import Goals'}
            </Button>
            <Button variant="ghost" className="text-gray-400 hover:text-blue-600 hover:bg-blue-50" size="sm" onClick={onTemplateDownload}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
        </div>

        <ImportModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onParse={onParse}
          onCommit={onCommit}
          onTemplateDownload={onTemplateDownload}
          isImporting={isImporting}
          isCommitting={isCommitting}
          commitProgress={commitProgress}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-blue-600 text-white border-none shadow-lg shadow-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-100">Across Org Pool</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{employees.filter(e => e.status !== 'Skipped').length}</p>
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest leading-none">Active</p>
                </div>
                {employees.some(e => e.status === 'Skipped') && (
                  <p className="text-[10px] text-blue-100/90 mt-1.5 font-bold uppercase tracking-widest leading-none">
                    {employees.filter(e => e.status === 'Skipped').length} Skipped / Inactive
                  </p>
                )}
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-amber-600 text-white border-none shadow-lg shadow-amber-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-100">Total Pending</p>
                <p className="text-3xl font-bold">{employees.filter(e => e.status === 'Pending' || e.status === 'Draft').length}</p>
              </div>
            </div>
          </Card>
          <Button 
            variant="primary" 
            className="h-full bg-emerald-600 shadow-emerald-200"
            onClick={handleAdminDownload}
            disabled={employees.length === 0}
          >
            <Download className="w-5 h-5 mr-3" />
            Generate Global Report (EIB)
          </Button>
        </div>

        <AdminVisuals employees={employees} />
        
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Org-wide Performance Trending Rating Distribution</h2>
          <CalibrationChart employees={employees} scopeLabel="Org-wide" />
        </div>

        <Card>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Completion Status by Manager</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Completed
              <span className="ml-2 w-3 h-3 bg-amber-500 rounded-full"></span> Pending
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Total Reports</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {managerStats.map((manager) => {
                  const skippedCount = manager.reports.filter(r => r.status === 'Skipped').length;
                  const activeTotal = manager.total - skippedCount;
                  const rate = activeTotal > 0 ? Math.round((manager.completed / activeTotal) * 100) : 100;
                  const isExpanded = expandedManagers[manager.email] || false;

                  return (
                    <React.Fragment key={manager.email}>
                      <tr className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <button 
                              onClick={() => toggleManager(manager.email)}
                              className="mt-1 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            </button>
                            <div>
                              <p className="font-bold text-gray-900">{manager.name}</p>
                              <p className="text-xs text-gray-500">{manager.email}</p>
                              <button 
                                onClick={() => onProxyManager(manager.email)}
                                className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-widest px-2.5 py-1.5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all w-fit group"
                              >
                                <Eye className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                View as Manager
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <span>{manager.total}</span>
                            {skippedCount > 0 && (
                              <span className="text-purple-600 font-bold text-[10px]" title={`${skippedCount} skipped reviews`}>
                                ({skippedCount} skipped)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[100px]">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <div className="flex gap-3 text-xs font-bold">
                              <span className="text-emerald-600" title="Completed active reviews">{manager.completed}</span>
                              <span className="text-amber-600" title="Pending active reviews">{manager.pending}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold",
                            rate === 100 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                          )}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 pb-6 pt-2 bg-gray-50/30">
                            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-gray-50/50 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                    <th className="px-6 py-3">Report Details</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {manager.reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/30 transition-colors">
                                      <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-gray-900">{report.employee_name}</span>
                                          <span className="text-gray-400 text-[10px]">{report.employee_email}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full font-bold text-[10px] border whitespace-nowrap",
                                          report.status === 'Acknowledged' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                          report.status === 'Shared' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                          report.status === 'Submitted' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                          report.status === 'Draft' ? "bg-gray-50 text-gray-700 border-gray-100" :
                                          report.status === 'Skipped' ? "bg-purple-50 text-purple-700 border-purple-100/60" :
                                          "bg-amber-50 text-amber-700 border-amber-100"
                                        )}>
                                          {report.status === 'Submitted' ? 'Feedback Recorded' : 
                                           report.status === 'Skipped' ? `Skipped (${report.skip_reason || 'Inactive'})` :
                                           report.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                          {onSkipEmployee && (
                                            <div>
                                              {report.status !== 'Skipped' ? (
                                                <select
                                                  onChange={async (e) => {
                                                    const reason = e.target.value;
                                                    if (reason) {
                                                      await onSkipEmployee(report.id, reason);
                                                    }
                                                    e.target.value = "";
                                                  }}
                                                  value=""
                                                  className="text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-xl border border-transparent focus:ring-2 focus:ring-purple-200 outline-none transition-all uppercase tracking-wider cursor-pointer font-sans"
                                                >
                                                  <option value="" disabled>Skip Review...</option>
                                                  <option value="On Leave">On Leave</option>
                                                  <option value="Serving Notice Period">Serving Notice</option>
                                                  <option value="Maternity Leave">Maternity Leave</option>
                                                  <option value="Other">Other</option>
                                                </select>
                                              ) : (
                                                <button
                                                  onClick={() => onSkipEmployee(report.id, null)}
                                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                                                >
                                                  <UserCheck className="w-3 h-3" />
                                                  Reactivate
                                                </button>
                                              )}
                                            </div>
                                          )}

                                          <button 
                                            onClick={() => setSelectedAuditEmployee(report)}
                                            disabled={report.status !== 'Submitted' && report.status !== 'Skipped'}
                                            className={cn(
                                              "inline-flex items-center gap-1.5 font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all text-[10px]",
                                              (report.status === 'Submitted' || report.status === 'Skipped')
                                                ? "text-blue-600 hover:bg-blue-50 cursor-pointer" 
                                                : "text-gray-300 cursor-not-allowed"
                                            )}
                                          >
                                            <History className="w-3.5 h-3.5" />
                                            View Audit
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Goals Import Results Modal */}
      {showGoalsResults && goalsImportResults && (
        <>
          <div 
            onClick={() => setShowGoalsResults(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[120]">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 max-h-[85vh] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">Goals Import Summary</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">H1 2026 CYCLE OBJECTIVES</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Successfully Updated</p>
                  <p className="text-2xl font-black text-emerald-700">{goalsImportResults.updated}</p>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Skipped / Warnings</p>
                  <p className="text-2xl font-black text-amber-700">{goalsImportResults.skipped}</p>
                </div>
              </div>

              {goalsImportResults.warnings && goalsImportResults.warnings.length > 0 ? (
                <div className="flex-1 overflow-y-auto mb-6 pr-2">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <AlertCircle className="w-4 h-4" /> Import Warnings ({goalsImportResults.warnings.length})
                  </p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto bg-gray-50/50 border border-gray-100 rounded-2xl p-4">
                    {goalsImportResults.warnings.map((warn, i) => (
                      <div key={i} className="text-xs font-semibold text-gray-600 leading-relaxed flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 text-center">
                  <p className="text-sm font-semibold text-gray-500">
                    🎉 Excellent! All goals mapped to existing employee records perfectly with zero warnings.
                  </p>
                </div>
              )}

              <Button 
                variant="primary" 
                className="w-full mt-4"
                onClick={() => setShowGoalsResults(false)}
              >
                Close Summary
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
