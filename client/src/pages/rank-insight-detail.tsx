import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  INSIGHTS_DATA,
  getHistoricalData,
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
  Sparkles,
  GraduationCap,
} from 'lucide-react';

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

  const history = useMemo(
    () => getHistoricalData(collegeId, course, category, quota),
    [collegeId, course, category, quota]
  );

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

  const round1Data = history.filter((h) => h.round === 1);
  const latestRank = round1Data.at(-1)?.closingRank ?? 0;
  const oldestRank = round1Data.at(0)?.closingRank ?? 0;
  const rankChange = oldestRank - latestRank;
  const latestScore = round1Data.at(-1)?.closingScore ?? 0;
  const oldestScore = round1Data.at(0)?.closingScore ?? 0;
  const scoreChange = latestScore - oldestScore;
  const yearsTracked = [...new Set(history.map((h) => h.year))].length;

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

  const latestYear = years.at(-1)!;
  const latestRounds = history
    .filter((h) => h.year === latestYear)
    .map((h) => ({
      name: `Round ${h.round}`,
      rank: h.closingRank,
      score: h.closingScore ?? 0,
    }));

  const roundColors = ['#dc2626', '#2563eb', '#d97706', '#059669'];

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/rank-insights')}
        className="flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Insights
      </Button>

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="gradient-primary p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-rose-400/10 rounded-full blur-2xl" />

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
                  {collegeName}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-red-100/90">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {collegeInfo.city}, {collegeInfo.state}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> {quota}
                  </span>
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    collegeInfo.type === 'Government' ? 'bg-emerald-500/20 text-emerald-200' :
                    collegeInfo.type === 'Deemed' ? 'bg-blue-500/20 text-blue-200' :
                    'bg-amber-500/20 text-amber-200'
                  }`}>
                    {collegeInfo.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Award}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-950/30"
          label="Latest Closing Rank"
          value={`#${latestRank.toLocaleString()}`}
          sub={`${latestYear} Round 1`}
        />
        <StatCard
          icon={rankChange > 0 ? TrendingDown : TrendingUp}
          color={rankChange > 0 ? 'text-emerald-600' : rankChange < 0 ? 'text-rose-600' : 'text-slate-500'}
          bg={rankChange > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : rankChange < 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-slate-50 dark:bg-slate-800'}
          label="Rank Trend"
          value={rankChange > 0 ? `Improved ${rankChange.toLocaleString()}` : rankChange < 0 ? `Dropped ${Math.abs(rankChange).toLocaleString()}` : 'Stable'}
          sub={`${round1Data.at(0)?.year} vs ${round1Data.at(-1)?.year}`}
        />
        <StatCard
          icon={Target}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/30"
          label="Latest Score"
          value={latestScore ? String(latestScore) : 'N/A'}
          sub={scoreChange > 0 ? `+${scoreChange} pts over ${yearsTracked} yrs` : scoreChange < 0 ? `${scoreChange} pts` : 'Stable'}
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
              {rankChange > 0
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
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-red-600" />
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
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-red-600" />
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
                    <tr key={`${h.year}-${h.round}`} className="group/row hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors duration-200">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400 group-hover/row:scale-125 transition-transform duration-200" />
                          {h.year}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 font-extrabold text-red-600 dark:text-red-400 text-[11px] group-hover/row:shadow-sm transition-shadow duration-200">
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
                                ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400'
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
