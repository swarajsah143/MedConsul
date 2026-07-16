import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CircleDashed,
  Eye,
  GraduationCap,
  Inbox,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Pencil,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/documents-api';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Admin view of students: who they are, how far along they actually are, and what
 * plan they are on.
 *
 * Two things this page refuses to lie about:
 *
 *  - PROGRESS IS VERIFIED-ONLY. The bar is docsVerified / docsTotal. A student
 *    uploading a file is not progress; an admin verifying it is. Uploaded-but-pending
 *    documents are shown separately (amber) so the distinction stays visible instead
 *    of being quietly rolled into a number that looks like completion.
 *  - PLANS ARE GRANTED, NOT BOUGHT. There is no payment integration anywhere in this
 *    app. No prices, no revenue, no billing status — see PLAN_DISCLOSURE below.
 */

const PLANS = ['free', 'pro', 'premium'] as const;
type Plan = (typeof PLANS)[number];

/** The honest note. This app has no payment gateway; a plan is a flag an admin sets. */
const PLAN_DISCLOSURE =
  'Plans are set manually by an admin. This app has no payment integration — nothing here reflects money received.';

type DocStatus = 'verified' | 'pending' | 'rejected' | 'not_uploaded';

const ROLES = ['student', 'admin'] as const;
type Role = (typeof ROLES)[number];

/** The server rejects anything outside this list with a 400. */
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'] as const;
const COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'] as const;

/**
 * The counselling details, as the FORM holds them: every value is a string, including
 * the two numbers. Numbers stay strings here so a half-typed "6" or an outright typo
 * survives a failed round-trip intact instead of being coerced to NaN behind the
 * admin's back — the server does the coercing, and the server does the complaining.
 */
interface Counselling {
  phone: string;
  dateOfBirth: string;
  neetRollNo: string;
  neetRank: string;
  neetScore: string;
  category: string;
  domicileState: string;
  coursePreference: string;
  guardianName: string;
  guardianPhone: string;
  adminNotes: string;
}

const NUMERIC_FIELDS: readonly (keyof Counselling)[] = ['neetRank', 'neetScore'];

const EMPTY_COUNSELLING: Counselling = {
  phone: '',
  dateOfBirth: '',
  neetRollNo: '',
  neetRank: '',
  neetScore: '',
  category: '',
  domicileState: '',
  coursePreference: '',
  guardianName: '',
  guardianPhone: '',
  adminNotes: '',
};

/**
 * CREATE: send only what was actually filled in. A blank field is a field the admin
 * has not got round to, not an instruction to store an empty string.
 */
function createPayload(c: Counselling): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) {
    const t = v.trim();
    if (t) out[k] = t;
  }
  return out;
}

/**
 * UPDATE: send every field, because here a blank field IS an instruction — "clear
 * this". Cleared numbers go as null (not ''), which is what the model stores for
 * "unknown rank"; '' would be coerced into a 0-ish number by Mongoose.
 */
function updatePayload(c: Counselling): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(c)) {
    const t = v.trim();
    out[k] = !t && NUMERIC_FIELDS.includes(k as keyof Counselling) ? null : t;
  }
  return out;
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;

  /**
   * Optional on purpose. GET /admin/students does not send the counselling fields
   * today — only GET /admin/students/:id does. The rank/category sub-line below
   * therefore renders per-row only when the value is actually there, so the table
   * shows no column of em dashes now and needs no change if the list starts
   * sending them.
   */
  neetRank?: number | null;
  category?: string;

  plan: Plan;
  planExpiresAt: string | null;
  planNote: string;
  planActive: boolean;

  docsTotal: number;
  docsVerified: number;
  docsPending: number;
  docsRejected: number;
  docsUploaded: number;
  progressPct: number;

  chatSessions: number;
  lastActiveAt: string | null;
}

interface Summary {
  total: number;
  students: number;
  admins: number;
  onPaidPlan: number;
  expired: number;
  awaitingReview: number;
}

interface StudentDoc {
  docId: string;
  name: string;
  section: string;
  mandatory: boolean;
  submissionId: string | null;
  status: DocStatus;
  remarks: string;
  originalName: string | null;
  size: number | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
}

interface DetailStudent {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  plan: Plan;
  planExpiresAt: string | null;
  planNote: string;
  planActive: boolean;

  // The counselling details. This endpoint is admin-only, so it also carries the
  // counsellor's private notes — see the InternalNotes block, which says so out loud.
  phone: string;
  dateOfBirth: string;
  neetRollNo: string;
  neetRank: number | null;
  neetScore: number | null;
  category: string;
  domicileState: string;
  coursePreference: string;
  guardianName: string;
  guardianPhone: string;
  adminNotes: string;
}

interface Detail {
  student: DetailStudent;
  documents: StudentDoc[];
  chatSessions: number;
}

/** The saved student → the strings the form edits. */
function toCounselling(s: DetailStudent): Counselling {
  return {
    phone: s.phone ?? '',
    dateOfBirth: toDobInput(s.dateOfBirth ?? ''),
    neetRollNo: s.neetRollNo ?? '',
    neetRank: s.neetRank == null ? '' : String(s.neetRank),
    neetScore: s.neetScore == null ? '' : String(s.neetScore),
    category: s.category ?? '',
    domicileState: s.domicileState ?? '',
    coursePreference: s.coursePreference ?? '',
    guardianName: s.guardianName ?? '',
    guardianPhone: s.guardianPhone ?? '',
    adminNotes: s.adminNotes ?? '',
  };
}

type PlanFilter = Plan | 'all';
type SortKey = 'progress' | 'joined';

const PLAN_TABS: { key: PlanFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'pro', label: 'Pro' },
  { key: 'premium', label: 'Premium' },
];

/** Matches the Input styling — there is no <select> in components/ui. */
const SELECT_CLASS =
  'flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200';

// ── formatting ───────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2 days ago". Null (never active) is an em dash — not "just now". */
function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['month', 2_592_000],
    ['year', 31_536_000],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  let size = 60;
  for (const [u, s] of units) {
    if (secs >= s) { unit = u; size = s; }
  }
  return rtf.format(-Math.floor(secs / size), unit);
}

/** ISO → the YYYY-MM-DD an <input type="date"> wants, in the admin's own timezone. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The date of birth is stored as a plain YYYY-MM-DD string, which is already exactly
 * what <input type="date"> wants — pass it straight through rather than round-tripping
 * it through a Date, which would shift it a day for anyone west of UTC.
 */
function toDobInput(v: string): string {
  if (!v) return '';
  return YMD.test(v) ? v : toDateInput(v);
}

/** A stored YYYY-MM-DD, shown the way a human reads a birthday. */
function fmtDob(v: string): string {
  if (!v) return '—';
  if (!YMD.test(v)) return fmtDate(v);
  const [y, m, d] = v.split('-').map(Number);
  return fmtDate(new Date(y, m - 1, d).toISOString());
}

// ── small pieces ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  to,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number | string;
  tint: string;
  to?: string;
}) {
  const body = (
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
      </div>
    </CardContent>
  );

  if (to) {
    return (
      <Link to={to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className="overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
          {body}
        </Card>
      </Link>
    );
  }
  return <Card className="overflow-hidden">{body}</Card>;
}

const PLAN_STYLES: Record<Plan, string> = {
  free: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  pro: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  premium: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
};

/** An expired paid plan reads as EXPIRED, never as the plan it used to be. */
function PlanBadge({ plan, active, expiresAt }: { plan: Plan; active: boolean; expiresAt: string | null }) {
  if (!active) {
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" />
          Expired · {plan}
        </span>
        {expiresAt && (
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80">Ended {fmtDate(expiresAt)}</span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PLAN_STYLES[plan]}`}>
        {plan !== 'free' && <Sparkles className="w-3 h-3" />}
        {plan}
      </span>
      {plan !== 'free' && (
        <span className="text-[10px] text-muted-foreground">
          {expiresAt ? `Until ${fmtDate(expiresAt)}` : 'Open-ended'}
        </span>
      )}
    </span>
  );
}

/**
 * VERIFIED documents over the total checklist. Deliberately not "uploaded" — the
 * label says so, because a bar that counted uploads would overstate every student.
 */
function ProgressBar({ verified, total, pct }: { verified: number; total: number; pct: number }) {
  const done = total > 0 && verified === total;
  return (
    <div className="min-w-[9rem] space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
          {verified}/{total} verified
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${verified} of ${total} documents verified`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

const DOC_STATUS: Record<DocStatus, { label: string; icon: typeof Clock; badge: string; row: string }> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    row: 'border-slate-200 dark:border-slate-800',
  },
  pending: {
    label: 'Awaiting review',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    row: 'border-amber-200 dark:border-amber-900/40',
  },
  rejected: {
    label: 'Rejected',
    icon: X,
    badge: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    row: 'border-red-200 dark:border-red-900/40',
  },
  // The gap. Dashed border + muted fill so a missing document cannot be mistaken for
  // a quiet, harmless row — this is the whole point of the detail view.
  not_uploaded: {
    label: 'Not uploaded',
    icon: CircleDashed,
    badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    row: 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/20',
  },
};

function DocStatusBadge({ status }: { status: DocStatus }) {
  const { label, icon: Icon, badge } = DOC_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${badge}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {message}
    </p>
  );
}

// ── counselling details: the shared fieldset ─────────────────────────────────

const LABEL_CLASS = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5';

/** The exact words the plan note already uses. Said the same way in every place. */
const PRIVATE_NOTE = 'Internal only — the student never sees this.';

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Everything a counsellor knows about a student, in one fieldset — shared verbatim by
 * "Add student" and by the detail modal's "Edit details", so the two can never drift.
 *
 * Note what is deliberately NOT here: `max={720}` on the score, `min` on the rank. The
 * browser would block the submit and swallow the server's own words ("NEET score cannot
 * exceed 720"), which is the message the admin actually needs to see. The server is the
 * rule; this form is only the typing surface.
 */
function CounsellingFields({
  idPrefix,
  v,
  set,
  disabled,
}: {
  idPrefix: string;
  v: Counselling;
  set: (patch: Partial<Counselling>) => void;
  disabled: boolean;
}) {
  const id = (f: string) => `${idPrefix}-${f}`;

  return (
    <>
      <FormSection title="Counselling details" hint="All optional — fill in whatever the student has to hand.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field id={id('phone')} label="Phone">
            <Input
              id={id('phone')}
              type="tel"
              value={v.phone}
              disabled={disabled}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>

          <Field id={id('dob')} label="Date of birth">
            <Input
              id={id('dob')}
              type="date"
              value={v.dateOfBirth}
              disabled={disabled}
              onChange={(e) => set({ dateOfBirth: e.target.value })}
            />
          </Field>

          <Field id={id('rollNo')} label="NEET roll no.">
            <Input
              id={id('rollNo')}
              value={v.neetRollNo}
              disabled={disabled}
              onChange={(e) => set({ neetRollNo: e.target.value })}
              placeholder="e.g. 2401234567"
            />
          </Field>

          <Field id={id('rank')} label="NEET rank" hint="All India Rank.">
            <Input
              id={id('rank')}
              type="number"
              inputMode="numeric"
              value={v.neetRank}
              disabled={disabled}
              onChange={(e) => set({ neetRank: e.target.value })}
              placeholder="e.g. 12345"
            />
          </Field>

          <Field id={id('score')} label="NEET score" hint="Out of 720.">
            <Input
              id={id('score')}
              type="number"
              inputMode="numeric"
              value={v.neetScore}
              disabled={disabled}
              onChange={(e) => set({ neetScore: e.target.value })}
              placeholder="e.g. 650"
            />
          </Field>

          <Field id={id('category')} label="Category">
            <select
              id={id('category')}
              className={SELECT_CLASS}
              value={v.category}
              disabled={disabled}
              onChange={(e) => set({ category: e.target.value })}
            >
              <option value="">Not set</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field id={id('domicile')} label="Domicile state">
            <Input
              id={id('domicile')}
              value={v.domicileState}
              disabled={disabled}
              onChange={(e) => set({ domicileState: e.target.value })}
              placeholder="e.g. Maharashtra"
            />
          </Field>

          <Field id={id('course')} label="Course preference">
            <select
              id={id('course')}
              className={SELECT_CLASS}
              value={v.coursePreference}
              disabled={disabled}
              onChange={(e) => set({ coursePreference: e.target.value })}
            >
              <option value="">Not set</option>
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Guardian" hint="Who we call if the student cannot be reached.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id('guardianName')} label="Guardian name">
            <Input
              id={id('guardianName')}
              value={v.guardianName}
              disabled={disabled}
              onChange={(e) => set({ guardianName: e.target.value })}
              placeholder="Parent or guardian"
            />
          </Field>

          <Field id={id('guardianPhone')} label="Guardian phone">
            <Input
              id={id('guardianPhone')}
              type="tel"
              value={v.guardianPhone}
              disabled={disabled}
              onChange={(e) => set({ guardianPhone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>
      </FormSection>

      {/* Private. Marked as such on the field, and again on the box that displays it. */}
      <FormSection title="Internal notes" hint={`${PRIVATE_NOTE} It is never sent to them and never shown in their profile.`}>
        <label htmlFor={id('adminNotes')} className="sr-only">
          Internal notes — the student never sees this
        </label>
        <textarea
          id={id('adminNotes')}
          className={`${SELECT_CLASS} h-24 py-2 resize-y`}
          value={v.adminNotes}
          disabled={disabled}
          maxLength={2000}
          onChange={(e) => set({ adminNotes: e.target.value })}
          placeholder="Anything the counsellor needs to remember — walk-in context, documents promised, follow-ups."
        />
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-500">
          <Lock className="w-3 h-3 shrink-0" /> Admins only — the student never sees this.
        </p>
      </FormSection>
    </>
  );
}

// ── email students (broadcast) ─────────────────────────────────────────────────

/**
 * Compose + send an email to students. Audience follows the page's current plan filter (all, or
 * one plan). The live recipient count comes from the server; the send goes through the mail
 * service, which no-ops when SMTP is unconfigured — in that case the result says so plainly.
 */
function BroadcastModal({
  planFilter,
  onClose,
  onSent,
}: {
  planFilter: PlanFilter;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audienceLabel = planFilter === 'all' ? 'all students' : `${planFilter} students`;
  const planQuery = planFilter === 'all' ? '' : `?plan=${planFilter}`;

  useEffect(() => {
    let cancelled = false;
    api.get(`/admin/students/broadcast/recipients${planQuery}`)
      .then((res) => { if (!cancelled) setCount(res?.data?.recipientCount ?? 0); })
      .catch(() => { if (!cancelled) setCount(null); });
    return () => { cancelled = true; };
  }, [planQuery]);

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are both required.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await api.post('/admin/students/broadcast', {
        subject: subject.trim(),
        message: message.trim(),
        audience: { plan: planFilter === 'all' ? undefined : planFilter },
      });
      const d = res?.data ?? {};
      let msg: string;
      if (!d.recipientCount) msg = 'No students matched this audience — nothing sent.';
      else if (d.sent === 0 && d.skipped > 0) msg = `Email isn't configured yet — 0 sent. Add SMTP credentials to go live.`;
      else if (typeof d.sent === 'number') msg = `Sent to ${d.sent} of ${d.recipientCount} student(s)${d.failed ? `, ${d.failed} failed` : ''}.`;
      else msg = `Sending to ${d.recipientCount} student(s) in the background…`;
      onSent(msg);
    } catch (e: any) {
      setError(e?.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Email students</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  To <span className="font-semibold text-slate-700 dark:text-slate-300">{audienceLabel}</span>
                  {count !== null && <> — <span className="font-semibold text-red-600 dark:text-red-400">{count}</span> recipient{count === 1 ? '' : 's'}</>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && <FormError message={error} />}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Round 1 choice filling closes soon" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              placeholder="Write your reminder or announcement. Blank lines become paragraphs."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all resize-y"
            />
            <p className="text-[11px] text-muted-foreground">Sent as a branded MedCounsel email with a plain-text fallback.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button onClick={send} disabled={sending || !subject.trim() || !message.trim() || count === 0}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : `Send${count ? ` to ${count}` : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── add student ──────────────────────────────────────────────────────────────

/**
 * A walk-in student, registered by the counsellor in one pass: account + counselling
 * details + guardian + private notes, all in a single POST. Only the account fields are
 * required; everything else can be filled in now or later from the detail modal.
 *
 * Password strength, email shape, the category list and the 720 ceiling are all the
 * server's calls. Whatever it refuses comes back as a `message` and lands verbatim
 * above the buttons, with every value still in place.
 */
function AddStudentForm({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (v: { name: string; email: string; password: string; role: Role; details: Counselling }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [details, setDetails] = useState<Counselling>(EMPTY_COUNSELLING);

  const set = useCallback((patch: Partial<Counselling>) => setDetails((d) => ({ ...d, ...patch })), []);

  return (
    <Card className="border-red-200 dark:border-red-900/40">
      <CardContent className="p-5">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name: name.trim(), email: email.trim(), password, role, details });
          }}
        >
          <FormSection title="Account" hint="The only required part. The student signs in with this email and password.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field id="new-name" label="Name *">
                <Input
                  id="new-name"
                  value={name}
                  required
                  disabled={busy}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </Field>

              <Field id="new-email" label="Email *">
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  required
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </Field>

              <Field
                id="new-password"
                label="Password *"
                hint="At least 8 characters, with an uppercase, a lowercase and a number."
              >
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  required
                  disabled={busy}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set an initial password"
                />
              </Field>

              <Field id="new-role" label="Role">
                <select
                  id="new-role"
                  className={SELECT_CLASS}
                  value={role}
                  disabled={busy}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-6">
            <CounsellingFields idPrefix="new" v={details} set={set} disabled={busy} />
          </div>

          {/* Every 400 and the 409 (duplicate email) land here, in the server's words. */}
          {error && <FormError message={error} />}

          <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-5">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create student
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── edit details (inside the modal) ──────────────────────────────────────────

function EditDetailsForm({
  student,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  student: DetailStudent;
  busy: boolean;
  error: string | null;
  onSubmit: (v: Counselling) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Counselling>(() => toCounselling(student));
  const set = useCallback((patch: Partial<Counselling>) => setV((d) => ({ ...d, ...patch })), []);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <CounsellingFields idPrefix={`edit-${student.id}`} v={v} set={set} disabled={busy} />

      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save details
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── read-only details (inside the modal) ─────────────────────────────────────

/** Unset is an em dash. Never a blank cell, never a zero. */
function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5 break-words">{value || '—'}</p>
    </div>
  );
}

function CounsellingSummary({ s }: { s: DetailStudent }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ReadField label="Phone" value={s.phone} />
      <ReadField label="Date of birth" value={fmtDob(s.dateOfBirth)} />
      <ReadField label="NEET roll no." value={s.neetRollNo} />
      <ReadField label="NEET rank" value={s.neetRank == null ? '' : String(s.neetRank)} />
      <ReadField label="NEET score" value={s.neetScore == null ? '' : `${s.neetScore} / 720`} />
      <ReadField label="Category" value={s.category} />
      <ReadField label="Domicile state" value={s.domicileState} />
      <ReadField label="Course preference" value={s.coursePreference} />
      <ReadField label="Guardian" value={s.guardianName} />
      <ReadField label="Guardian phone" value={s.guardianPhone} />
    </div>
  );
}

/**
 * The counsellor's private notes. Kept visually distinct from every other block on the
 * page — a bordered amber panel with a padlock — because the one thing that must never
 * happen is an admin mistaking this for something the student can read and writing
 * accordingly. The API never sends adminNotes to a student; the label says so.
 */
function InternalNotes({ notes }: { notes: string }) {
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
        <Lock className="w-3 h-3 shrink-0" /> Internal notes · private
      </p>
      <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 whitespace-pre-wrap break-words">
        {notes || '—'}
      </p>
      <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 mt-2">{PRIVATE_NOTE}</p>
    </div>
  );
}

// ── set plan ─────────────────────────────────────────────────────────────────

/**
 * The expiry is optional (empty = open-ended). The server refuses a past expiry on a
 * paid plan with a 400; that message is rendered verbatim below the field rather than
 * being pre-empted by a `min` attribute — the server is the rule, not this form.
 */
function SetPlanForm({
  student,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  student: StudentRow;
  busy: boolean;
  error: string | null;
  onSubmit: (v: { plan: Plan; planExpiresAt: string | null; planNote: string }) => void;
  onCancel: () => void;
}) {
  const [plan, setPlan] = useState<Plan>(student.plan);
  const [expiry, setExpiry] = useState(toDateInput(student.planExpiresAt));
  const [note, setNote] = useState(student.planNote);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ plan, planExpiresAt: expiry || null, planNote: note.trim() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`plan-${student.id}`} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Plan
          </label>
          <select
            id={`plan-${student.id}`}
            className={SELECT_CLASS}
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan)}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`expiry-${student.id}`} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Expires on
          </label>
          <Input
            id={`expiry-${student.id}`}
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {plan === 'free'
              ? 'Free never expires.'
              : expiry
                ? 'Must be in the future.'
                : 'Leave empty for an open-ended plan.'}
          </p>
        </div>

        <div>
          <label htmlFor={`note-${student.id}`} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Note
          </label>
          <Input
            id={`note-${student.id}`}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this plan was granted"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">Internal only — the student never sees this.</p>
        </div>
      </div>

      {/* The 400s (unknown plan, invalid date, expiry already in the past) land here. */}
      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Save plan
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── detail modal ─────────────────────────────────────────────────────────────

const SECTION_LABEL: Record<string, string> = {
  online: 'Online submission',
  physical: 'Physical / at reporting',
};

function DetailModal({
  detail,
  loading,
  error,
  saving,
  saveError,
  onSave,
  onEditToggle,
  onClose,
}: {
  detail: Detail | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  /** Resolves true when the PUT succeeded — only then does the form close. */
  onSave: (v: Counselling) => Promise<boolean>;
  onEditToggle: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Group by section, preserving the order the sections first appear in.
  const grouped = useMemo(() => {
    const out = new Map<string, StudentDoc[]>();
    for (const d of detail?.documents ?? []) {
      const key = d.section || 'other';
      const list = out.get(key);
      if (list) list.push(d);
      else out.set(key, [d]);
    }
    return [...out.entries()];
  }, [detail]);

  const verified = detail?.documents.filter((d) => d.status === 'verified').length ?? 0;
  const total = detail?.documents.length ?? 0;
  const missing = detail?.documents.filter((d) => d.status === 'not_uploaded').length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Student detail"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-full flex flex-col overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {detail?.student.name ?? 'Loading…'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{detail?.student.email}</p>
            {detail && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <PlanBadge
                  plan={detail.student.plan}
                  active={detail.student.planActive}
                  expiresAt={detail.student.planExpiresAt}
                />
                <span className="text-[11px] text-muted-foreground">
                  Joined {fmtDate(detail.student.joinedAt)} · {detail.chatSessions} chat session
                  {detail.chatSessions === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            </div>
          ) : error ? (
            <FormError message={error} />
          ) : !detail ? null : (
            <>
              {/* Verified, not uploaded. Said out loud so the number cannot be misread. */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <ProgressBar verified={verified} total={total} pct={total ? Math.round((verified / total) * 100) : 0} />
                <p className="text-xs text-muted-foreground mt-2.5">
                  Progress counts <strong className="font-semibold text-slate-600 dark:text-slate-400">admin-verified</strong>{' '}
                  documents only.
                  {missing > 0 && (
                    <>
                      {' '}
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">
                        {missing} document{missing === 1 ? '' : 's'} never uploaded.
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/*
                The counselling details. Read-only by default — this modal is opened to
                look something up far more often than to change it, and a page of live
                inputs invites an accidental edit.
              */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Counselling details</h3>
                  {!editing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onEditToggle();
                        setEditing(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" /> Edit details
                    </Button>
                  )}
                </div>

                {editing ? (
                  <EditDetailsForm
                    student={detail.student}
                    busy={saving}
                    error={saveError}
                    onSubmit={async (v) => {
                      // Only a genuine 2xx closes the form. On a 400 it stays open with
                      // every value the admin typed still in it.
                      if (await onSave(v)) setEditing(false);
                    }}
                    onCancel={() => {
                      setEditing(false);
                      onEditToggle();
                    }}
                  />
                ) : (
                  <>
                    <CounsellingSummary s={detail.student} />
                    <InternalNotes notes={detail.student.adminNotes} />
                  </>
                )}
              </div>

              {total === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  There are no checklist documents configured yet.
                </p>
              )}

              {grouped.map(([section, docs]) => (
                <div key={section} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {SECTION_LABEL[section] ?? section}
                    <span className="ml-1.5 font-normal normal-case tracking-normal">
                      ({docs.filter((d) => d.status === 'verified').length}/{docs.length} verified)
                    </span>
                  </p>

                  <ul className="space-y-2">
                    {docs.map((d) => {
                      const style = DOC_STATUS[d.status];
                      return (
                        <li key={d.docId} className={`rounded-lg border p-3 ${style.row}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {d.name}
                                {d.mandatory && (
                                  <span className="ml-1.5 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                                    Required
                                  </span>
                                )}
                              </p>

                              {d.status === 'not_uploaded' ? (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {d.mandatory
                                    ? 'Still missing — the student has not uploaded this.'
                                    : 'Not uploaded (optional).'}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {d.originalName && <span className="break-all">{d.originalName}</span>}
                                  {d.size !== null && ` · ${formatBytes(d.size)}`}
                                  {d.uploadedAt && ` · Uploaded ${fmtDate(d.uploadedAt)}`}
                                  {d.reviewedAt && ` · Reviewed ${fmtDate(d.reviewedAt)}`}
                                </p>
                              )}

                              {/* The admin's own words back to them — why this was refused. */}
                              {d.status === 'rejected' && d.remarks && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                                  <span className="font-semibold">Reason: </span>
                                  {d.remarks}
                                </p>
                              )}
                            </div>

                            <DocStatusBadge status={d.status} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('joined');

  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Set-plan is an inline expanded row (admin-dashboard's idiom); View is a modal.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Email students: a modal composer that sends to the currently-filtered plan audience.
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Add student: an inline panel under the header, in the same idiom as Set plan.
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailSaveError, setDetailSaveError] = useState<string | null>(null);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // The plan filter goes to the server (?plan=), which still computes `summary` over
  // every user — so the tiles stay stable while the list narrows.
  useEffect(() => {
    let cancelled = false;
    setStudents(null);
    setError(null);

    api
      .get(`/admin/students${planFilter === 'all' ? '' : `?plan=${planFilter}`}`)
      .then((res) => {
        if (cancelled) return;
        setStudents(res?.data?.students ?? []);
        setSummary(res?.data?.summary ?? null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setStudents([]);
        setError(e?.message || 'Failed to load students.');
      });

    return () => {
      cancelled = true;
    };
  }, [planFilter, reloadKey]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const openDetail = useCallback(async (id: string) => {
    setDetailOpen(true);
    setDetailId(id);
    setDetail(null);
    setDetailError(null);
    setDetailSaveError(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/students/${id}`);
      setDetail(res?.data ?? null);
    } catch (e: any) {
      setDetailError(e?.message || 'Could not load this student.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
    setDetailSaveError(null);
  }, []);

  /**
   * The whole student in one POST — account, counselling details, guardian, notes.
   *
   * Every rule here is the server's: password strength, the email shape, the category
   * list, the 720 ceiling on the score, and the 409 when the email is taken. Its
   * `message` is rendered as-is and the panel stays open with everything still typed in,
   * because the alternative — a cleared form and a generic "failed" — is how a
   * counsellor loses a walk-in student's details twice.
   */
  const createStudent = useCallback(
    async (v: { name: string; email: string; password: string; role: Role; details: Counselling }) => {
      setCreating(true);
      setCreateError(null);
      try {
        await api.post('/admin/users', {
          name: v.name,
          email: v.email,
          password: v.password,
          role: v.role,
          ...createPayload(v.details),
        });
        setAdding(false);
        setFlash(`${v.name} has been added.`);
        refresh();
      } catch (e: any) {
        setCreateError(e?.message || 'Could not create this student.');
      } finally {
        setCreating(false);
      }
    },
    [refresh]
  );

  /** Edit the counselling details of an existing student. Returns true only on success. */
  const saveDetails = useCallback(
    async (v: Counselling): Promise<boolean> => {
      if (!detailId) return false;
      setDetailSaving(true);
      setDetailSaveError(null);
      try {
        await api.put(`/admin/users/${detailId}`, updatePayload(v));

        // Refetch rather than trust what we sent — the server is what stored it. The
        // existing detail stays on screen while it reloads, so the modal does not blink
        // back to a spinner under the admin.
        const res = await api.get(`/admin/students/${detailId}`);
        setDetail(res?.data ?? null);
        setFlash(`${detail?.student.name ?? 'Student'}’s details have been updated.`);
        refresh();
        return true;
      } catch (e: any) {
        setDetailSaveError(e?.message || 'Could not save these details.');
        return false;
      } finally {
        setDetailSaving(false);
      }
    },
    [detailId, detail, refresh]
  );

  /**
   * The server owns the plan rules — an unknown plan, an unparseable date, and an
   * expiry already in the past are all 400s. Its `message` is what the admin reads;
   * the form stays open so the date can be corrected in place.
   */
  const savePlan = useCallback(
    async (student: StudentRow, v: { plan: Plan; planExpiresAt: string | null; planNote: string }) => {
      setSaving(true);
      setPlanError(null);
      try {
        await api.put(`/admin/students/${student.id}/plan`, v);
        setEditingId(null);
        setFlash(`${student.name} is now on the ${v.plan} plan.`);
        refresh();
      } catch (e: any) {
        setPlanError(e?.message || 'Could not update the plan.');
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const visible = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    const rows = q
      ? students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      : [...students];

    rows.sort((a, b) =>
      sort === 'progress'
        ? b.progressPct - a.progressPct || a.name.localeCompare(b.name)
        : new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    );
    return rows;
  }, [students, query, sort]);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        icon={UsersRound}
        title="Students"
        description="Everyone with an account, how far they actually are through the document checklist, and the plan an admin has given them."
      >
        {flash && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {flash}
          </span>
        )}
        <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
          <Mail className="w-4 h-4" />
          Email students
        </Button>
        <Button
          variant={adding ? 'outline' : 'default'}
          onClick={() => {
            setCreateError(null);
            setAdding((a) => !a);
          }}
          aria-expanded={adding}
        >
          {adding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {adding ? 'Close' : 'Add student'}
        </Button>
      </PageHeader>

      {broadcastOpen && (
        <BroadcastModal
          planFilter={planFilter}
          onClose={() => setBroadcastOpen(false)}
          onSent={(msg) => {
            setBroadcastOpen(false);
            setFlash(msg);
            setTimeout(() => setFlash(null), 5000);
          }}
        />
      )}

      {adding && (
        <AddStudentForm
          busy={creating}
          error={createError}
          onSubmit={createStudent}
          onCancel={() => {
            setAdding(false);
            setCreateError(null);
          }}
        />
      )}

      {/* Tiles. "Awaiting review" is the only actionable one — it links to the queue. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={UsersRound}
          label="Total users"
          value={summary?.total ?? '—'}
          tint="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={GraduationCap}
          label="Students"
          value={summary?.students ?? '—'}
          tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Sparkles}
          label="On a paid plan"
          value={summary?.onPaidPlan ?? '—'}
          tint="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expired plans"
          value={summary?.expired ?? '—'}
          tint="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Clock}
          label="Documents awaiting review"
          value={summary?.awaitingReview ?? '—'}
          tint="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
          to="/admin/verifications"
        />
      </div>

      {/* No payment system exists. Say so, plainly, where the plans are. */}
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20">
        <CardContent className="p-4 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{PLAN_DISCLOSURE}</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by plan">
          {PLAN_TABS.map(({ key, label }) => {
            const active = planFilter === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPlanFilter(key);
                  setEditingId(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-[16rem]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search students by name or email"
              className="pl-9"
            />
          </div>
          <select
            className={`${SELECT_CLASS} w-auto`}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort students"
          >
            <option value="joined">Newest first</option>
            <option value="progress">Most progress</option>
          </select>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="p-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
              <button onClick={refresh} className="text-xs text-muted-foreground hover:text-red-600 mt-1 font-medium">
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {students === null ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-red-600" />
        </div>
      ) : error ? null : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={query.trim() ? 'No one matches that search' : 'No students here'}
          description={
            query.trim()
              ? 'No student’s name or email matches what you typed.'
              : planFilter === 'all'
                ? 'No accounts have been created yet.'
                : `Nobody is on the ${planFilter} plan.`
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="font-semibold px-5 py-3">Student</th>
                    <th className="font-semibold px-5 py-3">Verified documents</th>
                    <th className="font-semibold px-5 py-3 hidden lg:table-cell">Plan</th>
                    <th className="font-semibold px-5 py-3 hidden xl:table-cell">Joined</th>
                    <th className="font-semibold px-5 py-3 hidden xl:table-cell">Last active</th>
                    <th className="font-semibold px-5 py-3 hidden md:table-cell">Chats</th>
                    <th className="font-semibold px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <Fragment key={s.id}>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {s.name}
                                {s.role === 'admin' && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 align-middle">
                                    <Shield className="w-3 h-3" /> Admin
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{s.email}</p>

                              {/*
                                The line a counsellor actually scans for. A sub-line, not
                                a column: it only appears for a student who has a rank or
                                a category, so nobody has to read a column of em dashes.
                              */}
                              {(s.neetRank != null || s.category) && (
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {s.neetRank != null && (
                                    <span className="tabular-nums">AIR {s.neetRank.toLocaleString('en-IN')}</span>
                                  )}
                                  {s.neetRank != null && s.category && <span className="mx-1">·</span>}
                                  {s.category}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3">
                          <ProgressBar verified={s.docsVerified} total={s.docsTotal} pct={s.progressPct} />
                          {/* Uploaded ≠ done. Pending and rejected stay visible next to the bar. */}
                          {(s.docsPending > 0 || s.docsRejected > 0) && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {s.docsPending > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock className="w-3 h-3" /> {s.docsPending} pending
                                </span>
                              )}
                              {s.docsRejected > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                  <X className="w-3 h-3" /> {s.docsRejected} rejected
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3 hidden lg:table-cell">
                          <PlanBadge plan={s.plan} active={s.planActive} expiresAt={s.planExpiresAt} />
                        </td>

                        <td className="px-5 py-3 hidden xl:table-cell text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" /> {fmtDate(s.joinedAt)}
                          </span>
                        </td>

                        <td className="px-5 py-3 hidden xl:table-cell text-muted-foreground whitespace-nowrap">
                          {fmtRelative(s.lastActiveAt)}
                        </td>

                        <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <MessageSquare className="w-3.5 h-3.5" /> {s.chatSessions}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`View ${s.name}`}
                              onClick={() => openDetail(s.id)}
                            >
                              <Eye className="w-4 h-4" /> View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Set plan for ${s.name}`}
                              onClick={() => {
                                setPlanError(null);
                                setEditingId((cur) => (cur === s.id ? null : s.id));
                              }}
                            >
                              <Sparkles className="w-4 h-4" /> Set plan
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {editingId === s.id && (
                        <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/60 dark:bg-slate-800/20">
                          <td colSpan={7} className="px-5 py-4">
                            <SetPlanForm
                              student={s}
                              busy={saving}
                              error={planError}
                              onSubmit={(v) => savePlan(s, v)}
                              onCancel={() => {
                                setEditingId(null);
                                setPlanError(null);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {detailOpen && (
        <DetailModal
          detail={detail}
          loading={detailLoading}
          error={detailError}
          saving={detailSaving}
          saveError={detailSaveError}
          onSave={saveDetails}
          onEditToggle={() => setDetailSaveError(null)}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
