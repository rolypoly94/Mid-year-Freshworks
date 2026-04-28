import React, { useState } from 'react';
import { 
  doc, 
  writeBatch, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, ImportResult, ImportRow, ImportBucket } from '../types';
import { User } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { IS_DEMO_MODE } from '../lib/demo-mode';

const VALID_RATINGS = [
  'Exceptional Results',
  'Exceeds Results',
  'Delivers Full Results',
  'Delivers Some Results',
  'Does Not Deliver Results'
];

export const useImportExport = (user: User | null, showToast: (msg: string, type?: any) => void) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState({ current: 0, total: 0 });

  const getVal = (row: Record<string, unknown>, ...keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const rKey in row) {
        if (rKey.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerKey) return String(row[rKey]).trim();
      }
    }
    return '';
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.toLowerCase().endsWith('@freshworks.com');
  };

  const parseFile = async (file: File): Promise<ImportResult | null> => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit.', 'error');
      return null;
    }

    setIsImporting(true);
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onerror = () => {
        showToast('Error reading file.', 'error');
        setIsImporting(false);
        resolve(null);
      };

      reader.onabort = () => {
        showToast('File read aborted.', 'error');
        setIsImporting(false);
        resolve(null);
      };

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let allRows: Record<string, unknown>[] = [];
          const warnings: string[] = [];

          // Read all sheets
          workbook.SheetNames.forEach(name => {
            const sheet = workbook.Sheets[name];
            const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
            if (json.length > 0) {
              // Check if sheet has at least one expected header
              const headers = Object.keys(json[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
              const validHeaders = ['email', 'employeename', 'emailprimarywork', 'employeeemail', 'manageremail', 'manager'];
              if (headers.some(h => validHeaders.includes(h))) {
                allRows = [...allRows, ...json];
              } else {
                warnings.push(`Skipped sheet "${name}": No matching headers found.`);
              }
            }
          });

          if (allRows.length === 0) {
            showToast('No valid employee records found in any sheet.', 'error');
            setIsImporting(false);
            resolve(null);
            return;
          }

          // Fetch existing emails to classify using chunked queries (limit 30 for 'in')
          const emailsInSheet = Array.from(new Set(allRows.map(r => getVal(r, 'Email', 'Employee Email', 'Email - Primary Work').toLowerCase().trim()).filter(Boolean)));
          
          const existingMap = new Map<string, Employee>();
          if (emailsInSheet.length > 0) {
            const CHUNK_SIZE = 30;
            const promises = [];
            for (let i = 0; i < emailsInSheet.length; i += CHUNK_SIZE) {
              const chunk = emailsInSheet.slice(i, i + CHUNK_SIZE);
              const q = query(collection(db, 'employees'), where('employee_email', 'in', chunk));
              promises.push(getDocs(q));
            }
            const results = await Promise.all(promises);
            results.forEach(snapshot => {
              snapshot.docs.forEach(d => {
                existingMap.set(d.id.toLowerCase(), { id: d.id, ...d.data() } as Employee);
              });
            });
          }

          const result: ImportResult = {
            buckets: { new: [], profile_update_safe: [], profile_update_preserve: [], invalid: [], duplicate: [] },
            totalCount: allRows.length,
            warnings
          };

          const seenEmails = new Set<string>();

          allRows.forEach((row, idx) => {
            const rawEmail = getVal(row, 'Email - Primary Work', 'Employee Email', 'Email').toLowerCase();
            const firstName = getVal(row, 'First Name');
            const lastName = getVal(row, 'Last Name');
            const fullName = getVal(row, 'Employee Name', 'Name') || `${firstName} ${lastName}`.trim();
            const managerEmail = getVal(row, 'Manager Email').toLowerCase();
            const employeeId = getVal(row, 'Employee ID', 'ID');
            const termDateStr = getVal(row, 'Termination Date');

            const reasons: string[] = [];
            let hasFatal = false;
            
            const addProblem = (msg: string, severity: 'fatal' | 'warning') => {
              reasons.push(msg);
              if (severity === 'fatal') hasFatal = true;
            };

            // Termination date warning
            if (termDateStr) {
              try {
                const termDate = new Date(termDateStr);
                if (!isNaN(termDate.getTime())) {
                  const today = new Date();
                  const diffDays = (termDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                  if (diffDays <= 14) {
                    addProblem(`Employee has termination date (${termDateStr}) on or near today — review whether they should be included in the mid-year cycle.`, 'warning');
                  }
                }
              } catch (e) {
                // Ignore parse errors for warning logic
              }
            }

            // Validation
            if (!rawEmail) addProblem('Missing employee email', 'fatal');
            else if (!validateEmail(rawEmail)) addProblem('Invalid employee email format or not @freshworks.com', 'fatal');
            
            if (!managerEmail) addProblem('Missing manager email (Required)', 'fatal');
            else if (!validateEmail(managerEmail)) addProblem('Invalid manager email format or not @freshworks.com', 'fatal');
            
            if (!fullName) addProblem('Employee name is empty', 'fatal');

            if (hasFatal) {
              result.buckets.invalid.push({
                employee: { id: rawEmail || `invalid_${idx}`, employee_email: rawEmail, employee_name: fullName, status: 'Pending' } as Employee,
                bucket: 'invalid',
                reasons,
                originalIndex: idx
              });
              return;
            }

            if (seenEmails.has(rawEmail)) {
              result.buckets.duplicate.push({
                employee: { id: rawEmail, employee_email: rawEmail, employee_name: fullName, status: 'Pending' } as Employee,
                bucket: 'duplicate',
                reasons: ['Duplicate email in sheet'],
                originalIndex: idx
              });
              return;
            }
            seenEmails.add(rawEmail);

            const numDirectReportsStr = getVal(row, 'Number of Direct Reports', 'Reports');
            const numDirectReports = numDirectReportsStr ? Number(numDirectReportsStr) : null;

            const employee: Employee = {
              id: rawEmail,
              employee_email: rawEmail,
              employee_name: fullName,
              first_name: firstName,
              last_name: lastName,
              employee_id: employeeId,
              gender: getVal(row, 'Gender'),
              manager_email: managerEmail,
              manager_name: getVal(row, 'Manager', 'Manager Name'),
              hrbp_email: getVal(row, 'HRBP Email', 'HRBP').toLowerCase(),
              hrbp_name: getVal(row, 'HR Business Partner', 'HRBP Name', 'HRBP'),
              job_title: getVal(row, 'Job Title'),
              job_family: getVal(row, 'Job Family'),
              work_location: getVal(row, 'Work Location'),
              grade: getVal(row, 'Grade'),
              hire_date: getVal(row, 'Hire Date'),
              last_promotion_date: getVal(row, 'Last Promotion Date'),
              tenure_in_freshworks: getVal(row, 'Tenure in Freshworks'),
              tenure_in_position: getVal(row, 'Tenure In Position'),
              tenure_in_job_profile: getVal(row, 'Tenure in Current Job Profile'),
              termination_date: termDateStr,
              num_direct_reports: numDirectReports !== null && !isNaN(numDirectReports) ? numDirectReports : null,
              rating_2024: getVal(row, '2024 FPI Rating'),
              rating_2025: getVal(row, '2025 FPI Rating'),
              management_chain_l6: getVal(row, 'Management Chain - Level 06'),
              management_chain_l7: getVal(row, 'Management Chain - Level 07'),
              management_chain_l8: getVal(row, 'Management Chain - Level 08'),
              management_chain_l9: getVal(row, 'Management Chain - Level 09'),
              management_chain_l10: getVal(row, 'Management Chain - Level 10'),
              status: 'Pending',
              updated_at: new Date().toISOString()
            };

            const existing = existingMap.get(rawEmail);
            if (!existing) {
              result.buckets.new.push({ employee, bucket: 'new', reasons, originalIndex: idx });
            } else {
              const hasFeedback = existing.status !== 'Pending' || 
                                (existing.mid_year_checkin && 
                                 (existing.mid_year_checkin.doing_well || existing.mid_year_checkin.focus_to_grow));
              
              if (hasFeedback) {
                const preserveReasons = [...reasons, 'Review in progress or submitted. Profile fields will be updated, review content preserved.'];
                result.buckets.profile_update_preserve.push({ 
                  employee, 
                  bucket: 'profile_update_preserve', 
                  reasons: preserveReasons,
                  originalIndex: idx 
                });
              } else {
                result.buckets.profile_update_safe.push({ employee, bucket: 'profile_update_safe', reasons, originalIndex: idx });
              }
            }
          });

          setIsImporting(false);
          resolve(result);
        } catch (err) {
          console.error(err);
          showToast('Failed to parse file.', 'error');
          setIsImporting(false);
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const commitImport = async (rows: ImportRow[]) => {
    if (!user) return { success: false, written: 0, failed: 0 };
    
    if (IS_DEMO_MODE) {
      setIsCommitting(true);
      for (let i = 0; i <= rows.length; i += Math.max(1, Math.floor(rows.length / 5))) {
        setCommitProgress({ current: i, total: rows.length });
        await new Promise(r => setTimeout(r, 200));
      }
      showToast(`Demo Mode — Simulated import of ${rows.length} records (not persisted)`, 'success');
      setIsCommitting(false);
      return { success: true, written: rows.length, failed: 0 };
    }

    setIsCommitting(true);
    setCommitProgress({ current: 0, total: rows.length });
    let written = 0;
    let failed = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 100;
    
    try {
      // 1. Optional Backup before write (Simplified: we'll skip for now but add audit log)
      
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        setCommitProgress({ current: i, total: rows.length });
        const batch = writeBatch(db);
        const chunk = rows.slice(i, i + BATCH_SIZE);

        chunk.forEach(row => {
          const docRef = doc(db, 'employees', row.employee.id);
          
          if (row.bucket === 'new') {
            batch.set(docRef, row.employee);
          } else {
            // profile_update_safe or profile_update_preserve
            // We MUST NOT overwrite status or mid_year_checkin
            const profileData: any = { ...row.employee };
            delete profileData.status;
            delete profileData.mid_year_checkin;
            delete profileData.id;
            
            batch.set(docRef, profileData, { merge: true });
          }
        });

        try {
          await batch.commit();
          written += chunk.length;
        } catch (err) {
          failed += chunk.length;
          errors.push(`Batch ${i/BATCH_SIZE + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 2. Audit Log - Separated try/catch
      try {
        await addDoc(collection(db, 'import_audit'), {
          admin_email: user.email,
          timestamp: serverTimestamp(),
          counts: {
            total: rows.length,
            written,
            failed
          },
          errors
        });
      } catch (auditErr) {
        console.error('Audit log failed:', auditErr);
        showToast('Import completed but audit log failed to sync.', 'info');
      }

      showToast(`Import complete. ${written} records processed.`, written > 0 ? 'success' : 'error');
      return { success: true, written, failed, errors };
    } catch (err) {
      console.error(err);
      showToast('Critical error during commit.', 'error');
      return { success: false, written, failed, errors: [...errors, String(err)] };
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadReport = (data: Employee[], filename: string) => {
    const formatDateStr = (isoString?: string) => {
      if (!isoString) return '';
      try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }).format(date);
      } catch (e) {
        return '';
      }
    };

    const exportData = data.map(emp => {
      let status: string = emp.status || 'Pending';
      if (emp.acknowledged_at) {
        status = `${status} (Acknowledged)`;
      }

      return {
        'Employee ID': emp.employee_id || '',
        'Name': emp.employee_name,
        'Email': emp.employee_email,
        'Job Title': emp.job_title || '',
        'Grade': emp.grade || '',
        'Job Family': emp.job_family || '',
        'Work Location': emp.work_location || '',
        'Manager': emp.manager_name || '',
        'Manager Email': emp.manager_email,
        'HR Business Partner': emp.hrbp_name || '',
        'HRBP Email': emp.hrbp_email || '',
        'Status': status,
        'Current Rating (Mid-Year)': emp.mid_year_checkin?.performance_trending_rating || '',
        'Doing Well': emp.mid_year_checkin?.doing_well || '',
        'Growth Focus': emp.mid_year_checkin?.focus_to_grow || '',
        '2024 Rating': emp.rating_2024 || '',
        '2025 Rating': emp.rating_2025 || '',
        'Submitted At': formatDateStr(emp.mid_year_checkin?.submitted_at),
        'Acknowledgement Date': formatDateStr(emp.acknowledged_at)
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return { 
    isImporting, 
    isCommitting, 
    commitProgress, 
    parseFile, 
    commitImport, 
    handleDownloadReport 
  };
};
