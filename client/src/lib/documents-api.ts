import { api } from './api';

/**
 * Student document uploads + admin verification.
 *
 * Files are never public. Every download goes through an authenticated endpoint
 * that checks ownership, so a URL alone is useless — which is why `downloadFile`
 * fetches with the bearer token and hands back a blob rather than pointing an
 * <a href> at the API.
 */

export type SubmissionStatus = 'pending' | 'verified' | 'rejected';

export interface Submission {
  id: string;
  userId: string;
  docId: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: SubmissionStatus;
  remarks: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A queue row, enriched by the server with who submitted what. */
export interface QueueItem extends Submission {
  documentName: string;
  section: string;
  studentName: string;
  studentEmail: string;
}

export const MAX_FILE_MB = 10;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

export const documentsApi = {
  /** Upload or replace the file for one checklist document. */
  async upload(docId: string, file: File): Promise<Submission> {
    const form = new FormData();
    form.append('file', file);

    // Not via api.ts: that sets Content-Type: application/json, which would corrupt
    // the multipart boundary. The browser must set it itself.
    const res = await fetch(`/api/documents/${docId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      body: form,
      credentials: 'include',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) throw new Error(body?.message || `Upload failed (${res.status})`);
    return body.data.submission as Submission;
  },

  mine: () =>
    api.get('/documents/mine').then((r) => (r.data?.items ?? []) as Submission[]),

  remove: (id: string) => api.delete(`/documents/${id}`),

  /** Fetches the file with auth and returns an object URL. Caller must revoke it. */
  async downloadFile(id: string): Promise<{ url: string; revoke: () => void }> {
    const res = await fetch(`/api/documents/${id}/file`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : `Could not fetch file (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  },

  // ── admin ──
  queue: (status?: SubmissionStatus, page = 1) =>
    api
      .get(`/documents/admin/queue?page=${page}${status ? `&status=${status}` : ''}`)
      .then((r) => r.data as { items: QueueItem[]; total: number; page: number; pages: number }),

  stats: () =>
    api.get('/documents/admin/stats').then((r) => r.data as Record<SubmissionStatus, number>),

  review: (id: string, status: 'verified' | 'rejected', remarks = '') =>
    api.post(`/documents/admin/${id}`, { status, remarks }).then((r) => r.data.submission as Submission),
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
