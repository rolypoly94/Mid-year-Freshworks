import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | number | Date | null | undefined) => {
  if (date === undefined || date === null || date === '') return 'N/A';
  
  if (typeof date === 'number' || (!isNaN(Number(date)) && String(date).includes('.') && Number(date) > 30000)) {
    const numDate = Number(date);
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + numDate * 86400000);
    if (!isNaN(jsDate.getTime())) {
      const day = String(jsDate.getDate()).padStart(2, '0');
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const year = jsDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return String(date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(date);
  }
};
