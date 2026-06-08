import React from 'react';
import { Employee, MidYearCheckin } from '../../types';
import { User } from 'firebase/auth';
import { Card } from '../ui/Card';
import { MidYearForm } from './MidYearForm';
import { cn } from '../../lib/utils';
import { CYCLE_NAME, formatDeadline, getDaysUntilDeadline } from '../../lib/cycle-config';
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Share2,
  CalendarClock,
} from 'lucide-react';

interface ManagerViewProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSave: (data: MidYearCheckin, status: 'Draft' | 'Submitted') => void;
  onShare: () => void;
  onSaveDraft: (data: MidYearCheckin) => void;
  isSaving: boolean;
  isSavingDraft: boolean;
  isSharing: boolean;
  onSeedData: () => void;
  isSeeding: boolean;
  isAdmin?: boolean;
  onAdminOverride?: (employeeId: string, data: MidYearCheckin, reason: string, user: User | null) => Promise<boolean>;
  isOverriding?: boolean;
  user?: User | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ManagerView = React.memo(({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  searchQuery,
  onSearchChange,
  onSave,
  onShare,
  onSaveDraft,
  isSaving,
  isSavingDraft,
  isSharing,
  onSeedData,
  isSeeding,
  isAdmin,
  onAdminOverride,
  isOverriding,
  user,
  showToast,
}: ManagerViewProps) => {
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const filteredEmployees = employees.filter(e =>
    (e.employee_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (e.employee_id?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const activeReports = employees.filter(e => e.status !== 'Skipped');
  const completedCount = activeReports.filter(e => ['Submitted', 'Shared', 'Acknowledged'].includes(e.status)).length;
  const totalCount = activeReports.length;
  const daysLeft = getDaysUntilDeadline();

  return (
    <div className="space-y-6">
      {totalCount > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{CYCLE_NAME} progress</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">
              {completedCount} of {totalCount} <span className="text-gray-400 font-bold text-sm uppercase tracking-widest ml-1">reviews submitted</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <CalendarClock className={cn("w-5 h-5", daysLeft <= 7 ? "text-amber-500" : "text-gray-300")} />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cycle closes</p>
              <p className={cn("text-sm font-extrabold", daysLeft <= 7 && daysLeft >= 0 ? "text-amber-600" : daysLeft < 0 ? "text-red-600" : "text-gray-900")}>
                {formatDeadline()}
                <span className="font-bold text-gray-400 ml-2">
                  {daysLeft > 0 ? `· ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : daysLeft === 0 ? '· closes today' : '· closed'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Report Selector */}
      <div className="lg:col-span-4 space-y-4">
        <Card className="flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            
            {employees.length === 0 && !isSeeding && isAdmin && (
              <div
                onClick={onSeedData}
                className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl cursor-pointer hover:bg-blue-100 transition-all border border-blue-100 border-dashed"
                title="Admin only — seeds a mock team for testing"
              >
                <Plus className="w-5 h-5 font-bold" />
                <span className="text-xs font-bold uppercase tracking-wider">Initialize Mock Team (Admin)</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Users className="w-12 h-12 text-gray-200 mb-4" />
                {employees.length === 0 ? (
                  <>
                    <p className="text-sm font-bold text-gray-500">No direct reports yet</p>
                    <p className="text-xs text-gray-400 font-medium mt-2 max-w-xs leading-relaxed">
                      Your direct reports will appear here once Talent Management imports the team. If your team looks wrong, ping your HRBP.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-500">No matches for "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 font-medium mt-2">Try a different name or employee ID.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredEmployees.map((emp) => (
                  <div 
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp.id)}
                    className={cn(
                      "p-4 transition-all cursor-pointer flex items-center justify-between group",
                      selectedEmployeeId === emp.id 
                        ? "bg-blue-50/50 border-l-4 border-blue-600" 
                        : "hover:bg-gray-50 border-l-4 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                        selectedEmployeeId === emp.id ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                      )}>
                        {(emp.employee_name || emp.first_name || 'E').charAt(0)}
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-bold truncate max-w-[150px]",
                          selectedEmployeeId === emp.id ? "text-blue-700" : "text-gray-900"
                        )}>
                          {emp.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">
                          {emp.job_title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {emp.status === 'Acknowledged' ? (
                         <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                       ) : emp.status === 'Shared' ? (
                         <Share2 className="w-4 h-4 text-blue-500" />
                       ) : emp.status === 'Submitted' ? (
                         <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                       ) : emp.status === 'Draft' ? (
                         <Clock className="w-4 h-4 text-amber-500" />
                       ) : emp.status === 'Skipped' ? (
                         <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-100 whitespace-nowrap">Skipped</span>
                       ) : (
                         <AlertCircle className="w-4 h-4 text-gray-300" />
                       )}
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-all",
                        selectedEmployeeId === emp.id ? "text-blue-600 translate-x-1" : "text-gray-300 group-hover:text-gray-400"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main View: Feedback Form */}
      <div className="lg:col-span-8">
        {!selectedEmployee ? (
          <Card className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-gray-100">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
              {totalCount === 0 ? 'Nothing to review yet' : 'Pick someone to get started'}
            </h3>
            <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
              {totalCount === 0
                ? 'Your direct reports will appear here once Talent Management imports the team.'
                : `Choose a direct report from the list on the left to write or review their ${CYCLE_NAME} check-in.`}
            </p>
          </Card>
        ) : (
          <MidYearForm
            employee={selectedEmployee}
            onSave={onSave}
            onShare={onShare}
            onSaveDraft={onSaveDraft}
            isSaving={isSaving}
            isSavingDraft={isSavingDraft}
            isSharing={isSharing}
            isAdmin={isAdmin}
            onAdminOverride={onAdminOverride}
            isOverriding={isOverriding}
            user={user}
            showToast={showToast}
          />
        )}
      </div>
      </div>
    </div>
  );
});
