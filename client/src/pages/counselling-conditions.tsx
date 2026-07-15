import { useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useCollection } from '@/lib/data-api';
import type { LucideIcon } from 'lucide-react';
import {
  ScrollText,
  ClipboardList,
  Home,
  Users,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
  ShieldCheck,
  Info,
  Layers,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

/**
 * The 28 states + 8 UTs. A static list of place names, not editable content — it stays in the
 * page. (It is also exported by lib/counselling-content.ts, but importing it from there would
 * pull that whole ~600-line migration seed into this page's bundle: Rollup keeps the module's
 * unused exports, so the quota prose we just moved to the DB would still ship to every visitor.)
 */
const ALL_INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

// ── Wire types (mirror the counsellingSections / counsellingQuotas collections) ──
// Fields are optional here on purpose: this is JSON off the network, and the admin
// can leave intro / note / items blank on any block.

interface Block {
  heading?: string;
  intro?: string;
  note?: string;
  items?: string[];
  ordered?: boolean;
}

interface CounsellingSection {
  id: string;
  key: string;
  label: string;
  blurb?: string;
  authority?: string;
  order?: number;
  blocks?: Block[];
}

interface CounsellingQuota {
  id: string;
  label: string;
  group: string;
  authority?: string;
  order?: number;
  blocks?: Block[];
}

/** The quota tab is not a row in counsellingSections — it renders the quota collection. */
const QUOTA_KEY = 'quota';
const QUOTA_TAB = { key: QUOTA_KEY, label: 'Quota & Reservation' };

/**
 * Icons cannot live in the database, so they are matched to the section key here.
 * A section the admin adds later simply falls back to the default icon — it still renders.
 */
const SECTION_ICONS: Record<string, LucideIcon | undefined> = {
  eligibility: ShieldCheck,
  application: ClipboardList,
  domicile: Home,
  counselling: Users,
  [QUOTA_KEY]: Layers,
};
const DEFAULT_ICON: LucideIcon = ScrollText;

const iconFor = (key: string): LucideIcon => SECTION_ICONS[key] ?? DEFAULT_ICON;

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

export default function CounsellingConditionsPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  const sectionsQuery = useCollection<CounsellingSection>('counsellingSections');
  const quotasQuery = useCollection<CounsellingQuota>('counsellingQuotas');

  const loading = sectionsQuery.loading || quotasQuery.loading;
  const error = sectionsQuery.error ?? quotasQuery.error;
  const reload = () => { sectionsQuery.reload(); quotasQuery.reload(); };

  const sections = useMemo(
    () => [...sectionsQuery.data].sort(byOrder),
    [sectionsQuery.data],
  );
  const quotas = useMemo(
    () => [...quotasQuery.data].sort(byOrder),
    [quotasQuery.data],
  );

  // Tab bar = the sections from the DB (in `order`), plus the fixed Quota tab.
  const tabs = useMemo(
    () => [
      ...sections.map((s) => ({ key: s.key, label: s.label })),
      QUOTA_TAB,
    ],
    [sections],
  );

  // An unknown / missing :section in the URL falls back to the first tab rather than blanking out.
  const active = tabs.find((t) => t.key === section)?.key ?? tabs[0].key;
  const isQuotaTab = active === QUOTA_KEY;
  const activeTab = tabs.find((t) => t.key === active) ?? QUOTA_TAB;

  // State dropdown (for non-quota tabs)
  const stateOptions = useMemo(() => ['All India Quota - MCC', ...[...ALL_INDIA_STATES].sort()], []);
  const [selectedState, setSelectedState] = useState('All India Quota - MCC');
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  // Quota dropdown — the selection is a label, resolved against the fetched rows below,
  // so it needs no effect to initialise once the data lands.
  const [selectedQuota, setSelectedQuota] = useState('');
  const [quotaMenuOpen, setQuotaMenuOpen] = useState(false);
  const [quotaSearch, setQuotaSearch] = useState('');
  const quotaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateMenuOpen(false);
      if (quotaRef.current && !quotaRef.current.contains(e.target as Node)) { setQuotaMenuOpen(false); setQuotaSearch(''); }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const quotaGroups = useMemo(() => [...new Set(quotas.map((q) => q.group))], [quotas]);

  const filteredQuotas = useMemo(() => {
    if (!quotaSearch) return quotas;
    const q = quotaSearch.toLowerCase();
    return quotas.filter((qt) => qt.label.toLowerCase().includes(q) || qt.group.toLowerCase().includes(q));
  }, [quotas, quotaSearch]);

  // Falls back to the first quota until the user picks one (and if a stale label no longer exists).
  const quotaInfo = quotas.find((q) => q.label === selectedQuota) ?? quotas[0];
  const activeSection = sections.find((s) => s.key === active);

  const displayContent = isQuotaTab
    ? { authority: quotaInfo?.authority, blocks: quotaInfo?.blocks }
    : { authority: activeSection?.authority, blocks: activeSection?.blocks };
  const blocks = displayContent.blocks ?? [];

  const hero = (dropdown: ReactNode) => (
    <div className="relative rounded-2xl">
      <div className="gradient-primary rounded-2xl p-6 sm:p-8 lg:p-10 relative">
        {/* Decorative blurs — clipped to the hero, but kept below content so the dropdown can overflow */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 space-y-4 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Counselling Conditions
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Counselling Conditions
          </h1>
          <p className="text-red-100/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Review eligibility, application rules, counselling flow, quota types, and domicile conditions.
          </p>

          {dropdown && <div className="flex justify-center pt-2">{dropdown}</div>}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero(null)}
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading counselling conditions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero(null)}
        <EmptyState
          icon={AlertTriangle}
          title="Could not load the counselling conditions"
          description={error}
          action={{ label: 'Retry', onClick: reload }}
        />
      </div>
    );
  }

  if (sections.length === 0 && quotas.length === 0) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero(null)}
        <EmptyState
          icon={ScrollText}
          title="No counselling content has been added yet"
          description="Eligibility, application, domicile, counselling and quota details will appear here once they are published."
        />
      </div>
    );
  }

  const quotaDropdown = quotas.length > 0 && (
    <div className="relative w-full max-w-2xl" ref={quotaRef}>
      <button
        onClick={() => { setQuotaMenuOpen((o) => !o); setQuotaSearch(''); }}
        className="w-full flex items-center justify-between gap-2 bg-white/15 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl border border-white/25 hover:bg-white/25 transition-all duration-200"
      >
        <span className="flex items-center gap-2 truncate">
          <Layers className="w-4 h-4 shrink-0" />
          {quotaInfo?.label}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${quotaMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      {quotaMenuOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[35] animate-fade-in text-left overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search quotas..."
                value={quotaSearch}
                onChange={(e) => setQuotaSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-lg"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5">
            {quotaGroups.map((group) => {
              const groupItems = filteredQuotas.filter((q) => q.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</p>
                  {groupItems.map((qt) => {
                    const isOn = qt.label === quotaInfo?.label;
                    return (
                      <button
                        key={qt.id}
                        onClick={() => { setSelectedQuota(qt.label); setQuotaMenuOpen(false); setQuotaSearch(''); }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors ${
                          isOn
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate text-left">{qt.label}</span>
                        {isOn && <Check className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filteredQuotas.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400 text-center">No quotas match your search</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const stateDropdown = (
    <div className="relative w-full max-w-2xl" ref={stateRef}>
      <button
        onClick={() => setStateMenuOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white/15 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl border border-white/25 hover:bg-white/25 transition-all duration-200"
      >
        <span className="truncate">{selectedState}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${stateMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      {stateMenuOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-[35] animate-fade-in text-left max-h-[372px] overflow-y-auto">
          {stateOptions.map((st) => {
            const isOn = st === selectedState;
            return (
              <button
                key={st}
                onClick={() => { setSelectedState(st); setStateMenuOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                  isOn
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate text-left">{st}</span>
                {isOn && <Check className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero — the dropdown switches between State and Quota based on the active tab */}
      {hero(isQuotaTab ? quotaDropdown : stateDropdown)}

      {/* Section tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((s) => {
          const Icon = iconFor(s.key);
          const isOn = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => navigate(`/counselling-conditions/${s.key}`)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                isOn
                  ? 'gradient-primary text-white border-transparent shadow-md shadow-red-500/25'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Context badge */}
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full">
          {isQuotaTab ? <Layers className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
          Showing <span className="font-bold text-slate-700 dark:text-slate-200">{activeTab.label}</span>
          {isQuotaTab
            ? quotaInfo && <> for <span className="font-bold text-red-600 dark:text-red-400">{quotaInfo.label}</span></>
            : <> conditions · <span className="font-bold text-red-600 dark:text-red-400">All-India baseline</span></>
          }
          {/* NB: these sections are the MCC/All-India baseline — the same content for every state.
              The state picker above is scaffolding for future per-state rules; until that content
              exists, the badge must NOT claim the rules shown are specific to the chosen state. */}
        </span>
      </div>

      {/* Content */}
      {isQuotaTab && quotas.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No quota information has been added yet"
          description="Quota and reservation details will appear here once they are published."
        />
      ) : (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
          <CardContent className="p-5 sm:p-7 space-y-7">
            {/* Governing authority */}
            {displayContent.authority && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                  <ScrollText className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    {isQuotaTab ? 'About This Quota' : 'Governing Authority'}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{displayContent.authority}</p>
                </div>
              </div>
            )}

            {/* Blocks */}
            {blocks.map((block, bi) => (
              <div key={bi} className="space-y-3">
                {block.heading && (
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{block.heading}</h3>
                )}
                {block.intro && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{block.intro}</p>
                )}
                {block.items && block.items.length > 0 && (
                  <ul className="space-y-2.5">
                    {block.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-3">
                        {block.ordered ? (
                          <span className="shrink-0 w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center mt-0.5">
                            {ii + 1}
                          </span>
                        ) : (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </span>
                        )}
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {block.note && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{block.note}</p>
                  </div>
                )}
              </div>
            ))}

            <p className="text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
              Conditions shown are indicative and based on the latest published counselling scheme. Always confirm details on the official MCC / State counselling portal before acting.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
