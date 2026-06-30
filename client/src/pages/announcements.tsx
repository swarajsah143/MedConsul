import { useState, useMemo } from 'react';
import {
  ANNOUNCEMENTS_DATA,
  ANNOUNCEMENT_FILTER_OPTIONS,
  type Announcement,
} from '@/lib/announcements-data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  Search,
  Megaphone,
  ExternalLink,
  Sparkles,
  MapPin,
  X,
  Bell,
  FileText,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Calendar,
} from 'lucide-react';

const PAGE_SIZE = 12;

const MONTH_ORDER: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

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

export default function AnnouncementsPage() {
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

  const sorted = useMemo(() =>
    [...ANNOUNCEMENTS_DATA].sort((a, b) => {
      const ma = MONTH_ORDER[a.month] ?? 0;
      const mb = MONTH_ORDER[b.month] ?? 0;
      if (mb !== ma) return mb - ma;
      return parseInt(b.day) - parseInt(a.day);
    }),
  []);

  const filtered = useMemo(() => {
    let data = sorted;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.shortDescription.toLowerCase().includes(q) ||
        (a.state?.toLowerCase().includes(q) ?? false)
      );
    }
    if (stateFilter !== 'All') data = data.filter((a) => a.state === stateFilter);
    if (typeFilter !== 'All') data = data.filter((a) => a.announcementType === typeFilter);
    if (monthFilter !== 'All') data = data.filter((a) => a.month === monthFilter);
    return data;
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

  // Count by type for the stat summary
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ANNOUNCEMENTS_DATA.forEach((a) => {
      counts[a.announcementType] = (counts[a.announcementType] || 0) + 1;
    });
    return counts;
  }, []);

  const topTypes = useMemo(() =>
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4),
  [typeCounts]);

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
                {ANNOUNCEMENT_FILTER_OPTIONS.months.map((m) => (
                  <option key={m} value={m}>{m}</option>
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
                {ANNOUNCEMENT_FILTER_OPTIONS.states.map((s) => (
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
            {ANNOUNCEMENT_FILTER_OPTIONS.types.map((t) => {
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
              {monthFilter !== 'All' && <FilterTag label={monthFilter} onRemove={() => { setMonthFilter('All'); setPage(1); }} />}
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
    </div>
  );
}

function AnnouncementCard({ announcement: a, index }: { announcement: Announcement; index: number }) {
  const colors = TYPE_COLORS[a.announcementType] || DEFAULT_COLORS;
  const Icon = TYPE_ICONS[a.announcementType] || Bell;

  // Determine date circle color based on how recent
  const monthNum = MONTH_ORDER[a.month] ?? 0;
  const isRecent = monthNum >= 5; // May onwards = recent (2026)

  return (
    <Card
      className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative border-transparent hover:border-red-200 dark:hover:border-red-900/40"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Hover accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Date Circle */}
          <div className={`shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${
            isRecent
              ? 'bg-red-50 dark:bg-red-950/30 group-hover:bg-red-100 dark:group-hover:bg-red-950/50'
              : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'
          }`}>
            <span className={`text-[10px] font-bold uppercase leading-none ${
              isRecent ? 'text-red-500 dark:text-red-400' : 'text-slate-400'
            }`}>
              {a.month}
            </span>
            <span className={`text-xl font-extrabold leading-none mt-0.5 ${
              isRecent ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {a.day}
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Tags row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {a.state && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                  {a.state}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {a.announcementType}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">
              {a.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {a.shortDescription}
            </p>

            {/* Document link */}
            {a.documentUrl ? (
              <a
                href={a.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 hover:shadow-sm hover:scale-[1.03] active:scale-[0.97] ${colors.bg} ${colors.text} ${colors.border}`}
              >
                <Icon className="w-3 h-3" />
                {a.documentLabel}
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${colors.bg} ${colors.text} opacity-70`}>
                <Icon className="w-3 h-3" />
                {a.documentLabel}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
