import { useEffect, useState } from 'react';

/**
 * Public read access to the admin-managed data (GET /api/data/:collection).
 *
 * The pages used to import hardcoded arrays from lib/*-data.ts and filter them
 * synchronously at render. They now fetch, which means every page needs real
 * loading and error states — there is no synchronous data any more.
 */

export interface Fetched<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

async function getCollection<T>(name: string, params: Record<string, any> = {}): Promise<T[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }
  const url = `/api/data/${name}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Failed to load ${name} (${res.status})`);
  }
  return body.data.items as T[];
}

/** Fetch one collection. `params` must be referentially stable or memoised. */
export function useCollection<T = any>(name: string, params: Record<string, any> = {}): Fetched<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCollection<T>(name, JSON.parse(key))
      .then((items) => { if (!cancelled) setData(items); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [name, key, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

/** Fetch several collections at once — most pages need their rows plus colleges to join against. */
export function useCollections<T extends Record<string, any[]>>(names: (keyof T & string)[]): {
  data: Partial<T>;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = names.join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(key.split(',').map((n) => getCollection(n).then((items) => [n, items] as const)))
      .then((pairs) => { if (!cancelled) setData(Object.fromEntries(pairs) as Partial<T>); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [key]);

  return { data, loading, error };
}

// ── shared record types (mirror server/src/schema/collections.ts) ──

export interface College {
  id: string;
  name: string;
  aliases?: string[];
  state: string;
  city: string;
  type: 'Government' | 'Private' | 'Deemed';
  established?: number;
  totalSeats?: number;
  affiliation?: string;
  website?: string;
  isActive?: boolean;
  coursesOffered?: string[];
  description?: string;
  thumbnail?: string;
  neetCutoffRange?: string;
  annualFees?: string;
  about?: string;
  facultyQuality?: string;
  campusInfrastructure?: string;
  hospitalFacilities?: string;
  clinicalExposure?: string;
  patientLoad?: string;
  hostelFacilities?: string;
  studentLife?: string;
  pros?: string[];
  cons?: string[];
  gallery?: { url: string; caption: string }[];
  reviewVideos?: { title: string; embedUrl: string }[];
}

export interface ClosingRank {
  id: string;
  collegeId: string;
  year: number;
  round: number;
  course: string;
  category: string;
  quota: string;
  closingRank: number;
  closingScore?: number | null;
}

export interface FeeEntry {
  id: string;
  collegeId: string;
  course: string;
  category: string;
  quota: string;
  tuitionFee: number;
  hostelFee?: number;
  miscCharges?: number;
  securityDeposit?: number;
  totalFirstYear?: number;
  govtSeats?: number;
  mgmtSeats?: number;
  nriSeats?: number;
  yearWiseFees?: { year: string; tuition: number; hostel: number; misc: number; deposit: number; total: number }[];
  feeBreakdown?: { label: string; amount: number }[];
  scholarships?: string[];
  paymentSchedule?: string;
  refundPolicy?: string;
  bondDetails?: string;
}

/** Index colleges by id — rank/fee rows carry only a collegeId now. */
export function byId(colleges: College[]): Map<string, College> {
  return new Map(colleges.map((c) => [c.id, c]));
}

/** Distinct, sorted values of a key — for building filter dropdowns from live data. */
export function distinct<T, K extends keyof T>(rows: T[], key: K): string[] {
  return [...new Set(rows.map((r) => String(r[key] ?? '')).filter(Boolean))].sort();
}
