import * as XLSX from 'xlsx';

export interface ParsedSheet {
  name: string;
  rows: Record<string, unknown>[];
  hasMatchingHeaders: boolean;
}

export interface XlsxParseResult {
  sheets: ParsedSheet[];
}

const VALID_HEADERS = [
  'email',
  'employeename',
  'emailprimarywork',
  'employeeemail',
  'manageremail',
  'manager',
];

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const workbook = XLSX.read(e.data, { type: 'array' });
    const sheets: ParsedSheet[] = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      let hasMatchingHeaders = false;
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        hasMatchingHeaders = headers.some(h => VALID_HEADERS.includes(h));
      }
      return { name, rows, hasMatchingHeaders };
    });
    const result: XlsxParseResult = { sheets };
    (self as unknown as Worker).postMessage({ ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
