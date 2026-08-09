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

// ── server-side pagination (for the large collections: allotments ~222k, closingRanks ~6.6k) ──
//
// The un-paginated useCollection() above is hard-capped at 5000 rows server-side, so a page that
// used it silently showed at most 5000 of 222k allotments. These hooks page + filter on the
// server instead, so a page only ever holds the rows it is showing.

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
}

function toQuery(params: Record<string, any>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }
  return qs.toString();
}

/**
 * One page of a collection, filtered on the server. `params` may carry page, limit, sort, q,
 * any filterable field (exact match), and `<numberField>_min` / `_max` range bounds. Must be
 * referentially stable or inline — it is JSON-keyed, so a fresh object each render is fine.
 */
export function usePaged<T = any>(name: string, params: Record<string, any>): Paged<T> {
  const [state, setState] = useState({ items: [] as T[], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = toQuery(JSON.parse(key));

    fetch(`/api/data/${name}/paged${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.success) throw new Error(body?.message || `Failed to load ${name} (${res.status})`);
        return body.data;
      })
      .then((d) => { if (!cancelled) setState({ items: d.items, total: d.total, page: d.page, pages: d.pages }); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [name, key]);

  return { ...state, loading, error };
}

/** Distinct values of `fields` (optionally scoped by `filters`) — for building filter dropdowns. */
export function useFacets(name: string, fields: string[], filters: Record<string, any> = {}): {
  facets: Record<string, any[]>;
  loading: boolean;
} {
  const [facets, setFacets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify({ fields, filters });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { fields: fl, filters: ft } = JSON.parse(key) as { fields: string[]; filters: Record<string, any> };
    const qs = toQuery({ fields: fl.join(','), ...ft });

    fetch(`/api/data/${name}/facets?${qs}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((body) => { if (!cancelled && body?.success) setFacets(body.data); })
      .catch(() => { /* a missing facet just means an empty dropdown, not a page error */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [name, key]);

  return { facets, loading };
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
  /** MCC's own 6-digit institute code. Blank means UNVERIFIED, not "has no code". */
  mccCode?: string;
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
  /** Whole-course cost (all years) — a different quantity from totalFirstYear. */
  totalCourseFee?: number;
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

/**
 * Seats OFFERED in a given round, as published before allotment.
 *
 * Distinct from `Allotment` (who actually received a seat) and from `FeeEntry.govtSeats` (a coarse
 * per-college annual total). The authority republishes a whole new matrix each round with different
 * numbers, so always filter by `round` — never aggregate across rounds as if they were additive.
 */
export interface SeatMatrixRow {
  id: string;
  counselling: string;
  year: number;
  round: number;
  instituteCode: string;
  collegeId?: string;
  instituteName: string;
  state: string;
  instituteType?: string;
  quota: string;
  course: string;
  category: string;
  pwd?: boolean;
  seatGender?: string;
  totalSeats: number;
  source?: string;
}

/** Index colleges by id — rank/fee rows carry only a collegeId now. */
export function byId(colleges: College[]): Map<string, College> {
  return new Map(colleges.map((c) => [c.id, c]));
}

/** Distinct, sorted values of a key — for building filter dropdowns from live data. */
export function distinct<T, K extends keyof T>(rows: T[], key: K): string[] {
  return [...new Set(rows.map((r) => String(r[key] ?? '')).filter(Boolean))].sort();
}

/**
 * The NEET-UG seat courses — mirrors the COURSES enum in server/src/schema/collections.ts.
 * Keep in sync. Used to populate course filters fully even when the loaded data only happens
 * to contain a couple of them (closing ranks / fees currently carry just MBBS + BDS).
 */
export const NEET_UG_COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'BVSc'] as const;

/**
 * A dropdown's options = the curated catalog (in its intentional order) followed by any values the
 * live data has that the catalog doesn't — so the filter lists every course, not just the ones
 * that appear in the currently loaded rows.
 */
export function withCatalog(catalog: readonly string[], fromData: string[]): string[] {
  const known = new Set(catalog);
  return [...catalog, ...fromData.filter((v) => !known.has(v)).sort()];
}
