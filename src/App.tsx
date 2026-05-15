import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { AnimatePresence } from 'motion/react';
import { LogOut, Target, X } from 'lucide-react';

// Hooks & Services
import { useAuth } from './hooks/useAuth';
import { usePerformanceData } from './hooks/usePerformanceData';
import { usePerformanceActions } from './hooks/usePerformanceActions';
import { useImportExport } from './hooks/useImportExport';
import { seedMockData } from './lib/mock-data';
import { cn } from './lib/utils';
import { Employee } from './types';

// UI Components
import { Button } from './components/ui/Button';
import { Toast } from './components/ui/Toast';
// ManagerView is the default landing view, so keep it eager.
import { ManagerView } from './components/views/ManagerView';
// Other views are loaded on demand to keep the initial bundle small.
const AdminView = lazy(() => import('./components/views/AdminView').then(m => ({ default: m.AdminView })));
const HRBPView = lazy(() => import('./components/views/HRBPView').then(m => ({ default: m.HRBPView })));
const EmployeeView = lazy(() => import('./components/views/EmployeeView').then(m => ({ default: m.EmployeeView })));
const CalibrationChart = lazy(() => import('./components/charts/CalibrationChart').then(m => ({ default: m.CalibrationChart })));

const ViewFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  // --- Auth & State ---
  const { user, isAdmin, isAdminLoaded, isAuthReady, login, logout } = useAuth();
  const [proxyEmail, setProxyEmail] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'manager' | 'admin' | 'employee' | 'hrbp' | 'analytics'>('manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const {
    employees,
    managerEmployees,
    hrbpEmployees,
    currentUserEmployee,
    isHRBP,
    isLoading,
    refreshAdminEmployees,
    refreshHrbpEmployees,
  } = usePerformanceData(user, isAdmin, proxyEmail, showToast);

  const { 
    isSaving, 
    isSavingDraft, 
    isSharing, 
    isOverriding, 
    saveFeedback, 
    shareReview, 
    adminOverrideReview 
  } = usePerformanceActions(showToast);
  const { 
    isImporting, 
    isCommitting, 
    commitProgress, 
    parseFile, 
    commitImport, 
    handleDownloadReport 
  } = useImportExport(user, showToast);

  // Form state lives inside MidYearForm now so that typing doesn't re-render the
  // entire app on every keystroke. App only passes the initial values.

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

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
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
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mid-Year Performance <span className="text-blue-600">Impact Portal</span></h1>
          <p className="text-gray-500 text-lg font-medium leading-relaxed">The high-velocity performance system for Freshworks managers.</p>
          <Button onClick={login} size="xl" className="w-full">Sign in with Google</Button>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restricted to @freshworks.com</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
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
                Mid-Year <span className="text-blue-600">Impact</span>
              </span>
            </div>
            
            <div className="flex bg-gray-100/80 p-1.5 rounded-2xl gap-1">
              {isAdmin && isAdminLoaded && (
                <button
                  onClick={() => { setViewMode('admin'); refreshAdminEmployees(); }}
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
                  onClick={() => { setViewMode('hrbp'); refreshHrbpEmployees(); }}
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
        <Suspense fallback={<ViewFallback />}>
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
            <CalibrationChart employees={managerEmployees} scopeLabel="Your team" />
          </div>
        ) : (
          <ManagerView
            employees={managerEmployees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSave={(data, status) => {
              if (!selectedEmployeeId) return;
              saveFeedback(selectedEmployeeId, data, status, user);
            }}
            onShare={() => {
              if (!selectedEmployeeId) return;
              shareReview(selectedEmployeeId, user);
            }}
            onSaveDraft={(data) => {
              if (!selectedEmployeeId) return;
              saveFeedback(selectedEmployeeId, data, 'Draft', user);
            }}
            isSaving={isSaving}
            isSavingDraft={isSavingDraft}
            isSharing={isSharing}
            onSeedData={handleSeed}
            isSeeding={isSeeding}
            isAdmin={isAdmin}
            onAdminOverride={adminOverrideReview}
            isOverriding={isOverriding}
            user={user}
            showToast={showToast}
          />
        )}
        </Suspense>
      </main>
    </div>
  );
};

export default App;
