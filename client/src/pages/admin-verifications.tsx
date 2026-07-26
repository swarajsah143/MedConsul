import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  FileText,
  Inbox,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  documentsApi,
  formatBytes,
  type QueueItem,
  type SubmissionStatus,
} from '@/lib/documents-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';

/**
 * Admin document verification queue.
 *
 * These are identity documents (Aadhaar, marksheets, photos). Three rules shape
 * this page:
 *
 *  - Files are never public. Viewing one goes through `documentsApi.downloadFile`,
 *    which fetches with the bearer token and hands back an object URL. Every object
 *    URL is tracked and revoked — an un-revoked blob: URL keeps a student's Aadhaar
 *    alive in memory for the rest of the session.
 *  - Nothing identifying goes into the URL bar. The status filter and page live in
 *    component state, never in a query string, so no document id or student email is
 *    ever written to history, the Referer header, or a server access log.
 *  - Uploaded files are never rendered inside an <iframe> on our origin. Images get
 *    an <img> in a modal; everything else opens in its own tab.
 */

/** `undefined` is the "All" tab — `queue()` omits the filter entirely. */
type Tab = SubmissionStatus | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

type Counts = Record<SubmissionStatus, number>;

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  verified: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  rejected: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const STATUS_ICONS: Record<SubmissionStatus, typeof Clock> = {
  pending: Clock,
  verified: ShieldCheck,
  rejected: X,
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const isImage = (mime: string) => mime.startsWith('image/');

/** One live object URL. `timer` is the auto-revoke for files handed to another tab. */
interface Lease {
  revoke: () => void;
  timer?: ReturnType<typeof setTimeout>;
}

/** A file opened in a new tab keeps loading after we hand the URL over, so it cannot
 *  be revoked synchronously. This is long enough for any 10MB file to have loaded. */
const NEW_TAB_REVOKE_MS = 60_000;

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState<Tab>('pending'); // it's a work queue — start on the work
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState<Counts | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ item: QueueItem; url: string; lease: Lease } | null>(null);

  // ── object-URL leases ────────────────────────────────────────────────
  // Every URL handed out by downloadFile lands here until it is revoked, so an
  // unmount (navigating away mid-review) can never strand a document blob.
  const leases = useRef<Lease[]>([]);

  const lease = useCallback((revoke: () => void, ttlMs?: number): Lease => {
    const entry: Lease = { revoke };
    if (ttlMs !== undefined) {
      entry.timer = setTimeout(() => {
        entry.revoke();
        leases.current = leases.current.filter((l) => l !== entry);
      }, ttlMs);
    }
    leases.current.push(entry);
    return entry;
  }, []);

  const release = useCallback((entry: Lease) => {
    if (entry.timer) clearTimeout(entry.timer);
    entry.revoke();
    leases.current = leases.current.filter((l) => l !== entry);
  }, []);

  useEffect(
    () => () => {
      for (const l of leases.current) {
        if (l.timer) clearTimeout(l.timer);
        l.revoke();
      }
      leases.current = [];
    },
    []
  );

  // ── data ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      setCounts(await documentsApi.stats());
    } catch {
      setCounts(null); // counts are decoration; a failure here must not blank the queue
    }
  }, []);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);

    documentsApi
      .queue(tab === 'all' ? undefined : tab, page)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setPages(Math.max(1, res.pages));
      })
      .catch((e: any) => {
        if (cancelled) return;
        setItems([]);
        setError(e?.message || 'Failed to load the review queue.');
      });

    return () => {
      cancelled = true;
    };
  }, [tab, page, reloadKey]);

  useEffect(() => {
    loadStats();
  }, [loadStats, reloadKey]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const selectTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    setRejecting(null);
    setRemarks('');
  };

  // ── actions ──────────────────────────────────────────────────────────

  /** Never point an <a href> or <iframe> at the API: the file endpoint needs the
   *  bearer token, and an uploaded file must not be interpreted in our origin. */
  const view = useCallback(
    async (item: QueueItem) => {
      setViewingId(item.id);
      setError(null);
      try {
        const { url, revoke } = await documentsApi.downloadFile(item.id);

        if (isImage(item.mimeType)) {
          const entry = lease(revoke); // revoked when the modal closes / on unmount
          setPreview({ item, url, lease: entry });
          return;
        }

        // PDFs: a separate tab, so nothing renders inside our document.
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          revoke();
          setError('Your browser blocked the popup. Allow popups for this site to view documents.');
          return;
        }
        lease(revoke, NEW_TAB_REVOKE_MS);
      } catch (e: any) {
        setError(e?.message || 'Could not open the file.');
      } finally {
        setViewingId(null);
      }
    },
    [lease]
  );

  const closePreview = useCallback(() => {
    setPreview((p) => {
      if (p) release(p.lease);
      return null;
    });
  }, [release]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, closePreview]);

  const approve = useCallback(
    async (item: QueueItem) => {
      setBusyId(item.id);
      setError(null);
      try {
        await documentsApi.review(item.id, 'verified');
        setRejecting(null);
        setFlash(`Verified ${item.documentName}.`);
        refresh(); // list + stats both re-read
      } catch (e: any) {
        setError(e?.message || 'Could not verify the document.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  /** The server rejects a rejection with no remarks (400), and rightly so — the
   *  student cannot fix what they were not told. The confirm button below stays
   *  disabled until there is a non-empty reason, so that 400 is unreachable. */
  const reject = useCallback(
    async (item: QueueItem) => {
      const reason = remarks.trim();
      if (!reason) return;

      setBusyId(item.id);
      setError(null);
      try {
        await documentsApi.review(item.id, 'rejected', reason);
        setRejecting(null);
        setRemarks('');
        setFlash(`Rejected ${item.documentName}.`);
        refresh();
      } catch (e: any) {
        setError(e?.message || 'Could not reject the document.');
      } finally {
        setBusyId(null);
      }
    },
    [remarks, refresh]
  );

  const countFor = (key: Tab): number | null => {
    if (!counts) return null;
    if (key === 'all') return counts.pending + counts.verified + counts.rejected;
    return counts[key] ?? 0;
  };

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Verify Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review the identity documents students have uploaded. A rejection always needs a reason —
            it is the only thing the student sees.
          </p>
        </div>
        {flash && (
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{flash}</span>
        )}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          const n = countFor(key);
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {label}
              {n !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <Card className="border-emerald-200 dark:border-emerald-900/40">
          <CardContent className="p-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{error}</p>
              <button
                onClick={refresh}
                className="text-xs text-muted-foreground hover:text-emerald-600 mt-1 font-medium"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {items === null ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : error ? null /* the error card above already says everything */ : items.length === 0 ? (
        // An empty pending queue is the goal, not a failure — it must not read like one.
        tab === 'pending' ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing waiting for review"
            description="Every submitted document has already been verified or rejected. New uploads land here."
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title={tab === 'all' ? 'No documents yet' : `No ${tab} documents`}
            description="Nothing has been submitted in this category yet."
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const busy = busyId === item.id;
                const isRejecting = rejecting === item.id;
                return (
                  <li key={item.id} className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.studentName}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.studentEmail}</p>

                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-1">
                          {item.documentName}
                          {item.section && (
                            <span className="ml-2 text-[11px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {item.section}
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          <span className="break-all">{item.originalName}</span>
                          {' · '}
                          {formatBytes(item.size)}
                          {' · '}
                          Uploaded {formatDate(item.createdAt)}
                        </p>

                        {item.status === 'rejected' && item.remarks && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                            <span className="font-semibold">Reason: </span>
                            {item.remarks}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => view(item)}
                          disabled={viewingId === item.id}
                        >
                          {viewingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          View
                        </Button>

                        {item.status !== 'verified' && (
                          <Button size="sm" onClick={() => approve(item)} disabled={busy}>
                            {busy && !isRejecting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Approve
                          </Button>
                        )}

                        {item.status !== 'rejected' && !isRejecting && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            onClick={() => {
                              setRejecting(item.id);
                              setRemarks('');
                            }}
                            disabled={busy}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Rejection reason. Required — Confirm stays disabled until it is filled in. */}
                    {isRejecting && (
                      <div className="mt-4 lg:ml-14 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 space-y-2.5">
                        <label
                          htmlFor={`reason-${item.id}`}
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Why is this being rejected?{' '}
                          <span className="text-emerald-600">Required</span>
                        </label>
                        <textarea
                          id={`reason-${item.id}`}
                          autoFocus
                          rows={2}
                          maxLength={500}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. The scan is cut off — the date of birth is not readable. Please re-upload the full page."
                          className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all duration-200 resize-y"
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-[11px] text-muted-foreground">
                            The student sees this text. {remarks.trim().length === 0
                              ? 'A reason is required.'
                              : `${remarks.trim().length}/500`}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRejecting(null);
                                setRemarks('');
                              }}
                              disabled={busy}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => reject(item)}
                              disabled={busy || remarks.trim().length === 0}
                            >
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                              Confirm rejection
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="px-4 sm:px-5 pb-4">
              <Pagination
                page={page}
                totalPages={pages}
                onPageChange={(p) => {
                  setPage(p);
                  setRejecting(null);
                  setRemarks('');
                }}
                itemCount={items.length}
                totalItems={total}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image preview. <img src=blob:> renders pixels — it cannot execute the file,
          which an <iframe> on our origin could. The URL is revoked on close. */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.item.documentName} preview`}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-full flex flex-col overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {preview.item.documentName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {preview.item.studentName} · {formatBytes(preview.item.size)}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto p-4 bg-slate-50 dark:bg-slate-950">
              <img
                src={preview.url}
                alt={preview.item.documentName}
                className="max-w-full mx-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
