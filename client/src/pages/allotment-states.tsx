import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_STATES, searchAllotmentsByRank, ALLOTMENT_FILTER_OPTIONS, type AllotmentEntry } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
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

const RANK_RESULTS_PER_PAGE = 15;

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
  const [rankCategory, setRankCategory] = useState('All');
  const [rankRound, setRankRound] = useState('All');

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

  // Filter rank results
  const filteredRankResults = useMemo(() => {
    if (!rankResults) return [];
    let data = rankResults;
    if (rankCategory !== 'All') data = data.filter((e) => e.category === rankCategory);
    if (rankRound !== 'All') data = data.filter((e) => e.round === Number(rankRound));
    return data;
  }, [rankResults, rankCategory, rankRound]);

  const rankTotalPages = Math.ceil(filteredRankResults.length / RANK_RESULTS_PER_PAGE);
  const paginatedRankResults = filteredRankResults.slice(
    (rankPage - 1) * RANK_RESULTS_PER_PAGE,
    rankPage * RANK_RESULTS_PER_PAGE
  );

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

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-500 mr-1">Category:</span>
                {['All', ...ALLOTMENT_FILTER_OPTIONS.categories].map((cat) => (
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
                {['All', '1', '2', '3'].map((r) => (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paginatedRankResults.map((entry) => (
                      <Card
                        key={`${entry.counselling}-${entry.id}`}
                        className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer border-transparent hover:border-indigo-200 dark:hover:border-indigo-900/40"
                        onClick={() => handleSelectState(entry.counselling)}
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-4">
                          {/* Institute */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {entry.instituteName}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {entry.counselling === 'All India Quota - MCC' ? 'MCC' : entry.counselling}
                              </p>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
                            <div className="text-center">
                              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Rank</p>
                              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                                #{entry.allIndiaRank.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center border-x border-slate-200 dark:border-slate-700">
                              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Score</p>
                              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {entry.neetScore}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Round</p>
                              <p className="text-sm font-extrabold text-red-600 dark:text-red-400">R{entry.round}</p>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              entry.category === 'General' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' :
                              entry.category === 'OBC' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700' :
                              entry.category === 'SC' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700' :
                              entry.category === 'ST' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700' :
                              'bg-purple-50 dark:bg-purple-950/30 text-purple-700'
                            }`}>
                              {entry.category}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              entry.seatType === 'Government' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700' :
                              entry.seatType === 'Deemed' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700' :
                              'bg-amber-50 dark:bg-amber-950/30 text-amber-700'
                            }`}>
                              {entry.seatType}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                  color: 'text-indigo-600',
                  bg: 'bg-indigo-50 dark:bg-indigo-950/30',
                },
                {
                  icon: Building2,
                  title: 'See Matching Colleges',
                  description: 'We search across all 35 states & MCC to find colleges in your rank range.',
                  color: 'text-purple-600',
                  bg: 'bg-purple-50 dark:bg-purple-950/30',
                },
                {
                  icon: TrendingUp,
                  title: 'Plan Your Choices',
                  description: 'Compare allotments across categories and rounds to make an informed choice list.',
                  color: 'text-pink-600',
                  bg: 'bg-pink-50 dark:bg-pink-950/30',
                },
              ].map((step, idx) => (
                <Card key={idx} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-5 text-center space-y-3">
                    <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-110`}>
                      <step.icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{step.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-extrabold text-slate-400">
                        {idx + 1}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
