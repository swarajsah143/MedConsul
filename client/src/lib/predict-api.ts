import { useEffect, useState } from 'react';

/**
 * The Rank Predictor's client. All the maths lives on the server (services/predictor.ts)
 * — this only asks and renders.
 *
 * That split is deliberate. The cutoff table is bigger than the public read cap, so a
 * browser-side predictor would silently be scoring against a truncated set of colleges;
 * and the chatbot has to give the same answers as the page, which means one implementation.
 */

export type Chance = 'Safe' | 'Good' | 'Reach' | 'Tough';

export interface PredictMatch {
  collegeId: string;
  college: string;
  city?: string;
  state?: string;
  type?: string;
  course: string;
  quota: string;
  round: number;
  year: number;
  closingRank: number;
  chance: Chance;
}

export interface Prediction {
  mode: 'marks' | 'rank';
  year: number;
  category: string;
  marks?: number;
  air: { point: number; lo: number; hi: number };
  percentile: number;
  categoryRank: number | null;
  matchedOn: number;
  counts: Record<Chance, number>;
  total: number;
  matches: PredictMatch[];
  note?: string;
}

export interface PredictorMeta {
  totalMarks: number;
  years: number[];
  categories: string[];
  courses: string[];
  quotas: string[];
  rounds: number[];
  states: string[];
}

export interface PredictInput {
  marks?: number;
  rank?: number;
  category: string;
  year?: number;
  course?: string;
  quota?: string;
  round?: number;
  state?: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/predict${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.success) {
    throw new Error(body?.message || `Prediction failed (${res.status})`);
  }
  return body.data as T;
}

export const predict = (input: PredictInput) =>
  call<Prediction>('', { method: 'POST', body: JSON.stringify(input) });

/** The dropdown values, straight from the data — so the form can only offer real options. */
export function usePredictorMeta() {
  const [meta, setMeta] = useState<PredictorMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    call<PredictorMeta>('/meta')
      .then((m) => alive && setMeta(m))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  return { meta, error, loading: !meta && !error };
}

export const CHANCE_STYLE: Record<Chance, { label: string; dot: string; chip: string; blurb: string }> = {
  Safe: {
    label: 'Safe',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    blurb: 'Closed well below your rank — you would very likely get a seat.',
  },
  Good: {
    label: 'Good',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    blurb: 'Closed comfortably below your rank. A strong, realistic choice.',
  },
  Reach: {
    label: 'Reach',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    blurb: 'Closed right around your rank. Worth filling, but do not count on it.',
  },
  Tough: {
    label: 'Tough',
    dot: 'bg-green-500',
    chip: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
    blurb: 'Closed above your rank last year. Only if the cutoff loosens.',
  },
};
