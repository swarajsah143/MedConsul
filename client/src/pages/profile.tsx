import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, UserCircle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

/**
 * The student's own counselling profile.
 *
 *   GET  /api/profile   read my details
 *   PUT  /api/profile   update my details
 *
 * What this page deliberately does NOT do:
 *
 *   - Let a student edit their `email`, `role` or `plan`. The server ignores those keys
 *     on this endpoint (it copies an allow-list, it does not merge the body), so any UI
 *     for them would be a lie that silently discards what the user typed. Email and plan
 *     are shown read-only, with a line saying who can change them.
 *   - Show `adminNotes` or `planNote`. The server never sends them to a student — that is
 *     where the counsellor writes candid things about this exact person.
 *   - Sell anything. There is no payment system; a plan is granted by an admin.
 *
 * An empty profile is the normal state for a brand-new account, not an error — so the
 * blank form is framed as an invitation, and the reason it matters (a counsellor
 * shortlists colleges from rank + category + domicile) is said out loud.
 */

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PwD'] as const;

const COURSE_SUGGESTIONS = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'];

type Plan = 'free' | 'pro' | 'premium';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
  planExpiresAt?: string | null;
  phone?: string;
  dateOfBirth?: string;
  neetRollNo?: string;
  neetRank?: number | null;
  neetScore?: number | null;
  category?: string;
  domicileState?: string;
  coursePreference?: string;
  guardianName?: string;
  guardianPhone?: string;
}

/** Everything the form edits, held as strings — an <input> has no concept of `null`. */
interface FormState {
  name: string;
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
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', dateOfBirth: '', neetRollNo: '', neetRank: '', neetScore: '',
  category: '', domicileState: '', coursePreference: '', guardianName: '', guardianPhone: '',
};

const num = (n: number | null | undefined): string =>
  n === null || n === undefined ? '' : String(n);

function toForm(p: Profile): FormState {
  return {
    name: p.name || '',
    phone: p.phone || '',
    dateOfBirth: p.dateOfBirth || '',
    neetRollNo: p.neetRollNo || '',
    neetRank: num(p.neetRank),
    neetScore: num(p.neetScore),
    category: p.category || '',
    domicileState: p.domicileState || '',
    coursePreference: p.coursePreference || '',
    guardianName: p.guardianName || '',
    guardianPhone: p.guardianPhone || '',
  };
}

/** The counselling details, minus `name` — name is filled in at signup, so it never
 *  counts as "you have started your profile". */
function isProfileEmpty(f: FormState): boolean {
  const { name: _name, ...rest } = f;
  return Object.values(rest).every((v) => v.trim() === '');
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLAN_LABEL: Record<Plan, string> = { free: 'Free', pro: 'Pro', premium: 'Premium' };

const PLAN_STYLE: Record<Plan, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  pro: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  premium: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
};

/* -------------------------------------------------------------------------- */
/* small building blocks                                                      */
/* -------------------------------------------------------------------------- */

const selectClass =
  'flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600';

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .get<{ data: { profile: Profile } }>('/profile')
      .then((res) => {
        if (cancelled) return;
        const p = res.data.profile;
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((e: any) => {
        // api.ts throws a plain object, not an Error — there is no `.stack`, only `.message`.
        if (!cancelled) setLoadError(e?.message || 'Could not load your profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  // Same 3s flash the admin data page uses.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  const emptyProfile = useMemo(() => isProfileEmpty(form), [form]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaveError(null);

    // A cleared number field means "I don't have one yet" -> null, not 0 and not "".
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth.trim(),
      neetRollNo: form.neetRollNo.trim(),
      neetRank: form.neetRank.trim() === '' ? null : Number(form.neetRank),
      neetScore: form.neetScore.trim() === '' ? null : Number(form.neetScore),
      category: form.category,
      domicileState: form.domicileState.trim(),
      coursePreference: form.coursePreference.trim(),
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
    };

    try {
      const res = await api.put<{ data: { profile: Profile } }>('/profile', body);
      const p = res.data.profile;
      setProfile(p);
      setForm(toForm(p));
      setFlash('Saved.');
    } catch (err: any) {
      // The server's message is the useful part ("NEET score cannot exceed 720").
      // Show it verbatim and keep what the user typed — retyping the whole form to fix
      // one digit is a punishment, not an error message.
      setSaveError(err?.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  // ── could not load ──
  if (loadError || !profile) {
    return (
      <div className="space-y-6 page-enter">
        <PageHeader icon={UserCircle} title="My Profile" />
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {loadError || 'Could not load your profile.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your details are safe — this is only a problem reading them. Try again in a moment.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan: Plan = profile.plan || 'free';
  const planExpiry = formatDate(profile.planExpiresAt);
  const memberSince = formatDate(profile.createdAt);
  const planExpired =
    !!profile.planExpiresAt && new Date(profile.planExpiresAt).getTime() < Date.now();

  return (
    <div className="space-y-6 pb-10 page-enter">
      <PageHeader
        icon={UserCircle}
        title="My Profile"
        description="Your counselling details. A counsellor works from your rank, category and domicile state — the more of this that is filled in, the more useful the college shortlist you get back."
      />

      {emptyProfile && (
        <Card className="border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Let&apos;s start with your details.
            </p>
            <p className="text-sm text-blue-700/90 dark:text-blue-300/80 mt-1">
              Nothing is filled in yet — that is completely normal for a new account. Add your NEET rank,
              category and domicile state below and your counsellor can begin shortlisting colleges you can
              realistically get into. You can fill it in a bit at a time; every field is optional.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={save} className="space-y-6" noValidate>
        {/* ── You ── */}
        <Card>
          <CardHeader>
            <CardTitle>You</CardTitle>
            <CardDescription>How we reach you, and who you are on record.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Full name">
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="As it appears on your NEET admit card"
                autoComplete="name"
              />
            </Field>

            <Field
              id="email"
              label="Email"
              hint="This is your login, so it cannot be changed here. Ask your counsellor if it needs correcting."
            >
              <Input
                id="email"
                value={profile.email}
                disabled
                readOnly
                aria-readonly="true"
                className="cursor-not-allowed bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400"
              />
            </Field>

            <Field id="dateOfBirth" label="Date of birth" hint="Format: YYYY-MM-DD.">
              <Input
                id="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                autoComplete="bday"
              />
            </Field>

            <Field id="phone" label="Phone">
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </Field>
          </CardContent>
        </Card>

        {/* ── NEET ── */}
        <Card>
          <CardHeader>
            <CardTitle>NEET &amp; counselling</CardTitle>
            <CardDescription>
              The numbers every seat-matrix and cutoff decision is made from. Leave anything you do not
              have yet blank.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field id="neetRollNo" label="NEET roll number">
              <Input
                id="neetRollNo"
                value={form.neetRollNo}
                onChange={(e) => set('neetRollNo', e.target.value)}
                placeholder="e.g. 3901012345"
              />
            </Field>

            <Field id="neetRank" label="All India Rank">
              <Input
                id="neetRank"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={form.neetRank}
                onChange={(e) => set('neetRank', e.target.value)}
                placeholder="e.g. 15420"
              />
            </Field>

            <Field id="neetScore" label="NEET score" hint="Out of 720.">
              <Input
                id="neetScore"
                type="number"
                min={0}
                max={720}
                step={1}
                inputMode="numeric"
                value={form.neetScore}
                onChange={(e) => set('neetScore', e.target.value)}
                placeholder="e.g. 610"
              />
            </Field>

            <Field id="category" label="Category">
              <select
                id="category"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={cn(selectClass)}
              >
                <option value="">Not specified</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field
              id="domicileState"
              label="Domicile state"
              hint="Decides which state quota (85%) you are eligible for."
            >
              <Input
                id="domicileState"
                value={form.domicileState}
                onChange={(e) => set('domicileState', e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </Field>

            <Field id="coursePreference" label="Course preference">
              <Input
                id="coursePreference"
                list="course-suggestions"
                value={form.coursePreference}
                onChange={(e) => set('coursePreference', e.target.value)}
                placeholder="e.g. MBBS"
              />
              <datalist id="course-suggestions">
                {COURSE_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </CardContent>
        </Card>

        {/* ── Guardian ── */}
        <Card>
          <CardHeader>
            <CardTitle>Guardian</CardTitle>
            <CardDescription>
              Who your counsellor should call if they cannot reach you during a counselling round.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field id="guardianName" label="Guardian name">
              <Input
                id="guardianName"
                value={form.guardianName}
                onChange={(e) => set('guardianName', e.target.value)}
                placeholder="Parent or guardian"
              />
            </Field>

            <Field id="guardianPhone" label="Guardian phone">
              <Input
                id="guardianPhone"
                type="tel"
                value={form.guardianPhone}
                onChange={(e) => set('guardianPhone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </Field>
          </CardContent>
        </Card>

        {/* ── Save ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {flash && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{flash}</span>
          )}
          {saveError && (
            <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">
              {saveError}
            </p>
          )}
        </div>
      </form>

      {/* ── Plan (read-only) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            Your plan
          </CardTitle>
          <CardDescription>Set by an admin — this is not something you buy here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('text-xs font-bold uppercase tracking-wide rounded-full px-2.5 py-1', PLAN_STYLE[plan])}>
              {PLAN_LABEL[plan]}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {planExpiry
                ? planExpired
                  ? `Expired on ${planExpiry}`
                  : `Valid until ${planExpiry}`
                : 'No expiry date set'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Plans are granted by your counsellor or an administrator. There is no self-serve purchase in
            this app — if you think your plan is wrong, or you want it changed, talk to your counsellor.
          </p>
          {memberSince && (
            <p className="text-xs text-muted-foreground">Member since {memberSince}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
