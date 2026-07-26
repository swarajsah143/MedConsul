import { useState, useMemo } from 'react';
import { useFacets } from '@/lib/data-api';
import { collegePhoto } from '@/lib/college-photo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { HeroBanner } from '@/components/ui/hero-banner';
import { Search, Building2, ListChecks, Loader2 } from 'lucide-react';

const PER_PAGE = 24;

const selectClass =
  'mt-1.5 w-full h-11 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-400 focus:outline-none transition-colors';

// An impossible range so the result facet ships nothing until the user searches
// (hooks can't be conditional, so useFacets always runs).
const NO_SEARCH = { allIndiaRank_min: '2', allIndiaRank_max: '1' };

export default function EligibilityMatcherPage() {
  const [rankFrom, setRankFrom] = useState('');
  const [rankTo, setRankTo] = useState('');
  const [category, setCategory] = useState('All');
  const [counselling, setCounselling] = useState('All');
  const [submitted, setSubmitted] = useState<{ from: number; to: number; category: string; counselling: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);

  // Dropdown options — distinct values across all allotments (server-side, unfiltered).
  const { facets: optionFacets } = useFacets('allotments', ['category', 'counselling']);
  const categoryOptions = (optionFacets.category as string[]) ?? [];
  const counsellingOptions = (optionFacets.counselling as string[]) ?? [];

  // The eligible-college list is the distinct institute names among allotments in the
  // rank range — computed on the server, so the 222k-row collection never ships to the client.
  const resultFilters = useMemo(() => {
    if (!submitted) return NO_SEARCH;
    return {
      allIndiaRank_min: String(submitted.from),
      allIndiaRank_max: String(submitted.to),
      ...(submitted.category !== 'All' && { category: submitted.category }),
      ...(submitted.counselling !== 'All' && { counselling: submitted.counselling }),
    };
  }, [submitted]);
  const { facets: resultFacets, loading } = useFacets('allotments', ['instituteName'], resultFilters);

  const colleges = useMemo(() => {
    const list = (resultFacets.instituteName as string[]) ?? [];
    return [...list].sort((a, b) => a.localeCompare(b));
  }, [resultFacets]);

  const handleMatch = () => {
    const from = parseInt(rankFrom);
    const to = parseInt(rankTo);
    if (isNaN(from) || from < 1) { setFormError('Enter your starting rank (required).'); return; }
    if (isNaN(to) || to < from) { setFormError('Enter an end rank greater than or equal to the start rank.'); return; }
    setFormError('');
    setSubmitted({ from, to, category, counselling });
    setPage(1);
  };

  const handleReset = () => {
    setRankFrom(''); setRankTo(''); setCategory('All'); setCounselling('All');
    setSubmitted(null); setFormError(''); setPage(1);
  };

  const totalPages = Math.ceil(colleges.length / PER_PAGE);
  const paginated = colleges.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Hero */}
      <HeroBanner>
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
            <ListChecks className="w-3.5 h-3.5" /> Eligibility Matcher
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ListChecks className="w-7 h-7 sm:w-8 sm:h-8" /> Eligibility Matcher
          </h1>
          <p className="text-emerald-50/90 text-sm sm:text-base max-w-xl leading-relaxed">
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
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State / Counselling</label>
              <select value={counselling} onChange={(e) => setCounselling(e.target.value)} className={selectClass}>
                <option value="All">All States</option>
                {counsellingOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {formError && <p className="text-xs font-semibold text-red-500">{formError}</p>}

          <div className="flex items-center gap-2">
            <Button onClick={handleMatch}
              className="gradient-primary text-white font-semibold h-11 px-6 rounded-xl shadow-sm">
              <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Match Eligible Colleges</span>
            </Button>
            {submitted !== null && (
              <Button variant="outline" onClick={handleReset} className="h-11 rounded-xl hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {submitted !== null && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : colleges.length === 0 ? (
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-8 sm:p-8 text-center">
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
              <span className="font-bold text-slate-800 dark:text-slate-200">{colleges.length}</span> eligible college{colleges.length !== 1 ? 's' : ''} matched for rank {submitted.from.toLocaleString()}–{submitted.to.toLocaleString()}
              {submitted.category !== 'All' && <span className="text-emerald-600 font-medium"> · {submitted.category}</span>}
              {submitted.counselling !== 'All' && <span className="text-emerald-600 font-medium"> · {submitted.counselling}</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginated.map((name) => (
                <Card key={name} className="border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 sm:p-4 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                      <Building2 className="w-[18px] h-[18px] text-emerald-600" />
                      <img
                        src={collegePhoto(name)}
                        alt=""
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{name}</h3>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Eligible in your rank range</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              itemCount={paginated.length} totalItems={colleges.length} />
          </div>
        )
      )}
    </div>
  );
}
