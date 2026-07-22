import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_STATES, searchAllotmentsByRank, ALLOTMENT_FILTER_OPTIONS, type AllotmentEntry } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { StateMap } from '@/components/ui/state-map';
import { HeroBanner } from '@/components/ui/hero-banner';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronRight,
  Sparkles,
  MapPin,
  Star,
  Hash,
  Building2,
  Target,
  TrendingUp,
  Zap,
  SlidersHorizontal,
  Columns3,
  ArrowUpDown,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

type ViewMode = 'state' | 'rank';

const GRADIENT_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-violet-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
  'from-green-500 to-pink-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-emerald-500',
];

const ICON_BG_COLORS = [
  'bg-blue-100 dark:bg-blue-950/40',
  'bg-emerald-100 dark:bg-emerald-950/40',
  'bg-purple-100 dark:bg-purple-950/40',
  'bg-amber-100 dark:bg-amber-950/40',
  'bg-cyan-100 dark:bg-cyan-950/40',
  'bg-green-100 dark:bg-green-950/40',
  'bg-indigo-100 dark:bg-indigo-950/40',
  'bg-teal-100 dark:bg-teal-950/40',
];

const ICON_TEXT_COLORS = [
  'text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600',
  'text-cyan-600', 'text-green-600', 'text-indigo-600', 'text-teal-600',
];

const RANK_RESULTS_PER_PAGE = 15;

// Display-column definitions (order = table order)
type ColumnKey =
  | 'allIndiaRank' | 'stateRank' | 'neetScore' | 'category'
  | 'subcategory' | 'instituteName' | 'seatType' | 'counselling';

const RANK_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'allIndiaRank', label: 'All India Rank' },
  { key: 'stateRank', label: 'State Rank' },
  { key: 'neetScore', label: 'Neet Score' },
  { key: 'category', label: 'Category' },
  { key: 'subcategory', label: 'Subcategory' },
  { key: 'instituteName', label: 'Institute Name' },
  { key: 'seatType', label: 'Seat Type' },
  { key: 'counselling', label: 'Counselling' },
];

type RankSortField = 'allIndiaRank' | 'instituteName' | 'round' | 'category' | 'quota';
const RANK_SORT_FIELDS: { key: RankSortField; label: string }[] = [
  { key: 'allIndiaRank', label: 'All India Rank' },
  { key: 'instituteName', label: 'Institute Name' },
  { key: 'round', label: 'Round' },
  { key: 'category', label: 'Category' },
  { key: 'quota', label: 'Quota' },
];

const quotaOf = (e: AllotmentEntry) =>
  e.counselling === 'All India Quota - MCC' ? 'All India Quota' : 'State Quota';
const eligibilityOf = (e: AllotmentEntry) =>
  e.subcategory.endsWith('-PH') ? 'PwD' : 'General';

export default function AllotmentStatesPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('state');
  const [stateSearch, setStateSearch] = useState('');

  // Rank search state
  const [rankInput, setRankInput] = useState('');
  const [rankRange, setRankRange] = useState(5000);
  const [rankResults, setRankResults] = useState<AllotmentEntry[] | null>(null);
  const [rankSearching, setRankSearching] = useState(false);
  const [rankPage, setRankPage] = useState(1);

  // ── Advanced filters ──
  const [searchBy, setSearchBy] = useState<'rank' | 'score'>('rank');
  const [airMin, setAirMin] = useState('');
  const [airMax, setAirMax] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [fRounds, setFRounds] = useState<Set<number>>(new Set());
  const [fYear, setFYear] = useState('2025');
  const [fInstitute, setFInstitute] = useState('All');
  const [fCourse, setFCourse] = useState('All');
  const [fCollegeType, setFCollegeType] = useState('All');
  const [fSeatType, setFSeatType] = useState('All');
  const [fDomicile, setFDomicile] = useState('All');
  const [fCategory, setFCategory] = useState('All');
  const [fSubcategory, setFSubcategory] = useState('All');
  const [fEligibility, setFEligibility] = useState('All');
  const [fQuota, setFQuota] = useState('All');

  // ── Panels ──
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // ── Display columns ──
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(
    () => new Set(RANK_COLUMNS.map((c) => c.key))
  );

  // ── Sort ──
  const [sortField, setSortField] = useState<RankSortField>('allIndiaRank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Lock background scroll while any panel is open
  const anyPanelOpen = showFilters || showColumns || showSort;
  useEffect(() => {
    document.body.style.overflow = anyPanelOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyPanelOpen]);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return ALL_STATES;
    const q = stateSearch.toLowerCase();
    return ALL_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [stateSearch]);

  const handleSelectState = (state: string) => {
    navigate(`/allotment/${encodeURIComponent(state)}`);
  };

  const handleRankSearch = () => {
    const rank = parseInt(rankInput);
    if (isNaN(rank) || rank < 1) return;
    setRankSearching(true);
    // Use setTimeout to show loading state briefly
    setTimeout(() => {
      const min = Math.max(1, rank - rankRange);
      const max = rank + rankRange;
      const results = searchAllotmentsByRank(min, max);
      setRankResults(results);
      setRankSearching(false);
      setRankPage(1);
    }, 300);
  };

  // Dropdown option lists derived from the current result set
  const instituteOptions = useMemo(
    () => (rankResults ? [...new Set(rankResults.map((e) => e.instituteName))].sort() : []),
    [rankResults]
  );
  const domicileOptions = useMemo(
    () => (rankResults ? [...new Set(rankResults.map((e) => e.counselling))].sort() : []),
    [rankResults]
  );
  const subcategoryOptions = useMemo(
    () => (rankResults ? [...new Set(rankResults.map((e) => e.subcategory))].sort() : []),
    [rankResults]
  );
  const courseOptions = useMemo(
    () => (rankResults ? [...new Set(rankResults.map((e) => e.course))].sort() : []),
    [rankResults]
  );

  // Filter + sort rank results
  const filteredRankResults = useMemo(() => {
    if (!rankResults) return [];
    let data = rankResults;
    if (fCategory !== 'All') data = data.filter((e) => e.category === fCategory);
    if (fSubcategory !== 'All') data = data.filter((e) => e.subcategory === fSubcategory);
    if (fSeatType !== 'All') data = data.filter((e) => e.seatType === fSeatType);
    if (fCollegeType !== 'All') data = data.filter((e) => e.seatType === fCollegeType);
    if (fDomicile !== 'All') data = data.filter((e) => e.counselling === fDomicile);
    if (fInstitute !== 'All') data = data.filter((e) => e.instituteName === fInstitute);
    if (fCourse !== 'All') data = data.filter((e) => e.course === fCourse);
    if (fQuota !== 'All') data = data.filter((e) => quotaOf(e) === fQuota);
    if (fEligibility !== 'All') data = data.filter((e) => eligibilityOf(e) === fEligibility);
    if (fRounds.size > 0) data = data.filter((e) => fRounds.has(e.round));
    if (airMin) data = data.filter((e) => e.allIndiaRank >= Number(airMin));
    if (airMax) data = data.filter((e) => e.allIndiaRank <= Number(airMax));
    if (scoreMin) data = data.filter((e) => e.neetScore >= Number(scoreMin));
    if (scoreMax) data = data.filter((e) => e.neetScore <= Number(scoreMax));

    return [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'allIndiaRank': cmp = a.allIndiaRank - b.allIndiaRank; break;
        case 'instituteName': cmp = a.instituteName.localeCompare(b.instituteName); break;
        case 'round': cmp = a.round - b.round; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'quota': cmp = quotaOf(a).localeCompare(quotaOf(b)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    rankResults, fCategory, fSubcategory, fSeatType, fCollegeType, fDomicile,
    fInstitute, fCourse, fQuota, fEligibility, fRounds, airMin, airMax,
    scoreMin, scoreMax, sortField, sortDir,
  ]);

  const activeFilterCount = [
    fCategory !== 'All', fSubcategory !== 'All', fSeatType !== 'All',
    fCollegeType !== 'All', fDomicile !== 'All', fInstitute !== 'All',
    fCourse !== 'All', fQuota !== 'All', fEligibility !== 'All',
    fRounds.size > 0, airMin !== '', airMax !== '', scoreMin !== '', scoreMax !== '',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setAirMin(''); setAirMax(''); setScoreMin(''); setScoreMax('');
    setFRounds(new Set()); setFInstitute('All'); setFCourse('All');
    setFCollegeType('All'); setFSeatType('All'); setFDomicile('All');
    setFCategory('All'); setFSubcategory('All'); setFEligibility('All'); setFQuota('All');
    setRankPage(1);
  };

  const toggleRound = (r: number) => {
    setFRounds((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
    setRankPage(1);
  };

  const rankTotalPages = Math.ceil(filteredRankResults.length / RANK_RESULTS_PER_PAGE);
  const paginatedRankResults = filteredRankResults.slice(
    (rankPage - 1) * RANK_RESULTS_PER_PAGE,
    rankPage * RANK_RESULTS_PER_PAGE
  );

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <HeroBanner>
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Live Data
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Allotment Mapping
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
              Find which colleges you can get based on your NEET rank. Search by state or enter your rank directly.
            </p>
          </div>
      </HeroBanner>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 gap-1">
          <button
            onClick={() => setMode('state')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === 'state'
                ? 'gradient-primary text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Search by State
          </button>
          <button
            onClick={() => setMode('rank')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === 'rank'
                ? 'gradient-primary text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Hash className="w-4 h-4" />
            Search by Rank
          </button>
        </div>
      </div>

      {/* ===================== STATE MODE ===================== */}
      {mode === 'state' && (
        <div className="space-y-6">
          {/* Search */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search states or union territories..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="pl-12 h-13 text-base rounded-xl border-slate-200 focus:border-emerald-400 focus:shadow-lg transition-all duration-200"
                />
                {stateSearch && (
                  <button
                    onClick={() => setStateSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="text-xs font-medium">Clear</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Count */}
          <p className="text-sm text-muted-foreground px-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">{filteredStates.length}</span> state{filteredStates.length !== 1 ? 's' : ''} found
          </p>

          {/* All India Quota - MCC (always first if visible) */}
          {filteredStates.includes('All India Quota - MCC') && (
            <button onClick={() => handleSelectState('All India Quota - MCC')} className="group w-full text-left">
              <Card className="overflow-hidden border-2 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-r from-emerald-50 via-green-50 to-white dark:from-emerald-950/20 dark:via-green-950/10 dark:to-slate-900 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <Star className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-600 transition-colors">
                        All India Quota - MCC
                      </h3>
                      <p className="text-xs text-emerald-500/80 dark:text-emerald-400/60 mt-0.5">National level counselling across all AIIMS, JIPMER & top government colleges</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-emerald-200">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          )}

          {/* State Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStates
              .filter((s) => s !== 'All India Quota - MCC')
              .map((state, idx) => {
                const colorIdx = idx % GRADIENT_COLORS.length;
                return (
                  <button
                    key={state}
                    onClick={() => handleSelectState(state)}
                    className="group text-left w-full"
                  >
                    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-transparent hover:border-slate-200 dark:hover:border-slate-700 relative">
                      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${GRADIENT_COLORS[colorIdx]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 p-2 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${ICON_BG_COLORS[colorIdx]}`}>
                            <StateMap state={state} className={`w-full h-full ${ICON_TEXT_COLORS[colorIdx]} transition-transform duration-300 group-hover:scale-105`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                              {state}
                            </h3>
                          </div>
                          <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:group-hover:bg-emerald-950/30 transition-all duration-300 group-hover:translate-x-0.5">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ===================== RANK MODE ===================== */}
      {mode === 'rank' && (
        <div className="space-y-6">
          {/* Rank Search Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <CardContent className="p-5 sm:p-7 space-y-6">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Find Colleges by Your Rank</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter your NEET All India Rank to see possible allotments</p>
                </div>
              </div>

              {/* Input Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400" />
                  <Input
                    type="number"
                    placeholder="Enter your All India Rank (e.g. 15000)"
                    value={rankInput}
                    onChange={(e) => setRankInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRankSearch()}
                    className="pl-12 h-13 text-base rounded-xl border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 transition-all duration-200"
                  />
                </div>
                <Button
                  onClick={handleRankSearch}
                  disabled={!rankInput || rankSearching}
                  className="h-13 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rankSearching ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Find Colleges
                    </span>
                  )}
                </Button>
              </div>

              {/* Range Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Range</label>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-full">
                    +/- {rankRange.toLocaleString()} ranks
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={rankRange}
                  onChange={(e) => setRankRange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Narrow (1,000)</span>
                  <span>Wide (50,000)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rank Results */}
          {rankResults !== null && (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Results for Rank #{parseInt(rankInput).toLocaleString()}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Showing allotments in rank range {Math.max(1, parseInt(rankInput) - rankRange).toLocaleString()} - {(parseInt(rankInput) + rankRange).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRankResults.length}</span>
                  <span className="text-muted-foreground">allotments found</span>
                </div>
              </div>

              {/* Toolbar: Report / Filters / Display Columns / Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report incorrect data
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowFilters(true)}
                    className="gradient-primary text-white shadow-sm font-semibold"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-white text-emerald-600 text-[10px] font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowColumns(true)}
                    className="font-semibold hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                  >
                    <Columns3 className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Display Columns</span>
                    <span className="sm:hidden">Columns</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSort(true)}
                    className="font-semibold hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </div>
              </div>

              {filteredRankResults.length === 0 ? (
                <Card className="bg-slate-50 dark:bg-slate-800/50">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No allotments found in this rank range</p>
                    <p className="text-xs text-muted-foreground mt-1">Try increasing the search range or adjusting filters</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Results Table */}
                  <Card className="overflow-hidden">
                    <div className="h-1 gradient-primary" />
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-500 text-white text-[11px] uppercase tracking-wider">
                            {RANK_COLUMNS.filter((c) => visibleCols.has(c.key)).map((c) => (
                              <th key={c.key} className="px-3 sm:px-4 py-3 whitespace-nowrap font-bold">{c.label}</th>
                            ))}
                            <th className="px-3 sm:px-4 py-3 whitespace-nowrap font-bold text-center">Round</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paginatedRankResults.map((entry) => (
                            <tr
                              key={`${entry.counselling}-${entry.id}`}
                              onClick={() => handleSelectState(entry.counselling)}
                              className="group cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors duration-150"
                            >
                              {visibleCols.has('allIndiaRank') && (
                                <td className="px-3 sm:px-4 py-3.5 font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{entry.allIndiaRank.toLocaleString()}</td>
                              )}
                              {visibleCols.has('stateRank') && (
                                <td className="px-3 sm:px-4 py-3.5 text-slate-500 tabular-nums font-medium">{entry.stateRank?.toLocaleString() ?? '-'}</td>
                              )}
                              {visibleCols.has('neetScore') && (
                                <td className="px-3 sm:px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 tabular-nums">{entry.neetScore}</td>
                              )}
                              {visibleCols.has('category') && (
                                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    entry.category === 'General' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                                    entry.category === 'OBC' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                    entry.category === 'SC' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                                    entry.category === 'ST' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                    'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400'
                                  }`}>{entry.category}</span>
                                </td>
                              )}
                              {visibleCols.has('subcategory') && (
                                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap text-slate-500 font-medium text-[11px]">{entry.subcategory}</td>
                              )}
                              {visibleCols.has('instituteName') && (
                                <td className="px-3 sm:px-4 py-3.5 max-w-[280px]">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">{entry.instituteName}</p>
                                </td>
                              )}
                              {visibleCols.has('seatType') && (
                                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    entry.seatType === 'Government' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                    entry.seatType === 'Deemed' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                                    'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                                  }`}>{entry.seatType}</span>
                                </td>
                              )}
                              {visibleCols.has('counselling') && (
                                <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{entry.counselling === 'All India Quota - MCC' ? 'MCC' : entry.counselling}</span>
                                </td>
                              )}
                              <td className="px-3 sm:px-4 py-3.5 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">R{entry.round}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Pagination
                    page={rankPage}
                    totalPages={rankTotalPages}
                    onPageChange={setRankPage}
                    itemCount={paginatedRankResults.length}
                    totalItems={filteredRankResults.length}
                  />
                </>
              )}
            </div>
          )}

          {/* Empty State before search */}
          {rankResults === null && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {[
                {
                  icon: Target,
                  title: 'Enter Your Rank',
                  description: 'Type your NEET All India Rank in the search box above.',
                  gradient: 'from-indigo-500 to-blue-600',
                  glow: 'shadow-indigo-500/20',
                  bg: 'bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20',
                },
                {
                  icon: Building2,
                  title: 'See Matching Colleges',
                  description: 'We search across all 35 states & MCC to find colleges in your rank range.',
                  gradient: 'from-purple-500 to-violet-600',
                  glow: 'shadow-purple-500/20',
                  bg: 'bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20',
                },
                {
                  icon: TrendingUp,
                  title: 'Plan Your Choices',
                  description: 'Compare allotments across categories and rounds to make an informed choice list.',
                  gradient: 'from-pink-500 to-green-600',
                  glow: 'shadow-pink-500/20',
                  bg: 'bg-gradient-to-br from-pink-50 to-green-50/50 dark:from-pink-950/30 dark:to-green-950/20',
                },
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className={`group relative overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:border-transparent hover:shadow-2xl ${step.glow} transition-all duration-500 h-full`}>
                    <div className={`h-1 bg-gradient-to-r ${step.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className={`absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-[0.06] blur-3xl transition-opacity duration-700 pointer-events-none`} />
                    <CardContent className="p-5 text-center space-y-3 relative">
                      <motion.div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto shadow-lg ${step.glow}`}
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      >
                        <step.icon className="w-6 h-6 text-white" />
                      </motion.div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{step.title}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{step.description}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className={`w-8 h-8 rounded-full ${step.bg} border border-current/5 flex items-center justify-center text-sm font-extrabold bg-gradient-to-br ${step.gradient} text-white shadow-sm`}>
                          {idx + 1}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===== FILTERS MODAL ===== */}
          {showFilters && (
            <div className="fixed inset-0 z-50 flex items-start justify-center">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={() => setShowFilters(false)} />
              <div className="relative z-50 w-full max-w-3xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl slide-in-from-top-4 fade-in">
                {/* Header */}
                <div className="gradient-primary px-6 py-5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/10">
                        <SlidersHorizontal className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-white">Advanced Filters</h2>
                        <p className="text-emerald-100 text-xs mt-0.5">Refine your search results by rank</p>
                      </div>
                    </div>
                    <button onClick={() => setShowFilters(false)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6 space-y-7">
                  {/* Rank & Round */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-slate-900 dark:bg-slate-100" /> Rank &amp; Round
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSearchBy('rank')}
                        className={`h-11 rounded-xl text-sm font-bold transition-all ${searchBy === 'rank' ? 'gradient-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                      >
                        Search by Rank
                      </button>
                      <button
                        onClick={() => setSearchBy('score')}
                        className={`h-11 rounded-xl text-sm font-bold transition-all ${searchBy === 'score' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                      >
                        Search by Score
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`rounded-xl border-2 p-4 transition-colors ${searchBy === 'rank' ? 'border-emerald-300 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">All India Rank Range</p>
                        <div className="flex items-center gap-3">
                          <Input type="number" placeholder="0" value={airMin} onChange={(e) => { setAirMin(e.target.value); setRankPage(1); }} className="h-11 text-sm" />
                          <span className="text-slate-400 shrink-0">—</span>
                          <Input type="number" placeholder="5000000" value={airMax} onChange={(e) => { setAirMax(e.target.value); setRankPage(1); }} className="h-11 text-sm" />
                        </div>
                      </div>
                      <div className={`rounded-xl border-2 p-4 transition-colors ${searchBy === 'score' ? 'border-emerald-300 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">NEET UG Score Range</p>
                        <div className="flex items-center gap-3">
                          <Input type="number" placeholder="113" value={scoreMin} onChange={(e) => { setScoreMin(e.target.value); setRankPage(1); }} className="h-11 text-sm" />
                          <span className="text-slate-400 shrink-0">—</span>
                          <Input type="number" placeholder="720" value={scoreMax} onChange={(e) => { setScoreMax(e.target.value); setRankPage(1); }} className="h-11 text-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Rounds</p>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3].map((r) => (
                            <button
                              key={r}
                              onClick={() => toggleRound(r)}
                              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:scale-[1.03] active:scale-[0.97] ${fRounds.has(r) ? 'gradient-primary text-white border-transparent shadow-md' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600'}`}
                            >
                              R{r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">NEET UG Year</p>
                        <div className="flex gap-2">
                          {['2025', '2026'].map((y) => (
                            <button
                              key={y}
                              onClick={() => setFYear(y)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${fYear === y ? 'gradient-primary text-white border-transparent shadow-md' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600'}`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Institute */}
                  <section className="space-y-3 rounded-xl bg-blue-50/40 dark:bg-blue-950/10 p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-blue-500" /> Institute
                    </h3>
                    <select value={fInstitute} onChange={(e) => { setFInstitute(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                      <option value="All">Select Institute</option>
                      {instituteOptions.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </section>

                  {/* Course & Branch */}
                  <section className="space-y-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/10 p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-purple-500" /> Course &amp; Branch
                    </h3>
                    <select value={fCourse} onChange={(e) => { setFCourse(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                      <option value="All">Select Course</option>
                      {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </section>

                  {/* College Type, Seat Type & Domicile */}
                  <section className="space-y-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/10 p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-amber-500" /> College Type, Seat Type &amp; Domicile
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">College Type</p>
                        <select value={fCollegeType} onChange={(e) => { setFCollegeType(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select College Type</option>
                          {ALLOTMENT_FILTER_OPTIONS.seatTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Seat Type</p>
                        <select value={fSeatType} onChange={(e) => { setFSeatType(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Seat Type</option>
                          {ALLOTMENT_FILTER_OPTIONS.seatTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Domicile</p>
                        <select value={fDomicile} onChange={(e) => { setFDomicile(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Domicile</option>
                          {domicileOptions.map((d) => <option key={d} value={d}>{d === 'All India Quota - MCC' ? 'MCC' : d}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Category */}
                  <section className="space-y-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/10 p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-emerald-500" /> Category
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Category</p>
                        <select value={fCategory} onChange={(e) => { setFCategory(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Category</option>
                          {ALLOTMENT_FILTER_OPTIONS.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Subcategory</p>
                        <select value={fSubcategory} onChange={(e) => { setFSubcategory(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Subcategory</option>
                          {subcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Eligibility & Quota */}
                  <section className="space-y-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/10 p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-rose-500" /> Eligibility &amp; Quota
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Eligibility</p>
                        <select value={fEligibility} onChange={(e) => { setFEligibility(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Eligibility</option>
                          <option value="General">General</option>
                          <option value="PwD">PwD</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-1.5">Quota</p>
                        <select value={fQuota} onChange={(e) => { setFQuota(e.target.value); setRankPage(1); }} className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors">
                          <option value="All">Select Quota</option>
                          <option value="All India Quota">All India Quota</option>
                          <option value="State Quota">State Quota</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                  <Button variant="outline" onClick={clearAllFilters} className="h-11 px-6 rounded-xl border-2 hover:border-emerald-300 hover:text-emerald-600 transition-all">
                    Clear All
                  </Button>
                  <Button onClick={() => { setRankPage(1); setShowFilters(false); }} className="gradient-primary text-white h-11 px-8 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== DISPLAY COLUMNS MODAL ===== */}
          {showColumns && (
            <div className="fixed inset-0 z-50 flex items-start justify-center">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={() => setShowColumns(false)} />
              <div className="relative z-50 w-full max-w-md mx-4 mt-16 mb-8 max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 slide-in-from-top-4 fade-in">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Display Columns</h2>
                  <button onClick={() => setShowColumns(false)} className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-1">
                  {RANK_COLUMNS.map((col) => {
                    const checked = visibleCols.has(col.key);
                    return (
                      <button
                        key={col.key}
                        onClick={() => setVisibleCols((prev) => {
                          const next = new Set(prev);
                          if (next.has(col.key)) next.delete(col.key); else next.add(col.key);
                          return next;
                        })}
                        className="w-full flex items-center gap-3 py-2.5 px-1 text-left group"
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${checked ? 'gradient-primary border-transparent' : 'border-slate-300 dark:border-slate-600'}`}>
                          {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center gap-3">
                  <Button variant="outline" onClick={() => setVisibleCols(new Set(RANK_COLUMNS.map((c) => c.key)))} className="flex-1 h-11 rounded-xl border-2">Show All</Button>
                  <Button variant="outline" onClick={() => setVisibleCols(new Set())} className="flex-1 h-11 rounded-xl border-2">Hide All</Button>
                  <Button onClick={() => setShowColumns(false)} className="flex-1 gradient-primary text-white h-11 rounded-xl font-semibold">Apply</Button>
                </div>
              </div>
            </div>
          )}

          {/* ===== SORT MODAL ===== */}
          {showSort && (
            <div className="fixed inset-0 z-50 flex items-start justify-center">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={() => setShowSort(false)} />
              <div className="relative z-50 w-full max-w-md mx-4 mt-16 mb-8 flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 slide-in-from-top-4 fade-in">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Sort By</h2>
                  <button onClick={() => setShowSort(false)} className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-500 mb-2">Select Field</p>
                    {RANK_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField(f.key); setRankPage(1); }} className="w-full flex items-center gap-3 py-2 text-left group">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${sortField === f.key ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {sortField === f.key && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </span>
                        <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-1">
                    <p className="text-sm font-bold text-slate-500 mb-2">Sort Direction</p>
                    {(['asc', 'desc'] as const).map((d) => (
                      <button key={d} onClick={() => { setSortDir(d); setRankPage(1); }} className="w-full flex items-center gap-3 py-2 text-left group">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${sortDir === d ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {sortDir === d && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </span>
                        <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{d === 'asc' ? 'Ascending' : 'Descending'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center gap-3">
                  <Button variant="outline" onClick={() => setShowSort(false)} className="flex-1 h-11 rounded-xl border-2">Cancel</Button>
                  <Button onClick={() => setShowSort(false)} className="flex-1 gradient-primary text-white h-11 rounded-xl font-semibold">Apply Sort</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
