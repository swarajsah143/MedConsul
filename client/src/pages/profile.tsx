import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Loader2,
  UserCircle,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Calendar,
  Target,
  Award,
  GraduationCap,
  MapPin,
  BookOpen,
  Users,
  Hash,
  Crown,
  CheckCircle2,
  Camera,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
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
  avatar?: string;
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
  avatar: string;   // data URL, or '' for the initials fallback
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', dateOfBirth: '', neetRollNo: '', neetRank: '', neetScore: '',
  category: '', domicileState: '', coursePreference: '', guardianName: '', guardianPhone: '',
  avatar: '',
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
    avatar: p.avatar || '',
  };
}

/** How much of the profile is filled in, 0–100. Every counselling field counts equally — this
 *  is the number the hero ring animates to, so it must move the moment the user types. The
 *  avatar is deliberately excluded: "profile strength" is about the counselling data a
 *  counsellor needs, not whether you uploaded a photo. */
function completionPercent(f: FormState): number {
  const vals = Object.entries(f)
    .filter(([k]) => k !== 'avatar')
    .map(([, v]) => v);
  const filled = vals.filter((v) => v.trim() !== '').length;
  return Math.round((filled / vals.length) * 100);
}

/** Client-side allow-list mirrors the server's; we re-encode anyway, so this is just a fast reject. */
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Turn a picked image file into a small, square data URL:
 * center-crop → downscale to 256×256 → re-encode (WEBP, JPEG fallback). This keeps what we
 * store to tens of KB regardless of the original, and strips EXIF/orientation metadata.
 */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Image is too large (max 8 MB).');

  let source: CanvasImageSource;
  let w: number;
  let h: number;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(file);
    source = bitmap;
    w = bitmap.width;
    h = bitmap.height;
  } catch {
    // Fallback for browsers/formats where createImageBitmap fails.
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Could not read that image.'));
        i.src = url;
      });
      source = img;
      w = img.naturalWidth;
      h = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image.');

  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  ctx.drawImage(source, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap?.close();

  let out = canvas.toDataURL('image/webp', 0.85);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', 0.85);
  return out;
}

/** Two-letter avatar monogram from the name (falls back to the email). */
function initialsOf(name: string, email: string): string {
  const src = (name.trim() || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || '?').toUpperCase();
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

/** Accent presets — one tinted foreground/background pair per section and stat. */
type Accent = { bg: string; text: string };
const ACCENT: Record<'red' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'purple', Accent> = {
  red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400' },
};

/* -------------------------------------------------------------------------- */
/* small building blocks                                                      */
/* -------------------------------------------------------------------------- */

/** Shared field polish: taller, rounder, with a soft red focus glow and a lift on hover.
 *  Passed to every Input so the whole form reacts consistently to hover/focus. */
const inputFx =
  'h-11 rounded-xl bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700 ' +
  'hover:border-red-300 dark:hover:border-red-800 hover:shadow-sm ' +
  'focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-0 ' +
  'focus-visible:shadow-[0_0_0_4px_rgba(244,63,94,0.10)] transition-all duration-200';

const selectClass =
  'flex h-11 w-full rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:border-red-400 focus-visible:ring-2 focus-visible:ring-red-500/25 ' +
  'focus-visible:shadow-[0_0_0_4px_rgba(244,63,94,0.10)] ' +
  'transition-all duration-200 hover:border-red-300 dark:hover:border-red-800 hover:shadow-sm cursor-pointer';

function Field({
  id,
  label,
  hint,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

/**
 * Editable avatar for the red hero. Shows the picture if there is one, otherwise the initials
 * monogram. Hovering (or focusing) reveals a "change" overlay; a always-visible camera badge
 * makes the affordance obvious on touch too, and an ✕ removes the photo. The picked file is
 * downscaled client-side and handed back as a data URL — it saves with the rest of the form.
 */
function AvatarEditor({
  value,
  name,
  email,
  onChange,
}: {
  value: string;
  name: string;
  email: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the user re-pick the same file after an error
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch (ex: any) {
      setErr(ex?.message || 'Could not use that image.');
    } finally {
      setBusy(false);
    }
  };

  const initials = initialsOf(name, email);

  return (
    <div className="relative shrink-0">
      <div className="group relative w-24 h-24 rounded-2xl overflow-hidden bg-white/15 backdrop-blur-sm border border-white/30 shadow-lg ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.03]">
        {value ? (
          <img src={value} alt="Your profile" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold tracking-tight text-white select-none">
            {initials}
          </div>
        )}

        {/* Reveal-on-hover / focus change overlay */}
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label="Change profile picture"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none transition-opacity duration-200 cursor-pointer disabled:cursor-wait"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Change</span>
            </>
          )}
        </button>
      </div>

      {/* Always-visible camera badge (clear affordance on touch) */}
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        aria-label="Change profile picture"
        className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md ring-2 ring-red-600/10 text-red-600 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <Camera className="w-4 h-4" />
      </button>

      {/* Remove photo */}
      {value && !busy && (
        <button
          type="button"
          onClick={() => { setErr(null); onChange(''); }}
          aria-label="Remove profile picture"
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md text-slate-500 hover:text-red-600 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFile}
        className="hidden"
      />

      {err && (
        <p className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[220px] text-center text-[11px] font-medium text-white bg-red-700/95 rounded-lg px-2.5 py-1.5 shadow-lg z-20">
          {err}
        </p>
      )}
    </div>
  );
}

/** Animated circular completion meter — lives on the red hero, so it draws in white. */
function CompletionRing({ percent }: { percent: number }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = C - (clamped / 100) * C;
  return (
    <div className="relative w-[68px] h-[68px] shrink-0">
      <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-90">
        <circle cx="34" cy="34" r={R} fill="none" strokeWidth="6" stroke="rgba(255,255,255,0.25)" />
        <motion.circle
          cx="34"
          cy="34"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="#ffffff"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-extrabold tabular-nums">{clamped}%</span>
      </div>
    </div>
  );
}

/** A live read-out tile in the summary strip — shows a dash until the field is filled. */
function StatTile({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent: Accent }) {
  const has = value.trim() !== '';
  return (
    <div className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center gap-2 mb-2.5">
        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110', accent.bg, accent.text)}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <p className={cn('text-lg font-bold tabular-nums truncate', has ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600')}>
        {has ? value : '—'}
      </p>
    </div>
  );
}

/** A form section: accent-badged header + a two-column grid of fields. */
function Section({
  icon: Icon,
  accent,
  title,
  description,
  delay,
  children,
}: {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="group overflow-hidden border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white via-white to-rose-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 hover:shadow-lg hover:shadow-rose-200/40 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300">
        <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105', accent.bg, accent.text)}>
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <CardContent className="grid gap-5 sm:grid-cols-2 p-5 sm:p-6">{children}</CardContent>
      </Card>
    </motion.div>
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

  const completion = useMemo(() => completionPercent(form), [form]);
  // Compared against the last-saved snapshot so the save bar can say "unsaved changes".
  const dirty = useMemo(
    () => (profile ? JSON.stringify(form) !== JSON.stringify(toForm(profile)) : false),
    [form, profile]
  );

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
      avatar: form.avatar,
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

  const strengthLabel =
    completion === 100 ? 'All set'
      : completion >= 70 ? 'Looking strong'
        : completion >= 40 ? 'Getting there'
          : completion > 0 ? 'Just started'
            : 'Empty for now';

  return (
    <div className="relative space-y-6 pb-16 page-enter">
      {/* Soft on-brand backdrop — a light rose wash that fades into the page, so the
          form area feels warm and distinct without fighting the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-[420px] bg-gradient-to-b from-rose-100/70 via-rose-50/30 to-transparent dark:from-red-950/20 dark:via-red-950/5 dark:to-transparent blur-2xl"
      />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary text-white shadow-lg shadow-red-600/20">
        <div className="pointer-events-none absolute -top-16 -right-8 w-72 h-72 bg-white/10 rounded-full blur-3xl float-slow" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl float-medium" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
            {/* Avatar — editable */}
            <AvatarEditor
              value={form.avatar}
              name={form.name}
              email={profile.email}
              onChange={(v) => set('avatar', v)}
            />

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
                {profile.name || 'Your profile'}
              </h1>
              <p className="text-red-50/90 text-sm mt-1 flex items-center gap-1.5 min-w-0">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold uppercase tracking-wide border border-white/15">
                  <Crown className="w-3.5 h-3.5" />
                  {PLAN_LABEL[plan]} plan
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-red-50">
                    <Calendar className="w-3.5 h-3.5" />
                    Member since {memberSince}
                  </span>
                )}
              </div>
            </div>

            {/* Completion */}
            <div className="flex items-center gap-3 shrink-0 rounded-xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-sm">
              <CompletionRing percent={completion} />
              <div className="leading-tight">
                <p className="text-sm font-bold">{strengthLabel}</p>
                <p className="text-xs text-red-50/80">Profile strength</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live stat strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatTile
          icon={Target}
          accent={ACCENT.red}
          label="All India Rank"
          value={form.neetRank.trim() ? Number(form.neetRank).toLocaleString('en-IN') : ''}
        />
        <StatTile
          icon={Award}
          accent={ACCENT.amber}
          label="NEET Score"
          value={form.neetScore.trim() ? `${form.neetScore}/720` : ''}
        />
        <StatTile icon={GraduationCap} accent={ACCENT.indigo} label="Category" value={form.category} />
        <StatTile icon={MapPin} accent={ACCENT.emerald} label="Domicile" value={form.domicileState} />
      </motion.div>

      <form onSubmit={save} className="space-y-6" noValidate>
        {/* ── You ── */}
        <Section
          icon={User}
          accent={ACCENT.blue}
          title="You"
          description="How we reach you, and who you are on record."
          delay={0.1}
        >
          <Field id="name" label="Full name" icon={User}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="As it appears on your NEET admit card"
              autoComplete="name"
              className={inputFx}
            />
          </Field>

          <Field
            id="email"
            label="Email"
            icon={Mail}
            hint="This is your login, so it cannot be changed here. Ask your counsellor if it needs correcting."
          >
            <Input
              id="email"
              value={profile.email}
              disabled
              readOnly
              aria-readonly="true"
              className="h-11 rounded-xl cursor-not-allowed bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400"
            />
          </Field>

          <Field id="dateOfBirth" label="Date of birth" icon={Calendar} hint="Format: YYYY-MM-DD.">
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              autoComplete="bday"
              className={inputFx}
            />
          </Field>

          <Field id="phone" label="Phone" icon={Phone}>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              className={inputFx}
            />
          </Field>
        </Section>

        {/* ── NEET ── */}
        <Section
          icon={Target}
          accent={ACCENT.red}
          title="NEET & counselling"
          description="The numbers every seat-matrix and cutoff decision is made from. Leave anything you do not have yet blank."
          delay={0.15}
        >
          <Field id="neetRollNo" label="NEET roll number" icon={Hash}>
            <Input
              id="neetRollNo"
              value={form.neetRollNo}
              onChange={(e) => set('neetRollNo', e.target.value)}
              placeholder="e.g. 3901012345"
              className={inputFx}
            />
          </Field>

          <Field id="neetRank" label="All India Rank" icon={Target}>
            <Input
              id="neetRank"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={form.neetRank}
              onChange={(e) => set('neetRank', e.target.value)}
              placeholder="e.g. 15420"
              className={inputFx}
            />
          </Field>

          <Field id="neetScore" label="NEET score" icon={Award} hint="Out of 720.">
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
              className={inputFx}
            />
          </Field>

          <Field id="category" label="Category" icon={GraduationCap}>
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
            icon={MapPin}
            hint="Decides which state quota (85%) you are eligible for."
          >
            <Input
              id="domicileState"
              value={form.domicileState}
              onChange={(e) => set('domicileState', e.target.value)}
              placeholder="e.g. Maharashtra"
              className={inputFx}
            />
          </Field>

          <Field id="coursePreference" label="Course preference" icon={BookOpen}>
            <Input
              id="coursePreference"
              list="course-suggestions"
              value={form.coursePreference}
              onChange={(e) => set('coursePreference', e.target.value)}
              placeholder="e.g. MBBS"
              className={inputFx}
            />
            <datalist id="course-suggestions">
              {COURSE_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </Section>

        {/* ── Guardian ── */}
        <Section
          icon={Users}
          accent={ACCENT.emerald}
          title="Guardian"
          description="Who your counsellor should call if they cannot reach you during a counselling round."
          delay={0.2}
        >
          <Field id="guardianName" label="Guardian name" icon={User}>
            <Input
              id="guardianName"
              value={form.guardianName}
              onChange={(e) => set('guardianName', e.target.value)}
              placeholder="Parent or guardian"
              className={inputFx}
            />
          </Field>

          <Field id="guardianPhone" label="Guardian phone" icon={Phone}>
            <Input
              id="guardianPhone"
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => set('guardianPhone', e.target.value)}
              placeholder="+91 98765 43210"
              className={inputFx}
            />
          </Field>
        </Section>

        {/* ── Save bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card>
            {/* p-5 sm:p-6 (not the inherited pt-0) so the row is vertically centred — this
                card has no header above its content, unlike the form Sections. */}
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm min-h-[1.5rem]">
                {saving ? (
                  <span className="text-muted-foreground">Saving your changes…</span>
                ) : saveError ? (
                  <span role="alert" className="font-semibold text-red-600 dark:text-red-400">{saveError}</span>
                ) : flash ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {flash}
                  </span>
                ) : dirty ? (
                  <span className="inline-flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved changes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    All changes saved
                  </span>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={saving || !dirty}
                className="bg-gradient-to-r from-red-600 to-rose-500 text-white hover:from-red-500 hover:to-rose-500 shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/25 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:shadow-sm"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </form>

      {/* ── Plan (read-only) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="overflow-hidden">
          <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ACCENT.purple.bg, ACCENT.purple.text)}>
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Your plan</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Set by an admin — this is not something you buy here.</p>
            </div>
          </div>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1.5', PLAN_STYLE[plan])}>
                <Crown className="w-3.5 h-3.5" />
                {PLAN_LABEL[plan]}
              </span>
              <span className={cn('text-sm font-medium', planExpired ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400')}>
                {planExpiry
                  ? planExpired
                    ? `Expired on ${planExpiry}`
                    : `Valid until ${planExpiry}`
                  : 'No expiry date set'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plans are granted by your counsellor or an administrator. There is no self-serve purchase in
              this app — if you think your plan is wrong, or you want it changed, talk to your counsellor.
            </p>
            {memberSince && (
              <p className="text-xs text-muted-foreground">Member since {memberSince}.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
