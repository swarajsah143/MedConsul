import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCollections, byId, type College, type ClosingRank } from '@/lib/data-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HeroBanner } from '@/components/ui/hero-banner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Award,
  Target,
  Calendar,
  AlertTriangle,
  MapPin,
  Sparkles,
  GraduationCap,
  Loader2,
} from 'lucide-react';

interface HistoricalPoint {
  /** The rank row's own id — the only value guaranteed unique. year+round is not. */
  id: string;
  year: number;
  round: number;
  closingRank: number;
  closingScore?: number | null;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingDown;
  color: string;
  bg: string;
}) {
  return (
    <Card className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-200 mt-0.5 leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RankInsightDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const collegeId = searchParams.get('collegeId') || '';
  const collegeName = searchParams.get('college') || '';
  const course = searchParams.get('course') || '';
  const category = searchParams.get('category') || '';
  const quota = searchParams.get('quota') || '';

  const { data, loading, error } = useCollections<{ colleges: College[]; closingRanks: ClosingRank[] }>([
    'colleges',
    'closingRanks',
  ]);

  // Rows for this exact college + course + category + quota combination, oldest first.
  const history = useMemo<HistoricalPoint[]>(
    () =>
      (data.closingRanks ?? [])
        .filter(
          (e) =>
            e.collegeId === collegeId &&
            e.course === course &&
            e.category === category &&
            e.quota === quota
        )
        .map((e) => ({
          id: e.id,
          year: e.year,
          round: e.round,
          closingRank: e.closingRank ?? 0,
          closingScore: e.closingScore,
        }))
        .sort((a, b) => a.year - b.year || a.round - b.round),
    [data.closingRanks, collegeId, course, category, quota]
  );

  // Nothing enforces uniqueness on collegeId+course+category+quota+year+round, so the same
  // year+round can appear twice. The charts key a series point off year+round and can only
  // plot one of them — say so instead of silently dropping the other.
  const duplicateSlots = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of history) {
      const slot = `${h.year} Round ${h.round}`;
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, n]) => n > 1).map(([slot]) => slot);
  }, [history]);

  // The rank row carries only a collegeId — join against colleges for the display info.
  const collegeInfo = useMemo(
    () => byId(data.colleges ?? []).get(collegeId),
    [data.colleges, collegeId]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading historical trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load trend data"
          description={error}
          action={{ label: 'Back to Insights', onClick: () => navigate('/rank-insights') }}
        />
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="No historical data found"
          description="We couldn't find trend data for this combination."
          action={{ label: 'Back to Insights', onClick: () => navigate('/rank-insights') }}
        />
      </div>
    );
  }

  const displayName = collegeName || collegeInfo?.name || 'Unknown college';

  // The hero stats used to read Round-1 rows only and coerce a miss to 0, so a
  // college/course/category/quota combination with no Round-1 record rendered a
  // closing rank of "#0" as though that were a real, achievable cutoff.
  // Fall back to all rounds, and show an em-dash when there is genuinely no data.
  const round1Data = history.filter((h) => h.round === 1);
  const statRows = round1Data.length ? round1Data : history;

  // A rank of 0 is not a rank: `closingRank ?? 0` above turns a missing value into 0,
  // and "#0" would read as the most competitive cutoff possible. Treat it as no data.
  const positiveRank = (v: number | null | undefined): number | null =>
    typeof v === 'number' && v > 0 ? v : null;

  const latestRank = positiveRank(statRows.at(-1)?.closingRank);
  const oldestRank = positiveRank(statRows.at(0)?.closingRank);
  const rankChange = latestRank !== null && oldestRank !== null ? oldestRank - latestRank : null;

  // A missing score is not a score of zero: coercing it made the delta equal to the
  // entire latest score.
  const latestScore = statRows.at(-1)?.closingScore ?? null;
  const oldestScore = statRows.at(0)?.closingScore ?? null;
  const scoreChange =
    latestScore !== null && latestScore !== undefined && oldestScore !== null && oldestScore !== undefined
      ? latestScore - oldestScore
      : null;

  const yearsTracked = [...new Set(history.map((h) => h.year))].length;

  const years = [...new Set(history.map((h) => h.year))].sort((a, b) => a - b);
  const rounds = [...new Set(history.map((h) => h.round))].sort((a, b) => a - b);

  const rankChartData = years.map((yr) => {
    const row: Record<string, number | string> = { year: String(yr) };
    for (const r of rounds) {
      const pt = history.find((h) => h.year === yr && h.round === r);
      if (pt) row[`R${r}`] = pt.closingRank;
    }
    return row;
  });

  // Gate on presence, not truthiness: a closing score of 0 is a real (if brutal) data point.
  const hasAnyScore = history.some((h) => h.closingScore != null);

  const scoreChartData = years.map((yr) => {
    const row: Record<string, number | string> = { year: String(yr) };
    for (const r of rounds) {
      const pt = history.find((h) => h.year === yr && h.round === r);
      if (pt && pt.closingScore != null) row[`R${r}`] = pt.closingScore;
    }
    return row;
  });

  const latestYear = years.at(-1)!;
  const latestRounds = history
    .filter((h) => h.year === latestYear)
    .map((h) => ({
      name: `Round ${h.round}`,
      rank: h.closingRank,
      score: h.closingScore ?? 0,
    }));

  const roundColors = ['#059669', '#2563eb', '#d97706', '#059669'];

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/rank-insights')}
        className="flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Insights
      </Button>

      {/* Hero Banner */}
      <HeroBanner>
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] uppercase font-bold text-white border border-white/10">
                <Sparkles className="w-3 h-3" /> Historical Trends
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] uppercase font-bold text-white border border-white/10">
                {course}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[10px] uppercase font-bold text-white border border-white/10">
                {category}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">
                  {displayName}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-emerald-100/90">
                  {collegeInfo && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {collegeInfo.city}, {collegeInfo.state}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> {quota}
                  </span>
                  {collegeInfo && (
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      collegeInfo.type === 'Government' ? 'bg-emerald-500/20 text-emerald-200' :
                      collegeInfo.type === 'Deemed' ? 'bg-blue-500/20 text-blue-200' :
                      'bg-amber-500/20 text-amber-200'
                    }`}>
                      {collegeInfo.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
      </HeroBanner>

      {/* Duplicate year+round rows: the charts can only plot one point per slot, so say
          which slots are ambiguous rather than silently dropping the extra rows. */}
      {duplicateSlots.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-bold">Duplicate records:</span> more than one row exists for{' '}
            {duplicateSlots.join(', ')}. The charts plot only the first record for each round.
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Award}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/30"
          label="Latest Closing Rank"
          value={latestRank === null ? '—' : `#${latestRank.toLocaleString()}`}
          sub={round1Data.length ? `${latestYear} Round 1` : `${latestYear} (no Round 1 data)`}
        />
        <StatCard
          icon={(rankChange ?? 0) > 0 ? TrendingDown : TrendingUp}
          color={(rankChange ?? 0) > 0 ? 'text-emerald-600' : (rankChange ?? 0) < 0 ? 'text-green-600' : 'text-slate-500'}
          bg={(rankChange ?? 0) > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : (rankChange ?? 0) < 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-slate-50 dark:bg-slate-800'}
          label="Rank Trend"
          value={rankChange === null ? '—' : rankChange > 0 ? `Improved ${rankChange.toLocaleString()}` : rankChange < 0 ? `Dropped ${Math.abs(rankChange).toLocaleString()}` : 'Stable'}
          sub={`${statRows.at(0)?.year ?? '--'} vs ${statRows.at(-1)?.year ?? '--'}`}
        />
        <StatCard
          icon={Target}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/30"
          label="Latest Score"
          value={latestScore === null || latestScore === undefined ? '—' : String(latestScore)}
          sub={scoreChange === null ? 'no score data' : scoreChange > 0 ? `+${scoreChange} pts over ${yearsTracked} yrs` : scoreChange < 0 ? `${scoreChange} pts` : 'Stable'}
        />
        <StatCard
          icon={Calendar}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950/30"
          label="Data Points"
          value={String(history.length)}
          sub={`${yearsTracked} years tracked`}
        />
      </div>

      {/* What This Means */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900/30">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">What does this mean for you?</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
              {rankChange === null
                ? `There isn't enough history for this combination yet to describe a trend.`
                : rankChange > 0
                ? `Good news! This college's closing rank has improved (gone lower) by ${rankChange.toLocaleString()} positions. It's becoming more competitive, so apply early and keep it as a strong preference.`
                : rankChange < 0
                ? `This college's closing rank has increased by ${Math.abs(rankChange).toLocaleString()} positions, meaning slightly less competition. You may have a better chance this year if your rank is near the cutoff.`
                : `The closing rank has remained stable. You can use the latest year's rank as a reliable benchmark for your admission planning.`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="group hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
              </div>
              Closing Rank Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Lower rank = better (more competitive). Tracks round-wise closing ranks over years.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rankChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis
                    reversed
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `#${v.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value, name) => [`#${Number(value).toLocaleString()}`, String(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {rounds.map((r, i) => (
                    <Line
                      key={r}
                      type="monotone"
                      dataKey={`R${r}`}
                      stroke={roundColors[i % roundColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: roundColors[i % roundColors.length] }}
                      name={`Round ${r}`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {hasAnyScore && (
        <Card className="group hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              Closing Score Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Higher score = more competitive cutoff. Tracks the minimum NEET score required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                    }}
                    formatter={(value, name) => [Number(value), String(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {rounds.map((r, i) => (
                    <Line
                      key={r}
                      type="monotone"
                      dataKey={`R${r}`}
                      stroke={roundColors[i % roundColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: roundColors[i % roundColors.length] }}
                      name={`Round ${r}`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Round-wise Bar Chart for Latest Year */}
      {latestRounds.length > 1 && (
        <Card className="group hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              {latestYear} Round-wise Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              How closing ranks change between counselling rounds within the same year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestRounds} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                  <YAxis
                    yAxisId="rank"
                    orientation="left"
                    reversed
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `#${v.toLocaleString()}`}
                  />
                  <YAxis
                    yAxisId="score"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      padding: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="rank" dataKey="rank" fill="#0d9488" name="Closing Rank" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="score" dataKey="score" fill="#2563eb" name="Closing Score" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Historical Data Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            Complete Historical Data
          </CardTitle>
          <CardDescription className="text-xs">
            All recorded closing rank and score entries for this college, course, category, and quota.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Year</th>
                  <th className="px-5 py-3.5 text-center">Round</th>
                  <th className="px-5 py-3.5 text-right">Closing Rank</th>
                  <th className="px-5 py-3.5 text-right">Closing Score</th>
                  <th className="px-5 py-3.5 text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h, idx) => {
                  const prevSameRound = history
                    .slice(0, idx)
                    .reverse()
                    .find((p) => p.round === h.round);
                  const change = prevSameRound ? prevSameRound.closingRank - h.closingRank : null;

                  return (
                    <tr key={h.id} className="group/row hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors duration-200">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover/row:scale-125 transition-transform duration-200" />
                          {h.year}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px] group-hover/row:shadow-sm transition-shadow duration-200">
                          R{h.round}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 dark:text-slate-50 tabular-nums text-sm">
                        #{h.closingRank.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {h.closingScore ?? 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {change !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                              change > 0
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : change < 0
                                ? 'text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400'
                                : 'text-slate-400 bg-slate-50 dark:bg-slate-800'
                            }`}
                          >
                            {change > 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : change < 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : null}
                            {change > 0 ? `+${change}` : change < 0 ? String(change) : '--'}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
