import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { HeroBanner } from '@/components/ui/hero-banner';
import {
  Search,
  GraduationCap,
  MapPin,
  Building2,
  ChevronRight,
  X,
  Sparkles,
  Users,
  IndianRupee,
  Star,
  Calendar,
  ArrowRight,
  Target,
} from 'lucide-react';

const STATES = [...new Set(MOCK_COLLEGES.map((c) => c.state))].sort();
const TYPES: Array<'Government' | 'Private' | 'Deemed'> = ['Government', 'Private', 'Deemed'];

const typeColors: Record<string, string> = {
  Government: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  Private: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  Deemed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
};

const typeIconBg: Record<string, string> = {
  Government: 'bg-emerald-100 dark:bg-emerald-950/40',
  Private: 'bg-amber-100 dark:bg-amber-950/40',
  Deemed: 'bg-blue-100 dark:bg-blue-950/40',
};

const typeIconColor: Record<string, string> = {
  Government: 'text-emerald-600', Private: 'text-amber-600', Deemed: 'text-blue-600',
};

export default function CollegesPage() {
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const filtered = useMemo(() => {
    let data = MOCK_COLLEGES;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
    }
    if (selectedState !== 'All') data = data.filter((c) => c.state === selectedState);
    if (selectedType !== 'All') data = data.filter((c) => c.type === selectedType);
    return data;
  }, [search, selectedState, selectedType]);

  const activeFilterCount = (selectedState !== 'All' ? 1 : 0) + (selectedType !== 'All' ? 1 : 0) + (search ? 1 : 0);

  const handleReset = () => { setSearch(''); setSelectedState('All'); setSelectedType('All'); };

  // Stats
  const govtCount = MOCK_COLLEGES.filter((c) => c.type === 'Government').length;
  const pvtCount = MOCK_COLLEGES.filter((c) => c.type === 'Private').length;
  const deemedCount = MOCK_COLLEGES.filter((c) => c.type === 'Deemed').length;

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <HeroBanner>
        <div className="relative z-10 space-y-3.5">
            <span className="hero-enter-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white border border-white/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <Sparkles className="w-3.5 h-3.5" /> Detailed Reviews
            </span>
            <h1 className="hero-enter-title text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight flex items-center gap-3.5 drop-shadow-md">
              <span className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm shadow-lg float-medium shrink-0">
                <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </span>
              College Reviews
            </h1>
            <p className="hero-enter-desc text-emerald-50/90 text-sm sm:text-base max-w-xl leading-relaxed">
              Explore honest, in-depth reviews of India's top medical colleges. Compare facilities, faculty, clinical exposure, campus life, and more.
            </p>
          </div>
      </HeroBanner>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Colleges', value: MOCK_COLLEGES.length, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Government', value: govtCount, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Private', value: pvtCount, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Deemed', value: deemedCount, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-4">
              <div className="flex items-center justify-center gap-3">
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
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
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
        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> of {MOCK_COLLEGES.length} colleges
      </p>

      {/* College Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState title="No colleges found" description="Try adjusting your search or filters."
          action={{ label: 'Clear Filters', onClick: handleReset }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((college) => (
            <Link key={college.id} to={`/colleges/${college.id}`} className="group">
              <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/40 relative">
                {/* Hover accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={college.thumbnail}
                    alt={college.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Type badge on image */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${typeColors[college.type]} backdrop-blur-sm`}>
                      {college.type}
                    </span>
                  </div>

                  {/* Established year */}
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Est. {college.established}
                    </span>
                  </div>

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
                    {college.description}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{college.totalSeats}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Seats</p>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <GraduationCap className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{college.coursesOffered.length}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Courses</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <IndianRupee className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{college.annualFees}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold">Fees</p>
                    </div>
                  </div>

                  {/* Cutoff */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Target className="w-3 h-3 text-emerald-500" />
                      <span className="font-medium">{college.neetCutoffRange}</span>
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
