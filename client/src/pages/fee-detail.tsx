import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FEE_MATRIX_DATA, formatINRFull, type CollegeFeeEntry } from '@/lib/fee-matrix-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HeroBanner } from '@/components/ui/hero-banner';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeft, IndianRupee, MapPin, GraduationCap, Building2, Users,
  CalendarClock, RefreshCw, Link2, Award, AlertTriangle, Wallet, Sparkles,
} from 'lucide-react';

const PIE_COLORS = ['#059669', '#2563eb', '#d97706', '#22c55e', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function FeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const entry: CollegeFeeEntry | undefined = useMemo(() => FEE_MATRIX_DATA.find((e) => e.id === id), [id]);

  if (!entry) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState icon={AlertTriangle} title="Fee data not found" description="The fee record you're looking for doesn't exist."
          action={{ label: 'Back to Fee Matrix', onClick: () => navigate('/fee-matrix') }} />
      </div>
    );
  }

  const pieData = entry.feeBreakdown.filter((b) => b.amount > 0).map((b) => ({ name: b.label, value: b.amount }));
  const seatData = [
    { name: 'Government', seats: entry.govtSeats, fill: '#059669' },
    { name: 'Management', seats: entry.mgmtSeats, fill: '#d97706' },
    { name: 'NRI', seats: entry.nriSeats, fill: '#2563eb' },
  ].filter((s) => s.seats > 0);

  const yearBarData = entry.yearWiseFees.map((y) => ({
    name: y.year, Tuition: y.tuition, Hostel: y.hostel, Misc: y.misc, Deposit: y.deposit,
  }));

  const totalAllYears = entry.yearWiseFees.reduce((s, y) => s + y.total, 0);
  const totalSeats = entry.govtSeats + entry.mgmtSeats + entry.nriSeats;

  const typeColor = (t: string) =>
    t === 'Government' ? 'bg-emerald-500/20 text-emerald-200' : t === 'Deemed' ? 'bg-blue-500/20 text-blue-200' : 'bg-amber-500/20 text-amber-200';

  return (
    <div className="space-y-6 pb-10 page-enter">
      <Button variant="ghost" size="sm" onClick={() => navigate('/fee-matrix')}
        className="flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 transition-colors duration-200">
        <ArrowLeft className="w-4 h-4" /> Back to Fee Matrix
      </Button>

      {/* Hero */}
      <HeroBanner>
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${typeColor(entry.type)}`}>{entry.type}</span>
              <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 text-white">{entry.course}</span>
              <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/10 text-white">{entry.category} - {entry.quota}</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/10">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">{entry.name}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-emerald-100/90">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {entry.city}, {entry.state}</span>
                </div>
              </div>
            </div>
          </div>
      </HeroBanner>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total 1st Year', value: formatINRFull(entry.totalFirstYear), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Total All Years', value: formatINRFull(totalAllYears), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Total Seats', value: String(totalSeats), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Govt Seats', value: String(entry.govtSeats || '--'), icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        ].map((s) => (
          <Card key={s.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg} transition-transform duration-300 group-hover:scale-110`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-200 leading-tight">{s.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fee Composition Pie */}
          <Card className="group hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                First Year Fee Composition
              </CardTitle>
              <CardDescription className="text-xs">How your total first year cost is distributed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}
                        label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        formatter={(value: number) => [formatINRFull(value), '']} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400">No fee data available.</p>}
              </div>
            </CardContent>
          </Card>

          {/* Year-wise Bar */}
          <Card className="group hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                </div>
                Year-wise Fee Progression
              </CardTitle>
              <CardDescription className="text-xs">How fees are structured from 1st year through internship</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearBarData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      formatter={(value: number, name: string) => [formatINRFull(value), name]} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Tuition" stackId="a" fill="#0d9488" />
                    <Bar dataKey="Hostel" stackId="a" fill="#2563eb" />
                    <Bar dataKey="Misc" stackId="a" fill="#d97706" />
                    <Bar dataKey="Deposit" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seat Distribution */}
          {seatData.length > 0 && (
            <Card className="group hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  Seat Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Visual seat bars instead of chart for small data */}
                <div className="space-y-4">
                  {seatData.map((s) => {
                    const pct = totalSeats > 0 ? (s.seats / totalSeats) * 100 : 0;
                    return (
                      <div key={s.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{s.seats} seats <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: s.fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year-wise Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                Year-wise Fee Table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 text-left">Year</th>
                      <th className="px-5 py-3.5 text-right">Tuition</th>
                      <th className="px-5 py-3.5 text-right">Hostel</th>
                      <th className="px-5 py-3.5 text-right">Misc</th>
                      <th className="px-5 py-3.5 text-right">Deposit</th>
                      <th className="px-5 py-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entry.yearWiseFees.map((y) => (
                      <tr key={y.year} className="group/row hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors duration-200">
                        <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover/row:scale-125 transition-transform duration-200" />
                            {y.year}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatINRFull(y.tuition)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatINRFull(y.hostel)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">{formatINRFull(y.misc)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">{formatINRFull(y.deposit)}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-extrabold text-slate-900 dark:text-slate-50">{formatINRFull(y.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 font-bold">
                      <td className="px-5 py-3.5 text-emerald-700 dark:text-emerald-400">Grand Total</td>
                      <td className="px-5 py-3.5 text-right" colSpan={4}></td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400 text-sm">{formatINRFull(totalAllYears)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Fee Details */}
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Key Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow icon={CalendarClock} label="Payment Schedule" value={entry.paymentSchedule} />
              <InfoRow icon={RefreshCw} label="Refund Policy" value={entry.refundPolicy} />
              {entry.bondDetails && <InfoRow icon={Link2} label="Service Bond" value={entry.bondDetails} />}
            </CardContent>
          </Card>

          {/* Scholarships */}
          {entry.scholarships.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Scholarships & Aid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {entry.scholarships.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Fee Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" /> Fee Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entry.feeBreakdown.map((b) => (
                  <div key={b.label} className="flex items-center justify-between px-6 py-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <span className="text-slate-600 dark:text-slate-400">{b.label}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{formatINRFull(b.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 text-xs font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400">Total First Year</span>
                  <span className="text-emerald-700 dark:text-emerald-400 tabular-nums text-sm">{formatINRFull(entry.totalFirstYear)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof IndianRupee }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}
