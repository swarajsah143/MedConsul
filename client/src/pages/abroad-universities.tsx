import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollection, distinct } from '@/lib/data-api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Globe2,
  Search,
  ChevronDown,
  Star,
  Sparkles,
  GraduationCap,
  Wallet,
  Clock,
  BadgeCheck,
  Languages,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Database,
  X,
  MapPin,
  CalendarDays,
  CalendarClock,
  Info,
  CheckCircle2,
  Home,
  ShieldCheck,
  Wallet2,
} from 'lucide-react';

/** Admin-managed abroad university. Only `id` is guaranteed. */
interface AbroadUniversity {
  id: string;
  name?: string;
  country?: string;
  flag?: string;
  city?: string;
  degree?: string;
  durationYears?: number;
  medium?: string;
  tuitionPerYearUSD?: number;
  livingCostPerYearUSD?: number;
  rating?: number;
  recognitions?: string[];
  highlight?: string;
  image?: string;
  // Richer detail (shown in the "View details" panel)
  about?: string;
  website?: string;
  established?: number;
  intake?: string;
  eligibility?: string;
  licensingExams?: string[];
  advantages?: string[];
  hostelInfo?: string;
}

const money = (n: number) => `$${n.toLocaleString()}`;

/**
 * MISSING COST DATA IS NOT ZERO COST.
 *
 * These fields used to be coerced with `?? 0`, so a university whose tuition and
 * living cost an admin simply hadn't recorded scored as the cheapest in the list,
 * won the value ranking, and got RECOMMENDED to a student *because* its data was
 * missing. A cost is only known when BOTH components are recorded; anything else
 * is un-priced and must not be ranked or recommended as if it were free.
 */
function isPriced(x: AbroadUniversity): boolean {
  return typeof x.tuitionPerYearUSD === 'number' && typeof x.livingCostPerYearUSD === 'number';
}

/** Total annual cost, or `undefined` when the university has no cost data recorded. */
function totalCostOf(x: AbroadUniversity): number | undefined {
  return isPriced(x) ? x.tuitionPerYearUSD! + x.livingCostPerYearUSD! : undefined;
}

/**
 * A "value" score favouring good rating AND low total annual cost — used to
 * surface affordable-yet-good universities as recommendations.
 * (Same formula as the old lib/abroad-data.ts helper.)
 *
 * Only defined for PRICED universities — see `isPriced`.
 */
function valueScore(x: AbroadUniversity): number {
  return (x.rating ?? 0) - ((totalCostOf(x) ?? 0) / 25000) * 2.5;
}

/** Cheap + well rated. An un-priced or unrated university can never qualify. */
function isRecommended(x: AbroadUniversity): boolean {
  return (
    isPriced(x) &&
    x.tuitionPerYearUSD! <= 6000 &&
    typeof x.rating === 'number' &&
    x.rating >= 4.2
  );
}

/** Value-rank the priced universities; un-priced ones keep their place at the end. */
function byValue(a: AbroadUniversity, b: AbroadUniversity): number {
  const aPriced = isPriced(a);
  const bPriced = isPriced(b);
  if (aPriced !== bPriced) return aPriced ? -1 : 1;
  if (!aPriced) return 0;
  return valueScore(b) - valueScore(a);
}

function searchAbroad(rows: AbroadUniversity[], query: string, country: string): AbroadUniversity[] {
  const q = query.trim().toLowerCase();
  return rows
    .filter((x) => {
      const matchQuery =
        !q ||
        (x.name ?? '').toLowerCase().includes(q) ||
        (x.country ?? '').toLowerCase().includes(q) ||
        (x.city ?? '').toLowerCase().includes(q);
      const matchCountry = country === 'All Countries' || x.country === country;
      return matchQuery && matchCountry;
    })
    .sort(byValue);
}

/** Top affordable + good recommendations (used when no search is active). */
function recommendedAbroad(rows: AbroadUniversity[], limit = 6): AbroadUniversity[] {
  return rows
    .filter(isRecommended)
    .sort(byValue)
    .slice(0, limit);
}

function AbroadCard({ x, onOpen }: { x: AbroadUniversity; onOpen: (x: AbroadUniversity) => void }) {
  const total = totalCostOf(x);
  const recommended = isRecommended(x);
  const name = x.name ?? 'Unnamed university';
  const place = [x.city, x.country].filter(Boolean).join(', ');
  const recognitions = x.recognitions ?? [];
  return (
    <Card
      onClick={() => onOpen(x)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(x); } }}
      className="group h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-transparent hover:border-red-200 dark:hover:border-red-900/40 relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
    >
      {/* Photo banner */}
      <div className="relative h-32 bg-gradient-to-br from-red-500 to-rose-600 overflow-hidden">
        {x.image && (
          <img
            src={x.image}
            alt={name}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        {recommended && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
            <Sparkles className="w-3 h-3" /> Recommended
          </span>
        )}
        {x.rating !== undefined && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-amber-600 shadow">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {x.rating.toFixed(1)}
          </span>
        )}
        {(x.flag || place) && (
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-white">
            {x.flag && <span className="text-base leading-none">{x.flag}</span>}
            <span className="text-[11px] font-semibold truncate drop-shadow">{place}</span>
          </div>
        )}
      </div>

      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
            <GraduationCap className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
              {name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              {x.degree && <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {x.degree}</span>}
              {x.durationYears !== undefined && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {x.durationYears} yrs</span>}
              {x.medium && <span className="inline-flex items-center gap-1"><Languages className="w-3 h-3" /> {x.medium}</span>}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{x.highlight ?? ''}</p>

        {/* Cost — an unrecorded cost reads as "—", never as $0. */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 mt-3">
          <div className="text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Tuition/yr</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {x.tuitionPerYearUSD !== undefined ? money(x.tuitionPerYearUSD) : '—'}
            </p>
          </div>
          <div className="text-center border-x border-slate-200 dark:border-slate-700">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Living/yr</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {x.livingCostPerYearUSD !== undefined ? money(x.livingCostPerYearUSD) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Total/yr</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {total !== undefined ? money(total) : '—'}
            </p>
          </div>
        </div>

        {/* Recognitions */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {recognitions.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
              <BadgeCheck className="w-3 h-3" /> {r}
            </span>
          ))}
        </div>

        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 group-hover:gap-2.5 transition-all">
          View Details <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* detail panel                                                               */
/* -------------------------------------------------------------------------- */

function Fact({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{value}</p>
    </div>
  );
}

function AbroadDetailModal({ x, onClose }: { x: AbroadUniversity; onClose: () => void }) {
  // Close on Escape, and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const name = x.name ?? 'Unnamed university';
  const place = [x.city, x.country].filter(Boolean).join(', ');
  const total = totalCostOf(x);
  const recognitions = x.recognitions ?? [];
  const advantages = x.advantages ?? [];
  const licensing = x.licensingExams ?? [];

  const facts: { icon: typeof Info; label: string; value: string }[] = [];
  if (x.degree) facts.push({ icon: GraduationCap, label: 'Degree', value: x.degree });
  if (x.durationYears !== undefined) facts.push({ icon: Clock, label: 'Duration', value: `${x.durationYears} years` });
  if (x.medium) facts.push({ icon: Languages, label: 'Medium', value: x.medium });
  if (x.established !== undefined) facts.push({ icon: CalendarDays, label: 'Established', value: String(x.established) });
  if (x.intake) facts.push({ icon: CalendarClock, label: 'Intake', value: x.intake });
  if (x.tuitionPerYearUSD !== undefined) facts.push({ icon: Wallet, label: 'Tuition / yr', value: money(x.tuitionPerYearUSD) });
  if (x.livingCostPerYearUSD !== undefined) facts.push({ icon: Home, label: 'Living / yr', value: money(x.livingCostPerYearUSD) });
  if (total !== undefined) facts.push({ icon: Wallet2, label: 'Total / yr', value: money(total) });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={name}
        className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
        initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        {/* Banner */}
        <div className="relative h-44 bg-gradient-to-br from-red-500 to-rose-600 overflow-hidden">
          {x.image && (
            <img
              src={x.image}
              alt={name}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          {isRecommended(x) && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow">
              <Sparkles className="w-3 h-3" /> Recommended
            </span>
          )}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold drop-shadow">
              {x.flag && <span className="text-base leading-none">{x.flag}</span>}
              <MapPin className="w-3.5 h-3.5" /> {place}
              {x.rating !== undefined && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-amber-600">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {x.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-xl font-extrabold leading-tight drop-shadow">{name}</h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* About */}
          {x.about && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                <Info className="w-4 h-4 text-red-600 dark:text-red-400" /> About
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{x.about}</p>
            </section>
          )}

          {/* Quick facts */}
          {facts.length > 0 && (
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {facts.map((f) => <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />)}
            </section>
          )}

          {/* Advantages */}
          {advantages.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Why choose it
              </h3>
              <ul className="grid sm:grid-cols-2 gap-2">
                {advantages.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Eligibility */}
          {x.eligibility && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                <GraduationCap className="w-4 h-4 text-red-600 dark:text-red-400" /> Eligibility
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{x.eligibility}</p>
            </section>
          )}

          {/* Licensing + Recognitions */}
          {(licensing.length > 0 || recognitions.length > 0) && (
            <section className="grid sm:grid-cols-2 gap-5">
              {licensing.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Licensing
                  </h3>
                  <ul className="space-y-1.5">
                    {licensing.map((l) => (
                      <li key={l} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" /> {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {recognitions.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                    <BadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Recognitions
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {recognitions.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                        <BadgeCheck className="w-3 h-3" /> {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Hostel */}
          {x.hostelInfo && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                <Home className="w-4 h-4 text-red-600 dark:text-red-400" /> Hostel &amp; mess
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{x.hostelInfo}</p>
            </section>
          )}

          {/* Cost disclaimer */}
          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
            Fees and living costs are indicative, last-known figures for comparison — always confirm the
            current amount with the university before deciding.
          </p>

          {/* Website */}
          {x.website && (
            <a
              href={x.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl gradient-primary text-white text-sm font-semibold shadow-md shadow-red-600/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Globe2 className="w-4 h-4" /> Visit official website <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AbroadUniversitiesPage() {
  const { data, loading, error, reload } = useCollection<AbroadUniversity>('abroadUniversities');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('All Countries');
  const [selected, setSelected] = useState<AbroadUniversity | null>(null);

  const isSearching = query.trim() !== '' || country !== 'All Countries';
  const countryOptions = useMemo(() => distinct(data, 'country'), [data]);
  const results = useMemo(() => searchAbroad(data, query, country), [data, query, country]);
  const recommended = useMemo(() => recommendedAbroad(data, 6), [data]);

  const hero = (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="gradient-primary p-6 sm:p-8 lg:p-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-white border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Study Abroad
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Globe2 className="w-7 h-7 sm:w-8 sm:h-8" /> Abroad Universities
          </h1>
          <p className="text-red-100/90 text-sm sm:text-base max-w-xl leading-relaxed">
            Research affordable, NMC-recognised medical universities abroad. Search by name or explore our curated recommendations.
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero}
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-red-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading universities...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero}
        <EmptyState
          icon={AlertTriangle}
          title="Could not load abroad universities"
          description={error}
          action={{ label: 'Retry', onClick: reload }}
        />
      </div>
    );
  }

  // The collection is EMPTY — nothing has been added yet. That is not a search miss,
  // so don't hand the student a search box and blame a filter they never set.
  if (data.length === 0) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        {hero}
        <EmptyState
          icon={Database}
          title="No universities yet"
          description="No abroad universities have been added yet. An admin can add them under Manage Data → Abroad Universities."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 page-enter">
      {hero}

      {/* Search */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-400" />
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search universities by name, city or country..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 h-11 text-base rounded-xl"
              />
            </div>
            <div className="relative sm:w-64">
              <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
              >
                <option value="All Countries">All Countries</option>
                {countryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended (no active search) */}
      {!isSearching && recommended.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recommended: Affordable &amp; Good</h2>
              <p className="text-xs text-muted-foreground">Best value picks — strong ratings with low total cost of study.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((x) => (
              <AbroadCard key={x.id} x={x} onOpen={setSelected} />
            ))}
          </div>
        </div>
      )}

      {/* All / search results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isSearching ? 'Search Results' : 'All Universities'}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-slate-800 dark:text-slate-200">{results.length}</span> found
          </p>
        </div>

        {results.length === 0 ? (
          <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
            <CardContent className="p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No universities match your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different name or select another country.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((x) => (
              <AbroadCard key={x.id} x={x} onOpen={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && <AbroadDetailModal x={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
