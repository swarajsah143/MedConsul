import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  predict, usePredictorMeta, CHANCE_STYLE,
  type Prediction, type PredictMatch, type Chance,
} from '@/lib/predict-api';
import { useAuth } from '@/providers/auth-provider';
import { usePlan } from '@/lib/use-plan';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { toCsv, downloadCsv } from '@/lib/csv';
import {
  Target, Loader2, AlertTriangle, Download, Sparkles, TrendingUp,
  ChevronRight, Info, SearchX, Lock,
} from 'lucide-react';

/**
 * The Rank Predictor.
 *
 * "I got 612 — where can I actually get in?" is the question that brings a student here,
 * and until now the app had no answer to it. It takes a score (or a rank they already
 * know), estimates the All India Rank against that year's curve, and lists the colleges
 * whose real closing ranks say they have a shot — each labelled Safe, Good, Reach or Tough.
 *
 * Every number comes from POST /api/predict. Nothing is computed here; see predict-api.ts.
 */

const SELECT =
  'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200 ' +
  'hover:border-red-300 appearance-none cursor-pointer';

const FIELD =
  'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all duration-200';

const BANDS: Chance[] = ['Safe', 'Good', 'Reach', 'Tough'];

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function RankPredictorPage() {
  const { user } = useAuth();
  const { canFullData } = usePlan();   // Pro+ unlocks the full shortlist + CSV export
  const { meta, loading: metaLoading, error: metaError } = usePredictorMeta();

  const [mode, setMode] = useState<'marks' | 'rank'>('marks');
  const [marks, setMarks] = useState('');
  const [rank, setRank] = useState('');
  const [category, setCategory] = useState('General');
  const [year, setYear] = useState<number | ''>('');
  const [course, setCourse] = useState('');
  const [quota, setQuota] = useState('');
  const [state, setState] = useState('');
  const [round, setRound] = useState<number | ''>('');

  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<Chance | 'All'>('All');

  // Prefill from the student's own counselling profile. They already told us their score
  // and category on the Profile page; asking again would be rude.
  useEffect(() => {
    if (!user) return;
    const u = user as any;
    if (u.neetScore != null && u.neetScore !== '') { setMarks(String(u.neetScore)); setMode('marks'); }
    else if (u.neetRank != null && u.neetRank !== '') { setRank(String(u.neetRank)); setMode('rank'); }
    if (u.category) setCategory(u.category);
    if (u.domicileState) setState(u.domicileState);
    if (u.coursePreference) setCourse(u.coursePreference);
  }, [user]);

  const canSubmit = mode === 'marks' ? marks.trim() !== '' : rank.trim() !== '';

  async function onPredict(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    try {
      const r = await predict({
        ...(mode === 'marks' ? { marks: Number(marks) } : { rank: Number(rank) }),
        category,
        year: year === '' ? undefined : year,
        course: course || undefined,
        quota: quota || undefined,
        state: state || undefined,
        round: round === '' ? undefined : round,
      });
      setResult(r);
      setBand('All');
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(
    () => (result ? result.matches.filter((m) => band === 'All' || m.chance === band) : []),
    [result, band]
  );

  function exportCsv() {
    if (!result) return;
    downloadCsv(
      `neet-${result.year}-${result.category}-air-${result.matchedOn}.csv`,
      toCsv(
        ['College', 'City', 'State', 'Type', 'Course', 'Quota', 'Round', 'Year', 'Closing Rank', 'Chance'],
        result.matches.map((m) => [
          m.college, m.city ?? '', m.state ?? '', m.type ?? '', m.course,
          m.quota, m.round, m.year, m.closingRank, m.chance,
        ])
      )
    );
  }

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  if (metaError || !meta) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="The predictor is unavailable"
        description={metaError ?? 'Could not load the predictor.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Rank Predictor"
        description={`Enter your NEET score and see which colleges you can realistically target, matched against real closing ranks from ${meta.years.slice(-1)[0]}–${meta.years[0]}.`}
      >
        {result && result.total > 0 && (
          canFullData ? (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          ) : (
            <Link to="/pricing" title="Upgrade to Pro to export" className="inline-flex items-center h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:border-red-300 hover:text-red-600">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Export (Pro)
            </Link>
          )
        )}
      </PageHeader>

      {/* ── the form ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={onPredict} className="space-y-5">
            {/* score or rank */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="sm:w-72">
                <div className="inline-flex p-1 mb-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(['marks', 'rank'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        mode === m
                          ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {m === 'marks' ? 'I know my score' : 'I know my rank'}
                    </button>
                  ))}
                </div>

                {mode === 'marks' ? (
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder={`NEET score out of ${meta.totalMarks}`}
                    max={meta.totalMarks}
                    className={FIELD}
                    aria-label="NEET score"
                    autoFocus
                  />
                ) : (
                  <input
                    type="number"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    placeholder="All India Rank"
                    min={1}
                    className={FIELD}
                    aria-label="All India Rank"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Select label="Category" value={category} onChange={setCategory}
                  options={meta.categories.map((c) => [c, c])} />
                <Select label="Year" value={String(year)} onChange={(v) => setYear(v === '' ? '' : Number(v))}
                  options={meta.years.map((y) => [String(y), String(y)])} placeholder="Latest" />
                <Select label="Course" value={course} onChange={setCourse}
                  options={meta.courses.map((c) => [c, c])} placeholder="Any" />
                <Select label="State" value={state} onChange={setState}
                  options={meta.states.map((s) => [s, s])} placeholder="All India" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="grid grid-cols-2 gap-3 flex-1 max-w-md">
                <Select label="Quota" value={quota} onChange={setQuota}
                  options={meta.quotas.map((q) => [q, q])} placeholder="Any" />
                <Select label="Round" value={String(round)} onChange={(v) => setRound(v === '' ? '' : Number(v))}
                  options={meta.rounds.map((r) => [String(r), r === 4 ? 'Stray Vacancy' : `Round ${r}`])}
                  placeholder="Best across rounds" />
              </div>
              <Button type="submit" disabled={!canSubmit || busy} className="h-11 sm:w-44">
                {busy
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Predicting…</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Predict</>}
              </Button>
            </div>
          </form>

          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && <Summary result={result} />}

      {result && result.total === 0 && (
        <EmptyState
          icon={SearchX}
          title="No colleges match those filters"
          description="Nothing in the data closes anywhere near this rank for that combination. Try widening the state, quota or course."
        />
      )}

      {result && result.total > 0 && (
        <>
          {/* band filter */}
          <div className="flex flex-wrap gap-2">
            <BandChip active={band === 'All'} onClick={() => setBand('All')}
              label="All" count={result.total} dot="bg-slate-400" />
            {BANDS.map((b) => result.counts[b] > 0 && (
              <BandChip key={b} active={band === b} onClick={() => setBand(b)}
                label={CHANCE_STYLE[b].label} count={result.counts[b]} dot={CHANCE_STYLE[b].dot} />
            ))}
          </div>

          {band !== 'All' && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0" /> {CHANCE_STYLE[band].blurb}
            </p>
          )}

          <MatchTable matches={shown} />

          {!canFullData ? (
            <UpgradePrompt
              title={`See all ${fmt(result.total)} colleges you can target`}
              description={`This free estimate shows the top ${result.matches.length}. Upgrade to Pro for your complete shortlist and CSV export.`}
            />
          ) : result.matches.length < result.total ? (
            <p className="text-xs text-center text-muted-foreground">
              Showing the strongest {result.matches.length} of {fmt(result.total)} matching colleges — export for the full list.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

// ── pieces ───────────────────────────────────────────────────────────

function Select({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT} aria-label={label}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Summary({ result }: { result: Prediction }) {
  const spread = result.air.hi > result.air.lo;

  return (
    <Card className="border-red-100 dark:border-red-950/40 bg-gradient-to-br from-red-50/60 to-transparent dark:from-red-950/20">
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={result.mode === 'marks' ? 'Estimated All India Rank' : 'Your All India Rank'}
            value={`#${fmt(result.air.point)}`}
            sub={result.mode === 'marks' && spread
              ? `Likely #${fmt(result.air.lo)} – #${fmt(result.air.hi)} · NEET ${result.year} trend`
              : `NEET ${result.year}`}
            accent
          />
          <Stat label="Percentile" value={result.percentile >= 99.99 ? '99.99+' : result.percentile.toFixed(2)}
            sub="of ~24 lakh candidates" />
          <Stat
            label={`${result.category} category rank`}
            value={result.categoryRank ? `#${fmt(result.categoryRank)}` : '—'}
            sub={result.categoryRank ? 'approximate' : 'not available'}
          />
          <Stat label="Colleges you can target" value={fmt(result.total)}
            sub={`${fmt(result.counts.Safe)} safe · ${fmt(result.counts.Good)} good`} />
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Matched against real {result.year} closing ranks for {result.category}.
            {result.note ? ` ${result.note}` : ''}{' '}
            Cutoffs move every year with the paper's difficulty and the number of candidates — treat this as a
            shortlist to research, not a guarantee.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${
        accent ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BandChip({ active, onClick, label, count, dot }: {
  active: boolean; onClick: () => void; label: string; count: number; dot: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
        active
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      aria-pressed={active}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
      <span className="text-xs text-muted-foreground">{fmt(count)}</span>
    </button>
  );
}

function MatchTable({ matches }: { matches: PredictMatch[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              {['College', 'Course', 'Quota', 'Round', 'Closing rank', 'Chance'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => {
              const s = CHANCE_STYLE[m.chance];
              return (
                <tr
                  key={`${m.collegeId}-${m.course}-${m.quota}-${m.round}-${i}`}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/colleges/${m.collegeId}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-red-600 dark:hover:text-red-400 inline-flex items-center gap-1 group"
                    >
                      {m.college}
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[m.city, m.state].filter(Boolean).join(', ')}
                      {m.type ? ` · ${m.type}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{m.course}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[14rem]">{m.quota}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {m.round === 4 ? 'Stray' : `R${m.round}`}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">{fmt(m.closingRank)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${s.chip}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {matches.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 opacity-40" />
          No colleges in this band.
        </div>
      )}
    </Card>
  );
}
