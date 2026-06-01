import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDateString(dateStr: string | number | Date | null | undefined): Date | null {
  if (dateStr === undefined || dateStr === null || dateStr === '') return null;
  
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }

  const num = Number(dateStr);
  if (!isNaN(num) && num > 10000 && num < 80000) {
    const excelEpoch = new Date(1899, 11, 30);
    const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
    return isNaN(targetDate.getTime()) ? null : targetDate;
  }

  const str = String(dateStr).trim();
  
  // 1. Check for standard YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})([ T]|$)/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check for DD/MM/YYYY or DD-MM-YYYY (or D/M/YYYY etc.)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const part1 = parseInt(dmyMatch[1], 10);
    const part2 = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    // Since Indian/European formats always prefer DD/MM/YYYY:
    // If part2 is > 12 and part1 is <= 12, it is definitely MM/DD/YYYY
    if (part2 > 12 && part1 <= 12) {
      const d = new Date(year, part1 - 1, part2);
      if (!isNaN(d.getTime())) return d;
    } else {
      // Otherwise default to DD/MM/YYYY
      const d = new Date(year, part2 - 1, part1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Fallback to standard javascript new Date
  const fallbackDate = new Date(str);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

export const formatDate = (date: string | number | Date | null | undefined) => {
  if (date === undefined || date === null || date === '') return 'N/A';
  
  const parsed = parseDateString(date);
  if (!parsed) return String(date);

  try {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(date);
  }
};
