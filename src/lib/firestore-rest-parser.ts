import { parse } from 'path';

export function parseFirestoreDocument(doc: any) {
  if (!doc || !doc.fields) return null;
  const result: any = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

export function parseFirestoreValue(val: any): any {
  if (!val) return val;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.mapValue !== undefined) return parseFirestoreDocument(val.mapValue);
  if (val.arrayValue !== undefined) return (val.arrayValue.values || []).map(parseFirestoreValue);
  return val;
}
