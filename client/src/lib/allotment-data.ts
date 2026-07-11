import { useCollection, distinct } from './data-api';

/**
 * Seat allotments — admin-managed, read from the API.
 *
 * WHAT THIS FILE USED TO BE: a seeded pseudo-random number generator. It did not
 * hold allotment data; it FABRICATED rows at runtime (`seededRandom` +
 * `generateAllotments`), inventing ranks, scores, categories and institute
 * assignments that a student would reasonably have read as real published data.
 *
 * The generator is deleted. Allotments are now a real collection loaded by an
 * admin (/admin/data/allotments, CSV import). Until real rows exist, the pages
 * show an honest empty state instead of invented numbers.
 */

export interface AllotmentEntry {
  id: string;
  counselling: string;
  round: number;
  collegeId?: string;
  instituteName: string;
  state: string;
  allIndiaRank: number;
  stateRank?: number | null;
  neetScore?: number;
  category: string;
  subcategory?: string;
  seatType: 'Government' | 'Private' | 'Deemed';
  course: string;
}

export interface AllotmentFilterOptions {
  rounds: number[];
  categories: string[];
  seatTypes: string[];
  courses: string[];
}

/**
 * All allotment rows, plus filter options derived from what is actually loaded —
 * so a counselling/category an admin adds shows up in the filters with no code
 * change, and one with no rows does not appear at all.
 */
export function useAllotments() {
  const { data, loading, error, reload } = useCollection<AllotmentEntry>('allotments');

  const counsellings = distinct(data, 'counselling');
  const states = distinct(data, 'state');

  const filterOptions: AllotmentFilterOptions = {
    rounds: [...new Set(data.map((a) => a.round))].filter((r) => Number.isFinite(r)).sort((a, b) => a - b),
    categories: distinct(data, 'category'),
    seatTypes: distinct(data, 'seatType'),
    courses: distinct(data, 'course'),
  };

  return { data, loading, error, reload, counsellings, states, filterOptions };
}

export function forCounselling(rows: AllotmentEntry[], counselling: string): AllotmentEntry[] {
  return rows
    .filter((r) => r.counselling === counselling)
    .sort((a, b) => a.allIndiaRank - b.allIndiaRank);
}

export function byRankRange(rows: AllotmentEntry[], minRank: number, maxRank: number): AllotmentEntry[] {
  return rows
    .filter((r) => r.allIndiaRank >= minRank && r.allIndiaRank <= maxRank)
    .sort((a, b) => a.allIndiaRank - b.allIndiaRank);
}
