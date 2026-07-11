import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections, byId, distinct, type College, type FeeEntry } from '@/lib/data-api';
import { formatINR } from '@/lib/fee-matrix-data';
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
  IndianRupee,
  ChevronRight,
  Building2,
  Users,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Wallet,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

type SortField = 'college' | 'tuitionFee' | 'hostelFee' | 'totalFirstYear' | 'govtSeats' | 'mgmtSeats';
type ViewMode = 'cards' | 'table';

/** A fee row joined against its college — the API stores only a collegeId, and every money/seat field is optional. */
interface FeeRow {
  id: string;
  collegeId: string;
  name: string;
  state: string;
  city: string;
  type: string;
  course: string;
  category: string;
  quota: string;
  tuitionFee: number;
  hostelFee: number;
  miscCharges: number;
  securityDeposit: number;
  totalFirstYear: number;
  govtSeats: number;
  mgmtSeats: number;
  nriSeats: number;
}

const PAGE_SIZE = 12;

export default function FeeMatrixPage() {
  const navigate = useNavigate();

  const { data, loading, error } = useCollections<{ colleges: College[]; fees: FeeEntry[] }>([
    'colleges',
    'fees',
  ]);

  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [college, setCollege] = useState('All');
  const [course, setCourse] = useState('All');
  const [category, setCategory] = useState('All');
  const [quota, setQuota] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [sortBy, setSortBy] = useState<SortField>('totalFirstYear');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (showFilters) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [showFilters]);

  const activeFilterCount = [
    state !== 'All', college !== 'All', course !== 'All',
    category !== 'All', quota !== 'All', search !== '',
  ].filter(Boolean).length;

  // ── join + normalise: college info from `colleges`, every optional number defaulted ──
  const rows = useMemo<FeeRow[]>(() => {
    const collegeMap = byId(data.colleges ?? []);
    return (data.fees ?? []).map((f) => {
      const c = collegeMap.get(f.collegeId);
      const tuitionFee = f.tuitionFee ?? 0;
      const hostelFee = f.hostelFee ?? 0;
      const miscCharges = f.miscCharges ?? 0;
      const securityDeposit = f.securityDeposit ?? 0;
      return {
        id: f.id,
        collegeId: f.collegeId,
        name: c?.name ?? 'Unknown college',
        state: c?.state ?? '',
        city: c?.city ?? '',
        type: c?.type ?? '',
        course: f.course ?? '',
        category: f.category ?? '',
        quota: f.quota ?? '',
        tuitionFee,
        hostelFee,
        miscCharges,
        securityDeposit,
        totalFirstYear: f.totalFirstYear ?? (tuitionFee + hostelFee + miscCharges + securityDeposit),
        govtSeats: f.govtSeats ?? 0,
        mgmtSeats: f.mgmtSeats ?? 0,
        nriSeats: f.nriSeats ?? 0,
      };
    });
  }, [data.colleges, data.fees]);

  // Dropdown options built from the live rows, so admin-added colleges/quotas show up automatically.
  const filterOptions = useMemo(() => ({
    states: distinct(rows, 'state'),
    colleges: distinct(rows, 'name'),
    courses: distinct(rows, 'course'),
    categories: distinct(rows, 'category'),
    quotas: distinct(rows, 'quota'),
  }), [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.course.toLowerCase().includes(q));
    }
    if (state !== 'All') list = list.filter((e) => e.state === state);
    if (college !== 'All') list = list.filter((e) => e.name === college);
    if (course !== 'All') list = list.filter((e) => e.course === course);
    if (category !== 'All') list = list.filter((e) => e.category === category);
    if (quota !== 'All') list = list.filter((e) => e.quota === quota);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'college': cmp = a.name.localeCompare(b.name); break;
        case 'tuitionFee': cmp = a.tuitionFee - b.tuitionFee; break;
        case 'hostelFee': cmp = a.hostelFee - b.hostelFee; break;
        case 'totalFirstYear': cmp = a.totalFirstYear - b.totalFirstYear; break;
        case 'govtSeats': cmp = a.govtSeats - b.govtSeats; break;
        case 'mgmtSeats': cmp = a.mgmtSeats - b.mgmtSeats; break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, search, state, college, course, category, quota, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((field: SortField) => {
    if (sortBy === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  }, [sortBy]);

  const handleReset = () => {
    setSearch(''); setState('All'); setCollege('All');
    setCourse('All'); setCategory('All'); setQuota('All'); setPage(1);
  };

  const handleExportCsv = () => {
    const header = 'College,State,City,Type,Course,Category,Quota,Tuition,Hostel,Misc,Deposit,Total 1st Yr,Govt Seats,Mgmt Seats,NRI Seats\n';
    const csvRows = filtered.map((e) =>
      `"${e.name}","${e.state}","${e.city}","${e.type}","${e.course}","${e.category}","${e.quota}",${e.tuitionFee},${e.hostelFee},${e.miscCharges},${e.securityDeposit},${e.totalFirstYear},${e.govtSeats},${e.mgmtSeats},${e.nriSeats}`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fee-seat-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const avgTotal = filtered.length > 0 ? Math.round(filtered.reduce((s, e) => s + e.totalFirstYear, 0) / filtered.length) : 0;
  const minTotal = filtered.length > 0 ? Math.min(...filtered.map((e) => e.totalFirstYear)) : 0;
  const maxTotal = filtered.length > 0 ? Math.max(...filtered.map((e) => e.totalFirstYear)) : 0;
  const totalGovtSeats = filtered.reduce((s, e) => s + e.govtSeats, 0);

  const typeColor = (t: string) =>
    t === 'Government' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
    : t === 'Deemed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';

  function SortHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortBy === field;
    return (
      <th onClick={() => handleSort(field)} className={`px-3 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 select-none whitespace-nowrap transition-colors duration-150 ${className || ''}`}>
        <span className="flex items-center gap-1">
          {children}
          <ArrowUpDown className={`w-3 h-3 shrink-0 transition-colors ${active ? 'text-red-600' : 'text-slate-400'}`} />
        </span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading fee & seat data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load fee data"
          description={error}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" /> NEET UG 2026
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                  <IndianRupee className="w-7 h-7 text-red-200" />
                  Fee & Seat Matrix
                </h1>
                <p className="text-red-100/90 text-sm max-w-xl leading-relaxed">
                  Compare tuition fees, hostel charges, and seat distribution across medical colleges. Plan your budget smartly.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button onClick={() => setShowFilters(true)} className="bg-white text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm font-semibold">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">{activeFilterCount}</span>
                  )}
                </Button>
                <Button onClick={handleExportCsv} className="bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all duration-200">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg. 1st Year', value: formatINR(avgTotal), icon: Wallet, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Lowest Fee', value: formatINR(minTotal), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Highest Fee', value: formatINR(maxTotal), icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Govt Seats', value: totalGovtSeats.toLocaleString(), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{s.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm fade-in" onClick={() => setShowFilters(false)} />
          <div className="relative z-50 w-full max-w-3xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl slide-in-from-top-4 fade-in">
            <div className="gradient-primary px-6 py-5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/10">
                    <SlidersHorizontal className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Fee Filters</h2>
                    <p className="text-red-200 text-xs mt-0.5">Narrow down colleges by fees and seats</p>
                  </div>
                </div>
                <button onClick={() => setShowFilters(false)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all duration-200 hover:scale-105">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6 space-y-7">
              {/* Search */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-red-500" /> Quick Search
                </h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search college, city, course..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-11 h-12 text-sm rounded-xl focus:shadow-lg transition-all duration-200" />
                </div>
              </section>

              {/* Location */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-blue-500" /> Location & Institute
                </h3>
                <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State</label>
                      <select value={state} onChange={(e) => setState(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all hover:border-red-300 cursor-pointer">
                        <option value="All">All States</option>
                        {filterOptions.states.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">College</label>
                      <select value={college} onChange={(e) => setCollege(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all hover:border-red-300 cursor-pointer">
                        <option value="All">All Colleges</option>
                        {filterOptions.colleges.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Course & Category */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-purple-500" /> Course, Category & Quota
                </h3>
                <div className="rounded-xl bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Course</label>
                      <select value={course} onChange={(e) => setCourse(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all hover:border-red-300 cursor-pointer">
                        <option value="All">All Courses</option>
                        {filterOptions.courses.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all hover:border-red-300 cursor-pointer">
                        <option value="All">All Categories</option>
                        {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quota</label>
                      <select value={quota} onChange={(e) => setQuota(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all hover:border-red-300 cursor-pointer">
                        <option value="All">All Quotas</option>
                        {filterOptions.quotas.map((q) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sort */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-emerald-500" /> Sort By
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { field: 'totalFirstYear' as SortField, label: 'Total Fee' },
                    { field: 'tuitionFee' as SortField, label: 'Tuition' },
                    { field: 'hostelFee' as SortField, label: 'Hostel' },
                    { field: 'govtSeats' as SortField, label: 'Govt Seats' },
                    { field: 'college' as SortField, label: 'College Name' },
                  ].map((item) => (
                    <button key={item.field} onClick={() => { setSortBy(item.field); setSortOrder('asc'); }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                        sortBy === item.field
                          ? 'gradient-primary text-white border-transparent shadow-md'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300 hover:text-red-600 bg-white dark:bg-slate-800'
                      }`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleReset} className="h-11 px-6 rounded-xl border-2 hover:border-red-300 hover:text-red-600 transition-all hover:scale-[1.02] active:scale-[0.98]">Clear All</Button>
                <Button onClick={() => { setPage(1); setShowFilters(false); }} className="gradient-primary text-white h-11 px-8 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] font-semibold">
                  Show {filtered.length} Results
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags + View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterCount > 0 && (
            <>
              {state !== 'All' && <FilterTag label={state} onRemove={() => { setState('All'); setPage(1); }} />}
              {college !== 'All' && <FilterTag label={college} onRemove={() => { setCollege('All'); setPage(1); }} />}
              {course !== 'All' && <FilterTag label={course} onRemove={() => { setCourse('All'); setPage(1); }} />}
              {category !== 'All' && <FilterTag label={category} onRemove={() => { setCategory('All'); setPage(1); }} />}
              {quota !== 'All' && <FilterTag label={quota} onRemove={() => { setQuota('All'); setPage(1); }} />}
              {search && <FilterTag label={`"${search}"`} onRemove={() => { setSearch(''); setPage(1); }} />}
              <button onClick={handleReset} className="text-xs font-semibold text-red-600 hover:underline">Clear all</button>
            </>
          )}
          {activeFilterCount === 0 && (
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> fee records
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Cards
          </button>
          <button onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Table
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState title="No results found" description="Adjust your filters or search to find fee data." action={{ label: 'Clear Filters', onClick: handleReset }} />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((entry) => (
            <div
              key={entry.id}
              onClick={() => navigate(`/fee-matrix/${entry.id}`)}
              className="group cursor-pointer rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-700/50 overflow-hidden hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 relative"
            >
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="p-4 sm:p-5 relative">
                {/* Top: Icon + Name + Location */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white leading-snug truncate group-hover:text-emerald-300 transition-colors duration-200">
                      {entry.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" /> {entry.city}, {entry.state}
                    </p>
                  </div>
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {entry.type && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      entry.type === 'Government' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      entry.type === 'Deemed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>{entry.type}</span>
                  )}
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{entry.course}</span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{entry.category}</span>
                </div>

                {/* Fee Hero — big glowing number */}
                <div className="rounded-xl bg-slate-800/80 border border-slate-700/50 p-4 mb-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">Total 1st Year Fee</p>
                  <p className="text-center text-2xl sm:text-3xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-rose-500" style={{ textShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
                    {formatINR(entry.totalFirstYear)}
                  </p>

                  {/* Tuition + Hostel row */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Tuition</p>
                        <p className="text-xs font-bold text-emerald-400 tabular-nums">{formatINR(entry.tuitionFee)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Hostel</p>
                        <p className="text-xs font-bold text-blue-400 tabular-nums">{formatINR(entry.hostelFee)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Seats + Arrow */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px]">
                    {entry.govtSeats > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400/80 font-semibold">
                        <Building2 className="w-3 h-3" /> {entry.govtSeats} Govt
                      </span>
                    )}
                    {entry.mgmtSeats > 0 && (
                      <span className="flex items-center gap-1 text-amber-400/80 font-semibold">
                        <Users className="w-3 h-3" /> {entry.mgmtSeats} Mgmt
                      </span>
                    )}
                    {entry.nriSeats > 0 && (
                      <span className="text-blue-400/80 font-semibold">{entry.nriSeats} NRI</span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="h-1 gradient-primary" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <SortHeader field="college">College</SortHeader>
                  <SortHeader field="tuitionFee" className="text-right">Tuition</SortHeader>
                  <SortHeader field="hostelFee" className="text-right">Hostel</SortHeader>
                  <th className="px-3 py-3.5 text-right whitespace-nowrap">Misc</th>
                  <SortHeader field="totalFirstYear" className="text-right">Total 1st Yr</SortHeader>
                  <SortHeader field="govtSeats" className="text-center">Govt</SortHeader>
                  <SortHeader field="mgmtSeats" className="text-center">Mgmt</SortHeader>
                  <th className="px-3 py-3.5 text-center">NRI</th>
                  <th className="px-3 py-3.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((entry) => (
                  <tr key={entry.id} onClick={() => navigate(`/fee-matrix/${entry.id}`)}
                    className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors duration-200 cursor-pointer group">
                    <td className="px-3 py-3.5 font-bold text-slate-800 dark:text-slate-100 min-w-[200px]">
                      <div className="truncate max-w-[220px] group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{entry.name}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-normal">
                        <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{entry.city}, {entry.state}</span>
                        {entry.type && <span className={`px-1.5 py-0.5 rounded-full font-bold ${typeColor(entry.type)}`}>{entry.type}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatINR(entry.tuitionFee)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatINR(entry.hostelFee)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-500 whitespace-nowrap">{formatINR(entry.miscCharges)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-extrabold text-slate-900 dark:text-slate-50 whitespace-nowrap">{formatINR(entry.totalFirstYear)}</td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{entry.govtSeats || '-'}</td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-amber-600 dark:text-amber-400">{entry.mgmtSeats || '-'}</td>
                    <td className="px-3 py-3.5 text-center tabular-nums font-bold text-blue-600 dark:text-blue-400">{entry.nriSeats || '-'}</td>
                    <td className="px-3 py-3.5 text-center">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all duration-200 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={paginated.length} totalItems={filtered.length} />

      {/* Tip */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Budget Planning Tip</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Click on any college card to see year-wise fee progression, pie chart breakdown, seat distribution, scholarship options, and refund policies. Government colleges are 10-100x cheaper than private ones.
            </p>
          </div>
        </CardContent>
      </Card>
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
