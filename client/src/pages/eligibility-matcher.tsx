import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_STATES, searchAllotmentsByRank, ALLOTMENT_FILTER_OPTIONS, type AllotmentEntry } from '@/lib/allotment-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Sparkles, Target, Search, Building2, MapPin } from 'lucide-react';

const PER_PAGE = 12;

// A small pool of campus / hospital photos (same source the college data uses).
// Assigned deterministically per college so each card keeps a stable image.
const COLLEGE_PHOTOS = [
  'photo-1587351021759-3e566b6af7cc',
  'photo-1519494026892-80bbd2d6fd0d',
  'photo-1580281658223-9b93f18ae9ae',
  'photo-1551076805-e1869033e561',
  'photo-1562774053-701939374585',
  'photo-1504439468489-c8920d796a29',
  'photo-1571019614242-c5c5dee9f50b',
  'photo-1523050854058-8df90110c9f1',
  'photo-1607237138185-eedd9c632b0b',
  'photo-1541339907198-e08756dedf3f',
].map((id) => `https://images.unsplash.com/${id}?w=160&h=160&fit=crop&auto=format`);

function collegePhoto(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLLEGE_PHOTOS[h % COLLEGE_PHOTOS.length];
}

interface EligibleCollege {
  instituteName: string;
  counselling: string;
  seatType: string;
  minRank: number;
  maxRank: number;
  categories: Set<string>;
  seats: number;
}

const selectClass =
  'mt-1.5 w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors';

export default function EligibilityMatcherPage() {
  const navigate = useNavigate();

  const [rankFrom, setRankFrom] = useState('');
  const [rankTo, setRankTo] = useState('');
  const [category, setCategory] = useState('All');
  const [state, setState] = useState('All');
  const [results, setResults] = useState<AllotmentEntry[] | null>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);

  const handleMatch = () => {
    const from = parseInt(rankFrom);
    const to = parseInt(rankTo);
    if (isNaN(from) || from < 1) { setError('Enter your starting rank (required).'); return; }
    if (isNaN(to) || to < from) { setError('Enter an end rank greater than or equal to the start rank.'); return; }
    setError('');
    setSearching(true);
    setTimeout(() => {
      let data = searchAllotmentsByRank(from, to);
      if (category !== 'All') data = data.filter((e) => e.category === category);
      if (state !== 'All') data = data.filter((e) => e.counselling === state);
      setResults(data);
      setPage(1);
      setSearching(false);
    }, 300);
  };

  const handleReset = () => {
    setRankFrom(''); setRankTo(''); setCategory('All'); setState('All');
    setResults(null); setError(''); setPage(1);
  };

  // Group matching allotments into unique eligible colleges
  const eligibleColleges = useMemo<EligibleCollege[]>(() => {
    if (!results) return [];
    const map = new Map<string, EligibleCollege>();
    for (const e of results) {
      const key = `${e.instituteName}||${e.counselling}`;
      let g = map.get(key);
      if (!g) {
        g = { instituteName: e.instituteName, counselling: e.counselling, seatType: e.seatType, minRank: e.allIndiaRank, maxRank: e.allIndiaRank, categories: new Set(), seats: 0 };
        map.set(key, g);
      }
      g.minRank = Math.min(g.minRank, e.allIndiaRank);
      g.maxRank = Math.max(g.maxRank, e.allIndiaRank);
      g.categories.add(e.category);
      g.seats += 1;
    }
    return [...map.values()].sort((a, b) => a.minRank - b.minRank);
  }, [results]);

  const totalPages = Math.ceil(eligibleColleges.length / PER_PAGE);
  const paginated = eligibleColleges.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <HeroBanner>
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Eligibility Matcher
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Target className="w-7 h-7 sm:w-8 sm:h-8" /> Eligibility Matcher
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
            Enter your rank range and we'll match you with every college where your eligibility holds. Narrow further by category and state.
          </p>
        </div>
      </HeroBanner>

      {/* Matcher form */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" />
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Rank Range <span className="text-emerald-600">*</span>
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <Input type="number" placeholder="From (e.g. 5000)" value={rankFrom}
                  onChange={(e) => setRankFrom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMatch()} className="h-11 text-sm" />
                <span className="text-slate-400 shrink-0">—</span>
                <Input type="number" placeholder="To (e.g. 20000)" value={rankTo}
                  onChange={(e) => setRankTo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMatch()} className="h-11 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                <option value="All">All Categories</option>
                {ALLOTMENT_FILTER_OPTIONS.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State / Counselling</label>
              <select value={state} onChange={(e) => setState(e.target.value)} className={selectClass}>
                <option value="All">All States</option>
                {ALL_STATES.map((s) => <option key={s} value={s}>{s === 'All India Quota - MCC' ? 'All India Quota (MCC)' : s}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <div className="flex items-center gap-2">
            <Button onClick={handleMatch} disabled={searching}
              className="gradient-primary text-white font-semibold h-11 px-6 rounded-xl shadow-sm disabled:opacity-60">
              {searching ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Matching…
                </span>
              ) : (
                <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Match Eligible Colleges</span>
              )}
            </Button>
            {results !== null && (
              <Button variant="outline" onClick={handleReset} className="h-11 rounded-xl hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results !== null && (
        eligibleColleges.length === 0 ? (
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No eligible colleges found for this selection.</p>
              <p className="text-xs text-muted-foreground mt-1">Try widening the rank range or changing the category / state.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground px-1">
              <span className="font-bold text-slate-800 dark:text-slate-200">{eligibleColleges.length}</span> eligible college{eligibleColleges.length !== 1 ? 's' : ''} matched for rank {parseInt(rankFrom).toLocaleString()}–{parseInt(rankTo).toLocaleString()}
              {category !== 'All' && <span className="text-emerald-600 font-medium"> · {category}</span>}
              {state !== 'All' && <span className="text-emerald-600 font-medium"> · {state === 'All India Quota - MCC' ? 'MCC' : state}</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginated.map((c) => {
                const seatBadge = c.seatType === 'Government'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : c.seatType === 'Deemed'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
                return (
                  <button key={`${c.instituteName}-${c.counselling}`} onClick={() => navigate(`/allotment/${encodeURIComponent(c.counselling)}`)} className="group text-left w-full">
                    <Card className="h-full border-slate-200/60 dark:border-slate-800/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                            <Building2 className="w-[18px] h-[18px] text-emerald-600" />
                            <img
                              src={collegePhoto(c.instituteName)}
                              alt=""
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {c.instituteName}
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {c.counselling === 'All India Quota - MCC' ? 'MCC — All India Quota' : c.counselling}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${seatBadge}`}>{c.seatType}</span>
                          {[...c.categories].slice(0, 3).map((cat) => (
                            <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{cat}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Closing Rank</p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                              {c.minRank.toLocaleString()}{c.maxRank !== c.minRank ? `–${c.maxRank.toLocaleString()}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{c.seats} seat{c.seats !== 1 ? 's' : ''}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              itemCount={paginated.length} totalItems={eligibleColleges.length} />
          </div>
        )
      )}
    </div>
  );
}
