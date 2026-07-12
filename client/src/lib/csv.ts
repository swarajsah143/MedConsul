/**
 * RFC-4180 CSV output.
 *
 * The three student-facing exports each hand-rolled this and each got it wrong the
 * same way: they wrapped every field in quotes but never escaped a quote INSIDE the
 * value. A college named `St. John's "Deemed" Campus` came out as
 *
 *     "St. John's "Deemed" Campus"
 *
 * which terminates the field early and shifts every column after it — a silently
 * corrupted file that still opens in Excel, so nobody notices until the numbers are
 * against the wrong college.
 */

/** Quote a value only when it needs it, and double any embedded quotes. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a full CSV document from a header row and data rows. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  // CRLF + a BOM: Excel mangles UTF-8 without it (₹ and college names in Indic scripts).
  return '﻿' + lines.join('\r\n');
}

/** Trigger a browser download, revoking the object URL afterwards. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
