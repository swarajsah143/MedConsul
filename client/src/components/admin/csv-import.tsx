import { useMemo, useState, type ReactNode } from 'react';
import { adminApi, ValidationError, type CollectionSchema, type Field } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  X,
} from 'lucide-react';

/**
 * CSV importer for any admin collection.
 *
 * The parser is hand-written on purpose (no papaparse): it is a small state
 * machine, and the three things everyone gets wrong — commas inside quoted
 * fields, "" as an escaped quote, and CRLF line endings — are exactly the three
 * things a real-world college-name CSV contains.
 */

/* ------------------------------------------------------------------- parser */

/**
 * RFC-4180 CSV parser.
 *
 * - A field wrapped in double quotes may contain commas, CR, LF and doubled
 *   quotes ("" -> a literal ").
 * - Row separators: \r\n, \n and a bare \r are all accepted, but only OUTSIDE
 *   quotes; inside quotes they are literal characters of the value.
 * - A trailing newline does not produce a phantom empty row.
 */
export function parseCsv(text: string): string[][] {
  // Strip a UTF-8 BOM — Excel writes one and it would corrupt the first header.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'; // escaped quote
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c; // commas / CR / LF inside quotes are literal
      i += 1;
      continue;
    }

    if (c === '"' && field === '') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      endField();
      i += 1;
      continue;
    }
    if (c === '\r') {
      // CRLF or lone CR both terminate the row.
      endRow();
      i += src[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (c === '\n') {
      endRow();
      i += 1;
      continue;
    }

    field += c;
    i += 1;
  }

  // Flush the last field/row unless the file ended exactly on a newline.
  if (field !== '' || row.length > 0 || inQuotes) endRow();

  // Drop rows that are entirely empty (e.g. a blank line in the middle).
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/* ------------------------------------------------------------------ mapping */

interface RowError {
  row: number;      // 1-based index into the data rows (matches the server's `row`)
  field: string;
  message: string;
}

interface Parsed {
  rows: Record<string, any>[];
  /** rows[i] came from this 1-based line of the CSV (header included). */
  sourceLines: number[];
  columns: Field[];
  unknownHeaders: string[];
  missingRequired: string[];
  errors: RowError[];
  totalRows: number;
}

function matchField(header: string, fields: Field[]): Field | undefined {
  const h = header.trim().toLowerCase();
  return (
    fields.find((f) => f.name.toLowerCase() === h) ||
    fields.find((f) => f.label.toLowerCase() === h)
  );
}

function buildRows(text: string, schema: CollectionSchema): Parsed {
  const empty: Parsed = {
    rows: [],
    sourceLines: [],
    columns: [],
    unknownHeaders: [],
    missingRequired: [],
    errors: [],
    totalRows: 0,
  };

  const table = parseCsv(text);
  if (!table.length) return empty;

  const header = table[0];
  const mapped = header.map((h) => matchField(h, schema.fields));
  const unknownHeaders = header.filter((h, idx) => !mapped[idx] && h.trim() !== '');
  const columns = mapped.filter((f): f is Field => !!f);

  const missingRequired = schema.fields
    .filter((f) => f.required && !columns.some((c) => c.name === f.name))
    .map((f) => f.label);

  const rows: Record<string, any>[] = [];
  const sourceLines: number[] = [];
  const errors: RowError[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const rowNo = r; // 1-based data-row number, same numbering the server uses
    const out: Record<string, any> = {};

    mapped.forEach((f, idx) => {
      if (!f) return;
      const raw = (cells[idx] ?? '').trim();

      if (f.type === 'string[]' || f.type === 'enum[]') {
        out[f.name] = raw ? raw.split('|').map((s) => s.trim()).filter(Boolean) : [];
        return;
      }

      if (f.type === 'object[]') {
        if (!raw) {
          out[f.name] = [];
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            errors.push({
              row: rowNo,
              field: f.name,
              message: `expected a JSON array (e.g. [{"…":"…"}]), got ${typeof parsed}`,
            });
            return;
          }
          out[f.name] = parsed;
        } catch (e: any) {
          errors.push({
            row: rowNo,
            field: f.name,
            message: `invalid JSON — ${e?.message || 'could not parse'}`,
          });
        }
        return;
      }

      // number / boolean / enum / string / text / url / ref: the server coerces
      // and validates these, so pass the raw string through untouched.
      out[f.name] = raw;
    });

    rows.push(out);
    sourceLines.push(r + 1); // +1: CSV lines are 1-based and line 1 is the header
  }

  return {
    rows,
    sourceLines,
    columns,
    unknownHeaders,
    missingRequired,
    errors,
    totalRows: rows.length,
  };
}

/* ----------------------------------------------------------------- template */

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/* -------------------------------------------------------------------- panel */

export function CsvImport(props: {
  schema: CollectionSchema;
  onDone: (inserted: number) => void;
  onCancel: () => void;
}) {
  const { schema, onDone, onCancel } = props;

  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [importing, setImporting] = useState(false);
  const [serverErrors, setServerErrors] = useState<RowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const parsed = useMemo(() => (text.trim() ? buildRows(text, schema) : null), [text, schema]);

  const labelOf = (name: string) => schema.fields.find((f) => f.name === name)?.label || name;
  const lineOf = (row: number) => parsed?.sourceLines[row - 1];

  const blocked =
    !parsed ||
    parsed.totalRows === 0 ||
    parsed.missingRequired.length > 0 ||
    parsed.errors.length > 0;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setServerErrors([]);
    setMessage(null);
    setText(await file.text());
  };

  const handleTemplate = () => {
    const csv = schema.fields.map((f) => csvCell(f.name)).join(',') + '\r\n';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsed || blocked) return;
    setImporting(true);
    setServerErrors([]);
    setMessage(null);
    try {
      const res = await adminApi.bulk(schema.name, parsed.rows, replace);
      onDone(res.inserted);
    } catch (e: any) {
      if (e instanceof ValidationError) {
        setServerErrors(e.errors as unknown as RowError[]);
        setMessage(e.message || 'Validation failed — nothing was imported.');
      } else {
        setMessage(e?.message || 'Import failed.');
      }
    } finally {
      setImporting(false);
    }
  };

  const previewRows = parsed?.rows.slice(0, 10) ?? [];

  const cellPreview = (f: Field, v: any) => {
    if (v === '' || v === undefined || v === null) return '—';
    if (Array.isArray(v)) {
      if (f.type === 'object[]') return `${v.length} ${v.length === 1 ? 'item' : 'items'}`;
      return v.join(', ') || '—';
    }
    const s = String(v);
    return s.length > 32 ? `${s.slice(0, 31)}…` : s;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-600 dark:text-red-400" />
            Import {schema.labelPlural}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a .csv file or paste CSV below. Headers may use either the field name or its label.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleTemplate}>
            <Download className="w-4 h-4" />
            Template CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close importer">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Input */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:h-9 file:px-4 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:bg-white dark:file:bg-slate-900 file:text-xs file:font-semibold file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-50 dark:hover:file:bg-slate-800 file:cursor-pointer cursor-pointer"
          />
          {fileName && (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[16rem]">
              {fileName}
            </span>
          )}
          {text && (
            <button
              onClick={() => {
                setText('');
                setFileName(null);
                setServerErrors([]);
                setMessage(null);
              }}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
            setServerErrors([]);
            setMessage(null);
          }}
          rows={6}
          spellCheck={false}
          placeholder={`${schema.fields.slice(0, 4).map((f) => f.name).join(',')}\n…paste CSV rows here`}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200"
        />

        <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            List columns (<code className="font-mono">string[]</code>, <code className="font-mono">enum[]</code>)
            are split on <code className="font-mono">|</code>. Object list columns (
            <code className="font-mono">object[]</code>) expect a JSON array in the cell. Quoted fields may contain
            commas, newlines and doubled quotes (<code className="font-mono">""</code>).
          </span>
        </p>
      </Card>

      {/* Parse feedback */}
      {parsed && (
        <div className="space-y-2">
          {parsed.totalRows === 0 && (
            <Callout tone="error" title="No data rows">
              The CSV has a header but no rows underneath it.
            </Callout>
          )}

          {parsed.missingRequired.length > 0 && (
            <Callout tone="error" title="Required columns missing">
              This collection requires {parsed.missingRequired.map((l) => `"${l}"`).join(', ')}. Add{' '}
              {parsed.missingRequired.length === 1 ? 'that column' : 'those columns'} to the header row and try again.
            </Callout>
          )}

          {parsed.unknownHeaders.length > 0 && (
            <Callout tone="warning" title="Unknown columns (they will be ignored)">
              {parsed.unknownHeaders.map((h) => `"${h}"`).join(', ')} {parsed.unknownHeaders.length === 1 ? 'does' : 'do'}{' '}
              not match any field in {schema.label}.
            </Callout>
          )}

          {parsed.errors.length > 0 && (
            <Callout tone="error" title={`${parsed.errors.length} cell error(s) — fix these before importing`}>
              <ul className="mt-1 space-y-0.5">
                {parsed.errors.slice(0, 25).map((e, i) => (
                  <li key={i} className="font-mono text-[11px]">
                    row {e.row} (CSV line {lineOf(e.row) ?? '?'}), column {labelOf(e.field)}: {e.message}
                  </li>
                ))}
                {parsed.errors.length > 25 && (
                  <li className="text-[11px] italic">…and {parsed.errors.length - 25} more.</li>
                )}
              </ul>
            </Callout>
          )}
        </div>
      )}

      {/* Server-side validation errors */}
      {serverErrors.length > 0 && (
        <Callout tone="error" title="The server rejected this import — nothing was imported">
          <ul className="mt-1 space-y-0.5">
            {serverErrors.map((e, i) => (
              <li key={i} className="font-mono text-[11px]">
                row {e.row} (CSV line {lineOf(e.row) ?? '?'}), column {labelOf(e.field)}: {e.message}
              </li>
            ))}
          </ul>
          <p className="text-[11px] mt-2">
            Bulk import is all-or-nothing: a single bad row rejects the whole file, so no partial data was written.
          </p>
        </Callout>
      )}

      {message && serverErrors.length === 0 && (
        <Callout tone="error" title="Import failed">
          {message}
        </Callout>
      )}

      {/* Preview */}
      {parsed && parsed.totalRows > 0 && parsed.columns.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preview</p>
            <p className="text-xs text-muted-foreground">
              showing {previewRows.length} of{' '}
              <span className="font-bold text-slate-700 dark:text-slate-300">{parsed.totalRows.toLocaleString()}</span>{' '}
              row{parsed.totalRows === 1 ? '' : 's'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 w-10">#</th>
                  {parsed.columns.map((f) => (
                    <th key={f.name} className="px-3 py-2.5 whitespace-nowrap">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 text-slate-400 dark:text-slate-600 tabular-nums">{i + 1}</td>
                    {parsed.columns.map((f) => (
                      <td key={f.name} className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {cellPreview(f, row[f.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Replace + actions */}
      <Card className="p-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-red-600 cursor-pointer"
          />
          <span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Replace all existing rows</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Import as a full replacement instead of appending.
            </span>
          </span>
        </label>

        {replace && (
          <Callout tone="warning" title="This deletes everything first">
            Every existing {schema.label.toLowerCase()} record in the <code className="font-mono">{schema.name}</code>{' '}
            collection will be permanently deleted before the {parsed?.totalRows ?? 0} row
            {parsed?.totalRows === 1 ? '' : 's'} below are inserted. This cannot be undone.
          </Callout>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={importing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={blocked || importing}
            variant={replace ? 'destructive' : 'default'}
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {replace ? 'Replace with' : 'Import'} {parsed?.totalRows ?? 0} row
            {parsed?.totalRows === 1 ? '' : 's'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ callout */

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'error' | 'warning' | 'success';
  title: string;
  children?: ReactNode;
}) {
  const styles = {
    error: {
      box: 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20',
      text: 'text-red-700 dark:text-red-400',
      Icon: AlertTriangle,
    },
    warning: {
      box: 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      Icon: AlertTriangle,
    },
    success: {
      box: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      Icon: CheckCircle2,
    },
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${styles.box}`}>
      <styles.Icon className={`w-4 h-4 shrink-0 mt-0.5 ${styles.text}`} />
      <div className={`text-xs ${styles.text} min-w-0`}>
        <p className="font-bold">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed break-words">{children}</div>}
      </div>
    </div>
  );
}
