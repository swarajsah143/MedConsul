import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Shield,
  Users,
  GraduationCap,
  CreditCard,
  Crown,
  Loader2,
  Mail,
  CalendarDays,
  IndianRupee,
  BadgeCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

type PlanName = 'Free' | 'Pro' | 'Premium';

interface PlanMeta {
  price: number; // INR / month
  cycle: string;
  color: string;
}

const PLAN_META: Record<PlanName, PlanMeta> = {
  Free: { price: 0, cycle: '—', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  Pro: { price: 499, cycle: 'monthly', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' },
  Premium: { price: 999, cycle: 'monthly', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' },
};

interface Subscription {
  user: AdminUser;
  plan: PlanName;
  status: 'Active' | 'Expired';
  startedAt: string;
  renewsAt: string;
}

// Deterministic sample-plan assignment (until the real payment system ships).
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function buildSubscriptions(users: AdminUser[]): Subscription[] {
  return users.map((u) => {
    const h = hash(u.email);
    const plan: PlanName = u.role === 'admin' ? 'Premium' : h % 3 === 0 ? 'Premium' : h % 3 === 1 ? 'Pro' : 'Free';
    const start = new Date(u.createdAt);
    const renew = new Date(start);
    renew.setMonth(renew.getMonth() + 1);
    const status: 'Active' | 'Expired' = h % 7 === 0 ? 'Expired' : 'Active';
    return {
      user: u,
      plan,
      status,
      startedAt: start.toISOString(),
      renewsAt: renew.toISOString(),
    };
  });
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const MS_30D = 30 * 24 * 60 * 60 * 1000;

// ── Stat card (solid, colored — Skydash style) ──
function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  gradient,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  delta: number; // percentage change vs previous period
  gradient: string;
}) {
  const up = delta >= 0;
  return (
    <div className={`relative overflow-hidden rounded-xl p-5 text-white shadow-sm ${gradient}`}>
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-10 top-10 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Icon className="w-6 h-6" />
        </div>
        <span
          className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            up ? 'bg-white/25' : 'bg-black/15'
          }`}
        >
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? '+' : ''}
          {delta}%
        </span>
      </div>
      <p className="relative mt-4 text-3xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="relative mt-1.5 text-xs font-medium text-white/80">{label}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isAdmin ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    }`}>
      {isAdmin ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
      {isAdmin ? 'Admin' : 'Student'}
    </span>
  );
}

const chartTooltip = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
  padding: '10px 12px',
};

const PLAN_BAR_COLORS: Record<PlanName, string> = {
  Free: '#94a3b8',
  Pro: '#3b82f6',
  Premium: '#f59e0b',
};

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/users')
      .then((res) => {
        if (res.success && res.data?.users) setUsers(res.data.users);
        else setError(res.message || 'Failed to load users');
      })
      .catch((e) => setError(e?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const subscriptions = useMemo(() => buildSubscriptions(users), [users]);
  const paidSubs = useMemo(() => subscriptions.filter((s) => s.plan !== 'Free'), [subscriptions]);

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => u.role === 'student').length,
    admins: users.filter((u) => u.role === 'admin').length,
    activeSubs: subscriptions.filter((s) => s.plan !== 'Free' && s.status === 'Active').length,
    mrr: paidSubs.filter((s) => s.status === 'Active').reduce((sum, s) => sum + PLAN_META[s.plan].price, 0),
  }), [users, subscriptions, paidSubs]);

  // Growth over the last 30 days → % delta badges on the stat cards.
  const deltas = useMemo(() => {
    const now = Date.now();
    const recent = (list: { createdAt: string }[]) =>
      list.filter((x) => now - new Date(x.createdAt).getTime() <= MS_30D).length;
    const pct = (added: number, total: number) => {
      const base = total - added;
      if (base <= 0) return added > 0 ? 100 : 0;
      return Math.round((added / base) * 100);
    };
    const newUsers = recent(users);
    const newStudents = recent(users.filter((u) => u.role === 'student'));
    const newPaid = recent(paidSubs.map((s) => ({ createdAt: s.startedAt })));
    return {
      total: pct(newUsers, users.length),
      students: pct(newStudents, users.filter((u) => u.role === 'student').length),
      subs: pct(newPaid, paidSubs.length),
      mrr: pct(newPaid, paidSubs.length),
    };
  }, [users, paidSubs]);

  // Cumulative user growth by month (last 6 months) — area chart.
  const growthData = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; end: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); // start of next month
      buckets.push({
        label: new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-IN', { month: 'short' }),
        end: d.getTime(),
      });
    }
    const times = users.map((u) => new Date(u.createdAt).getTime());
    return buckets.map((b) => ({
      month: b.label,
      users: times.filter((t) => t < b.end).length,
    }));
  }, [users]);

  // Plan distribution — bar chart.
  const planData = useMemo(() => {
    const order: PlanName[] = ['Free', 'Pro', 'Premium'];
    const counts: Record<PlanName, number> = { Free: 0, Pro: 0, Premium: 0 };
    subscriptions.forEach((s) => { counts[s.plan]++; });
    return order.map((p) => ({ plan: p, count: counts[p] }));
  }, [subscriptions]);

  const firstName = currentUser?.name?.split(' ')[0] || 'Admin';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {error && (
        <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Top row: welcome hero + stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Welcome hero */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-2xl gradient-primary text-white p-6 sm:p-8">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute right-16 bottom-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5" /> Admin Panel
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
              <CalendarDays className="w-3.5 h-3.5" /> {today}
            </div>
          </div>
          <div className="relative mt-8 max-w-md">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {firstName} 👋</h2>
            <p className="mt-2 text-sm text-white/85">
              Your platform is running smoothly. You have{' '}
              <span className="font-bold text-white">{stats.total}</span> registered user{stats.total !== 1 ? 's' : ''} and{' '}
              <span className="font-bold text-white">{stats.activeSubs}</span> active subscription{stats.activeSubs !== 1 ? 's' : ''}.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold bg-white/20 hover:bg-white/25 transition-colors px-4 py-2 rounded-lg backdrop-blur-sm">
              Est. Monthly Revenue
              <span className="inline-flex items-center font-extrabold">
                <IndianRupee className="w-3.5 h-3.5" />{stats.mrr.toLocaleString('en-IN')}
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Stat cards (2×2) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.total} delta={deltas.total}
            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
          <StatCard icon={GraduationCap} label="Students" value={stats.students} delta={deltas.students}
            gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <StatCard icon={CreditCard} label="Active Subscriptions" value={stats.activeSubs} delta={deltas.subs}
            gradient="bg-gradient-to-br from-orange-400 to-amber-500" />
          <StatCard icon={IndianRupee} label="Est. MRR (₹)" value={stats.mrr.toLocaleString('en-IN')} delta={deltas.mrr}
            gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User growth */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">User Growth</h3>
                  <p className="text-xs text-muted-foreground">Cumulative registered users · last 6 months</p>
                </div>
              </div>
              <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{stats.total}</span>
            </div>
            <div className="h-64 mt-3 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => [v, 'Users']} />
                  <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} fill="url(#userGrad)"
                    dot={{ r: 3, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscription report */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Subscription Report</h3>
                  <p className="text-xs text-muted-foreground">Users by plan tier</p>
                </div>
              </div>
              <span className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{paidSubs.length}</span>
            </div>
            <div className="h-64 mt-3 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="plan" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'rgba(148,163,184,0.08)' }} formatter={(v: number) => [v, 'Users']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={64}>
                    {planData.map((d) => (
                      <Cell key={d.plan} fill={PLAN_BAR_COLORS[d.plan as PlanName]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Users */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">All Users</h3>
                <p className="text-xs text-muted-foreground">{users.length} registered account{users.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="font-semibold px-5 py-3">User</th>
                  <th className="font-semibold px-5 py-3 hidden sm:table-cell">Email</th>
                  <th className="font-semibold px-5 py-3">Role</th>
                  <th className="font-semibold px-5 py-3 hidden md:table-cell">Joined</th>
                  <th className="font-semibold px-5 py-3 hidden lg:table-cell">User ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {u.email}
                      </span>
                    </td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {fmtDate(u.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <code className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{u.id.slice(0, 8)}…</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Subscriptions</h3>
                <p className="text-xs text-muted-foreground">
                  {paidSubs.length} paid subscriber{paidSubs.length !== 1 ? 's' : ''} · Est. MRR{' '}
                  <span className="inline-flex items-center font-semibold text-slate-600 dark:text-slate-300">
                    <IndianRupee className="w-3 h-3" />{stats.mrr.toLocaleString('en-IN')}
                  </span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Sample data — live once payments launch
            </span>
          </div>

          {paidSubs.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No paid subscriptions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Subscribers will appear here once the paid plans go live.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="font-semibold px-5 py-3">Subscriber</th>
                    <th className="font-semibold px-5 py-3">Plan</th>
                    <th className="font-semibold px-5 py-3">Amount</th>
                    <th className="font-semibold px-5 py-3">Status</th>
                    <th className="font-semibold px-5 py-3 hidden md:table-cell">Started</th>
                    <th className="font-semibold px-5 py-3 hidden md:table-cell">Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {paidSubs.map((s) => (
                    <tr key={s.user.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">{s.user.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_META[s.plan].color}`}>
                          {s.plan === 'Premium' && <Crown className="w-3 h-3" />}
                          {s.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center"><IndianRupee className="w-3 h-3" />{PLAN_META[s.plan].price}</span>
                        <span className="text-[11px] text-muted-foreground font-normal">/{PLAN_META[s.plan].cycle}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <BadgeCheck className="w-3 h-3" /> {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{fmtDate(s.startedAt)}</td>
                      <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{fmtDate(s.renewsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
