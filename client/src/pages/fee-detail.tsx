import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FEE_MATRIX_DATA, formatINRFull, type CollegeFeeEntry } from '@/lib/fee-matrix-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  IndianRupee,
  MapPin,
  GraduationCap,
  Building2,
  Users,
  Globe,
  Shield,
  CalendarClock,
  RefreshCw,
  Link2,
  Award,
  AlertTriangle,
  Wallet,
} from 'lucide-react';

const PIE_COLORS = ['#0d9488', '#2563eb', '#d97706', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16'];

const typeColor = (t: string) =>
  t === 'Government'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
    : t === 'Deemed'
    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400'
    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400';

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof IndianRupee }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

export default function FeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const entry: CollegeFeeEntry | undefined = useMemo(
    () => FEE_MATRIX_DATA.find((e) => e.id === id),
    [id]
  );

  if (!entry) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <EmptyState
          icon={AlertTriangle}
          title="Fee data not found"
          description="The fee record you're looking for doesn't exist."
          action={{ label: 'Back to Fee Matrix', onClick: () => navigate('/fee-matrix') }}
        />
      </div>
    );
  }

  // Pie chart data — filter out zero amounts
  const pieData = entry.feeBreakdown
    .filter((b) => b.amount > 0)
    .map((b) => ({ name: b.label, value: b.amount }));

  // Seat distribution bar
  const seatData = [
    { name: 'Government', seats: entry.govtSeats, fill: '#059669' },
    { name: 'Management', seats: entry.mgmtSeats, fill: '#d97706' },
    { name: 'NRI', seats: entry.nriSeats, fill: '#2563eb' },
  ].filter((s) => s.seats > 0);

  // Year-wise bar chart
  const yearBarData = entry.yearWiseFees.map((y) => ({
    name: y.year,
    Tuition: y.tuition,
    Hostel: y.hostel,
    Misc: y.misc,
    Deposit: y.deposit,
  }));

  const totalAllYears = entry.yearWiseFees.reduce((s, y) => s + y.total, 0);

  return (
    <div className="space-y-6 pb-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/fee-matrix')}
        className="flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Fee Matrix
      </Button>

      {/* Hero */}
      <div className="gradient-primary rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${typeColor(entry.type)}`}
            >
              {entry.type}
            </span>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              {entry.course}
            </span>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              {entry.category}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight max-w-3xl">
            {entry.name}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-teal-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {entry.city}, {entry.state}
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> {entry.quota}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total 1st Year
              </p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatINRFull(entry.totalFirstYear)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total All Years
              </p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatINRFull(totalAllYears)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Govt Seats
              </p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {entry.govtSeats || '--'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Mgmt + NRI Seats
              </p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {(entry.mgmtSeats + entry.nriSeats) || '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Charts & Tables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fee Composition Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-teal-600" />
                First Year Fee Composition
              </CardTitle>
              <CardDescription className="text-xs">
                Breakdown of how the total first year cost is distributed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={55}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        formatter={(value: number) => [
                          formatINRFull(value),
                          '',
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-slate-400">No fee data available.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Year-wise Stacked Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-blue-600" />
                Year-wise Fee Progression
              </CardTitle>
              <CardDescription className="text-xs">
                How fees are structured from 1st year through internship.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yearBarData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) =>
                        v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(value: number, name: string) => [
                        formatINRFull(value),
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Tuition" stackId="a" fill="#0d9488" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Hostel" stackId="a" fill="#2563eb" />
                    <Bar dataKey="Misc" stackId="a" fill="#d97706" />
                    <Bar dataKey="Deposit" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seat Distribution Bar */}
          {seatData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Seat Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Number of seats by admission quota type.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={seatData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, bottom: 5, left: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value} seats`, '']}
                      />
                      <Bar dataKey="seats" radius={[0, 6, 6, 0]}>
                        {seatData.map((s, i) => (
                          <Cell key={i} fill={s.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Fee Breakdown Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-600" />
                Year-wise Fee Table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Year</th>
                      <th className="px-5 py-3 text-right">Tuition</th>
                      <th className="px-5 py-3 text-right">Hostel</th>
                      <th className="px-5 py-3 text-right">Misc</th>
                      <th className="px-5 py-3 text-right">Deposit</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entry.yearWiseFees.map((y) => (
                      <tr
                        key={y.year}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">
                          {y.year}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {formatINRFull(y.tuition)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {formatINRFull(y.hostel)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                          {formatINRFull(y.misc)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                          {formatINRFull(y.deposit)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-extrabold text-slate-900 dark:text-slate-50">
                          {formatINRFull(y.total)}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-teal-50/50 dark:bg-teal-950/20 font-bold">
                      <td className="px-5 py-3 text-teal-700 dark:text-teal-400">
                        Grand Total
                      </td>
                      <td className="px-5 py-3 text-right" colSpan={4}></td>
                      <td className="px-5 py-3 text-right tabular-nums text-teal-700 dark:text-teal-400 text-sm">
                        {formatINRFull(totalAllYears)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* College Info */}
          <Card className="glass sticky top-16">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Fee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow
                icon={CalendarClock}
                label="Payment Schedule"
                value={entry.paymentSchedule}
              />
              <InfoRow
                icon={RefreshCw}
                label="Refund Policy"
                value={entry.refundPolicy}
              />
              {entry.bondDetails && (
                <InfoRow
                  icon={Link2}
                  label="Service Bond"
                  value={entry.bondDetails}
                />
              )}
            </CardContent>
          </Card>

          {/* Scholarships */}
          {entry.scholarships.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Scholarships & Aid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {entry.scholarships.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-teal-600" />
                Fee Component Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entry.feeBreakdown.map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between px-6 py-2.5 text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      {b.label}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatINRFull(b.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-6 py-3 bg-teal-50/50 dark:bg-teal-950/20 text-xs font-bold">
                  <span className="text-teal-700 dark:text-teal-400">
                    Total First Year
                  </span>
                  <span className="text-teal-700 dark:text-teal-400 tabular-nums">
                    {formatINRFull(entry.totalFirstYear)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
