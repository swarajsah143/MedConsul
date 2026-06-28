import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_COLLEGES } from '@/lib/college-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  GraduationCap,
  MapPin,
  Building2,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

const STATES = [...new Set(MOCK_COLLEGES.map((c) => c.state))].sort();
const TYPES: Array<'Government' | 'Private' | 'Deemed'> = ['Government', 'Private', 'Deemed'];

const typeColors: Record<string, string> = {
  Government: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
  Private: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
  Deemed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40',
};

export default function CollegesPage() {
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let data = MOCK_COLLEGES;

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (selectedState !== 'All') {
      data = data.filter((c) => c.state === selectedState);
    }
    if (selectedType !== 'All') {
      data = data.filter((c) => c.type === selectedType);
    }

    return data;
  }, [search, selectedState, selectedType]);

  const activeFilterCount =
    (selectedState !== 'All' ? 1 : 0) + (selectedType !== 'All' ? 1 : 0);

  const handleReset = () => {
    setSearch('');
    setSelectedState('All');
    setSelectedType('All');
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        icon={GraduationCap}
        title="College Reviews"
        description="Explore detailed reviews of India's top medical colleges. Compare facilities, faculty, clinical exposure, and student life."
      />

      {/* Search & Filter Bar */}
      <div className="glass border-slate-100 p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by college name, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All States</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">College Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All Types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <div className="sm:col-span-2">
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-slate-500">
                  <X className="w-3.5 h-3.5 mr-1" /> Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <p className="text-xs text-muted-foreground font-medium">
        Showing {filtered.length} of {MOCK_COLLEGES.length} colleges
      </p>

      {/* College Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No colleges found"
          description="Try adjusting your search or filters to find colleges."
          action={{ label: 'Clear Filters', onClick: handleReset }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((college) => (
            <Link key={college.id} to={`/colleges/${college.id}`} className="group">
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col border-slate-200 dark:border-slate-800 group-hover:border-teal-300 dark:group-hover:border-teal-800">
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={college.thumbnail}
                    alt={college.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${typeColors[college.type]}`}
                    >
                      {college.type}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent h-16" />
                </div>

                {/* Content */}
                <CardContent className="flex-1 flex flex-col p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {college.name}
                  </h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {college.city}, {college.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Est. {college.established}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 flex-1">
                    {college.description}
                  </p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Seats</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{college.totalSeats}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Courses</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{college.coursesOffered.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Fees</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{college.annualFees}</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Full Review <ChevronRight className="w-3.5 h-3.5" />
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
