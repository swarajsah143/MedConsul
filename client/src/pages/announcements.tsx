import { useState, useMemo } from 'react';
import { useCollection, distinct } from '@/lib/data-api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { motion } from 'framer-motion';
import {
  Search,
  Megaphone,
  Sparkles,
  MapPin,
  X,
  Bell,
  FileText,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const PAGE_SIZE = 12;

/** Admin-managed announcement. Only `id` is guaranteed — guard everything else. */
interface Announcement {
  id: string;
  date?: string;              // 'YYYY-MM-DD'
  title?: string;
  announcementType?: string;
  state?: string;             // '' = All-India / MCC
  shortDescription?: string;
  documentLabel?: string;
  documentUrl?: string;       // '' = no document
}

/** Announcement + fields derived from the real `date` (replaces the old month/day strings). */
interface DatedAnnouncement extends Announcement {
  ts: number;         // epoch ms, 0 when the date is missing/unparseable
  monthKey: string;   // 'YYYY-MM' — used for the month filter
  monthLabel: string; // 'Jun 2026'
  monthShort: string; // 'JUN'
  dayLabel: string;   // '25'
}

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 60 days — an announcement newer than this gets the red "recent" date chip. */
const RECENT_MS = 60 * 24 * 60 * 60 * 1000;

function decorate(a: Announcement): DatedAnnouncement {
  const raw = a.date ?? '';
  const d = raw ? new Date(`${raw}T00:00:00`) : null;
  const valid = d !== null && !Number.isNaN(d.getTime());

  if (!valid || d === null) {
    return { ...a, ts: 0, monthKey: '', monthLabel: '', monthShort: '—', dayLabel: '—' };
  }

  const month = d.getMonth();
  const year = d.getFullYear();
  const short = MONTH_SHORT[month] ?? '—';

  return {
    ...a,
    ts: d.getTime(),
    monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
    monthLabel: `${short.charAt(0)}${short.slice(1).toLowerCase()} ${year}`,
    monthShort: short,
    dayLabel: String(d.getDate()),
  };
}

const TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'Allotment': { text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900/40' },
  'Counselling': { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/40' },
  'Public Notice': { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/40' },
  'Seat Matrix': { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40' },
  'Merit list': { text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900/40' },
  'Merit List': { text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900/40' },
  'Rank List': { text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-900/40' },
  'Rank list': { text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-900/40' },
  'Last rank': { text: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-900/40' },
  'Opening and closing rank': { text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-900/40' },
  'Seat matrix': { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/40' },
};

const TYPE_ICONS: Record<string, typeof Bell> = {
  'Allotment': FileText,
  'Counselling': GraduationCap,
  'Public Notice': Megaphone,
  'Seat Matrix': BarChart3,
  'Merit list': TrendingUp,
  'Merit List': TrendingUp,
  'Rank List': TrendingUp,
  'Rank list': TrendingUp,
  'Last rank': TrendingUp,
  'Opening and closing rank': TrendingUp,
  'Seat matrix': BarChart3,
};

const DEFAULT_COLORS = { text: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' };

const TYPE_GRADIENTS: Record<string, string> = {
  'Allotment': 'from-blue-500 to-indigo-600',
  'Counselling': 'from-emerald-500 to-green-600',
  'Public Notice': 'from-red-500 to-rose-600',
  'Seat Matrix': 'from-amber-500 to-orange-600',
  'Merit list': 'from-purple-500 to-violet-600',
  'Merit List': 'from-purple-500 to-violet-600',
  'Rank List': 'from-indigo-500 to-blue-600',
  'Rank list': 'from-indigo-500 to-blue-600',
  'Last rank': 'from-cyan-500 to-teal-600',
  'Opening and closing rank': 'from-indigo-500 to-blue-600',
  'Seat matrix': 'from-amber-500 to-orange-600',
};

const TYPE_GLOWS: Record<string, string> = {
  'Allotment': 'shadow-blue-500/20',
  'Counselling': 'shadow-emerald-500/20',
  'Public Notice': 'shadow-red-500/20',
  'Seat Matrix': 'shadow-amber-500/20',
  'Merit list': 'shadow-purple-500/20',
  'Merit List': 'shadow-purple-500/20',
  'Rank List': 'shadow-indigo-500/20',
  'Rank list': 'shadow-indigo-500/20',
  'Last rank': 'shadow-cyan-500/20',
  'Opening and closing rank': 'shadow-indigo-500/20',
  'Seat matrix': 'shadow-amber-500/20',
};

export default function AnnouncementsPage() {
  const { data, loading, error, reload } = useCollection<Announcement>('announcements');

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [page, setPage] = useState(1);

  const activeFilterCount = [
    stateFilter !== 'All',
    typeFilter !== 'All',
    monthFilter !== 'All',
    search !== '',
  ].filter(Boolean).length;

  // Real dates now — sort newest first, no month-index guesswork.
  const sorted = useMemo(
    () => data.map(decorate).sort((a, b) => b.ts - a.ts),
    [data],
  );

  // Filter options come from the live data.
  const stateOptions = useMemo(() => distinct(sorted, 'state'), [sorted]);
  const typeOptions = useMemo(() => distinct(sorted, 'announcementType'), [sorted]);
  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of sorted) {
      if (a.monthKey && !seen.has(a.monthKey)) seen.set(a.monthKey, a.monthLabel);
    }
    return [...seen.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sorted]);

  const filtered = useMemo(() => {
    let rows = sorted;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((a) =>
        (a.title ?? '').toLowerCase().includes(q) ||
        (a.shortDescription ?? '').toLowerCase().includes(q) ||
        (a.state ?? '').toLowerCase().includes(q)
      );
    }
    if (stateFilter !== 'All') rows = rows.filter((a) => a.state === stateFilter);
    if (typeFilter !== 'All') rows = rows.filter((a) => a.announcementType === typeFilter);
    if (monthFilter !== 'All') rows = rows.filter((a) => a.monthKey === monthFilter);
    return rows;
  }, [sorted, search, stateFilter, typeFilter, monthFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => {
    setSearch('');
    setStateFilter('All');
    setTypeFilter('All');
    setMonthFilter('All');
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Live Updates
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-red-200" />
              Announcements
            </h1>
            <p className="text-red-100/90 text-sm max-w-xl leading-relaxed">
              Stay updated with the latest NEET UG counselling notifications, allotments, seat matrices, and public notices across all states.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading announcements...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load announcements"
          description={error}
          action={{ label: 'Retry', onClick: reload }}
        />
      ) : (
        <>
          {/* Search & Filters Bar */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search announcements..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10 h-11 rounded-xl text-sm focus:shadow-md transition-all duration-200"
                  />
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={monthFilter}
                    onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
                    className="h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 hover:border-red-300 cursor-pointer min-w-[140px]"
                  >
                    <option value="All">All Months</option>
                    {monthOptions.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* State Filter */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                  <select
                    value={stateFilter}
                    onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
                    className="h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 hover:border-red-300 cursor-pointer min-w-[160px]"
                  >
                    <option value="All">All States</option>
                    {stateOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type Filter Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Type:</span>
                <button
                  onClick={() => { setTypeFilter('All'); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                    typeFilter === 'All'
                      ? 'gradient-primary text-white border-transparent shadow-md'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  All
                </button>
                {typeOptions.map((t) => {
                  const colors = TYPE_COLORS[t] || DEFAULT_COLORS;
                  const isActive = typeFilter === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setPage(1); }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                        isActive
                          ? 'gradient-primary text-white border-transparent shadow-md'
                          : `${colors.bg} ${colors.text} ${colors.border} hover:shadow-sm`
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Active filter tags */}
              {activeFilterCount > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">Active:</span>
                  {search && <FilterTag label={`"${search}"`} onRemove={() => { setSearch(''); setPage(1); }} />}
                  {stateFilter !== 'All' && <FilterTag label={stateFilter} onRemove={() => { setStateFilter('All'); setPage(1); }} />}
                  {typeFilter !== 'All' && <FilterTag label={typeFilter} onRemove={() => { setTypeFilter('All'); setPage(1); }} />}
                  {monthFilter !== 'All' && (
                    <FilterTag
                      label={monthOptions.find(([key]) => key === monthFilter)?.[1] ?? monthFilter}
                      onRemove={() => { setMonthFilter('All'); setPage(1); }}
                    />
                  )}
                  <button onClick={handleReset} className="text-[11px] font-semibold text-red-600 hover:underline ml-1">Clear all</button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> announcement{filtered.length !== 1 ? 's' : ''}
              {activeFilterCount > 0 && <span className="text-red-600 font-medium"> (filtered)</span>}
            </p>
          </div>

          {/* Announcement Cards Grid */}
          {filtered.length === 0 ? (
            <EmptyState
              title="No announcements found"
              description="Try adjusting your search or filters to find what you're looking for."
              action={{ label: 'Clear Filters', onClick: handleReset }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((announcement, idx) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} index={idx} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemCount={paginated.length}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement: a, index }: { announcement: DatedAnnouncement; index: number }) {
  const type = a.announcementType ?? '';
  const colors = TYPE_COLORS[type] || DEFAULT_COLORS;
  const Icon = TYPE_ICONS[type] || Bell;
  const gradient = TYPE_GRADIENTS[type] || 'from-slate-500 to-slate-600';
  const glow = TYPE_GLOWS[type] || 'shadow-slate-500/20';

  const isRecent = a.ts > 0 && Date.now() - a.ts <= RECENT_MS;
  const docLabel = a.documentLabel || type || 'Document';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className={`group relative overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:border-transparent transition-all duration-500 hover:shadow-2xl ${glow} h-full`}
      >
        {/* Top gradient accent bar */}
        <div className={`h-1 bg-gradient-to-r ${gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

        {/* Hover background glow */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.06] blur-3xl transition-opacity duration-700 pointer-events-none`} />

        <CardContent className="p-5 relative">
          {/* Header: Icon badge + Date */}
          <div className="flex items-start justify-between mb-3">
            <motion.div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${glow}`}
              whileHover={{ scale: 1.15, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>

            <div
              title={a.monthLabel || undefined}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-300 group-hover:scale-105 ${
                isRecent
                  ? 'bg-red-50 dark:bg-red-950/30'
                  : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase leading-none tracking-wider ${
                isRecent ? 'text-red-500 dark:text-red-400' : 'text-slate-400'
              }`}>
                {a.monthShort}
              </span>
              <span className={`text-lg font-extrabold leading-none mt-0.5 ${
                isRecent ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {a.dayLabel}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {type && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                {type}
              </span>
            )}
            {a.state && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <MapPin className="w-2.5 h-2.5" />
                {a.state}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:to-rose-500 dark:group-hover:from-red-400 dark:group-hover:to-rose-400 transition-all duration-300 mb-2">
            {a.title ?? 'Untitled announcement'}
          </h3>

          {/* Description */}
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {a.shortDescription ?? ''}
          </p>

          {/* Bottom: Document action */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
            {a.documentUrl ? (
              <a
                href={a.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-2 text-[11px] font-bold w-full justify-between px-3.5 py-2 rounded-xl border transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${colors.bg} ${colors.text} ${colors.border} group/link`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {docLabel}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all duration-300" />
              </a>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-2 rounded-xl ${colors.bg} ${colors.text} opacity-60`}>
                <Icon className="w-3.5 h-3.5" />
                {docLabel}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[11px] font-semibold border border-red-200 dark:border-red-900/40 hover:bg-red-100 transition-colors duration-200">
      {label}
      <button onClick={onRemove} className="w-3.5 h-3.5 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
