import { useState, useMemo, useCallback, useRef } from 'react';
import { useCollection, distinct } from '@/lib/data-api';
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
} from 'lucide-react';

type ChecklistSection = 'online' | 'physical';

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
}: {
  doc: ChecklistDoc;
  isChecked: boolean;
  onToggle: () => void;
}) {
  const name = doc.name ?? 'Untitled document';
  const categories = doc.categories ?? [];
  const counsellingTypes = doc.counsellingTypes ?? [];
  const states = doc.states ?? [];

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isChecked
          ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-300 hover:shadow-md dark:hover:border-red-800'
      }`}
    >
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
  const [activeTab, setActiveTab] = useState<ChecklistSection>('online');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [category, setCategory] = useState('All');
  const [counsellingType, setCounsellingType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [state !== 'All', category !== 'All', counsellingType !== 'All'].filter(Boolean).length;

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

  const onlineDocs = useMemo(() => filterDocs(allDocs.filter((d) => d.section === 'online')), [filterDocs, allDocs]);
  const physicalDocs = useMemo(() => filterDocs(allDocs.filter((d) => d.section === 'physical')), [filterDocs, allDocs]);

  const currentDocs = activeTab === 'online' ? onlineDocs : physicalDocs;
  const allFilteredDocs = [...onlineDocs, ...physicalDocs];

  const totalDocs = allFilteredDocs.length;
  const completedDocs = allFilteredDocs.filter((d) => checked.has(d.id)).length;
  const onlineComplete = onlineDocs.filter((d) => checked.has(d.id)).length;
  const physicalComplete = physicalDocs.filter((d) => checked.has(d.id)).length;

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

    const pushDoc = (d: ChecklistDoc, i: number) => {
      const status = checked.has(d.id) ? '[x]' : '[ ]';
      lines.push(`${status} ${i + 1}. ${d.name ?? 'Untitled document'} ${d.mandatory ? '(MANDATORY)' : '(Optional)'}`);
      if (d.format || d.fileSize) {
        lines.push(`   Format: ${d.format ?? '—'}${d.fileSize ? ` | Size: ${d.fileSize}` : ''}`);
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

    lines.push(`Progress: ${completedDocs}/${totalDocs} documents completed (${totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0}%)`);

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
                <p className="text-xs text-slate-500 mt-0.5">{completedDocs} of {totalDocs} documents completed</p>
              </div>
              {/* Per-section mini progress */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Online
                    </span>
                    <span className="font-bold text-red-600">{onlineComplete}/{onlineDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${onlineComplete === onlineDocs.length && onlineDocs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${onlineDocs.length > 0 ? (onlineComplete / onlineDocs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Physical
                    </span>
                    <span className="font-bold text-red-600">{physicalComplete}/{physicalDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${physicalComplete === physicalDocs.length && physicalDocs.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${physicalDocs.length > 0 ? (physicalComplete / physicalDocs.length) * 100 : 0}%` }}
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

      {/* Section Header (for print) */}
      <div className="hidden print:block">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Section 1: Online Registration Documents</h3>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
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
            />
          ))
        )}
      </div>

      {/* Print-only: Physical section */}
      <div className="hidden print:block print:break-before-page">
        <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Section 2: Physical Reporting Documents</h3>
        <div className="space-y-3">
          {physicalDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              isChecked={checked.has(doc.id)}
              onToggle={() => toggleCheck(doc.id)}
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
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400">All documents completed!</h3>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mt-0.5">
                You have marked all {totalDocs} documents as collected. You are ready for counselling.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
