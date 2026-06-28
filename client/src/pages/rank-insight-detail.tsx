import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  INSIGHTS_DATA,
  getHistoricalData,
  type HistoricalPoint,
} from '@/lib/insights-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
} from 'lucide-react';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingDown;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
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

  const history = useMemo(
    () => getHistoricalData(collegeId, course, category, quota),
    [collegeId, course, category, quota]
  );

  // Find the college info from any matching entry
  const collegeInfo = useMemo(
    () => INSIGHTS_DATA.find((e) => e.collegeId === collegeId)?.college,
    [collegeId]
  );

  if (!history.length || !collegeInfo) {
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

  // Compute stats
  const round1Data = history.filter((h) => h.round === 1);
  const latestRank = round1Data.at(-1)?.closingRank ?? 0;
  const oldestRank = round1Data.at(0)?.closingRank ?? 0;
  const rankChange = oldestRank - latestRank;
  const latestScore = round1Data.at(-1)?.closingScore ?? 0;
  const oldestScore = round1Data.at(0)?.closingScore ?? 0;
  const scoreChange = latestScore - oldestScore;
  const yearsTracked = [...new Set(history.map((h) => h.year))].length;

  // Build chart data: aggregate by year with separate lines per round
  const years = [...new Set(history.map((h) => h.year))].sort();
  const rounds = [...new Set(history.map((h) => h.round))].sort();

  const rankChartData = years.map((yr) => {
    const row: Record<string, number | string> = { year: String(yr) };
    for (const r of rounds) {
      const pt = history.find((h) => h.year === yr && h.round === r);
      if (pt) row[`R${r}`] = pt.closingRank;
    }
    return row;
  });

  const scoreChartData = years.map((yr) => {
    const row: Record<string, number | string> = { year: String(yr) };
    for (const r of rounds) {
      const pt = history.find((h) => h.year === yr && h.round === r);
      if (pt && pt.closingScore) row[`R${r}`] = pt.closingScore;
    }
    return row;
  });

  // Bar chart: round-wise comparison for latest year
  const latestYear = years.at(-1)!;
  const latestRounds = history
    .filter((h) => h.year === latestYear)
    .map((h) => ({
      name: `Round ${h.round}`,
      rank: h.closingRank,
      score: h.closingScore ?? 0,
    }));

  const roundColors = ['#0d9488', '#2563eb', '#d97706', '#dc2626'];

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/rank-insights')} className="flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Back to Insights
      </Button>

      {/* Hero */}
      <div className="gradient-primary rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              Historical Trends
            </span>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              {course}
            </span>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              {category}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight max-w-3xl">
            {collegeName}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-teal-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {collegeInfo.city}, {collegeInfo.state}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> {quota}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Award}
          color="bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400"
          label="Latest Closing Rank"
          value={`#${latestRank.toLocaleString()}`}
          sub={`${latestYear} Round 1`}
        />
        <StatCard
          icon={rankChange > 0 ? TrendingDown : TrendingUp}
          color={rankChange > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}
          label="Rank Trend"
          value={rankChange > 0 ? `Improved ${rankChange.toLocaleString()}` : rankChange < 0 ? `Dropped ${Math.abs(rankChange).toLocaleString()}` : 'Stable'}
          sub={`${round1Data.at(0)?.year} vs ${round1Data.at(-1)?.year}`}
        />
        <StatCard
          icon={Target}
          color="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
          label="Latest Score"
          value={latestScore ? String(latestScore) : 'N/A'}
          sub={scoreChange > 0 ? `+${scoreChange} pts over ${yearsTracked} yrs` : scoreChange < 0 ? `${scoreChange} pts` : 'Stable'}
        />
        <StatCard
          icon={Calendar}
          color="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
          label="Data Points"
          value={String(history.length)}
          sub={`${yearsTracked} years tracked`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Closing Rank Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
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
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                  />
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
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number, name: string) => [`#${value.toLocaleString()}`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  {rounds.map((r, i) => (
                    <Line
                      key={r}
                      type="monotone"
                      dataKey={`R${r}`}
                      stroke={roundColors[i % roundColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      name={`Round ${r}`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Closing Score Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
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
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                  />
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
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  {rounds.map((r, i) => (
                    <Line
                      key={r}
                      type="monotone"
                      dataKey={`R${r}`}
                      stroke={roundColors[i % roundColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      name={`Round ${r}`}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Round-wise Bar Chart for Latest Year */}
      {latestRounds.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {latestYear} Round-wise Comparison
            </CardTitle>
            <CardDescription className="text-xs">
              How closing ranks change between counseling rounds within the same year.
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
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="rank" dataKey="rank" fill="#0d9488" name="Closing Rank" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="score" dataKey="score" fill="#2563eb" name="Closing Score" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Historical Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
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
                  <th className="px-5 py-3 text-left">Year</th>
                  <th className="px-5 py-3 text-center">Round</th>
                  <th className="px-5 py-3 text-right">Closing Rank</th>
                  <th className="px-5 py-3 text-right">Closing Score</th>
                  <th className="px-5 py-3 text-right">Rank Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h, idx) => {
                  // Compare to previous same round
                  const prevSameRound = history
                    .slice(0, idx)
                    .reverse()
                    .find((p) => p.round === h.round);
                  const change = prevSameRound ? prevSameRound.closingRank - h.closingRank : null;

                  return (
                    <tr key={`${h.year}-${h.round}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{h.year}</td>
                      <td className="px-5 py-3 text-center font-extrabold text-teal-600 dark:text-teal-400">
                        R{h.round}
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                        #{h.closingRank.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {h.closingScore ?? 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {change !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              change > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : change < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
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
                          <span className="text-slate-300">--</span>
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
