import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections, byId, distinct, type College, type ClosingRank } from '@/lib/data-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  ArrowUpDown,
  Download,
  X,
  BarChart3,
  ChevronRight,
  Building2,
  Target,
  FileText,
  Award,
  Sparkles,
  GraduationCap,
  MapPin,
  ArrowRight,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

type SortField = 'college' | 'course' | 'category' | 'quota' | 'round' | 'closingRank' | 'closingScore';
type SearchMode = 'rank' | 'score';

/** A closing-rank row joined against its college. The API is normalised — rank rows carry only a collegeId. */
interface InsightRow extends ClosingRank {
  collegeName: string;
  collegeState: string;
  collegeCity: string;
  collegeType: string;
}

const PAGE_SIZE = 12;

export default function RankInsightsPage() {
  const navigate = useNavigate();

  const { data, loading, error } = useCollections<{ colleges: College[]; closingRanks: ClosingRank[] }>([
    'colleges',
    'closingRanks',
  ]);

  // Filters
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [college, setCollege] = useState('All');
  const [course, setCourse] = useState('All');
  const [category, setCategory] = useState('All');
  const [quota, setQuota] = useState('All');
  const [round, setRound] = useState('All');
  const [rankMin, setRankMin] = useState('');
  const [rankMax, setRankMax] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('rank');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Table state
  const [sortBy, setSortBy] = useState<SortField>('closingRank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showFilters]);

  const activeFilterCount = [
    state !== 'All', college !== 'All', course !== 'All',
    category !== 'All', quota !== 'All', round !== 'All',
    rankMin !== '', rankMax !== '', scoreMin !== '', scoreMax !== '',
  ].filter(Boolean).length;

  // ── join: every rank row gets its college's name/state/city/type ──
  const rows = useMemo<InsightRow[]>(() => {
    const collegeMap = byId(data.colleges ?? []);
    return (data.closingRanks ?? []).map((r) => {
      const c = collegeMap.get(r.collegeId);
      return {
        ...r,
        collegeName: c?.name ?? 'Unknown college',
        collegeState: c?.state ?? '',
        collegeCity: c?.city ?? '',
        collegeType: c?.type ?? '',
      };
    });
  }, [data.colleges, data.closingRanks]);

  // Filter dropdown options built from the live data, so new years/quotas appear automatically.
  const filterOptions = useMemo(() => ({
    states: distinct(rows, 'collegeState'),
    colleges: distinct(rows, 'collegeName'),
    courses: distinct(rows, 'course'),
    categories: distinct(rows, 'category'),
    quotas: distinct(rows, 'quota'),
    rounds: [...new Set(rows.map((r) => r.round))].sort((a, b) => a - b),
  }), [rows]);

  const latestYear = useMemo(
    () => (rows.length ? Math.max(...rows.map((r) => r.year)) : null),
    [rows]
  );

  // Latest (most recent year, then highest round) entry per college+course+category+quota.
  const baseEntries = useMemo(() => {
    const grouped = new Map<string, InsightRow>();
    for (const entry of rows) {
      const key = `${entry.collegeId}|${entry.course}|${entry.category}|${entry.quota}`;
      const existing = grouped.get(key);
      if (
        !existing ||
        entry.year > existing.year ||
        (entry.year === existing.year && entry.round > existing.round)
      ) {
        grouped.set(key, entry);
      }
    }
    return [...grouped.values()];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = baseEntries;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        e.collegeName.toLowerCase().includes(q) ||
        e.course.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.quota.toLowerCase().includes(q)
      );
    }
    if (state !== 'All') list = list.filter((e) => e.collegeState === state);
    if (college !== 'All') list = list.filter((e) => e.collegeName === college);
    if (course !== 'All') list = list.filter((e) => e.course === course);
    if (category !== 'All') list = list.filter((e) => e.category === category);
    if (quota !== 'All') list = list.filter((e) => e.quota === quota);
    if (round !== 'All') list = list.filter((e) => e.round === Number(round));
    if (rankMin) list = list.filter((e) => e.closingRank >= Number(rankMin));
    if (rankMax) list = list.filter((e) => e.closingRank <= Number(rankMax));
    if (scoreMin) list = list.filter((e) => (e.closingScore ?? 0) >= Number(scoreMin));
    if (scoreMax) list = list.filter((e) => (e.closingScore ?? 0) <= Number(scoreMax));

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'college': cmp = a.collegeName.localeCompare(b.collegeName); break;
        case 'course': cmp = a.course.localeCompare(b.course); break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'quota': cmp = a.quota.localeCompare(b.quota); break;
        case 'round': cmp = a.round - b.round; break;
        case 'closingRank': cmp = a.closingRank - b.closingRank; break;
        case 'closingScore': cmp = (a.closingScore ?? 0) - (b.closingScore ?? 0); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [baseEntries, search, state, college, course, category, quota, round, rankMin, rankMax, scoreMin, scoreMax, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // A narrowing filter can leave `page` past the end of the new result set, which
  // renders an empty grid with no pagination control — as if the data vanished.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const handleReset = () => {
    setSearch(''); setState('All'); setCollege('All'); setCourse('All');
    setCategory('All'); setQuota('All'); setRound('All');
    setRankMin(''); setRankMax(''); setScoreMin(''); setScoreMax('');
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    setShowFilters(false);
  };

  const handleRowClick = (entry: InsightRow) => {
    const params = new URLSearchParams({
      collegeId: entry.collegeId,
      college: entry.collegeName,
      course: entry.course,
      category: entry.category,
      quota: entry.quota,
    });
    navigate(`/rank-insights/detail?${params.toString()}`);
  };

  const handleExportCsv = () => {
    const header = 'College,State,Course,Category,Quota,Year,Round,Closing Rank,Closing Score\n';
    const csvRows = filtered.map((e) =>
      `"${e.collegeName}","${e.collegeState}","${e.course}","${e.category}","${e.quota}",${e.year},${e.round},${e.closingRank},${e.closingScore ?? 'N/A'}`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'closing-rank-insights.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  function SortHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none transition-colors duration-150 ${className || ''}`}
      >
        <span className="flex items-center gap-1.5">
          {children}
          <ArrowUpDown className={`w-3 h-3 transition-colors duration-200 ${active ? 'text-red-600' : 'text-slate-400'}`} />
        </span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading closing rank data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load closing ranks"
          description={error}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  NEET UG Counselling
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-red-200" />
                  Closing Rank Insights
                </h1>
                <p className="text-red-100/90 text-sm max-w-xl leading-relaxed">
                  Find your safe rank range. Compare closing ranks across colleges, categories & quotas. Click any entry to see year-over-year trends.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  onClick={() => setShowFilters(true)}
                  className="bg-white text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm font-semibold"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Advanced Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <Button onClick={handleExportCsv} className="bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all duration-200">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FILTER MODAL ========== */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFilters(false)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-3xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            {/* Modal Header */}
            <div className="gradient-primary px-6 py-5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <SlidersHorizontal className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Advanced Filters</h2>
                    <p className="text-red-200 text-xs mt-0.5">Refine your search results</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
              <div className="p-6 space-y-7">

                {/* ---- Section 1: Rank & Round Filters ---- */}
                <section className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-red-500" />
                    Rank & Round Filters
                  </h3>

                  {/* Search Mode Toggle */}
                  <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setSearchMode('rank')}
                      className={`py-3 text-sm font-semibold transition-all duration-200 ${
                        searchMode === 'rank'
                          ? 'gradient-primary text-white shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Search by Rank
                    </button>
                    <button
                      onClick={() => setSearchMode('score')}
                      className={`py-3 text-sm font-semibold transition-all duration-200 ${
                        searchMode === 'score'
                          ? 'gradient-primary text-white shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Search by Score
                    </button>
                  </div>

                  {/* Range Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Rank Range */}
                    <div className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                      searchMode === 'rank'
                        ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`text-xs font-bold ${searchMode === 'rank' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                          All India Rank Range
                        </p>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          placeholder="0"
                          value={rankMin}
                          onChange={(e) => { setRankMin(e.target.value); setPage(1); }}
                          className="text-sm h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-red-400 transition-colors duration-200"
                        />
                        <span className="text-slate-400 font-medium shrink-0">—</span>
                        <Input
                          type="number"
                          placeholder="5000000"
                          value={rankMax}
                          onChange={(e) => { setRankMax(e.target.value); setPage(1); }}
                          className="text-sm h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-red-400 transition-colors duration-200"
                        />
                      </div>
                    </div>

                    {/* Score Range */}
                    <div className={`rounded-xl border-2 p-4 transition-all duration-300 ${
                      searchMode === 'score'
                        ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`text-xs font-bold ${searchMode === 'score' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                          NEET UG Score Range
                        </p>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          placeholder="113"
                          value={scoreMin}
                          onChange={(e) => { setScoreMin(e.target.value); setPage(1); }}
                          className="text-sm h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-red-400 transition-colors duration-200"
                        />
                        <span className="text-slate-400 font-medium shrink-0">—</span>
                        <Input
                          type="number"
                          placeholder="720"
                          value={scoreMax}
                          onChange={(e) => { setScoreMax(e.target.value); setPage(1); }}
                          className="text-sm h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-red-400 transition-colors duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rounds + Year Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Rounds */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Rounds</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setRound('All'); setPage(1); }}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                            round === 'All'
                              ? 'gradient-primary text-white border-transparent shadow-md'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          All
                        </button>
                        {filterOptions.rounds.map((r) => (
                          <button
                            key={r}
                            onClick={() => { setRound(String(r)); setPage(1); }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                              round === String(r)
                                ? 'gradient-primary text-white border-transparent shadow-md'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            Round {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Pills */}
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Category</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setCategory('All'); setPage(1); }}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                            category === 'All'
                              ? 'gradient-primary text-white border-transparent shadow-md'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          All
                        </button>
                        {filterOptions.categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => { setCategory(String(cat)); setPage(1); }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                              category === String(cat)
                                ? 'gradient-primary text-white border-transparent shadow-md'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---- Section 2: Location & Institute ---- */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-blue-500" />
                    Location & Institute
                  </h3>

                  <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State / Counselling</label>
                        <select
                          value={state}
                          onChange={(e) => { setState(e.target.value); setPage(1); }}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 hover:border-red-300 appearance-none cursor-pointer"
                        >
                          <option value="All">All States</option>
                          {filterOptions.states.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Institute</label>
                        <select
                          value={college}
                          onChange={(e) => { setCollege(e.target.value); setPage(1); }}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 hover:border-red-300 appearance-none cursor-pointer"
                        >
                          <option value="All">Select Institute</option>
                          {filterOptions.colleges.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---- Section 3: Course & Quota ---- */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-purple-500" />
                    Course & Quota
                  </h3>

                  <div className="rounded-xl bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Course</label>
                        <select
                          value={course}
                          onChange={(e) => { setCourse(e.target.value); setPage(1); }}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 hover:border-red-300 appearance-none cursor-pointer"
                        >
                          <option value="All">All Courses</option>
                          {filterOptions.courses.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quota</label>
                        <select
                          value={quota}
                          onChange={(e) => { setQuota(e.target.value); setPage(1); }}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 hover:border-red-300 appearance-none cursor-pointer"
                        >
                          <option value="All">All Quotas</option>
                          {filterOptions.quotas.map((q) => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ---- Section 4: Quick Search ---- */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-emerald-500" />
                    Quick Search
                  </h3>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Type college name, course, category..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="pl-11 h-12 text-sm rounded-xl border-slate-200 dark:border-slate-600 focus:border-red-400 focus:shadow-lg transition-all duration-200"
                    />
                  </div>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-11 px-6 rounded-xl border-2 hover:border-red-300 hover:text-red-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Clear All
                </Button>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      <span className="font-bold text-red-600">{activeFilterCount}</span> filter{activeFilterCount !== 1 ? 's' : ''} active
                    </span>
                  )}
                  <Button
                    onClick={handleApplyFilters}
                    className="gradient-primary text-white h-11 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-semibold"
                  >
                    Show {filtered.length} Results
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Records', value: rows.length.toLocaleString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Colleges Tracked', value: String(filterOptions.colleges.length), icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Filtered Results', value: String(filtered.length), icon: Target, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Latest Year', value: latestYear ? String(latestYear) : '--', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{s.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Filters Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Active filters:</span>
          {state !== 'All' && <FilterTag label={`State: ${state}`} onRemove={() => { setState('All'); setPage(1); }} />}
          {college !== 'All' && <FilterTag label={`College: ${college}`} onRemove={() => { setCollege('All'); setPage(1); }} />}
          {course !== 'All' && <FilterTag label={`Course: ${course}`} onRemove={() => { setCourse('All'); setPage(1); }} />}
          {category !== 'All' && <FilterTag label={`Category: ${category}`} onRemove={() => { setCategory('All'); setPage(1); }} />}
          {quota !== 'All' && <FilterTag label={`Quota: ${quota}`} onRemove={() => { setQuota('All'); setPage(1); }} />}
          {round !== 'All' && <FilterTag label={`Round ${round}`} onRemove={() => { setRound('All'); setPage(1); }} />}
          {rankMin && <FilterTag label={`Rank >= ${rankMin}`} onRemove={() => { setRankMin(''); setPage(1); }} />}
          {rankMax && <FilterTag label={`Rank <= ${rankMax}`} onRemove={() => { setRankMax(''); setPage(1); }} />}
          {scoreMin && <FilterTag label={`Score >= ${scoreMin}`} onRemove={() => { setScoreMin(''); setPage(1); }} />}
          {scoreMax && <FilterTag label={`Score <= ${scoreMax}`} onRemove={() => { setScoreMax(''); setPage(1); }} />}
          <button onClick={handleReset} className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* View Toggle + Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> results
          {activeFilterCount > 0 && <span className="text-red-600 dark:text-red-400 font-medium"> (filtered)</span>}
        </p>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No results found"
          description="Adjust your filters or search query to find closing rank data."
          action={{ label: 'Clear Filters', onClick: handleReset }}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((entry) => (
            <div
              key={entry.id}
              onClick={() => handleRowClick(entry)}
              className="group cursor-pointer rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-700/50 overflow-hidden hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="p-4 sm:p-5 relative">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-red-500/20 transition-all duration-300">
                    <GraduationCap className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white leading-snug truncate group-hover:text-red-300 transition-colors duration-200">
                      {entry.collegeName}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" /> {entry.collegeCity}, {entry.collegeState}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {entry.collegeType && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      entry.collegeType === 'Government' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      entry.collegeType === 'Deemed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>{entry.collegeType}</span>
                  )}
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{entry.course}</span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{entry.category}</span>
                </div>

                {/* Rank / Score / Round */}
                <div className="rounded-xl bg-slate-800/80 border border-slate-700/50 p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Rank</p>
                      <p className="text-lg font-extrabold tabular-nums mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                        #{(entry.closingRank ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center border-x border-slate-700/50">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Score</p>
                      <p className="text-lg font-extrabold text-emerald-400 tabular-nums mt-0.5">
                        {entry.closingScore ?? 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Round</p>
                      <p className="text-lg font-extrabold text-red-400 mt-0.5">
                        R{entry.round}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-slate-500 truncate max-w-[65%] font-medium">{entry.quota}</span>
                  <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-3.5 h-3.5 text-red-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <SortHeader field="college">College</SortHeader>
                  <SortHeader field="course">Course</SortHeader>
                  <SortHeader field="category">Category</SortHeader>
                  <SortHeader field="quota">Quota</SortHeader>
                  <SortHeader field="round" className="text-center">Round</SortHeader>
                  <SortHeader field="closingRank" className="text-right">Closing Rank</SortHeader>
                  <SortHeader field="closingScore" className="text-right">Closing Score</SortHeader>
                  <th className="px-4 py-3.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => handleRowClick(entry)}
                    className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100 max-w-[220px]">
                      <div className="truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">{entry.collegeName}</div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {entry.collegeCity}, {entry.collegeState}
                        {entry.collegeType && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            entry.collegeType === 'Government'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : entry.collegeType === 'Deemed'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {entry.collegeType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {entry.course}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium max-w-[180px] truncate">
                      {entry.quota}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 font-extrabold text-red-600 dark:text-red-400 text-[11px]">
                        R{entry.round}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-slate-50 tabular-nums text-sm">
                      #{(entry.closingRank ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {entry.closingScore ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all duration-200 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={paginated.length}
        totalItems={filtered.length}
      />

      {/* Student Tip Banner */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Pro Tip for Students</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Click on any college entry to see year-over-year closing rank trends. This helps you understand if a college is getting more or less competitive over time, so you can make a safer choice list.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors duration-200 group/tag">
      {label}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-4 h-4 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors duration-200">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
