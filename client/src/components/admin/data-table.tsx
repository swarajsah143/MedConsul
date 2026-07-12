import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi, type CollectionSchema, type Field, type ListResult, type Reference } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

/**
 * Schema-driven admin table. Everything (columns, filters, search, sort) is
 * derived from the CollectionSchema — no collection is hardcoded.
 *
 * Pagination/filtering/sorting/search all happen SERVER-side: we only ever hold
 * one page in memory. The single exception is CSV export, which walks the pages
 * of the *current filter set* explicitly (the server caps `limit` at 500, so a
 * "just ask for 100000" export would silently truncate).
 */

const PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 500; // server hard-caps limit at 500
const EXPORT_MAX_ROWS = 20000;

type RefLabels = Record<string, Record<string, string>>;

/* ------------------------------------------------------------------ CSV out */

/**
 * RFC-4180 quoting: a value is wrapped in double quotes if it contains a comma,
 * a double quote, CR or LF; internal double quotes are doubled.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (Array.isArray(value)) {
    s = value.every((v) => v === null || typeof v !== 'object')
      ? value.map((v) => String(v ?? '')).join('|')   // string[] / enum[]
      : JSON.stringify(value);                         // object[]
  } else if (typeof value === 'object') {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialises rows to CSV using the schema's field order. Exported for reuse. */
export function toCsv(rows: Record<string, any>[], fields: Field[]): string {
  const header = fields.map((f) => csvCell(f.name)).join(',');
  const body = rows.map((row) => fields.map((f) => csvCell(row[f.name])).join(','));
  return [header, ...body].join('\r\n');
}

function downloadCsv(filename: string, csv: string) {
  // BOM so Excel reads UTF-8 college names correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------- cell render */

function truncate(s: string, max = 48) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function renderCell(field: Field, value: unknown, refLabels: RefLabels): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 dark:text-slate-600">—</span>;
  }

  switch (field.type) {
    case 'ref': {
      const id = String(value);
      const label = (field.ref && refLabels[field.ref]?.[id]) || undefined;
      return label ? (
        <span className="font-medium text-slate-800 dark:text-slate-100">{truncate(label, 40)}</span>
      ) : (
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400" title={id}>
          {id}
        </span>
      );
    }
    case 'boolean':
      return (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
            value
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {value ? 'Yes' : 'No'}
        </span>
      );
    case 'string[]':
    case 'enum[]': {
      const arr = Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
      if (!arr.length) return <span className="text-slate-400 dark:text-slate-600">—</span>;
      const joined = arr.join(', ');
      return (
        <span title={joined} className="text-slate-600 dark:text-slate-300">
          {truncate(joined, 40)}
          {arr.length > 1 && (
            <span className="ml-1.5 text-[10px] text-slate-400">({arr.length})</span>
          )}
        </span>
      );
    }
    case 'object[]': {
      const n = Array.isArray(value) ? value.length : 0;
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {n} {n === 1 ? 'item' : 'items'}
        </span>
      );
    }
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-red-600 dark:text-red-400 hover:underline"
        >
          {truncate(String(value), 32)}
        </a>
      );
    case 'number':
      return (
        <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-100">
          {/* A year is a number but not a quantity — grouping made 2025 render as "2,025". */}
          {field.plain ? String(value) : Number(value).toLocaleString()}
        </span>
      );
    default:
      return (
        <span title={String(value)} className="text-slate-700 dark:text-slate-300">
          {truncate(String(value))}
        </span>
      );
  }
}

/* ------------------------------------------------------------------ filters */

const SELECT_CLASS =
  'h-9 w-auto min-w-[9rem] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer';

function FilterControl({
  field,
  value,
  refLabels,
  onChange,
}: {
  field: Field;
  value: string;
  refLabels: RefLabels;
  onChange: (v: string) => void;
}) {
  if (field.type === 'enum' || field.type === 'enum[]') {
    return (
      <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {field.label.toLowerCase()}</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {field.label.toLowerCase()}</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (field.type === 'ref') {
    const options = Object.entries((field.ref && refLabels[field.ref]) || {}).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
    return (
      <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {field.label.toLowerCase()}</option>
        {options.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-auto min-w-[9rem] text-xs"
    />
  );
}

/* -------------------------------------------------------------------- table */

export function DataTable(props: {
  schema: CollectionSchema;
  refLabels?: Record<string, Record<string, string>>;
  onEdit: (item: any) => void;
  onCreate: () => void;
  onImport: () => void;
  reloadKey?: number;
}) {
  const { schema, onEdit, onCreate, onImport, reloadKey = 0 } = props;
  const refLabels = props.refLabels || {};

  const columns = useMemo(() => schema.fields.filter((f) => f.inList), [schema]);
  const filterFields = useMemo(() => schema.fields.filter((f) => f.filterable), [schema]);
  const hasSearch = useMemo(() => schema.fields.some((f) => f.searchable), [schema]);
  // A `ref` column DISPLAYS the joined label (e.g. the college name) but the server
  // can only sort by the stored value — the raw ObjectId — so a "sort" on it looks
  // random to the user. Offer no sort affordance rather than a lying one.
  const sortable = useCallback(
    (f: Field) =>
      f.type !== 'string[]' && f.type !== 'enum[]' && f.type !== 'object[]' && f.type !== 'ref',
    []
  );

  const [result, setResult] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Set when the server refuses a delete because other rows reference the record. */
  const [blocked, setBlocked] = useState<{ id: string; refs: Reference[] } | null>(null);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(schema.defaultSort || '');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0); // local refetch trigger

  // Collection switched -> reset every view-state knob.
  useEffect(() => {
    setPage(1);
    setSort(schema.defaultSort || '');
    setQ('');
    setQInput('');
    setFilters({});
    setConfirmId(null);
  }, [schema.name, schema.defaultSort]);

  // Debounce the search box so a fast typist doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput === q) return;
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, q]);

  const query = useMemo(
    () => ({ page, limit: PAGE_SIZE, sort: sort || undefined, q: q || undefined, ...filters }),
    [page, sort, q, filters]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .list(schema.name, query)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setResult(null);
        setError(e?.message || 'Failed to load records');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schema.name, query, reloadKey, tick]);

  const refetch = () => setTick((t) => t + 1);

  const handleSort = (field: Field) => {
    if (!sortable(field)) return;
    setSort((cur) => (cur === field.name ? `-${field.name}` : field.name));
    setPage(1);
  };

  const setFilter = (name: string, value: string) => {
    setFilters((cur) => {
      const next = { ...cur };
      if (value === '') delete next[name];
      else next[name] = value;
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setQ('');
    setQInput('');
    setPage(1);
  };

  const handleDelete = async (id: string, cascade = false) => {
    setDeletingId(id);
    setError(null);
    setBlocked(null);
    try {
      await adminApi.remove(schema.name, id, cascade);
      setConfirmId(null);
      // Deleting the last row of the last page would strand us on an empty page.
      if (result && result.items.length === 1 && page > 1) setPage(page - 1);
      else refetch();
    } catch (e: any) {
      // The server refuses to orphan rows: it 409s with the referencing counts.
      // Turn that into something an admin can act on, rather than telling them to
      // "re-send with ?cascade=true", which means nothing to whoever runs this.
      if (e?.status === 409 && Array.isArray(e?.references)) {
        setBlocked({ id, refs: e.references });
      } else {
        setError(e?.message || 'Delete failed');
      }
    } finally {
      setDeletingId(null);
    }
  };

  /** Exports the CURRENT filtered/searched/sorted set, not just this page. */
  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const rows: any[] = [];
      let p = 1;
      let pages = 1;
      do {
        const res: ListResult = await adminApi.list(schema.name, {
          ...filters,
          q: q || undefined,
          sort: sort || undefined,
          page: p,
          limit: EXPORT_PAGE_SIZE,
        });
        rows.push(...res.items);
        pages = res.pages;
        p += 1;
      } while (p <= pages && rows.length < EXPORT_MAX_ROWS);

      downloadCsv(`${schema.name}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, schema.fields));
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const pages = result?.pages ?? 1;
  const activeFilters = Object.keys(filters).length + (q ? 1 : 0);

  const sortIndicator = (field: Field) => {
    const active = sort === field.name || sort === `-${field.name}`;
    return (
      <ArrowUpDown
        className={`w-3 h-3 transition-colors duration-200 ${active ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{schema.labelPlural}</h2>
          {schema.description && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">{schema.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || total === 0}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onImport}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={onCreate}>
            <Plus className="w-4 h-4" />
            Add {schema.label.toLowerCase()}
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      {(hasSearch || filterFields.length > 0) && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            {hasSearch && (
              <div className="relative flex-1 min-w-[14rem]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder={`Search ${schema.labelPlural.toLowerCase()}…`}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            )}
            {filterFields.map((f) => (
              <FilterControl
                key={f.name}
                field={f}
                value={filters[f.name] ?? ''}
                refLabels={refLabels}
                onChange={(v) => setFilter(f.name, v)}
              />
            ))}
            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline px-1"
              >
                <X className="w-3 h-3" />
                Clear ({activeFilters})
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* A blocked delete is a decision, not an error: say what depends on the record
          and let the admin choose. The old message told them to "re-send with
          ?cascade=true", which is an API detail, not something a person can act on. */}
      {blocked && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                This {schema.label.toLowerCase()} is still in use, so it wasn't deleted.
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {blocked.refs.map((r) => (
                  <li key={r.collection} className="text-xs text-amber-700 dark:text-amber-400">
                    • {r.count.toLocaleString()} {r.label.toLowerCase()} reference it
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                Deleting it would leave those rows pointing at nothing.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletingId === blocked.id}
                  onClick={() => handleDelete(blocked.id, true)}
                >
                  {deletingId === blocked.id
                    ? 'Deleting…'
                    : `Delete it and the ${blocked.refs.reduce((n, r) => n + r.count, 0).toLocaleString()} linked row${
                        blocked.refs.reduce((n, r) => n + r.count, 0) === 1 ? '' : 's'
                      }`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setBlocked(null); setConfirmId(null); }}>
                  Keep it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
              <tr>
                {columns.map((f) => (
                  <th
                    key={f.name}
                    onClick={() => handleSort(f)}
                    className={`px-4 py-3.5 whitespace-nowrap select-none ${
                      sortable(f)
                        ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150'
                        : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {f.label}
                      {sortable(f) && sortIndicator(f)}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-14 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-red-600 dark:text-red-400 mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Loading {schema.labelPlural.toLowerCase()}…</p>
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-14 text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No {schema.labelPlural.toLowerCase()} found
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeFilters > 0
                        ? 'No rows match the current filters.'
                        : `Add your first ${schema.label.toLowerCase()} or import a CSV.`}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {activeFilters > 0 ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={onCreate}>
                            <Plus className="w-4 h-4" />
                            Add {schema.label.toLowerCase()}
                          </Button>
                          <Button variant="outline" size="sm" onClick={onImport}>
                            <Upload className="w-4 h-4" />
                            Import CSV
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item: any) => {
                  const id = String(item.id);
                  const confirming = confirmId === id;
                  return (
                    <tr
                      key={id}
                      className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors duration-200"
                    >
                      {columns.map((f) => (
                        <td key={f.name} className="px-4 py-3 align-middle max-w-[16rem]">
                          {renderCell(f, item[f.name], refLabels)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {confirming ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                              Delete?
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === id}
                              onClick={() => handleDelete(id)}
                            >
                              {deletingId === id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Yes, delete'
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === id}
                              onClick={() => setConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setConfirmId(id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
          <span className="text-xs text-muted-foreground font-medium">
            Page <span className="font-bold text-slate-700 dark:text-slate-300">{result?.page ?? page}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300">{pages}</span>{' '}
            <span className="text-slate-400 dark:text-slate-600">({total.toLocaleString()} total)</span>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
