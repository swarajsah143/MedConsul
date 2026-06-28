import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  INSIGHTS_DATA,
  INSIGHT_FILTER_OPTIONS,
  getLatestEntries,
  type InsightEntry,
} from '@/lib/insights-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  TrendingDown,
  ArrowUpDown,
  Download,
  Filter,
  X,
  BarChart3,
  ChevronRight,
} from 'lucide-react';

type SortField = 'college' | 'course' | 'category' | 'quota' | 'round' | 'closingRank' | 'closingScore';

const PAGE_SIZE = 12;

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
  options: (string | number)[];
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
          <option key={String(o)} value={String(o)}>
            {typeof o === 'number' ? `Round ${o}` : o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RankInsightsPage() {
  const navigate = useNavigate();

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
  const [showFilters, setShowFilters] = useState(true);

  // Table state
  const [sortBy, setSortBy] = useState<SortField>('closingRank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const activeFilterCount = [
    state !== 'All',
    college !== 'All',
    course !== 'All',
    category !== 'All',
    quota !== 'All',
    round !== 'All',
    rankMin !== '',
    rankMax !== '',
    scoreMin !== '',
    scoreMax !== '',
  ].filter(Boolean).length;

  // Start with the deduplicated latest entries
  const baseEntries = useMemo(() => getLatestEntries(), []);

  // Filtered + sorted data
  const filtered = useMemo(() => {
    let data = baseEntries;

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.college.name.toLowerCase().includes(q) ||
          e.course.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.quota.toLowerCase().includes(q)
      );
    }
    if (state !== 'All') data = data.filter((e) => e.college.state === state);
    if (college !== 'All') data = data.filter((e) => e.college.name === college);
    if (course !== 'All') data = data.filter((e) => e.course === course);
    if (category !== 'All') data = data.filter((e) => e.category === category);
    if (quota !== 'All') data = data.filter((e) => e.quota === quota);
    if (round !== 'All') data = data.filter((e) => e.round === Number(round));
    if (rankMin) data = data.filter((e) => e.closingRank >= Number(rankMin));
    if (rankMax) data = data.filter((e) => e.closingRank <= Number(rankMax));
    if (scoreMin) data = data.filter((e) => (e.closingScore ?? 0) >= Number(scoreMin));
    if (scoreMax) data = data.filter((e) => (e.closingScore ?? 0) <= Number(scoreMax));

    // Sort
    data = [...data].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'college':
          cmp = a.college.name.localeCompare(b.college.name);
          break;
        case 'course':
          cmp = a.course.localeCompare(b.course);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'quota':
          cmp = a.quota.localeCompare(b.quota);
          break;
        case 'round':
          cmp = a.round - b.round;
          break;
        case 'closingRank':
          cmp = a.closingRank - b.closingRank;
          break;
        case 'closingScore':
          cmp = (a.closingScore ?? 0) - (b.closingScore ?? 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [baseEntries, search, state, college, course, category, quota, round, rankMin, rankMax, scoreMin, scoreMax, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleReset = () => {
    setSearch('');
    setState('All');
    setCollege('All');
    setCourse('All');
    setCategory('All');
    setQuota('All');
    setRound('All');
    setRankMin('');
    setRankMax('');
    setScoreMin('');
    setScoreMax('');
    setPage(1);
  };

  const handleRowClick = (entry: InsightEntry) => {
    const params = new URLSearchParams({
      collegeId: entry.collegeId,
      college: entry.college.name,
      course: entry.course,
      category: entry.category,
      quota: entry.quota,
    });
    navigate(`/rank-insights/detail?${params.toString()}`);
  };

  const handleExportCsv = () => {
    const header = 'College,State,Course,Category,Quota,Year,Round,Closing Rank,Closing Score\n';
    const rows = filtered
      .map(
        (e) =>
          `"${e.college.name}","${e.college.state}","${e.course}","${e.category}","${e.quota}",${e.year},${e.round},${e.closingRank},${e.closingScore ?? 'N/A'}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
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
        className={`px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none ${className || ''}`}
      >
        <span className="flex items-center gap-1.5">
          {children}
          <ArrowUpDown className={`w-3 h-3 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        icon={BarChart3}
        title="Closing Rank Insights"
        description="Analyze historical closing ranks and scores across colleges, categories, and quotas. Click any row for year-over-year trends."
      >
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${showFilters ? 'bg-teal-50/50 border-teal-200 text-teal-700' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button onClick={handleExportCsv} className="gradient-primary text-white flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: INSIGHTS_DATA.length.toLocaleString(), sub: 'across all years' },
          { label: 'Colleges', value: String(INSIGHT_FILTER_OPTIONS.colleges.length), sub: 'institutions tracked' },
          { label: 'Filtered Results', value: String(filtered.length), sub: 'matching entries' },
          { label: 'Latest Year', value: '2025', sub: 'most recent data' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="shadow-sm glass animate-fade-in">
          <CardContent className="pt-6 space-y-5">
            {/* Search row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search college, course, category, quota..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(1)}
                  className="gradient-primary text-white"
                >
                  Apply
                </Button>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={handleReset}>
                    <X className="w-3.5 h-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Dropdowns grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <SelectFilter label="State" value={state} onChange={(v) => { setState(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.states} allLabel="All States" />
              <SelectFilter label="College" value={college} onChange={(v) => { setCollege(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.colleges} allLabel="All Colleges" />
              <SelectFilter label="Course" value={course} onChange={(v) => { setCourse(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.courses} allLabel="All Courses" />
              <SelectFilter label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.categories} allLabel="All Categories" />
              <SelectFilter label="Quota" value={quota} onChange={(v) => { setQuota(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.quotas} allLabel="All Quotas" />
              <SelectFilter label="Round" value={round} onChange={(v) => { setRound(v); setPage(1); }} options={INSIGHT_FILTER_OPTIONS.rounds} allLabel="All Rounds" />
            </div>

            {/* Range inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rank Range</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={rankMin}
                    onChange={(e) => { setRankMin(e.target.value); setPage(1); }}
                    className="text-xs"
                  />
                  <span className="text-slate-400 text-xs shrink-0">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={rankMax}
                    onChange={(e) => { setRankMax(e.target.value); setPage(1); }}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Score Range</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={scoreMin}
                    onChange={(e) => { setScoreMin(e.target.value); setPage(1); }}
                    className="text-xs"
                  />
                  <span className="text-slate-400 text-xs shrink-0">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={scoreMax}
                    onChange={(e) => { setScoreMax(e.target.value); setPage(1); }}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No results found"
          description="Adjust your filters or search query to find closing rank data."
          action={{ label: 'Clear Filters', onClick: handleReset }}
        />
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
                    className="hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100 max-w-[220px]">
                      <div className="truncate">{entry.college.name}</div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                        {entry.college.city}, {entry.college.state}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          entry.college.type === 'Government'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : entry.college.type === 'Deemed'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {entry.college.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {entry.course}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium max-w-[180px] truncate">
                      {entry.quota}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-extrabold text-teal-600 dark:text-teal-400">
                      R{entry.round}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                      #{entry.closingRank.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {entry.closingScore ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors inline-block" />
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
