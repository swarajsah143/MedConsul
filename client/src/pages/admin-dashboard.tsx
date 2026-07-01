import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  Shield,
  Users,
  GraduationCap,
  ShieldCheck,
  CreditCard,
  Crown,
  Loader2,
  Mail,
  CalendarDays,
  IndianRupee,
  BadgeCheck,
  AlertCircle,
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

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: number | string; tint: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isAdmin ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    }`}>
      {isAdmin ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
      {isAdmin ? 'Admin' : 'Student'}
    </span>
  );
}

export default function AdminDashboardPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        icon={Shield}
        title="Admin Dashboard"
        description="Administrative overview — manage users, review account details, and track subscriptions."
      />

      {error && (
        <Card className="border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} tint="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" />
        <StatCard icon={GraduationCap} label="Students" value={stats.students} tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={ShieldCheck} label="Admins" value={stats.admins} tint="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={stats.activeSubs} tint="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" />
      </div>

      {/* All Users */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
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
