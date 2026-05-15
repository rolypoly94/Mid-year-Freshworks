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
  AlertCircle
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
  onDownloadReport: (data: Employee[], filename: string) => void;
  onTemplateDownload: () => void;
  onProxyManager: (email: string) => void;
  showToast: (msg: string, type?: any) => void;
}

export const AdminView = ({ 
  employees, 
  isImporting, 
  isCommitting,
  commitProgress,
  onParse,
  onCommit,
  onDownloadReport, 
  onTemplateDownload,
  onProxyManager,
  showToast
}: AdminViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>({});
  const [selectedAuditEmployee, setSelectedAuditEmployee] = useState<Employee | null>(null);

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
              <div>
                <p className="text-sm font-medium text-blue-100">Across Org Pool</p>
                <p className="text-3xl font-bold">{employees.length}</p>
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
                <p className="text-3xl font-bold">{employees.filter(e => e.status === 'Pending').length}</p>
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
                  const rate = Math.round((manager.completed / manager.total) * 100);
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
                        <td className="px-6 py-4 font-medium text-gray-700">{manager.total}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[100px]">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <div className="flex gap-3 text-xs font-bold">
                              <span className="text-emerald-600">{manager.completed}</span>
                              <span className="text-amber-600">{manager.pending}</span>
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
                                          "bg-amber-50 text-amber-700 border-amber-100"
                                        )}>
                                          {report.status === 'Submitted' ? 'Feedback Recorded' : report.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 text-right">
                                        <button 
                                          onClick={() => setSelectedAuditEmployee(report)}
                                          disabled={report.status !== 'Submitted'}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all",
                                            report.status === 'Submitted' 
                                              ? "text-blue-600 hover:bg-blue-50 cursor-pointer" 
                                              : "text-gray-300 cursor-not-allowed"
                                          )}
                                        >
                                          <History className="w-3.5 h-3.5" />
                                          View Audit Trail
                                        </button>
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
    </div>
  );
};
