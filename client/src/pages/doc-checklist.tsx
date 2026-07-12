import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCollection, distinct } from '@/lib/data-api';
import {
  documentsApi,
  formatBytes,
  ACCEPT,
  MAX_FILE_MB,
  type Submission,
  type SubmissionStatus,
} from '@/lib/documents-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  Filter,
  X,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Monitor,
  UserCheck,
  Printer,
  Download,
  Info,
  FileText,
  HardDrive,
  Tag,
  Shield,
  Loader2,
  AlertTriangle,
  Upload,
  Eye,
  Trash2,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';

type ChecklistSection = 'online' | 'physical';

const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Submissions indexed by the checklist document they belong to. */
type SubmissionsByDoc = Record<string, Submission>;

/**
 * `upload` throws `Error`, while `api.ts` throws a plain `{ status, message }`.
 * Both carry a server-authored, user-readable message — surface it either way.
 */
function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}

const STATUS_BADGE: Record<SubmissionStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: {
    label: 'Awaiting review',
    icon: Clock,
    className:
      'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400',
  },
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className:
      'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400',
  },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, icon: Icon, className } = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${className}`}
    >
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

/** Admin-managed checklist document. Only `id` is guaranteed. */
interface ChecklistDoc {
  id: string;
  name?: string;
  section?: ChecklistSection;
  mandatory?: boolean;
  format?: string;
  fileSize?: string;
  notes?: string;
  states?: string[];
  categories?: string[];
  counsellingTypes?: string[];
}

/** Admin-managed state-wise document requirement. */
interface StateDoc {
  id: string;
  state?: string;
  checklistType?: string;
  documents?: string[];
}

const STORAGE_KEY = 'medcounsel-checklist-state';

/**
 * Progress is keyed off document id. Ids are Mongo ObjectIds now, so previously
 * saved ids simply won't match any live document — that's fine, they're ignored.
 */
function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((v): v is string => typeof v === 'string'));
      }
    }
  } catch { /* ignore malformed/stale state */ }
  return new Set();
}

function saveChecked(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore quota / private-mode errors */ }
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="All">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" />
        <circle
          cx="50" cy="50" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={pct === 100 ? '#10b981' : '#dc2626'}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-extrabold ${pct === 100 ? 'text-emerald-600' : 'text-red-600'}`}>{pct}%</span>
        <span className="text-[9px] text-slate-400 font-semibold">{completed}/{total}</span>
      </div>
    </div>
  );
}

function DocCard({
  doc,
  isChecked,
  onToggle,
  submission,
  onSubmissionChange,
}: {
  doc: ChecklistDoc;
  isChecked: boolean;
  onToggle: () => void;
  submission?: Submission;
  onSubmissionChange: (docId: string, submission: Submission | null) => void;
}) {
  const name = doc.name ?? 'Untitled document';
  const categories = doc.categories ?? [];
  const counsellingTypes = doc.counsellingTypes ?? [];
  const states = doc.states ?? [];

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs handed out by `downloadFile` outlive the click that created them —
  // the new tab needs the blob to still exist while it loads. We revoke on a timer
  // and, failing that, when the row unmounts, so nothing leaks.
  const revokersRef = useRef<(() => void)[]>([]);
  useEffect(
    () => () => {
      for (const revoke of revokersRef.current) revoke();
      revokersRef.current = [];
    },
    []
  );

  const status = submission?.status;
  const busy = uploading || removing;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the SAME file again still fires `change`
    // (needed after a rejected upload — the fix is often a re-export of the same name).
    e.target.value = '';
    if (!file) return;

    setRowError(null);

    // Pre-check locally so a 50MB file isn't pushed over the wire just to be refused.
    if (file.size > MAX_FILE_BYTES) {
      setRowError(`File is too large. Maximum ${MAX_FILE_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const next = await documentsApi.upload(doc.id, file);
      onSubmissionChange(doc.id, next);
      setConfirmingRemove(false);
    } catch (err) {
      setRowError(errorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleView = async () => {
    if (!submission) return;
    setRowError(null);
    setViewing(true);
    try {
      const { url, revoke } = await documentsApi.downloadFile(submission.id);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) {
        revoke();
        setRowError('Your browser blocked the popup. Allow popups for this site to view the file.');
        return;
      }
      const timer = window.setTimeout(revoke, 60_000);
      revokersRef.current.push(() => {
        window.clearTimeout(timer);
        revoke();
      });
    } catch (err) {
      setRowError(errorMessage(err, 'Could not open the file.'));
    } finally {
      setViewing(false);
    }
  };

  const handleRemove = async () => {
    if (!submission) return;
    setRowError(null);
    setRemoving(true);
    try {
      await documentsApi.remove(submission.id);
      onSubmissionChange(doc.id, null);
      setConfirmingRemove(false);
    } catch (err) {
      setRowError(errorMessage(err, 'Could not remove the file.'));
    } finally {
      setRemoving(false);
    }
  };

  const tone =
    status === 'verified'
      ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'
      : status === 'rejected'
        ? 'bg-red-50/40 border-red-200 dark:bg-red-950/10 dark:border-red-900/30'
        : isChecked
          ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-300 hover:shadow-md dark:hover:border-red-800';

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${tone}`}>
      <div className="flex gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors mt-0.5 ${
            isChecked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-red-500'
          }`}
          aria-label={isChecked ? `Unmark ${name}` : `Mark ${name} as done`}
        >
          {isChecked && <Check className="w-4 h-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title Row */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-sm font-bold leading-snug ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
              {name}
            </h4>
            {status && <StatusBadge status={status} />}
            {doc.mandatory ? (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-bold uppercase tracking-wider dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400">
                Mandatory
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold uppercase tracking-wider dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400">
                Optional
              </span>
            )}
          </div>

          {/* Notes */}
          {doc.notes && (
            <div className={`flex gap-2 items-start text-xs p-2.5 rounded-lg ${
              isChecked
                ? 'bg-emerald-50/60 text-emerald-700/60 dark:bg-emerald-900/10 dark:text-emerald-400/50'
                : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
            }`}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{doc.notes}</span>
            </div>
          )}

          {/* Meta Tags */}
          <div className="flex flex-wrap gap-2">
            {doc.format && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-semibold">
                <FileText className="w-3 h-3" /> {doc.format}
              </span>
            )}
            {doc.fileSize && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 rounded text-[10px] font-semibold">
                <HardDrive className="w-3 h-3" /> {doc.fileSize}
              </span>
            )}
            {categories.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded text-[10px] font-semibold">
                <Tag className="w-3 h-3" /> {categories.join(', ')}
              </span>
            )}
            {counsellingTypes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded text-[10px] font-semibold">
                <Shield className="w-3 h-3" /> {counsellingTypes.join(', ')}
              </span>
            )}
            {states.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded text-[10px] font-semibold">
                {states.join(', ')}
              </span>
            )}
          </div>

          {/* Rejection remarks — the only channel telling the student what to fix. */}
          {status === 'rejected' && (
            <div className="flex gap-2 items-start text-xs p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">Rejected by the verification team</p>
                <p className="leading-relaxed mt-0.5">
                  {submission?.remarks?.trim()
                    ? submission.remarks
                    : 'No reason was given. Please re-upload a clear, complete copy.'}
                </p>
              </div>
            </div>
          )}

          {/* Upload / file actions */}
          <div className="pt-1 space-y-2 print:hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileSelect}
              disabled={busy}
              aria-label={`Upload file for ${name}`}
            />

            {submission ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 min-w-0 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-semibold max-w-[220px]">{submission.originalName}</span>
                  <span className="text-slate-400 shrink-0">{formatBytes(submission.size)}</span>
                </span>

                <Button variant="outline" size="sm" onClick={handleView} disabled={viewing || busy}>
                  {viewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  View
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : status === 'rejected' ? (
                    <RefreshCw className="w-3.5 h-3.5" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {uploading ? 'Uploading...' : status === 'rejected' ? 'Re-upload' : 'Replace'}
                </Button>

                {confirmingRemove ? (
                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
                    <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Remove this file?</span>
                    <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing}>
                      {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {removing ? 'Removing...' : 'Yes, remove'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(false)} disabled={removing}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(true)} disabled={busy}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <span className="text-[10px] text-slate-400">PDF, JPG, PNG or WEBP · up to {MAX_FILE_MB}MB</span>
              </div>
            )}

            {rowError && (
              <p role="alert" className="flex gap-1.5 items-start text-[11px] font-semibold text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>{rowError}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocChecklistPage() {
  const docsQuery = useCollection<ChecklistDoc>('checklistDocs');
  const stateDocsQuery = useCollection<StateDoc>('stateDocs');

  const loading = docsQuery.loading || stateDocsQuery.loading;
  const error = docsQuery.error ?? stateDocsQuery.error;
  const reload = useCallback(() => {
    docsQuery.reload();
    stateDocsQuery.reload();
  }, [docsQuery, stateDocsQuery]);

  const [checked, setChecked] = useState<Set<string>>(loadChecked);
  const [submissions, setSubmissions] = useState<SubmissionsByDoc>({});
  const [activeTab, setActiveTab] = useState<ChecklistSection>('online');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [category, setCategory] = useState('All');
  const [counsellingType, setCounsellingType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [state !== 'All', category !== 'All', counsellingType !== 'All'].filter(Boolean).length;

  // Fetched once. Uploads patch this map in place rather than refetching the world.
  useEffect(() => {
    let alive = true;
    documentsApi
      .mine()
      .then((items) => {
        if (!alive) return;
        // Defensive: a thin/stubbed response can leave `items` undefined. Never assume an array.
        const next: SubmissionsByDoc = {};
        if (Array.isArray(items)) {
          for (const s of items) {
            if (s && typeof s.docId === 'string') next[s.docId] = s;
          }
        }
        setSubmissions(next);
      })
      .catch(() => {
        // Non-fatal: the checklist still reads and uploads. Rows simply start unbadged.
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmissionChange = useCallback((docId: string, submission: Submission | null) => {
    setSubmissions((prev) => {
      const next = { ...prev };
      if (submission) next[docId] = submission;
      else delete next[docId];
      return next;
    });
  }, []);

  // Filter options come from the live data (state list is the union of the
  // state-wise requirement rows and any states pinned on a checklist doc).
  const allDocs = docsQuery.data;
  const stateOptions = useMemo(() => {
    const set = new Set<string>(distinct(stateDocsQuery.data, 'state'));
    for (const d of allDocs) for (const s of d.states ?? []) if (s) set.add(s);
    return [...set].sort();
  }, [stateDocsQuery.data, allDocs]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDocs) for (const c of d.categories ?? []) if (c) set.add(c);
    return [...set].sort();
  }, [allDocs]);

  const counsellingTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDocs) for (const t of d.counsellingTypes ?? []) if (t) set.add(t);
    return [...set].sort();
  }, [allDocs]);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecked(next);
      return next;
    });
  }, []);

  const filterDocs = useCallback(
    (docs: ChecklistDoc[]) => {
      let data = docs;

      if (search) {
        const q = search.toLowerCase();
        data = data.filter(
          (d) => (d.name ?? '').toLowerCase().includes(q) || (d.notes ?? '').toLowerCase().includes(q)
        );
      }
      if (state !== 'All') {
        data = data.filter((d) => (d.states ?? []).length === 0 || (d.states ?? []).includes(state));
      }
      if (category !== 'All') {
        data = data.filter((d) => (d.categories ?? []).length === 0 || (d.categories ?? []).includes(category));
      }
      if (counsellingType !== 'All') {
        data = data.filter(
          (d) => (d.counsellingTypes ?? []).length === 0 || (d.counsellingTypes ?? []).includes(counsellingType)
        );
      }

      return data;
    },
    [search, state, category, counsellingType]
  );

  // Unfiltered sections — these drive PROGRESS. A search or filter must never make
  // an untouched checklist look complete.
  const allOnlineDocs = useMemo(() => allDocs.filter((d) => d.section === 'online'), [allDocs]);
  const allPhysicalDocs = useMemo(() => allDocs.filter((d) => d.section === 'physical'), [allDocs]);

  // Filtered sections — these drive what is DISPLAYED.
  const onlineDocs = useMemo(() => filterDocs(allOnlineDocs), [filterDocs, allOnlineDocs]);
  const physicalDocs = useMemo(() => filterDocs(allPhysicalDocs), [filterDocs, allPhysicalDocs]);

  const currentDocs = activeTab === 'online' ? onlineDocs : physicalDocs;

  // Progress is UPLOAD-driven, not checkbox-driven: only a document the admin has
  // actually VERIFIED counts as complete. Computed over `allDocs` (never the filtered
  // subset) so a search can't make an untouched checklist read 100%.
  const countVerified = useCallback(
    (docs: ChecklistDoc[]) => docs.filter((d) => submissions[d.id]?.status === 'verified').length,
    [submissions]
  );

  const totalDocs = allDocs.length;
  const completedDocs = countVerified(allDocs);
  const onlineComplete = countVerified(allOnlineDocs);
  const physicalComplete = countVerified(allPhysicalDocs);

  const pendingDocs = allDocs.filter((d) => submissions[d.id]?.status === 'pending').length;
  const rejectedDocs = allDocs.filter((d) => submissions[d.id]?.status === 'rejected').length;
  const notUploadedDocs = allDocs.filter((d) => !submissions[d.id]).length;

  const handleReset = () => {
    setSearch('');
    setState('All');
    setCategory('All');
    setCounsellingType('All');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Generate a text-based checklist as a downloadable file
    const lines: string[] = [
      'NEET UG Counselling — Document Checklist',
      `Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      '═══════════════════════════════════════════════',
      'SECTION 1: ONLINE REGISTRATION DOCUMENTS',
      '═══════════════════════════════════════════════',
      '',
    ];

    const MARK: Record<SubmissionStatus, string> = { verified: '[x]', pending: '[~]', rejected: '[!]' };
    const LABEL: Record<SubmissionStatus, string> = {
      verified: 'Verified',
      pending: 'Uploaded — awaiting review',
      rejected: 'Rejected',
    };

    const pushDoc = (d: ChecklistDoc, i: number) => {
      const sub = submissions[d.id];
      const mark = sub ? MARK[sub.status] : checked.has(d.id) ? '[o]' : '[ ]';
      lines.push(`${mark} ${i + 1}. ${d.name ?? 'Untitled document'} ${d.mandatory ? '(MANDATORY)' : '(Optional)'}`);
      if (d.format || d.fileSize) {
        lines.push(`   Format: ${d.format ?? '—'}${d.fileSize ? ` | Size: ${d.fileSize}` : ''}`);
      }
      if (sub) {
        lines.push(`   Status: ${LABEL[sub.status]} | File: ${sub.originalName} (${formatBytes(sub.size)})`);
        if (sub.status === 'rejected' && sub.remarks) lines.push(`   Reason: ${sub.remarks}`);
      } else {
        lines.push('   Status: Not uploaded');
      }
      if (d.notes) lines.push(`   Notes: ${d.notes}`);
      lines.push('');
    };

    onlineDocs.forEach(pushDoc);

    lines.push('═══════════════════════════════════════════════');
    lines.push('SECTION 2: PHYSICAL REPORTING DOCUMENTS');
    lines.push('═══════════════════════════════════════════════');
    lines.push('');

    physicalDocs.forEach(pushDoc);

    lines.push(`Progress: ${completedDocs}/${totalDocs} documents verified (${totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0}%)`);
    lines.push(`Awaiting review: ${pendingDocs} | Rejected: ${rejectedDocs} | Not uploaded: ${notUploadedDocs}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document-checklist.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const header = (
    <PageHeader
      icon={ClipboardCheck}
      iconClassName="text-red-600"
      title="Document Checklist"
      description="Complete guide to documents needed for NEET UG online registration and physical college reporting."
    />
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-10">
        {header}
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading document checklist...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-10">
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Could not load the document checklist"
          description={error}
          action={{ label: 'Retry', onClick: reload }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 print:pb-0 print:space-y-4" ref={printRef}>
      <PageHeader
        icon={ClipboardCheck}
        iconClassName="text-red-600"
        title="Document Checklist"
        description="Complete guide to documents needed for NEET UG online registration and physical college reporting."
      >
        <Button
          variant="outline"
          className={`flex items-center gap-2 print:hidden ${showFilters ? 'bg-red-50/50 border-red-200 text-red-700' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">{activeFilterCount}</span>
          )}
        </Button>
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2 print:hidden">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </Button>
        <Button onClick={handleDownloadPdf} className="gradient-primary text-white flex items-center gap-2 shadow-sm print:hidden">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </PageHeader>

      {/* Progress Section */}
      <Card className="border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="bg-gradient-to-r from-red-50/80 to-rose-50/80 dark:from-red-950/20 dark:to-rose-950/20 p-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ProgressRing completed={completedDocs} total={totalDocs} />
            <div className="flex-1 w-full space-y-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Overall Progress</h3>
                <p className="text-xs text-slate-500 mt-0.5">{completedDocs} of {totalDocs} documents verified</p>
                {/* Verification counters — pending/rejected are what the student must act on. */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400">
                    <Clock className="w-3 h-3" /> {pendingDocs} awaiting review
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                    <XCircle className="w-3 h-3" /> {rejectedDocs} rejected
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400">
                    <Upload className="w-3 h-3" /> {notUploadedDocs} not uploaded
                  </span>
                </div>
              </div>
              {/* Per-section mini progress */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Online
                    </span>
                    <span className="font-bold text-red-600">{onlineComplete}/{allOnlineDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${onlineComplete === allOnlineDocs.length && allOnlineDocs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${allOnlineDocs.length > 0 ? (onlineComplete / allOnlineDocs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Physical
                    </span>
                    <span className="font-bold text-red-600">{physicalComplete}/{allPhysicalDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${physicalComplete === allPhysicalDocs.length && allPhysicalDocs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${allPhysicalDocs.length > 0 ? (physicalComplete / allPhysicalDocs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="shadow-sm glass animate-fade-in print:hidden">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={handleReset}>
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <SelectFilter label="State" value={state} onChange={setState} options={stateOptions} allLabel="All States" />
              <SelectFilter label="Category" value={category} onChange={setCategory} options={categoryOptions} allLabel="All Categories" />
              <SelectFilter label="Counselling Type" value={counsellingType} onChange={setCounsellingType} options={counsellingTypeOptions} allLabel="All Types" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'online'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Online Registration
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'online' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {onlineDocs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('physical')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'physical'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Physical Reporting
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'physical' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {physicalDocs.length}
          </span>
        </button>
      </div>

      {/* Document Cards — the ACTIVE TAB, on screen only.
          This list used to print as-is under a hardcoded "Section 1: Online Registration
          Documents" heading, so printing from the Physical tab filed every physical
          document under "Online", printed them twice, and omitted the online ones
          entirely. Printing now goes through the print-only block below, which always
          renders BOTH sections under their correct headings. */}
      <div className="space-y-3 print:hidden">
        {currentDocs.length === 0 ? (
          <Card className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No documents match your filters.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the state, category, or counselling type filters.</p>
          </Card>
        ) : (
          currentDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              isChecked={checked.has(doc.id)}
              onToggle={() => toggleCheck(doc.id)}
              submission={submissions[doc.id]}
              onSubmissionChange={handleSubmissionChange}
            />
          ))
        )}
      </div>

      {/* Print-only: Section 1 — Online, regardless of the active tab. */}
      <div className="hidden print:block">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Section 1: Online Registration Documents</h3>
        <div className="space-y-3">
          {onlineDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              isChecked={checked.has(doc.id)}
              onToggle={() => toggleCheck(doc.id)}
              submission={submissions[doc.id]}
              onSubmissionChange={handleSubmissionChange}
            />
          ))}
        </div>
      </div>

      {/* Print-only: Section 2 — Physical, regardless of the active tab. */}
      <div className="hidden print:block print:break-before-page">
        <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Section 2: Physical Reporting Documents</h3>
        <div className="space-y-3">
          {physicalDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              isChecked={checked.has(doc.id)}
              onToggle={() => toggleCheck(doc.id)}
              submission={submissions[doc.id]}
              onSubmissionChange={handleSubmissionChange}
            />
          ))}
        </div>
      </div>

      {/* Bottom completion banner */}
      {completedDocs === totalDocs && totalDocs > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 print:hidden">
          <div className="p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">All documents verified!</h3>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-0.5">
                All {totalDocs} documents have been uploaded and verified by our team. You are ready for counselling.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
