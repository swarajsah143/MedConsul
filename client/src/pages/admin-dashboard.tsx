import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Users,
  GraduationCap,
  ShieldCheck,
  Loader2,
  Mail,
  CalendarDays,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Pencil,
  KeyRound,
  Trash2,
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

interface AdminStats {
  totalUsers: number;
  admins: number;
  students: number;
}

type Role = 'student' | 'admin';

/** The server rejects anything weaker — show the rules instead of letting an admin guess. */
const PASSWORD_RULES = 'At least 8 characters, including an uppercase letter, a lowercase letter and a number.';

/** No <select> in components/ui — match the Input styling so the form stays visually consistent. */
const SELECT_CLASS =
  'flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: number | string; tint: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 sm:p-5 flex items-center gap-4">
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
      isAdmin ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    }`}>
      {isAdmin ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
      {isAdmin ? 'Admin' : 'Student'}
    </span>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
      {children}
    </label>
  );
}

/** The server's `message` on a 4xx (self-demotion, last admin, duplicate email, weak password). */
function FormError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {message}
    </p>
  );
}

// ── Create ───────────────────────────────────────────────────────────────────

function AddUserForm({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (v: { name: string; email: string; password: string; role: Role }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');

  return (
    <form
      className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), email: email.trim(), password, role });
      }}
    >
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">New user</h4>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel htmlFor="new-name">Name</FieldLabel>
          <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
        </div>
        <div>
          <FieldLabel htmlFor="new-email">Email</FieldLabel>
          <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
        </div>
        <div>
          <FieldLabel htmlFor="new-password">Password</FieldLabel>
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" required />
        </div>
        <div>
          <FieldLabel htmlFor="new-role">Role</FieldLabel>
          <select id="new-role" className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{PASSWORD_RULES}</p>

      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create user
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Per-row: edit ────────────────────────────────────────────────────────────

function EditUserForm({
  user,
  isSelf,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  user: AdminUser;
  isSelf: boolean;
  busy: boolean;
  error: string | null;
  onSubmit: (v: { name: string; email: string; role: Role }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role === 'admin' ? 'admin' : 'student');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), email: email.trim(), role });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor={`edit-name-${user.id}`}>Name</FieldLabel>
          <Input id={`edit-name-${user.id}`} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor={`edit-email-${user.id}`}>Email</FieldLabel>
          <Input id={`edit-email-${user.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <FieldLabel htmlFor={`edit-role-${user.id}`}>Role</FieldLabel>
          {/* Self-demotion is refused by the server — don't offer it. */}
          <select
            id={`edit-role-${user.id}`}
            className={SELECT_CLASS}
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="text-[11px] text-muted-foreground mt-1.5">You cannot remove your own admin role.</p>}
        </div>
      </div>

      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Per-row: reset password ──────────────────────────────────────────────────

function ResetPasswordForm({
  user,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  user: AdminUser;
  busy: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(password);
      }}
    >
      <div className="max-w-sm">
        <FieldLabel htmlFor={`pw-${user.id}`}>New password for {user.email}</FieldLabel>
        <Input
          id={`pw-${user.id}`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground mt-1.5">{PASSWORD_RULES}</p>
      </div>

      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Set password
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Per-row: delete confirm ──────────────────────────────────────────────────

function DeleteConfirm({
  user,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  user: AdminUser;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Delete {user.name} ({user.email})?
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            This also <strong>permanently deletes every identity document they have uploaded</strong> — the files are
            erased from disk, not archived. This cannot be undone.
          </p>
        </div>
      </div>

      {error && <FormError message={error} />}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Yes, delete user and documents
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type RowAction = { kind: 'edit' | 'password' | 'delete'; id: string } | null;

export default function AdminDashboardPage() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [rowAction, setRowAction] = useState<RowAction>(null);

  /** Users and stats always move together — a write that changes one changes the other. */
  const refresh = useCallback(async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats'),
      ]);
      setUsers(usersRes?.data?.users ?? []);
      setStats(statsRes?.data ?? null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  /**
   * Every write goes through here: refetch on success, and on a 4xx keep the form open
   * showing the server's own message. The server's guards (self-demotion, last admin,
   * duplicate email, weak password) are the only source of truth for those rules — the
   * message it sends is the message the admin reads.
   */
  const run = useCallback(
    async (fn: () => Promise<string>) => {
      setBusy(true);
      setActionError(null);
      try {
        const message = await fn();
        await refresh();
        setRowAction(null);
        setAdding(false);
        setFlash(message);
      } catch (e: any) {
        setActionError(e?.message || 'Request failed');
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const closeForms = () => { setRowAction(null); setAdding(false); setActionError(null); };

  const openRowAction = (kind: 'edit' | 'password' | 'delete', id: string) => {
    setAdding(false);
    setActionError(null);
    setRowAction((cur) => (cur && cur.kind === kind && cur.id === id ? null : { kind, id }));
  };

  const createUser = (v: { name: string; email: string; password: string; role: Role }) =>
    run(async () => {
      await api.post('/admin/users', v);
      return `${v.name} added as ${v.role}.`;
    });

  const saveUser = (id: string, v: { name: string; email: string; role: Role }) =>
    run(async () => {
      await api.put(`/admin/users/${id}`, v);
      return 'Changes saved.';
    });

  const setPassword = (id: string, password: string) =>
    run(async () => {
      const res = await api.post(`/admin/users/${id}/password`, { password });
      return res?.message || 'Password updated.';
    });

  const deleteUser = (id: string) =>
    run(async () => {
      const res = await api.delete(`/admin/users/${id}`);
      const docs: number = res?.data?.deletedDocuments ?? 0;
      const base = res?.message || 'User deleted.';
      return docs > 0 ? `${base} · ${docs} uploaded document${docs === 1 ? '' : 's'} permanently removed.` : base;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        icon={Shield}
        title="Admin Dashboard"
        description="Administrative overview — add, edit and remove user accounts."
      />

      {error && (
        <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? users.length} tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={GraduationCap} label="Students" value={stats?.students ?? 0} tint="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={ShieldCheck} label="Admins" value={stats?.admins ?? 0} tint="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" />
      </div>

      {/* All Users */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">All Users</h3>
                <p className="text-xs text-muted-foreground">{users.length} registered account{users.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {flash && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> {flash}
                </span>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setRowAction(null);
                  setActionError(null);
                  setAdding((a) => !a);
                }}
              >
                <UserPlus className="w-4 h-4" /> Add user
              </Button>
            </div>
          </div>

          {adding && (
            <AddUserForm
              busy={busy}
              error={actionError}
              onSubmit={createUser}
              onCancel={closeForms}
            />
          )}

          {users.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No users yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use “Add user” to create the first account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="font-semibold px-5 py-3">User</th>
                    <th className="font-semibold px-5 py-3 hidden sm:table-cell">Email</th>
                    <th className="font-semibold px-5 py-3">Role</th>
                    <th className="font-semibold px-5 py-3 hidden md:table-cell">Joined</th>
                    <th className="font-semibold px-5 py-3 hidden lg:table-cell">User ID</th>
                    <th className="font-semibold px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = me?.id === u.id;
                    const open = rowAction?.id === u.id ? rowAction.kind : null;

                    return (
                      <Fragment key={u.id}>
                        <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {u.name}
                                {isSelf && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(you)</span>}
                              </span>
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
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Edit ${u.name}`}
                                onClick={() => openRowAction('edit', u.id)}
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Reset password for ${u.name}`}
                                onClick={() => openRowAction('password', u.id)}
                              >
                                <KeyRound className="w-4 h-4" /> Reset password
                              </Button>
                              {/* The server refuses a self-delete, so don't offer it. */}
                              {isSelf ? (
                                <span className="text-[11px] text-muted-foreground px-2" title="You cannot delete your own account.">
                                  Delete unavailable
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  aria-label={`Delete ${u.name}`}
                                  onClick={() => openRowAction('delete', u.id)}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {open && (
                          <tr className={`border-b border-slate-50 dark:border-slate-800/50 ${
                            open === 'delete' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-50/60 dark:bg-slate-800/20'
                          }`}>
                            <td colSpan={6} className="px-5 py-4">
                              {open === 'edit' && (
                                <EditUserForm
                                  user={u}
                                  isSelf={isSelf}
                                  busy={busy}
                                  error={actionError}
                                  onSubmit={(v) => saveUser(u.id, v)}
                                  onCancel={closeForms}
                                />
                              )}
                              {open === 'password' && (
                                <ResetPasswordForm
                                  user={u}
                                  busy={busy}
                                  error={actionError}
                                  onSubmit={(pw) => setPassword(u.id, pw)}
                                  onCancel={closeForms}
                                />
                              )}
                              {open === 'delete' && (
                                <DeleteConfirm
                                  user={u}
                                  busy={busy}
                                  error={actionError}
                                  onConfirm={() => deleteUser(u.id)}
                                  onCancel={closeForms}
                                />
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
