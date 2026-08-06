import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, GraduationCap, ShieldCheck, UsersRound, CreditCard, FileClock, Database,
  Activity, RefreshCw, Cpu, HardDrive, Mail, Bot, Server, TrendingUp,
  PieChart as PieIcon, BarChart3, Clock, CheckCircle2, AlertCircle,
  type LucideIcon,
} from 'lucide-react';

// ── shape of GET /admin/analytics ──
interface Analytics {
  users: {
    total: number; students: number; admins: number; counsellors: number;
    plans: { free: number; pro: number; premium: number };
    activeSubscriptions: number; withProfile: number;
    signupsByDay: { date: string; count: number }[];
  };
  documents: { pending: number; verified: number; rejected: number; total: number };
  content: { collection: string; label: string; count: number }[];
  system: {
    dbConnected: boolean; dbMode: string; aiConfigured: boolean; mailConfigured: boolean;
    uptimeSeconds: number; memory: { rss: number; heapUsed: number; heapTotal: number };
    nodeVersion: string; timestamp: string;
  };
}

const PLAN_COLORS = { free: '#94a3b8', pro: '#10b981', premium: '#8b5cf6' } as const;
const DOC_COLORS = { verified: '#10b981', pending: '#f59e0b', rejected: '#f43f5e' } as const;

const REFRESH_MS = 30_000;   // the system panel is a live monitor — keep it fresh

const fmtInt = (n: number) => n.toLocaleString('en-IN');

function fmtBytes(n: number): string {
  if (n >= 1 << 30) return `${(n / (1 << 30)).toFixed(1)} GB`;
  if (n >= 1 << 20) return `${(n / (1 << 20)).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

const TOOLTIP_STYLE = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
  fontSize: '12px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px 12px',
} as const;

// ── small building blocks ──

function KpiCard({ icon: Icon, label, value, sub, tint }: {
  icon: LucideIcon; label: string; value: ReactNode; sub?: string; tint: string;
}) {
  return (
    <Card className="overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <CardContent className="p-4 sm:p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tint} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-none">{value}</p>
          <p className="text-xs text-muted-foreground font-medium truncate mt-1">{label}</p>
          {sub && <p className="text-[11px] text-slate-400 truncate mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ icon: Icon, title, subtitle, children }: {
  icon: LucideIcon; title: string; subtitle?: string; children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmtInt(value)}</span>
    </div>
  );
}

function StatusRow({ icon: Icon, label, ok, value, okText = 'Connected', badText = 'Offline' }: {
  icon: LucideIcon; label: string; ok: boolean; value?: string; okText?: string; badText?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      </div>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        {value ?? (ok ? okText : badText)}
      </span>
    </div>
  );
}

// ── main ──

export function DashboardAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await api.get('/admin/analytics');
      setData(res?.data ?? null);
      setError(null);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => load(true), REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5 h-[92px] animate-pulse bg-slate-50 dark:bg-slate-800/30" /></Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error || 'No analytics available.'}
          </span>
          <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="w-4 h-4" /> Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const { users, documents, content, system } = data;
  const planData = (['free', 'pro', 'premium'] as const).map((k) => ({ name: k, value: users.plans[k] }));
  const docData = (['verified', 'pending', 'rejected'] as const)
    .map((k) => ({ name: k, value: documents[k] }))
    .filter((d) => d.value > 0);
  const totalRecords = content.reduce((s, c) => s + c.count, 0);
  const topContent = content.slice(0, 8);
  const heapPct = system.memory.heapTotal ? Math.round((system.memory.heapUsed / system.memory.heapTotal) * 100) : 0;
  const profilePct = users.students ? Math.round((users.withProfile / users.students) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Live refresh bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-4">
        <KpiCard icon={Users} label="Total Users" value={fmtInt(users.total)} tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
        <KpiCard icon={GraduationCap} label="Students" value={fmtInt(users.students)} tint="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400" />
        <KpiCard icon={UsersRound} label="Counsellors" value={fmtInt(users.counsellors)} tint="bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400" />
        <KpiCard icon={ShieldCheck} label="Admins" value={fmtInt(users.admins)} tint="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" />
        <KpiCard icon={CreditCard} label="Active Plans" value={fmtInt(users.activeSubscriptions)} sub={`${fmtInt(users.plans.pro)} pro · ${fmtInt(users.plans.premium)} premium`} tint="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" />
        <KpiCard icon={FileClock} label="Pending Reviews" value={fmtInt(documents.pending)} sub={`${fmtInt(documents.total)} docs total`} tint="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" />
        <KpiCard icon={Database} label="Data Records" value={fmtInt(totalRecords)} sub={`${content.length} collections`} tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signups over time */}
        <div className="lg:col-span-2">
          <ChartCard icon={TrendingUp} title="New Signups" subtitle="Last 30 days">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={users.signupsByDay} margin={{ top: 5, right: 12, bottom: 5, left: -12 }}>
                  <defs>
                    <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    interval={4}
                    tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    formatter={(v) => [fmtInt(Number(v)), 'Signups']}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fill="url(#signupFill)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Plan distribution */}
        <ChartCard icon={PieIcon} title="Subscription Mix" subtitle={`${fmtInt(users.activeSubscriptions)} on a paid plan`}>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                  {planData.map((d) => <Cell key={d.name} fill={PLAN_COLORS[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtInt(Number(v)), String(n)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
            <LegendDot color={PLAN_COLORS.free} label="Free" value={users.plans.free} />
            <LegendDot color={PLAN_COLORS.pro} label="Pro" value={users.plans.pro} />
            <LegendDot color={PLAN_COLORS.premium} label="Premium" value={users.plans.premium} />
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Content library */}
        <div className="lg:col-span-2">
          <ChartCard icon={BarChart3} title="Content Library" subtitle={`${fmtInt(totalRecords)} records across ${content.length} collections`}>
            {topContent.length ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topContent} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={128} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtInt(Number(v)), 'Records']} cursor={{ fill: '#10b98111' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-center px-6">
                <p className="text-sm text-muted-foreground">
                  {system.dbConnected ? 'No content records yet.' : 'Content counts need MongoDB — currently on the JSON fallback store.'}
                </p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Verification queue */}
        <ChartCard icon={FileClock} title="Verification Queue" subtitle={`${fmtInt(documents.total)} documents`}>
          {documents.total ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={docData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                      {docData.map((d) => <Cell key={d.name} fill={DOC_COLORS[d.name as keyof typeof DOC_COLORS]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtInt(Number(v)), String(n)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
                <LegendDot color={DOC_COLORS.verified} label="Verified" value={documents.verified} />
                <LegendDot color={DOC_COLORS.pending} label="Pending" value={documents.pending} />
                <LegendDot color={DOC_COLORS.rejected} label="Rejected" value={documents.rejected} />
              </div>
            </>
          ) : (
            <div className="h-[230px] flex flex-col items-center justify-center gap-2 text-center px-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-sm text-muted-foreground">No documents uploaded for review yet.</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* System monitoring + engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System health */}
        <div className="lg:col-span-2">
          <ChartCard icon={Activity} title="System Monitoring" subtitle={`Node ${system.nodeVersion} · uptime ${fmtUptime(system.uptimeSeconds)}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <div>
                <StatusRow icon={Server} label="Database" ok={system.dbConnected} value={system.dbConnected ? 'MongoDB' : 'JSON fallback'} />
                <StatusRow icon={Bot} label="AI Provider" ok={system.aiConfigured} okText="Configured" badText="RAG fallback" />
                <StatusRow icon={Mail} label="Email (SMTP)" ok={system.mailConfigured} okText="Configured" badText="Disabled" />
              </div>
              <div>
                <StatusRow icon={Clock} label="Uptime" ok value={fmtUptime(system.uptimeSeconds)} />
                <StatusRow icon={Cpu} label="Node" ok value={system.nodeVersion} />
                <StatusRow icon={HardDrive} label="RSS Memory" ok value={fmtBytes(system.memory.rss)} />
              </div>
            </div>
            {/* Heap usage bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Heap usage</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  {fmtBytes(system.memory.heapUsed)} / {fmtBytes(system.memory.heapTotal)} ({heapPct}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${heapPct > 90 ? 'bg-rose-500' : heapPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(heapPct, 100)}%` }}
                />
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Engagement snapshot */}
        <ChartCard icon={CheckCircle2} title="Engagement" subtitle="Student profile completeness">
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative h-[130px] w-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ name: 'done', value: profilePct }, { name: 'rest', value: 100 - profilePct }]}
                    dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={62} startAngle={90} endAngle={-270} stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{profilePct}%</span>
                <span className="text-[10px] text-muted-foreground">complete</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              <span className="font-bold text-slate-700 dark:text-slate-300">{fmtInt(users.withProfile)}</span> of {fmtInt(users.students)} students
              have filled counselling details
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
