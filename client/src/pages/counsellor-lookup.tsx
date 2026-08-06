import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  predict, usePredictorMeta, CHANCE_STYLE,
  type Prediction, type PredictMatch, type Chance,
} from '@/lib/predict-api';
import { useCollection, type FeeEntry } from '@/lib/data-api';
import { quotaAccess } from '@/lib/quota';
import { DomicileBadge } from '@/components/ui/domicile-badge';
import { formatINR } from '@/lib/fee-matrix-data';
import { toCsv, downloadCsv } from '@/lib/csv';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search, Loader2, AlertTriangle, ChevronDown, ChevronUp, Info, SearchX, Printer, Download,
} from 'lucide-react';

/**
 * Counsellor Lookup.
 *
 * A counsellor sitting across from a student already knows their All India Rank — it is
 * printed on the rank card. This page skips everything the Rank Predictor asks a student
 * for (their own score, their own saved profile) and goes straight to "type the rank, see
 * the shortlist." Every other filter (category, year, course, quota, state, round) has a
 * sensible default and lives behind "More Options" so the common case is one field.
 *
 * All the maths is POST /api/predict, same as the Rank Predictor — see predict-api.ts.
 * This page only renders; it does not compute anything itself.
 */

const SELECT =
  'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200 ' +
  'hover:border-emerald-300 appearance-none cursor-pointer';

const BANDS: Chance[] = ['Safe', 'Good', 'Reach', 'Tough'];

const fmt = (n: number) => n.toLocaleString('en-IN');

export default function CounsellorLookupPage() {
  const { meta, loading: metaLoading, error: metaError } = usePredictorMeta();

  // The one required field.
  const [rank, setRank] = useState('');

  // Everything else — collapsed behind "More Options", already defaulted to values that
  // produce a useful result on their own (General category, latest year, any course/quota/
  // state, best rank across rounds).
  const [showMore, setShowMore] = useState(false);
  const [category, setCategory] = useState('General');
  const [year, setYear] = useState<number | ''>('');
  const [course, setCourse] = useState('');
  const [quota, setQuota] = useState('');
  const [state, setState] = useState('');
  const [round, setRound] = useState<number | ''>('');

  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fee lookup for the "Fee" column, scoped to the category the shown matches were computed
  // for (once a lookup has run) — the fee schedule differs by category. This is a display
  // join only; it never touches the matches predict() returned.
  const { data: fees } = useCollection<FeeEntry>('fees', { category: result?.category ?? category });
  const feeMap = useMemo(() => {
    const map = new Map<string, FeeEntry>();
    for (const f of fees) map.set(`${f.collegeId}|${f.course}|${f.quota}`, f);
    return map;
  }, [fees]);

  function feeFor(m: PredictMatch): string {
    const f = feeMap.get(`${m.collegeId}|${m.course}|${m.quota}`);
    const amount = f?.totalFirstYear ?? f?.tuitionFee;
    return amount != null ? `₹${formatINR(amount)}` : 'Not available';
  }

  /**
   * The seat's domicile condition, for the export/handout. Deliberately NOT personalised: this
   * screen is used by a counsellor advising someone else, so their own profile domicile says
   * nothing about the family in front of them. State the seat's requirement and let the counsellor
   * apply it.
   */
  function eligibilityFor(m: PredictMatch): string {
    const a = quotaAccess(m.quota, m.state);
    return a.scope === 'state' && a.domicileState ? `${a.domicileState} domicile only` : 'Open to all states';
  }

  const canSubmit = rank.trim() !== '';
  const handlePrint = () => window.print();

  /** The currently visible results — same Safe -> Good -> Reach -> Tough grouping and rows
   * as the on-screen tables, just flattened into one file. No CSV logic of its own: toCsv/
   * downloadCsv (lib/csv.ts) do the RFC-4180 escaping and the actual download. */
  function exportCsv() {
    if (!result) return;
    const rows = BANDS.flatMap((b) => result.matches.filter((m) => m.chance === b));
    downloadCsv(
      `counsellor-lookup-${result.year}-${result.category}-air-${result.air.point}.csv`,
      toCsv(
        ['College', 'City', 'Quota', 'Eligibility', 'Closing Rank', 'Fee', 'Status'],
        rows.map((m) => [m.college, m.city ?? '', m.quota, eligibilityFor(m), m.closingRank, feeFor(m), CHANCE_STYLE[m.chance].label])
      )
    );
  }

  async function onLookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    try {
      const r = await predict({
        rank: Number(rank),
        category,
        year: year === '' ? undefined : year,
        course: course || undefined,
        quota: quota || undefined,
        state: state || undefined,
        round: round === '' ? undefined : round,
      });
      setResult(r);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (metaError || !meta) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="The lookup is unavailable"
        description={metaError ?? 'Could not load the predictor.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Search}
        title="Counsellor Lookup"
        description="Type a student's All India Rank to see which colleges close within reach — matched against real closing ranks."
      >
        {result && result.total > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} className="print:hidden">
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </>
        )}
      </PageHeader>

      {/* Everything below — the rank input, More Options filters, and the Look up button —
          is the editing surface. None of it belongs on a printed handout, so the whole card
          is print:hidden; the print-only block right after the results replaces it with just
          the three facts a printout needs (Rank, Category, Date). */}
      <Card className="print:hidden">
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={onLookup} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 max-w-xs">
                <label htmlFor="air" className="block mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  All India Rank
                </label>
                <input
                  id="air"
                  type="number"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="e.g. 42318"
                  min={1}
                  className={
                    'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm ' +
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200'
                  }
                  aria-label="All India Rank"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={!canSubmit || busy} className="h-11 sm:w-40">
                {busy
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up…</>
                  : <><Search className="w-4 h-4 mr-2" /> Look up</>}
              </Button>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="inline-flex items-center gap-1 h-11 px-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 sm:ml-auto"
                aria-expanded={showMore}
              >
                More Options
                {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showMore && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Select label="Category" value={category} onChange={setCategory}
                  options={meta.categories.map((c) => [c, c])} />
                <Select label="Year" value={String(year)} onChange={(v) => setYear(v === '' ? '' : Number(v))}
                  options={meta.years.map((y) => [String(y), String(y)])} placeholder="Latest" />
                <Select label="Course" value={course} onChange={setCourse}
                  options={meta.courses.map((c) => [c, c])} placeholder="Any" />
                <Select label="State" value={state} onChange={setState}
                  options={meta.states.map((s) => [s, s])} placeholder="All India" />
                <Select label="Quota" value={quota} onChange={setQuota}
                  options={meta.quotas.map((q) => [q, q])} placeholder="Any" />
                <Select label="Round" value={String(round)} onChange={(v) => setRound(v === '' ? '' : Number(v))}
                  options={meta.rounds.map((r) => [String(r), r === 4 ? 'Stray Vacancy' : `Round ${r}`])}
                  placeholder="Best across rounds" />
              </div>
            )}
          </form>

          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result && <Summary result={result} />}

      {/* Print-only: the on-screen Summary card above is a dashboard widget (gradient, icons,
          extra stats) — the printout instead states just what was asked for: Rank, Category,
          Date. print:block on an otherwise `hidden` element, per the doc-checklist.tsx pattern. */}
      {result && (
        <div className="hidden print:block">
          <h2 className="text-lg font-bold text-slate-900">Counsellor Lookup — Shortlist</h2>
          <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-sm text-slate-700">
            <div className="flex gap-1.5"><dt className="font-semibold">Rank:</dt><dd>#{fmt(result.air.point)}</dd></div>
            <div className="flex gap-1.5"><dt className="font-semibold">Category:</dt><dd>{result.category}</dd></div>
            <div className="flex gap-1.5">
              <dt className="font-semibold">Date:</dt>
              <dd>{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
            </div>
          </dl>
        </div>
      )}

      {result && result.total === 0 && (
        <EmptyState
          icon={SearchX}
          title="No colleges match this rank"
          description="Nothing in the data closes anywhere near this rank for that combination. Try widening the state, quota or course under More Options."
        />
      )}

      {result && result.total > 0 && (
        // Safest first: BANDS is already ordered Safe -> Good -> Reach -> Tough. A band
        // with no matches renders nothing rather than an empty table.
        <div className="space-y-6">
          {BANDS.map((b) => {
            const rows = result.matches.filter((m) => m.chance === b);
            if (!rows.length) return null;
            return <GroupTable key={b} chance={b} matches={rows} feeFor={feeFor} />;
          })}
        </div>
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
  return (
    <Card className="print:hidden border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20">
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <Stat label="All India Rank" value={`#${fmt(result.air.point)}`} sub={`NEET ${result.year}`} accent />
          <Stat
            label={`${result.category} category rank`}
            value={result.categoryRank ? `#${fmt(result.categoryRank)}` : '—'}
            sub={result.categoryRank ? 'approximate' : 'not available'}
          />
          <Stat label="Colleges in reach" value={fmt(result.total)}
            sub={`${fmt(result.counts.Safe)} safe · ${fmt(result.counts.Good)} good`} />
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Matched against real {result.year} closing ranks for {result.category}.
            {result.note ? ` ${result.note}` : ''}
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
        accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** One Safe/Good/Reach/Tough group, rendered as its own table — reuses CHANCE_STYLE for the group header and the per-row Status chip. */
function GroupTable({ chance, matches, feeFor }: {
  chance: Chance; matches: PredictMatch[]; feeFor: (m: PredictMatch) => string;
}) {
  const s = CHANCE_STYLE[chance];
  return (
    <Card className="overflow-hidden print:break-inside-avoid print:shadow-none">
      <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{s.label}</h3>
        <span className="text-xs text-muted-foreground">{fmt(matches.length)} college{matches.length === 1 ? '' : 's'}</span>
        <span className="hidden sm:inline text-xs text-muted-foreground ml-1">— {s.blurb}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
              {['College', 'City', 'Quota', 'Closing Rank', 'Fee', 'Status'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => {
              const fee = feeFor(m);
              return (
                <tr
                  key={`${m.collegeId}-${m.course}-${m.quota}-${m.round}-${i}`}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/colleges/${m.collegeId}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      {m.college}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{m.city || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[14rem]">
                    {m.quota}
                    <DomicileBadge quota={m.quota} collegeState={m.state} compact />
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                    {fmt(m.closingRank)}
                    {m.source === 'derived_from_allotments' && (
                      <span
                        className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide align-middle cursor-help
                          bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                        title="Estimated from MCC allotment history. Official cutoff unavailable."
                      >
                        Estimated
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap tabular-nums ${fee === 'Not available' ? 'text-muted-foreground italic' : 'font-medium'}`}>
                    {fee}
                  </td>
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
    </Card>
  );
}
