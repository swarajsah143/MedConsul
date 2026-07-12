import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllotments, byRankRange, type AllotmentEntry } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronRight,
  Sparkles,
  MapPin,
  Star,
  Globe,
  Hash,
  ArrowRight,
  GraduationCap,
  Building2,
  Target,
  TrendingUp,
  Zap,
  Loader2,
  AlertTriangle,
  Database,
} from 'lucide-react';

type ViewMode = 'state' | 'rank';

const GRADIENT_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-violet-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-emerald-500',
];

const ICON_BG_COLORS = [
  'bg-blue-100 dark:bg-blue-950/40',
  'bg-emerald-100 dark:bg-emerald-950/40',
  'bg-purple-100 dark:bg-purple-950/40',
  'bg-amber-100 dark:bg-amber-950/40',
  'bg-cyan-100 dark:bg-cyan-950/40',
  'bg-rose-100 dark:bg-rose-950/40',
  'bg-indigo-100 dark:bg-indigo-950/40',
  'bg-teal-100 dark:bg-teal-950/40',
];

const ICON_TEXT_COLORS = [
  'text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600',
  'text-cyan-600', 'text-rose-600', 'text-indigo-600', 'text-teal-600',
];

const CATEGORY_STYLES: Record<string, { gradient: string; bg: string; text: string; glow: string }> = {
  General: { gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', glow: 'shadow-slate-500/15' },
  OBC: { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', glow: 'shadow-amber-500/15' },
  SC: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', glow: 'shadow-blue-500/15' },
  ST: { gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', glow: 'shadow-emerald-500/15' },
};
const DEFAULT_CAT_STYLE = { gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', glow: 'shadow-purple-500/15' };

const SEAT_STYLES: Record<string, { bg: string; text: string }> = {
  Government: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400' },
  Deemed: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400' },
};
const DEFAULT_SEAT_STYLE = { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' };

const RANK_RESULTS_PER_PAGE = 15;

export default function AllotmentStatesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload, counsellings, filterOptions } = useAllotments();

  const [mode, setMode] = useState<ViewMode>('state');
  const [stateSearch, setStateSearch] = useState('');

  // Rank search state
  const [rankInput, setRankInput] = useState('');
  const [rankRange, setRankRange] = useState(5000);
  const [rankResults, setRankResults] = useState<AllotmentEntry[] | null>(null);
  // Snapshot of the rank + range the CURRENT results were computed for. The header used
  // to re-parse `rankInput` at RENDER time, so clearing the field after a search printed
  // "Results for Rank #NaN" over results that were still perfectly valid.
  const [searchedRank, setSearchedRank] = useState<{ rank: number; min: number; max: number } | null>(null);
  const [rankSearching, setRankSearching] = useState(false);
  const [rankPage, setRankPage] = useState(1);
  const [rankCategory, setRankCategory] = useState('All');
  const [rankRound, setRankRound] = useState('All');

  // Counselling list comes from the allotments actually loaded — a counselling with
  // no rows is not offered, so nobody clicks through to an empty table.
  const filteredStates = useMemo(() => {
    if (!stateSearch) return counsellings;
    const q = stateSearch.toLowerCase();
    return counsellings.filter((s) => s.toLowerCase().includes(q));
  }, [counsellings, stateSearch]);

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
      setRankResults(byRankRange(data, min, max));
      setSearchedRank({ rank, min, max });
      setRankSearching(false);
      setRankPage(1);
    }, 300);
  };

  // Filter rank results
  const filteredRankResults = useMemo(() => {
    if (!rankResults) return [];
    let rows = rankResults;
    if (rankCategory !== 'All') rows = rows.filter((e) => e.category === rankCategory);
    if (rankRound !== 'All') rows = rows.filter((e) => e.round === Number(rankRound));
    return rows;
  }, [rankResults, rankCategory, rankRound]);

  const rankTotalPages = Math.ceil(filteredRankResults.length / RANK_RESULTS_PER_PAGE);
  const paginatedRankResults = filteredRankResults.slice(
    (rankPage - 1) * RANK_RESULTS_PER_PAGE,
    rankPage * RANK_RESULTS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load allotment data"
          description={error}
          action={{ label: 'Try Again', onClick: reload }}
        />
      </div>
    );
  }

  // The collection is empty — no rows have been loaded yet. This is NOT the same as
  // "your filters matched nothing", and must not be dressed up as a search miss.
  if (data.length === 0) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="gradient-primary p-6 sm:p-8 lg:p-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            <div className="relative z-10 space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Allotment Mapping
              </h1>
              <p className="text-red-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
                Find which colleges you can get based on your NEET rank.
              </p>
            </div>
          </div>
        </div>
        <EmptyState
          icon={Database}
          title="No allotment data yet"
          description="Seat allotment records haven't been loaded. An admin can add them under Manage Data → Seat Allotments."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Live Data
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Allotment Mapping
            </h1>
            <p className="text-red-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
              Find which colleges you can get based on your NEET rank. Search by state or enter your rank directly.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 gap-1">
          <button
            onClick={() => setMode('state')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              mode === 'state'
                ? 'gradient-primary text-white shadow-lg shadow-red-500/25 scale-[1.02]'
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
                ? 'gradient-primary text-white shadow-lg shadow-red-500/25 scale-[1.02]'
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
            <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
            <CardContent className="p-4 sm:p-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search states or union territories..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="pl-12 h-13 text-base rounded-xl border-slate-200 focus:border-red-400 focus:shadow-lg transition-all duration-200"
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
              <Card className="overflow-hidden border-2 border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 via-rose-50 to-white dark:from-red-950/20 dark:via-rose-950/10 dark:to-slate-900 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <Star className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-red-700 dark:text-red-400 group-hover:text-red-600 transition-colors">
                        All India Quota - MCC
                      </h3>
                      <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-0.5">National level counselling across all AIIMS, JIPMER & top government colleges</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-red-200">
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
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${ICON_BG_COLORS[colorIdx]}`}>
                            <Globe className={`w-5 h-5 ${ICON_TEXT_COLORS[colorIdx]} transition-transform duration-300 group-hover:rotate-12`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">
                              {state}
                            </h3>
                          </div>
                          <div className="shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 dark:group-hover:bg-red-950/30 transition-all duration-300 group-hover:translate-x-0.5">
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
          {rankResults !== null && searchedRank !== null && (
            <div className="space-y-4">
              {/* Results Header — rendered from the SEARCHED snapshot, never from the live input. */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Results for Rank #{searchedRank.rank.toLocaleString()}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Showing allotments in rank range {searchedRank.min.toLocaleString()} - {searchedRank.max.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRankResults.length}</span>
                  <span className="text-muted-foreground">allotments found</span>
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 mr-1">Category:</span>
                {['All', ...filterOptions.categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setRankCategory(cat); setRankPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                      rankCategory === cat
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>

                <span className="text-xs font-semibold text-slate-500 mr-1">Round:</span>
                {['All', ...filterOptions.rounds.map(String)].map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRankRound(r); setRankPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                      rankRound === r
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {r === 'All' ? 'All' : `R${r}`}
                  </button>
                ))}
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
                  {/* Results Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedRankResults.map((entry, idx) => {
                      const catStyle = CATEGORY_STYLES[entry.category] || DEFAULT_CAT_STYLE;
                      const seatStyle = SEAT_STYLES[entry.seatType] || DEFAULT_SEAT_STYLE;
                      return (
                        <motion.div
                          key={`${entry.counselling}-${entry.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <Card
                            className={`group relative overflow-hidden cursor-pointer border-slate-200/60 dark:border-slate-800/60 hover:border-transparent transition-all duration-500 hover:shadow-2xl ${catStyle.glow} h-full bg-white dark:bg-slate-900`}
                            onClick={() => handleSelectState(entry.counselling)}
                          >
                            {/* Top gradient bar */}
                            <div className={`h-1 bg-gradient-to-r ${catStyle.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                            {/* Hover glow */}
                            <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full bg-gradient-to-br ${catStyle.gradient} opacity-0 group-hover:opacity-[0.07] blur-3xl transition-opacity duration-700 pointer-events-none`} />

                            <CardContent className="p-4 relative">
                              {/* Header: Icon + Round Badge */}
                              <div className="flex items-start justify-between mb-3">
                                <motion.div
                                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catStyle.gradient} flex items-center justify-center shadow-lg ${catStyle.glow}`}
                                  whileHover={{ scale: 1.15, rotate: 5 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                                >
                                  <GraduationCap className="w-5 h-5 text-white" />
                                </motion.div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40">
                                  <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">Round</span>
                                  <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">{entry.round}</span>
                                </span>
                              </div>

                              {/* Institute Name */}
                              <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 dark:group-hover:from-indigo-400 dark:group-hover:to-purple-400 transition-all duration-300 mb-1.5">
                                {entry.instituteName}
                              </h3>

                              {/* Counselling location */}
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-3">
                                <MapPin className="w-2.5 h-2.5" />
                                {entry.counselling === 'All India Quota - MCC' ? 'MCC — All India Quota' : entry.counselling}
                              </p>

                              {/* Stats Row */}
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 p-2.5 text-center border border-slate-100 dark:border-slate-800">
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">All India Rank</p>
                                  <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight mt-0.5">
                                    #{entry.allIndiaRank.toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 p-2.5 text-center border border-emerald-100 dark:border-emerald-900/30">
                                  <p className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-widest">NEET Score</p>
                                  <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-tight mt-0.5">
                                    {entry.neetScore ?? '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Bottom: Tags + Arrow */}
                              <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${catStyle.bg} ${catStyle.text} border-current/10`}>
                                  {entry.category}
                                </span>
                                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${seatStyle.bg} ${seatStyle.text}`}>
                                  {entry.seatType}
                                </span>
                                <motion.div
                                  className="ml-auto opacity-0 group-hover:opacity-100"
                                  initial={false}
                                  animate={{ x: 0 }}
                                  whileHover={{ x: 3 }}
                                >
                                  <ArrowRight className="w-4 h-4 text-indigo-400 dark:text-indigo-500" />
                                </motion.div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

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
                  description: 'We search every counselling in the allotment data to find colleges in your rank range.',
                  gradient: 'from-purple-500 to-violet-600',
                  glow: 'shadow-purple-500/20',
                  bg: 'bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20',
                },
                {
                  icon: TrendingUp,
                  title: 'Plan Your Choices',
                  description: 'Compare allotments across categories and rounds to make an informed choice list.',
                  gradient: 'from-pink-500 to-rose-600',
                  glow: 'shadow-pink-500/20',
                  bg: 'bg-gradient-to-br from-pink-50 to-rose-50/50 dark:from-pink-950/30 dark:to-rose-950/20',
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
        </div>
      )}
    </div>
  );
}
