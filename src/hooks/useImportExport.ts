import React, { useState } from 'react';
import { 
  doc, 
  writeBatch, 
  getDocs, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  addDoc,
  documentId
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, ImportResult, ImportRow, ImportBucket, EmployeeGoal } from '../types';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import XlsxParserWorker from '../workers/xlsx-parser.worker?worker';
import type { XlsxParseResult } from '../workers/xlsx-parser.worker';

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

  const parseAndCleanDate = (rawVal: string): string => {
    if (!rawVal) return '';
    const num = Number(rawVal);
    if (!isNaN(num) && num > 10000 && num < 80000) {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(jsDate.getTime())) {
        const day = String(jsDate.getDate()).padStart(2, '0');
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const year = jsDate.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    return rawVal;
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

          // Parse xlsx off the main thread so the UI doesn't freeze on big files.
          const parsed = await new Promise<XlsxParseResult>((resolveWorker, rejectWorker) => {
            const worker = new XlsxParserWorker();
            type ParseMessage =
              | { ok: true; result: XlsxParseResult }
              | { ok: false; error: string };
            worker.onmessage = (msg: MessageEvent<ParseMessage>) => {
              worker.terminate();
              const data = msg.data;
              if (data.ok === true) resolveWorker(data.result);
              else rejectWorker(new Error(data.error));
            };
            worker.onerror = (err) => {
              worker.terminate();
              rejectWorker(err);
            };
            worker.postMessage(arrayBuffer, [arrayBuffer]);
          });

          let allRows: Record<string, unknown>[] = [];
          const warnings: string[] = [];
          parsed.sheets.forEach(sheet => {
            if (sheet.rows.length === 0) return;
            if (sheet.hasMatchingHeaders) {
              allRows = allRows.concat(sheet.rows);
            } else {
              warnings.push(`Skipped sheet "${sheet.name}": No matching headers found.`);
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
              const q = query(collection(db, 'employees'), where(documentId(), 'in', chunk));
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
            const termDateStr = parseAndCleanDate(getVal(row, 'Termination Date'));

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
              hire_date: parseAndCleanDate(getVal(row, 'Hire Date')),
              last_promotion_date: parseAndCleanDate(getVal(row, 'Last Promotion Date')),
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
                                 (existing.mid_year_checkin.key_contributions || existing.mid_year_checkin.development_evolution));
              
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

    setIsCommitting(true);
    setCommitProgress({ current: 0, total: rows.length });
    let written = 0;
    let failed = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 100;
    const CONCURRENCY = 5;

    // Throttle progress updates so we don't trigger a re-render per batch.
    let lastProgressEmit = 0;
    const reportProgress = (current: number, force = false) => {
      const now = Date.now();
      if (force || now - lastProgressEmit > 200) {
        lastProgressEmit = now;
        setCommitProgress({ current, total: rows.length });
      }
    };

    try {
      const batches: ImportRow[][] = [];
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        batches.push(rows.slice(i, i + BATCH_SIZE));
      }

      const commitBatch = async (chunk: ImportRow[], batchIndex: number) => {
        const batch = writeBatch(db);
        chunk.forEach(row => {
          const docRef = doc(db, 'employees', row.employee.id);
          if (row.bucket === 'new') {
            batch.set(docRef, row.employee);
          } else {
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
          errors.push(`Batch ${batchIndex + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          reportProgress(written + failed);
        }
      };

      // Run batches with a small concurrency cap so big imports don't take
      // forever waiting one-at-a-time, but we don't blast Firestore either.
      let next = 0;
      const runWorker = async () => {
        while (next < batches.length) {
          const i = next++;
          await commitBatch(batches[i], i);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, runWorker));
      reportProgress(rows.length, true);

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

  const parseToISOString = (rawVal: any): string => {
    if (!rawVal) return '';
    if (rawVal instanceof Date) {
      try {
        return rawVal.toISOString();
      } catch {
        return '';
      }
    }
    const valStr = String(rawVal).trim();
    if (!valStr) return '';
    
    // Check if it is an excel serial number
    const num = Number(valStr);
    if (!isNaN(num) && num > 10000 && num < 80000) {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString();
      }
    }

    // Try parsing as DD/MM/YYYY or D/M/YYYY
    const ddmmyyyyMatch = valStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      const jsDate = new Date(year, month, day);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString();
      }
    }

    // Try parsing standard JS Date
    const parsedDate = new Date(valStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }

    return '';
  };

  const parseGoalsFile = async (file: File): Promise<Record<string, unknown>[] | null> => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit.', 'error');
      return null;
    }

    setIsImporting(true);
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        showToast('No sheets found in workbook.', 'error');
        setIsImporting(false);
        return null;
      }

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      if (rows.length === 0) {
        showToast('No rows found in sheet.', 'error');
        setIsImporting(false);
        return null;
      }

      setIsImporting(false);
      return rows;
    } catch (err: any) {
      console.error('Error parsing goals file:', err);
      showToast('Error parsing goals file: ' + err.message, 'error');
      setIsImporting(false);
      return null;
    }
  };

  const commitGoalsImport = async (rawRows: Record<string, unknown>[]) => {
    if (!user) return { updated: 0, skipped: 0, warnings: [] as string[] };

    setIsCommitting(true);
    let updated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    try {
      // 1. Group rows by Email - Work
      const goalsByEmail = new Map<string, any[]>();
      
      rawRows.forEach((row) => {
        const rawEmail = getVal(row, 'Email - Work', 'Email Work', 'Email', 'Employee Email').trim().toLowerCase();
        if (!rawEmail) {
          // Skip silently
          return;
        }

        const category = getVal(row, 'Goals_group: Goal Category', 'Goal Category', 'Category');
        const description = getVal(row, 'Goals_group: Goal Description', 'Goal Description', 'Description');
        const status = getVal(row, 'Goals_group: Status', 'Goal Status', 'Status') || 'Not Started';
        const name = getVal(row, 'Goals_group: Goal Name', 'Goal Name', 'Name');
        const dueDateRaw = getVal(row, 'Goals_group: Due Date', 'Due Date');
        const weightRaw = getVal(row, 'Formula1', 'Weight');

        const computedDueDate = parseToISOString(dueDateRaw);

        let computedWeight: number | undefined = undefined;
        if (weightRaw) {
          const numWeight = parseFloat(weightRaw);
          if (!isNaN(numWeight)) {
            computedWeight = numWeight;
          }
        }

        const goalObj = {
          goal_name: name || 'Untitled Goal',
          goal_category: category || 'General Objective',
          goal_description: description || '',
          status: status,
          due_date: computedDueDate,
          weight: computedWeight
        };

        if (!goalsByEmail.has(rawEmail)) {
          goalsByEmail.set(rawEmail, []);
        }
        goalsByEmail.get(rawEmail)!.push(goalObj);
      });

      if (goalsByEmail.size === 0) {
        showToast('No valid goals grouped by email.', 'error');
        setIsCommitting(false);
        return { updated: 0, skipped: 0, warnings };
      }

      // Check which emails exist in Firestore
      const emailsList = Array.from(goalsByEmail.keys());
      const existingMap = new Map<string, boolean>();

      if (emailsList.length > 0) {
        const CHUNK_SIZE = 30;
        const promises = [];
        for (let i = 0; i < emailsList.length; i += CHUNK_SIZE) {
          const chunk = emailsList.slice(i, i + CHUNK_SIZE);
          const q = query(collection(db, 'employees'), where(documentId(), 'in', chunk));
          promises.push(getDocs(q));
        }
        const queryResults = await Promise.all(promises);
        queryResults.forEach(snapshot => {
          snapshot.docs.forEach(docSnap => {
            const email = docSnap.id.toLowerCase();
            existingMap.set(email, true);
          });
        });
      }

      const updateTargets: { email: string; goals: any[] }[] = [];
      const BATCH_SIZE = 100;

      goalsByEmail.forEach((goals, email) => {
        if (existingMap.has(email)) {
          updateTargets.push({ email, goals });
        } else {
          skipped++;
          warnings.push(`Goal skipped — employee not found: ${email}`);
        }
      });

      setCommitProgress({ current: 0, total: updateTargets.length });

      for (let i = 0; i < updateTargets.length; i += BATCH_SIZE) {
        const chunk = updateTargets.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(target => {
          const docRef = doc(db, 'employees', target.email);
          batch.set(docRef, { goals: target.goals }, { merge: true });
        });

        await batch.commit();
        updated += chunk.length;
        setCommitProgress({ current: updated, total: updateTargets.length });
      }

      // Write audit log entry
      try {
        await addDoc(collection(db, 'import_audit'), {
          type: 'goals',
          admin_email: user.email,
          timestamp: serverTimestamp(),
          counts: {
            total: rawRows.length,
            updated,
            skipped
          },
          warnings
        });
      } catch (auditErr) {
        console.error('Audit log failed for goals import:', auditErr);
      }

      showToast(`Import complete. Updated goals for ${updated} employees.`, updated > 0 ? 'success' : 'error');
      return { updated, skipped, warnings };
    } catch (err: any) {
      console.error('Error during goals commit:', err);
      showToast('Critical error during goals import: ' + err.message, 'error');
      return { updated, skipped, warnings: [...warnings, err.message] };
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadReport = async (data: Employee[], filename: string) => {
    try {
      const XLSX = await import('xlsx');
      await writeReport(XLSX, data, filename);
    } catch (err) {
      console.error('Report download failed:', err);
      showToast('Failed to generate report.', 'error');
    }
  };

  const writeReport = async (XLSX: typeof import('xlsx'), data: Employee[], filename: string) => {
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
        'Promotion Readiness': emp.mid_year_checkin?.promotion_readiness || '',
        'Calibration Notes': emp.mid_year_checkin?.additional_notes || '',
        'Key Contributions': emp.mid_year_checkin?.key_contributions || '',
        'Development & Evolution': emp.mid_year_checkin?.development_evolution || '',
        'Leadership Mastery': emp.mid_year_checkin?.leadership_mastery || '',
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
    parseGoalsFile,
    commitGoalsImport,
    handleDownloadReport 
  };
};
