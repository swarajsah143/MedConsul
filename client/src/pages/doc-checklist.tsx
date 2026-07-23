import { useState, useMemo, useCallback, useRef } from 'react';
import {
  CHECKLIST_DOCS,
  CHECKLIST_FILTER_OPTIONS,
  type ChecklistDoc,
  type ChecklistSection,
} from '@/lib/checklist-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeroBanner } from '@/components/ui/hero-banner';
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
} from 'lucide-react';

const STORAGE_KEY = 'medcounsel-checklist-state';

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveChecked(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
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
          stroke={pct === 100 ? '#10b981' : '#059669'}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-extrabold ${pct === 100 ? 'text-emerald-600' : 'text-emerald-600'}`}>{pct}%</span>
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
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isChecked
          ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-800'
      }`}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors mt-0.5 ${
            isChecked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
          }`}
          aria-label={isChecked ? `Unmark ${doc.name}` : `Mark ${doc.name} as done`}
        >
          {isChecked && <Check className="w-4 h-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title Row */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-sm font-bold leading-snug ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
              {doc.name}
            </h4>
            {doc.mandatory ? (
              <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-[9px] font-bold uppercase tracking-wider dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400">
                Mandatory
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold uppercase tracking-wider dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400">
                Optional
              </span>
            )}
          </div>

          {/* Notes */}
          <div className={`flex gap-2 items-start text-xs p-2.5 rounded-lg ${
            isChecked
              ? 'bg-emerald-50/60 text-emerald-700/60 dark:bg-emerald-900/10 dark:text-emerald-400/50'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
          }`}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{doc.notes}</span>
          </div>

          {/* Meta Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-semibold">
              <FileText className="w-3 h-3" /> {doc.format}
            </span>
            {doc.fileSize && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 rounded text-[10px] font-semibold">
                <HardDrive className="w-3 h-3" /> {doc.fileSize}
              </span>
            )}
            {doc.categories.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded text-[10px] font-semibold">
                <Tag className="w-3 h-3" /> {doc.categories.join(', ')}
              </span>
            )}
            {doc.counsellingTypes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-semibold">
                <Shield className="w-3 h-3" /> {doc.counsellingTypes.join(', ')}
              </span>
            )}
            {doc.states.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded text-[10px] font-semibold">
                {doc.states.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocChecklistPage() {
  const [checked, setChecked] = useState<Set<string>>(loadChecked);
  const [activeTab, setActiveTab] = useState<ChecklistSection>('online');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [category, setCategory] = useState('All');
  const [counsellingType, setCounsellingType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [state !== 'All', category !== 'All', counsellingType !== 'All'].filter(Boolean).length;

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
          (d) => d.name.toLowerCase().includes(q) || d.notes.toLowerCase().includes(q)
        );
      }
      if (state !== 'All') {
        data = data.filter((d) => d.states.length === 0 || d.states.includes(state));
      }
      if (category !== 'All') {
        data = data.filter((d) => d.categories.length === 0 || d.categories.includes(category));
      }
      if (counsellingType !== 'All') {
        data = data.filter(
          (d) => d.counsellingTypes.length === 0 || d.counsellingTypes.includes(counsellingType)
        );
      }

      return data;
    },
    [search, state, category, counsellingType]
  );

  const onlineDocs = useMemo(() => filterDocs(CHECKLIST_DOCS.filter((d) => d.section === 'online')), [filterDocs]);
  const physicalDocs = useMemo(() => filterDocs(CHECKLIST_DOCS.filter((d) => d.section === 'physical')), [filterDocs]);

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

    onlineDocs.forEach((d, i) => {
      const status = checked.has(d.id) ? '[x]' : '[ ]';
      lines.push(`${status} ${i + 1}. ${d.name} ${d.mandatory ? '(MANDATORY)' : '(Optional)'}`);
      lines.push(`   Format: ${d.format}${d.fileSize ? ` | Size: ${d.fileSize}` : ''}`);
      lines.push(`   Notes: ${d.notes}`);
      lines.push('');
    });

    lines.push('═══════════════════════════════════════════════');
    lines.push('SECTION 2: PHYSICAL REPORTING DOCUMENTS');
    lines.push('═══════════════════════════════════════════════');
    lines.push('');

    physicalDocs.forEach((d, i) => {
      const status = checked.has(d.id) ? '[x]' : '[ ]';
      lines.push(`${status} ${i + 1}. ${d.name} ${d.mandatory ? '(MANDATORY)' : '(Optional)'}`);
      lines.push(`   Format: ${d.format}${d.fileSize ? ` | Size: ${d.fileSize}` : ''}`);
      lines.push(`   Notes: ${d.notes}`);
      lines.push('');
    });

    lines.push(`Progress: ${completedDocs}/${totalDocs} documents completed (${totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0}%)`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document-checklist.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10 print:pb-0 print:space-y-4" ref={printRef}>
      <HeroBanner contentClassName="text-white print:!p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/20">
              <ClipboardCheck className="w-3.5 h-3.5" /> Checklist
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Document Checklist</h1>
            <p className="text-emerald-50/90 text-sm max-w-2xl leading-relaxed">
              Complete guide to documents needed for NEET UG online registration and physical college reporting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              className={`text-white border backdrop-blur-sm print:hidden ${showFilters ? 'bg-white/30 border-white/40' : 'bg-white/15 border-white/20 hover:bg-white/25'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white text-emerald-700 text-[10px] font-bold">{activeFilterCount}</span>
              )}
            </Button>
            <Button variant="ghost" onClick={handlePrint} className="text-white border border-white/20 bg-white/15 hover:bg-white/25 backdrop-blur-sm print:hidden">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="ghost" onClick={handleDownloadPdf} className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm print:hidden">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </HeroBanner>

      {/* Progress Section */}
      <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 dark:from-emerald-950/20 dark:to-green-950/20 p-5">
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
                    <span className="font-bold text-emerald-600">{onlineComplete}/{onlineDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${onlineComplete === onlineDocs.length && onlineDocs.length > 0 ? 'bg-emerald-500' : 'bg-emerald-500'}`}
                      style={{ width: `${onlineDocs.length > 0 ? (onlineComplete / onlineDocs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Physical
                    </span>
                    <span className="font-bold text-emerald-600">{physicalComplete}/{physicalDocs.length}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${physicalComplete === physicalDocs.length && physicalDocs.length > 0 ? 'bg-emerald-500' : 'bg-emerald-500'}`}
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
              <SelectFilter label="State" value={state} onChange={setState} options={CHECKLIST_FILTER_OPTIONS.states} allLabel="All States" />
              <SelectFilter label="Category" value={category} onChange={setCategory} options={CHECKLIST_FILTER_OPTIONS.categories} allLabel="All Categories" />
              <SelectFilter label="Counselling Type" value={counsellingType} onChange={setCounsellingType} options={CHECKLIST_FILTER_OPTIONS.counsellingTypes} allLabel="All Types" />
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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
