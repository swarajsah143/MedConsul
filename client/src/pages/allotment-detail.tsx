import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAllotmentsForCounselling,
  ALLOTMENT_FILTER_OPTIONS,
} from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowLeft,
  ArrowUpDown,
  Download,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  MapPin,
  Building2,
  Target,
  GraduationCap,
  Award,
  Filter,
  BarChart3,
} from 'lucide-react';

type SortField = 'allIndiaRank' | 'stateRank' | 'neetScore' | 'category' | 'instituteName' | 'seatType' | 'round';

const PAGE_SIZE = 15;

export default function AllotmentDetailPage() {
  const { counselling: rawCounselling } = useParams<{ counselling: string }>();
  const counselling = decodeURIComponent(rawCounselling || '');
  const navigate = useNavigate();

  const allData = useMemo(() => getAllotmentsForCounselling(counselling), [counselling]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [seatTypeFilter, setSeatTypeFilter] = useState('All');
  const [roundFilter, setRoundFilter] = useState('All');
  const [rankMin, setRankMin] = useState('');
  const [rankMax, setRankMax] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Table state
  const [sortBy, setSortBy] = useState<SortField>('allIndiaRank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showFilters]);

  const activeFilterCount = [
    categoryFilter !== 'All', seatTypeFilter !== 'All', roundFilter !== 'All',
    rankMin !== '', rankMax !== '', scoreMin !== '', scoreMax !== '', search !== '',
  ].filter(Boolean).length;

  const institutes = useMemo(() =>
    [...new Set(allData.map((e) => e.instituteName))].sort(),
  [allData]);

  const filtered = useMemo(() => {
    let data = allData;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((e) =>
        e.instituteName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.subcategory.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') data = data.filter((e) => e.category === categoryFilter);
    if (seatTypeFilter !== 'All') data = data.filter((e) => e.seatType === seatTypeFilter);
    if (roundFilter !== 'All') data = data.filter((e) => e.round === Number(roundFilter));
    if (rankMin) data = data.filter((e) => e.allIndiaRank >= Number(rankMin));
    if (rankMax) data = data.filter((e) => e.allIndiaRank <= Number(rankMax));
    if (scoreMin) data = data.filter((e) => e.neetScore >= Number(scoreMin));
    if (scoreMax) data = data.filter((e) => e.neetScore <= Number(scoreMax));

    data = [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'allIndiaRank': cmp = a.allIndiaRank - b.allIndiaRank; break;
        case 'stateRank': cmp = (a.stateRank ?? 999999) - (b.stateRank ?? 999999); break;
        case 'neetScore': cmp = a.neetScore - b.neetScore; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
        case 'instituteName': cmp = a.instituteName.localeCompare(b.instituteName); break;
        case 'seatType': cmp = a.seatType.localeCompare(b.seatType); break;
        case 'round': cmp = a.round - b.round; break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [allData, search, categoryFilter, seatTypeFilter, roundFilter, rankMin, rankMax, scoreMin, scoreMax, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    setSearch(''); setCategoryFilter('All'); setSeatTypeFilter('All');
    setRoundFilter('All'); setRankMin(''); setRankMax('');
    setScoreMin(''); setScoreMax(''); setPage(1);
  };

  const handleExportCsv = () => {
    const header = 'All India Rank,State Rank,NEET Score,Category,Subcategory,Institute,Seat Type,Counselling,Round\n';
    const rows = filtered.map((e) =>
      `${e.allIndiaRank},${e.stateRank ?? '-'},${e.neetScore},"${e.category}","${e.subcategory}","${e.instituteName}","${e.seatType}","${e.counselling}",R${e.round}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allotment-${counselling.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isMCC = counselling === 'All India Quota - MCC';

  if (!allData.length) {
    return (
      <div className="space-y-4 page-enter">
        <Button variant="ghost" size="sm" onClick={() => navigate('/allotment')} className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to States
        </Button>
        <EmptyState
          title="No allotment data"
          description={`Allotment data for "${counselling}" is not available yet. Please check back later.`}
          action={{ label: 'Go Back', onClick: () => navigate('/allotment') }}
        />
      </div>
    );
  }

  function SortHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-3 sm:px-4 py-3 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 select-none transition-colors duration-150 whitespace-nowrap ${className || ''}`}
      >
        <span className="flex items-center gap-1">
          {children}
          <ArrowUpDown className={`w-3 h-3 transition-colors ${active ? 'text-red-600' : 'text-slate-400'}`} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/allotment')} className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to States
      </Button>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                    <Sparkles className="w-3.5 h-3.5" /> Live Data
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Allotment Mapping
                </h1>
                <p className="text-red-100/80 text-sm max-w-lg leading-relaxed">
                  Real counselling seat allotments across rounds, quotas, and categories with AI-powered filtering.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-sm font-bold text-white border border-white/10">
                  <MapPin className="w-4 h-4" />
                  {isMCC ? 'MCC' : counselling}
                </span>
                <button
                  onClick={() => navigate('/allotment')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-red-600 text-sm font-bold hover:bg-red-50 transition-colors shadow-sm"
                >
                  <GraduationCap className="w-4 h-4" />
                  Counselling
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Allotments', value: allData.length.toLocaleString(), icon: Award, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Institutes', value: String(institutes.length), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Filtered', value: filtered.length.toLocaleString(), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Rounds', value: '3', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{s.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <>
              {categoryFilter !== 'All' && <FilterTag label={categoryFilter} onRemove={() => { setCategoryFilter('All'); setPage(1); }} />}
              {seatTypeFilter !== 'All' && <FilterTag label={seatTypeFilter} onRemove={() => { setSeatTypeFilter('All'); setPage(1); }} />}
              {roundFilter !== 'All' && <FilterTag label={`Round ${roundFilter}`} onRemove={() => { setRoundFilter('All'); setPage(1); }} />}
              {search && <FilterTag label={`"${search}"`} onRemove={() => { setSearch(''); setPage(1); }} />}
              {rankMin && <FilterTag label={`Rank >= ${rankMin}`} onRemove={() => { setRankMin(''); setPage(1); }} />}
              {rankMax && <FilterTag label={`Rank <= ${rankMax}`} onRemove={() => { setRankMax(''); setPage(1); }} />}
              <button onClick={handleReset} className="text-xs font-semibold text-red-600 hover:underline">Clear all</button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(true)}
            className="gradient-primary text-white shadow-sm font-semibold"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-white text-red-600 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button onClick={handleExportCsv} variant="outline" className="hover:border-red-300 hover:text-red-600 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* ===== FILTER MODAL ===== */}
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
                    <h2 className="text-xl font-extrabold text-white">Filters</h2>
                    <p className="text-red-200 text-xs mt-0.5">Refine allotment results</p>
                  </div>
                </div>
                <button onClick={() => setShowFilters(false)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6 space-y-7">
              {/* Rank & Score */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-red-500" />
                  Rank & Score Range
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-600">All India Rank</p>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input type="number" placeholder="Min" value={rankMin} onChange={(e) => setRankMin(e.target.value)} className="h-11 text-sm" />
                      <span className="text-slate-400 font-medium shrink-0">—</span>
                      <Input type="number" placeholder="Max" value={rankMax} onChange={(e) => setRankMax(e.target.value)} className="h-11 text-sm" />
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-600">NEET Score</p>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input type="number" placeholder="Min" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} className="h-11 text-sm" />
                      <span className="text-slate-400 font-medium shrink-0">—</span>
                      <Input type="number" placeholder="Max" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} className="h-11 text-sm" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Rounds */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-blue-500" />
                  Round
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['All', ...ALLOTMENT_FILTER_OPTIONS.rounds.map(String)].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoundFilter(r)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                        roundFilter === r
                          ? 'gradient-primary text-white border-transparent shadow-md'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {r === 'All' ? 'All Rounds' : `Round ${r}`}
                    </button>
                  ))}
                </div>
              </section>

              {/* Category */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-purple-500" />
                  Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['All', ...ALLOTMENT_FILTER_OPTIONS.categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                        categoryFilter === cat
                          ? 'gradient-primary text-white border-transparent shadow-md'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </section>

              {/* Seat Type */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-emerald-500" />
                  Seat Type
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['All', ...ALLOTMENT_FILTER_OPTIONS.seatTypes].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSeatTypeFilter(st)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                        seatTypeFilter === st
                          ? 'gradient-primary text-white border-transparent shadow-md'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </section>

              {/* Institute Search */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-amber-500" />
                  Search Institute
                </h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type institute name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-11 h-12 text-sm rounded-xl focus:shadow-lg transition-all duration-200"
                  />
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleReset} className="h-11 px-6 rounded-xl border-2 hover:border-red-300 hover:text-red-600 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Clear All
                </Button>
                <Button
                  onClick={() => { setPage(1); setShowFilters(false); }}
                  className="gradient-primary text-white h-11 px-8 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold"
                >
                  Show {filtered.length.toLocaleString()} Results
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{paginated.length}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length.toLocaleString()}</span> results
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No allotments found"
          description="Adjust your filters to find allotment data."
          action={{ label: 'Clear Filters', onClick: handleReset }}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Red header bar */}
          <div className="h-1 gradient-primary" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-red-600 via-red-600 to-rose-500 text-white text-[11px] uppercase tracking-wider">
                  <SortHeader field="allIndiaRank" className="text-white hover:bg-white/10">All India Rank</SortHeader>
                  {!isMCC && <SortHeader field="stateRank" className="text-white hover:bg-white/10">State Rank</SortHeader>}
                  <SortHeader field="neetScore" className="text-white hover:bg-white/10">NEET Score</SortHeader>
                  <SortHeader field="category" className="text-white hover:bg-white/10">Category</SortHeader>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap font-bold">Subcategory</th>
                  <SortHeader field="instituteName" className="text-white hover:bg-white/10">Institute Name</SortHeader>
                  <SortHeader field="seatType" className="text-white hover:bg-white/10">Seat Type</SortHeader>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap font-bold">Counselling</th>
                  <SortHeader field="round" className="text-white hover:bg-white/10 text-center">Round</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((entry) => (
                  <tr
                    key={entry.id}
                    className="group hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors duration-150"
                  >
                    <td className="px-3 sm:px-4 py-3.5 font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                      {entry.allIndiaRank.toLocaleString()}
                    </td>
                    {!isMCC && (
                      <td className="px-3 sm:px-4 py-3.5 text-slate-500 tabular-nums font-medium">
                        {entry.stateRank?.toLocaleString() ?? '-'}
                      </td>
                    )}
                    <td className="px-3 sm:px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {entry.neetScore}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        entry.category === 'General' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                        entry.category === 'OBC' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                        entry.category === 'SC' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                        entry.category === 'ST' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                        'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                      {entry.subcategory}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 max-w-[280px]">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200">
                        {entry.instituteName}
                      </p>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        entry.seatType === 'Government' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                        entry.seatType === 'Deemed' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                        'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {entry.seatType}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {entry.counselling === 'All India Quota - MCC' ? 'MCC' : entry.counselling}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 font-extrabold text-red-600 dark:text-red-400 text-[11px]">
                        R{entry.round}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[11px] font-semibold border border-red-200 dark:border-red-900/40 hover:bg-red-100 transition-colors">
      {label}
      <button onClick={onRemove} className="w-3.5 h-3.5 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
