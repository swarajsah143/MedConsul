import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollection, distinct, type College } from '@/lib/data-api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { HeroBanner } from '@/components/ui/hero-banner';
import {
  Search,
  GraduationCap,
  MapPin,
  Building2,
  X,
  Sparkles,
  Users,
  IndianRupee,
  Star,
  Calendar,
  ArrowRight,
  Target,
  Loader2,
  AlertTriangle,
  Database,
} from 'lucide-react';

const TYPES: Array<'Government' | 'Private' | 'Deemed'> = ['Government', 'Private', 'Deemed'];

// Rendering all 820 cards at once made the page (and every filter click) crawl. We now show
// one page at a time — the filtered set is sliced, so only this many cards ever mount.
const PAGE_SIZE = 12;

const typeColors: Record<string, string> = {
  Government: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  Private: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  Deemed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
};

// No college has a `thumbnail` in the data, so the image slot was rendering as an empty dark
// box. Fall back to a branded, type-coloured gradient header instead of a blank frame.
const typeGradient: Record<string, string> = {
  Government: 'from-emerald-500 to-teal-600',
  Private: 'from-amber-500 to-orange-600',
  Deemed: 'from-blue-500 to-indigo-600',
};

export default function CollegesPage() {
  const { data: allColleges, loading, error, reload } = useCollection<College>('colleges');
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [page, setPage] = useState(1);

  // A college an admin deactivated must not appear publicly. Legacy rows have no
  // isActive field at all — treat those as active.
  const colleges = useMemo(() => allColleges.filter((c) => c.isActive !== false), [allColleges]);

  // Filter options come from the live data, so a newly added state shows up automatically.
  const states = useMemo(() => distinct(colleges, 'state'), [colleges]);

  const filtered = useMemo(() => {
    let data = colleges;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.state ?? '').toLowerCase().includes(q));
    }
    if (selectedState !== 'All') data = data.filter((c) => c.state === selectedState);
    if (selectedType !== 'All') data = data.filter((c) => c.type === selectedType);
    return data;
  }, [colleges, search, selectedState, selectedType]);

  const activeFilterCount = (selectedState !== 'All' ? 1 : 0) + (selectedType !== 'All' ? 1 : 0) + (search ? 1 : 0);

  // Any change to the result set jumps back to page 1 — otherwise filtering down while on
  // page 30 would show an empty grid.
  useEffect(() => { setPage(1); }, [search, selectedState, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => { setSearch(''); setSelectedState('All'); setSelectedType('All'); };

  // Stats
  const govtCount = colleges.filter((c) => c.type === 'Government').length;
  const pvtCount = colleges.filter((c) => c.type === 'Private').length;
  const deemedCount = colleges.filter((c) => c.type === 'Deemed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState icon={AlertTriangle} title="Couldn't load colleges" description={error}
          action={{ label: 'Try Again', onClick: reload }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <HeroBanner>
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Detailed Reviews
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <GraduationCap className="w-7 h-7 text-emerald-200" />
              College Reviews
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-xl leading-relaxed">
              Explore honest, in-depth reviews of India's top medical colleges. Compare facilities, faculty, clinical exposure, campus life, and more.
            </p>
          </div>
      </HeroBanner>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Colleges', value: colleges.length, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Government', value: govtCount, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Private', value: pvtCount, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Deemed', value: deemedCount, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{s.value}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1.5 uppercase tracking-wide truncate">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <Card className="overflow-hidden">
        <div className="h-1 gradient-primary" />
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by college name, city, state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl text-sm focus:shadow-md transition-all duration-200"
              />
            </div>
            <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}
              className="h-11 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200 hover:border-emerald-300 cursor-pointer min-w-[150px]">
              <option value="All">All States</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Type Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Type:</span>
            <button onClick={() => setSelectedType('All')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                selectedType === 'All'
                  ? 'gradient-primary text-white border-transparent shadow-md'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600 bg-white dark:bg-slate-800'
              }`}>All</button>
            {TYPES.map((t) => (
              <button key={t} onClick={() => setSelectedType(selectedType === t ? 'All' : t)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
                  selectedType === t
                    ? 'gradient-primary text-white border-transparent shadow-md'
                    : `${typeColors[t]} border-transparent hover:shadow-sm`
                }`}>{t}</button>
            ))}
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Active:</span>
              {search && <FilterTag label={`"${search}"`} onRemove={() => setSearch('')} />}
              {selectedState !== 'All' && <FilterTag label={selectedState} onRemove={() => setSelectedState('All')} />}
              {selectedType !== 'All' && <FilterTag label={selectedType} onRemove={() => setSelectedType('All')} />}
              <button onClick={handleReset} className="text-[11px] font-semibold text-emerald-600 hover:underline ml-1">Clear all</button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {colleges.length} colleges
      </p>

      {/* College Cards Grid.
          An EMPTY collection is not a search miss: offering "Clear Filters" there gives the
          student a button that does nothing and blames a search they never ran. */}
      {colleges.length === 0 ? (
        <EmptyState icon={Database} title="No colleges yet"
          description="No colleges have been added yet. An admin can add them under Manage Data → Colleges." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No colleges found" description="Try adjusting your search or filters."
          action={{ label: 'Clear Filters', onClick: handleReset }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map((college) => (
            <Link key={college.id} to={`/colleges/${college.id}`} className="group">
              <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/40 relative">
                {/* Hover accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                {/* Thumbnail — real image if present, otherwise a branded type-coloured header */}
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {college.thumbnail ? (
                    <img
                      src={college.thumbnail}
                      alt={college.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${typeGradient[college.type] ?? 'from-emerald-500 to-green-600'} flex items-center justify-center transition-transform duration-700 ease-out group-hover:scale-110`}>
                      <GraduationCap className="w-16 h-16 text-white/25" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Type badge on image */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${typeColors[college.type] ?? ''} backdrop-blur-sm`}>
                      {college.type}
                    </span>
                  </div>

                  {/* Established year */}
                  {college.established != null && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Est. {college.established}
                      </span>
                    </div>
                  )}

                  {/* College name overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-lg">
                      {college.name}
                    </h3>
                    <p className="text-[11px] text-white/80 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {college.city}, {college.state}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="flex-1 flex flex-col p-5 space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1">
                    {college.description ?? ''}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{college.totalSeats ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Seats</p>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <GraduationCap className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{college.coursesOffered?.length ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Courses</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <IndianRupee className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{college.annualFees ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Fees</p>
                    </div>
                  </div>

                  {/* Cutoff */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Target className="w-3 h-3 text-emerald-500" />
                      <span className="font-medium">{college.neetCutoffRange ?? 'Cutoff not available'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      Review <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemCount={paginated.length}
          totalItems={filtered.length}
        />
      )}
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 transition-colors">
      {label}
      <button onClick={(e) => { e.preventDefault(); onRemove(); }} className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 flex items-center justify-center transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
