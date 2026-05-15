import React from 'react';
import { Employee, MidYearCheckin } from '../../types';
import { User } from 'firebase/auth';
import { Card } from '../ui/Card';
import { MidYearForm } from './MidYearForm';
import { cn } from '../../lib/utils';
import { 
  Users, 
  Search, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Share2
} from 'lucide-react';

interface ManagerViewProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  midYearData: MidYearCheckin;
  setMidYearData: React.Dispatch<React.SetStateAction<MidYearCheckin>>;
  handleSave: (status: 'Draft' | 'Submitted') => void;
  handleShare: () => void;
  handleSaveDraft: () => void;
  isSaving: boolean;
  isSavingDraft: boolean;
  isSharing: boolean;
  isFormValid: boolean;
  isDraftValid: boolean;
  onSeedData: () => void;
  isSeeding: boolean;
  isAdmin?: boolean;
  onAdminOverride?: (employeeId: string, data: MidYearCheckin, reason: string, user: User | null) => Promise<boolean>;
  isOverriding?: boolean;
  user?: User | null;
}

export const ManagerView = ({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  searchQuery,
  onSearchChange,
  midYearData,
  setMidYearData,
  handleSave,
  handleShare,
  handleSaveDraft,
  isSaving,
  isSavingDraft,
  isSharing,
  isFormValid,
  isDraftValid,
  onSeedData,
  isSeeding,
  isAdmin,
  onAdminOverride,
  isOverriding,
  user
}: ManagerViewProps) => {
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const filteredEmployees = employees.filter(e => 
    e.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
            
            {employees.length === 0 && !isSeeding && (
              <div 
                onClick={onSeedData}
                className="flex items-center gap-3 p-4 bg-blue-50 text-blue-600 rounded-2xl cursor-pointer hover:bg-blue-100 transition-all border border-blue-100 border-dashed"
              >
                <Plus className="w-5 h-5 font-bold" />
                <span className="text-xs font-bold uppercase tracking-wider">Initialize Mock Team</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Users className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-sm font-bold text-gray-400">No reports found</p>
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
                        {emp.employee_name.charAt(0)}
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-bold truncate max-w-[150px]",
                          selectedEmployeeId === emp.id ? "text-blue-700" : "text-gray-900"
                        )}>
                          {emp.employee_name}
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
            <h3 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Select a Direct Report</h3>
            <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
              Choose an employee from the list on the left to start or review their mid-year performance check-in.
            </p>
          </Card>
        ) : (
          <MidYearForm 
            employee={selectedEmployee}
            midYearData={midYearData}
            setMidYearData={setMidYearData}
            onSave={handleSave}
            onShare={handleShare}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
            isSavingDraft={isSavingDraft}
            isSharing={isSharing}
            isFormValid={isFormValid}
            isDraftValid={isDraftValid}
            isAdmin={isAdmin}
            onAdminOverride={onAdminOverride}
            isOverriding={isOverriding}
            user={user}
          />
        )}
      </div>
    </div>
  );
};
