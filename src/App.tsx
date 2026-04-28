import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut, Target, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// Hooks & Services
import { useAuth } from './hooks/useAuth';
import { usePerformanceData } from './hooks/usePerformanceData';
import { usePerformanceActions } from './hooks/usePerformanceActions';
import { useImportExport } from './hooks/useImportExport';
import { seedMockData } from './lib/mock-data';
import { cn } from './lib/utils';
import { Employee, MidYearCheckin } from './types';

// UI Components
import { Button } from './components/ui/Button';
import { Toast } from './components/ui/Toast';
import { AdminView } from './components/views/AdminView';
import { ManagerView } from './components/views/ManagerView';
import { HRBPView } from './components/views/HRBPView';
import { EmployeeView } from './components/views/EmployeeView';
import { BellCurveChart } from './components/charts/BellCurveChart';

import { DemoViewSwitcher } from './components/ui/DemoViewSwitcher';
import { useDemo } from './context/DemoContext';
import { IS_DEMO_MODE } from './lib/demo-mode';

const App = () => {
  // --- Auth & State ---
  const { user, isAdmin, isAdminLoaded, isAuthReady, login, logout } = useAuth();
  const [proxyEmail, setProxyEmail] = useState<string | null>(null);
  const { 
    employees, 
    managerEmployees, 
    hrbpEmployees, 
    currentUserEmployee, 
    isHRBP, 
    isLoading 
  } = usePerformanceData(user, isAdmin, proxyEmail);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'manager' | 'admin' | 'employee' | 'hrbp' | 'analytics'>('manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const { isSaving, isSavingDraft, isOverriding, saveFeedback, adminOverrideReview } = usePerformanceActions(showToast);
  const { 
    isImporting, 
    isCommitting, 
    commitProgress, 
    parseFile, 
    commitImport, 
    handleDownloadReport 
  } = useImportExport(user, showToast);

  // --- Feedback Form State ---
  const [midYearData, setMidYearData] = useState<MidYearCheckin>({
    doing_well: '',
    focus_to_grow: '',
    performance_trending_rating: '',
    additional_notes: '',
    great_reflections: []
  });

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  useEffect(() => {
    if (selectedEmployee?.mid_year_checkin) {
      setMidYearData({
        doing_well: selectedEmployee.mid_year_checkin.doing_well || '',
        focus_to_grow: selectedEmployee.mid_year_checkin.focus_to_grow || '',
        performance_trending_rating: selectedEmployee.mid_year_checkin.performance_trending_rating || '',
        additional_notes: selectedEmployee.mid_year_checkin.additional_notes || '',
        great_reflections: selectedEmployee.mid_year_checkin.great_reflections || []
      });
    } else {
      setMidYearData({ 
        doing_well: '', 
        focus_to_grow: '', 
        performance_trending_rating: '', 
        additional_notes: '',
        great_reflections: [] 
      });
    }
  }, [selectedEmployee]);

  const isFormValid = useMemo(() => 
    midYearData.doing_well.trim() !== '' &&
    midYearData.focus_to_grow.trim() !== '' &&
    midYearData.performance_trending_rating !== '', 
    [midYearData]
  );

  const demoContext = IS_DEMO_MODE ? useDemo() : null;

  useEffect(() => {
    if (IS_DEMO_MODE && demoContext) {
      if (demoContext.perspective === 'admin') setViewMode('admin');
      else if (demoContext.perspective === 'manager') setViewMode('manager');
      else if (demoContext.perspective === 'hrbp') setViewMode('hrbp');
      else if (demoContext.perspective === 'employee') setViewMode('employee');
    }
  }, [demoContext?.perspective]);

  const isDraftValid = useMemo(() => 
    midYearData.doing_well.trim() !== '' ||
    midYearData.focus_to_grow.trim() !== '' ||
    midYearData.performance_trending_rating !== '' ||
    midYearData.additional_notes?.trim() !== '' ||
    (midYearData.great_reflections?.some(r => r.response.trim() !== '' || r.not_applicable)),
    [midYearData]
  );

  // --- Handlers ---
  const handleSeed = async () => {
    if (!user?.email) return;
    setIsSeeding(true);
    try {
      await seedMockData(user.email);
      showToast('Mock team initialized!', 'success');
    } catch (e) {
      showToast('Seeding failed', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [{ 
      'Employee ID': 'FW1024',
      'First Name': 'Jane',
      'Last Name': 'Smith',
      'Email - Primary Work': 'jane.smith@freshworks.com',
      'Manager': 'John Doe',
      'Manager Email': user?.email?.toLowerCase() || 'john.doe@freshworks.com',
      'HR Business Partner': 'HRBP Name',
      'HRBP Email': 'hrbp.name@freshworks.com',
      'Gender': 'Female',
      'Job Title': 'Staff Software Engineer',
      'Grade': 'G5',
      'Job Family': 'Engineering',
      'Work Location': 'Chennai, India',
      'Hire Date': '2020-01-15',
      'Last Promotion Date': '2023-01-01',
      'Tenure in Freshworks': '4.3 years',
      'Tenure In Position': '1.3 years',
      'Tenure in Current Job Profile': '1.3 years',
      'Termination Date': '',
      'Number of Direct Reports': '0',
      '2024 FPI Rating': '',
      '2025 FPI Rating': '',
      'Management Chain - Level 06': '',
      'Management Chain - Level 07': '',
      'Management Chain - Level 08': '',
      'Management Chain - Level 09': '',
      'Management Chain - Level 10': ''
    }];

    const instructionsData = [
      { 'Instruction': 'Requirement', 'Details': 'Mandatory columns: Employee ID, First Name, Last Name, Email - Primary Work, Manager, Manager Email, HR Business Partner, HRBP Email' },
      { 'Instruction': 'Termination Date', 'Details': 'Leave blank for active employees. Populate for employees with known exit dates; these will be flagged in the import preview.' },
      { 'Instruction': 'Management Chain', 'Details': 'Management Chain (L6–L10) — Imported for future leadership rollup visibility. Populate if available from Workday; has no effect on the current release.' },
      { 'Instruction': 'Email Domain', 'Details': 'All emails MUST belong to @freshworks.com' },
      { 'Instruction': 'Data Preservation', 'Details': 'Re-importing updates profile info (Job Title, etc.) but NEVER overwrites submitted feedback.' },
      { 'Instruction': 'Multiple Sheets', 'Details': 'The importer reads all sheets. Ensure the first row of each sheet contains headers.' }
    ];

    const wb = XLSX.utils.book_new();
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);

    // Auto-size columns for instructions
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 100 }];

    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Data Template');
    XLSX.writeFile(wb, 'MidYear_Import_Template.xlsx');
  };

  if (!isAuthReady || (user && !isAdminLoaded)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
            {!isAuthReady ? 'Authenticating...' : 'Loading Permissions...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-200 mb-8 animate-bounce">
            <Target className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Fresh Performance <span className="text-blue-600">Impact</span></h1>
          <p className="text-gray-500 text-lg font-medium leading-relaxed">The high-velocity performance system for Freshworks managers.</p>
          <Button onClick={login} size="xl" className="w-full">Sign in with Google</Button>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restricted to @freshworks.com</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {IS_DEMO_MODE && <DemoViewSwitcher />}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-1">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-extrabold text-gray-900 tracking-tight hidden sm:block">
                FPI <span className="text-blue-600">Portal</span>
              </span>
              {IS_DEMO_MODE && (
                <div className="ml-4 px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-200">
                  Demo
                </div>
              )}
            </div>
            
            <div className="flex bg-gray-100/80 p-1.5 rounded-2xl gap-1">
              {isAdmin && isAdminLoaded && (
                <button
                  onClick={() => setViewMode('admin')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    viewMode === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  TM Space
                </button>
              )}
              {isHRBP && (
                <button
                  onClick={() => setViewMode('hrbp')}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    viewMode === 'hrbp' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  HRBP Org View
                </button>
              )}
              <button
                onClick={() => setViewMode('manager')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'manager' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Team Feedback
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'analytics' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Analytics
              </button>
              <button
                onClick={() => setViewMode('employee')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  viewMode === 'employee' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                My Performance
              </button>
            </div>

            <div className="flex items-center gap-4">
              {proxyEmail && (
                <div className="hidden lg:flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Viewing as: {proxyEmail}</span>
                  <button 
                    onClick={() => {
                      setProxyEmail(null);
                      showToast('View Reset', 'info');
                    }}
                    className="p-1 hover:bg-amber-100 rounded-lg text-amber-600 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900">{user.displayName}</span>
                <span className="text-[10px] text-gray-400 font-bold tracking-widest leading-none">@FRESHWORKS</span>
              </div>
              <button onClick={logout} className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'admin' && isAdmin ? (
          <AdminView 
            employees={employees}
            isImporting={isImporting}
            isCommitting={isCommitting}
            commitProgress={commitProgress}
            onParse={parseFile}
            onCommit={commitImport}
            onDownloadReport={handleDownloadReport}
            onTemplateDownload={downloadTemplate}
            onProxyManager={(email) => {
              setProxyEmail(email);
              setViewMode('manager');
              showToast(`Viewing as ${email}`, 'info');
            }}
            showToast={showToast}
          />
        ) : viewMode === 'hrbp' && isHRBP ? (
          <HRBPView 
            employees={hrbpEmployees}
            onDownload={() => {
              if (hrbpEmployees.length === 0) {
                showToast('No employees to export.', 'error');
                return;
              }
              try {
                const today = new Date().toISOString().split('T')[0];
                handleDownloadReport(hrbpEmployees, `HRBP_Org_Report_${today}`);
                showToast(`Report downloaded with ${hrbpEmployees.length} employees`, 'success');
              } catch (err) {
                showToast('Failed to generate report.', 'error');
              }
            }}
          />
        ) : viewMode === 'employee' ? (
          <EmployeeView 
            employee={currentUserEmployee} 
            isAdmin={isAdmin} 
            user={user} 
            onAdminOverride={adminOverrideReview}
            isOverriding={isOverriding}
            showToast={showToast}
          />
        ) : viewMode === 'analytics' ? (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Manager Analytics</h1>
            <BellCurveChart employees={managerEmployees} />
          </div>
        ) : (
          <ManagerView 
            employees={managerEmployees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            midYearData={midYearData}
            setMidYearData={setMidYearData}
            handleSave={() => {
              if (!selectedEmployeeId) return;
              if (!isFormValid) {
                showToast('Please fill in all required fields (Wins, Growth, and Rating) before completing.', 'error');
                return;
              }
              saveFeedback(selectedEmployeeId, midYearData, true, user);
            }}
            handleSaveDraft={() => {
              if (!selectedEmployeeId) return;
              if (!isDraftValid) {
                showToast('Please enter at least one field before saving a draft.', 'info');
                return;
              }
              saveFeedback(selectedEmployeeId, midYearData, false, user);
            }}
            isSaving={isSaving}
            isSavingDraft={isSavingDraft}
            isFormValid={isFormValid}
            isDraftValid={isDraftValid}
            onSeedData={handleSeed}
            isSeeding={isSeeding}
            isAdmin={isAdmin}
            onAdminOverride={adminOverrideReview}
            isOverriding={isOverriding}
            user={user}
          />
        )}
      </main>
    </div>
  );
};

export default App;
