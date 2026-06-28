import type { College } from '@/services/cutoff.service';

export interface InsightEntry {
  id: string;
  collegeId: string;
  college: College;
  year: number;
  round: number;
  course: string;
  category: string;
  quota: string;
  closingRank: number;
  closingScore: number | null;
}

export interface HistoricalPoint {
  year: number;
  round: number;
  closingRank: number;
  closingScore: number | null;
}

const colleges: Record<string, College> = {
  aiims: {
    id: 'col-aiims',
    name: 'AIIMS, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    totalSeats: 125,
    website: 'https://www.aiims.edu',
    isActive: true,
  },
  mamc: {
    id: 'col-mamc',
    name: 'Maulana Azad Medical College (MAMC), New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    totalSeats: 250,
    website: 'https://mamc.delhi.gov.in',
    isActive: true,
  },
  grant: {
    id: 'col-grant',
    name: 'Grant Medical College & Sir JJ Hospital, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  bmcri: {
    id: 'col-bmcri',
    name: 'Bangalore Medical College (BMCRI)',
    state: 'Karnataka',
    city: 'Bengaluru',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  kmc: {
    id: 'col-kmc',
    name: 'Kasturba Medical College (KMC), Manipal',
    state: 'Karnataka',
    city: 'Manipal',
    type: 'Deemed',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  cmc: {
    id: 'col-cmc',
    name: 'Christian Medical College (CMC), Vellore',
    state: 'Tamil Nadu',
    city: 'Vellore',
    type: 'Private',
    totalSeats: 100,
    website: null,
    isActive: true,
  },
  afmc: {
    id: 'col-afmc',
    name: 'Armed Forces Medical College (AFMC), Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Government',
    totalSeats: 150,
    website: null,
    isActive: true,
  },
  jipmer: {
    id: 'col-jipmer',
    name: 'JIPMER, Puducherry',
    state: 'Puducherry',
    city: 'Puducherry',
    type: 'Government',
    totalSeats: 200,
    website: null,
    isActive: true,
  },
  seth: {
    id: 'col-seth',
    name: 'Seth GS Medical College & KEM Hospital, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Government',
    totalSeats: 200,
    website: null,
    isActive: true,
  },
  stanley: {
    id: 'col-stanley',
    name: 'Stanley Medical College, Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
};

// Helper to build entries for a college across years/rounds
function makeEntries(
  key: string,
  course: string,
  category: string,
  quota: string,
  data: { year: number; round: number; rank: number; score: number | null }[]
): InsightEntry[] {
  return data.map((d, i) => ({
    id: `${key}-${course}-${category}-${quota}-${d.year}-R${d.round}-${i}`.replace(/\s/g, ''),
    collegeId: colleges[key].id,
    college: colleges[key],
    year: d.year,
    round: d.round,
    course,
    category,
    quota,
    closingRank: d.rank,
    closingScore: d.score,
  }));
}

export const INSIGHTS_DATA: InsightEntry[] = [
  // AIIMS - General - AIQ
  ...makeEntries('aiims', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 68, score: 710 },
    { year: 2023, round: 2, rank: 72, score: 708 },
    { year: 2024, round: 1, rank: 62, score: 712 },
    { year: 2024, round: 2, rank: 65, score: 711 },
    { year: 2025, round: 1, rank: 57, score: 715 },
    { year: 2025, round: 2, rank: 60, score: 714 },
  ]),
  // AIIMS - OBC - AIQ
  ...makeEntries('aiims', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 520, score: 680 },
    { year: 2024, round: 1, rank: 485, score: 683 },
    { year: 2025, round: 1, rank: 450, score: 686 },
  ]),
  // AIIMS - SC - AIQ
  ...makeEntries('aiims', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 3200, score: 620 },
    { year: 2024, round: 1, rank: 2950, score: 625 },
    { year: 2025, round: 1, rank: 2700, score: 630 },
  ]),

  // MAMC - General - Delhi State
  ...makeEntries('mamc', 'MBBS', 'General', 'Delhi State Quota', [
    { year: 2023, round: 1, rank: 95, score: 706 },
    { year: 2023, round: 2, rank: 110, score: 703 },
    { year: 2024, round: 1, rank: 90, score: 708 },
    { year: 2024, round: 2, rank: 100, score: 706 },
    { year: 2025, round: 1, rank: 85, score: 710 },
    { year: 2025, round: 2, rank: 92, score: 708 },
  ]),
  // MAMC - OBC - Delhi State
  ...makeEntries('mamc', 'MBBS', 'OBC', 'Delhi State Quota', [
    { year: 2023, round: 1, rank: 1400, score: 665 },
    { year: 2024, round: 1, rank: 1300, score: 668 },
    { year: 2025, round: 1, rank: 1200, score: 672 },
  ]),
  // MAMC - General - AIQ
  ...makeEntries('mamc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 120, score: 702 },
    { year: 2024, round: 1, rank: 108, score: 705 },
    { year: 2025, round: 1, rank: 98, score: 708 },
  ]),

  // Grant - General - Maharashtra State
  ...makeEntries('grant', 'MBBS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 2200, score: 678 },
    { year: 2023, round: 2, rank: 2500, score: 674 },
    { year: 2024, round: 1, rank: 2050, score: 680 },
    { year: 2024, round: 2, rank: 2300, score: 677 },
    { year: 2025, round: 1, rank: 1900, score: 683 },
    { year: 2025, round: 2, rank: 2150, score: 680 },
  ]),
  // Grant - OBC - Maharashtra State
  ...makeEntries('grant', 'MBBS', 'OBC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 5800, score: 648 },
    { year: 2024, round: 1, rank: 5400, score: 652 },
    { year: 2025, round: 1, rank: 5100, score: 655 },
  ]),
  // Grant - BDS
  ...makeEntries('grant', 'BDS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 18000, score: 600 },
    { year: 2024, round: 1, rank: 16500, score: 608 },
    { year: 2025, round: 1, rank: 15420, score: 615 },
  ]),

  // BMCRI - General - Karnataka State
  ...makeEntries('bmcri', 'MBBS', 'General', 'Karnataka State Quota', [
    { year: 2023, round: 1, rank: 1200, score: 688 },
    { year: 2023, round: 2, rank: 1350, score: 685 },
    { year: 2024, round: 1, rank: 1050, score: 692 },
    { year: 2024, round: 2, rank: 1180, score: 689 },
    { year: 2025, round: 1, rank: 945, score: 695 },
    { year: 2025, round: 2, rank: 1080, score: 692 },
  ]),
  // BMCRI - OBC
  ...makeEntries('bmcri', 'MBBS', 'OBC', 'Karnataka State Quota', [
    { year: 2023, round: 1, rank: 4500, score: 655 },
    { year: 2024, round: 1, rank: 4200, score: 658 },
    { year: 2025, round: 1, rank: 3900, score: 662 },
  ]),

  // KMC Manipal - General - Management
  ...makeEntries('kmc', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 48000, score: 548 },
    { year: 2024, round: 1, rank: 45000, score: 555 },
    { year: 2025, round: 1, rank: 42150, score: 565 },
  ]),
  // KMC Manipal - General - AIQ
  ...makeEntries('kmc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 12000, score: 638 },
    { year: 2024, round: 1, rank: 11200, score: 642 },
    { year: 2025, round: 1, rank: 10500, score: 648 },
  ]),

  // CMC Vellore - General - Management
  ...makeEntries('cmc', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 6200, score: 652 },
    { year: 2024, round: 1, rank: 5800, score: 657 },
    { year: 2025, round: 1, rank: 5410, score: 662 },
  ]),
  // CMC Vellore - SC
  ...makeEntries('cmc', 'MBBS', 'SC', 'Management Quota', [
    { year: 2023, round: 1, rank: 28000, score: 575 },
    { year: 2024, round: 1, rank: 26000, score: 580 },
    { year: 2025, round: 1, rank: 24000, score: 586 },
  ]),

  // AFMC - General - AIQ
  ...makeEntries('afmc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 850, score: 692 },
    { year: 2024, round: 1, rank: 780, score: 695 },
    { year: 2025, round: 1, rank: 720, score: 698 },
  ]),
  // AFMC - OBC
  ...makeEntries('afmc', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 3800, score: 640 },
    { year: 2024, round: 1, rank: 3500, score: 645 },
    { year: 2025, round: 1, rank: 3200, score: 650 },
  ]),

  // JIPMER - General - AIQ
  ...makeEntries('jipmer', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 250, score: 700 },
    { year: 2023, round: 2, rank: 280, score: 698 },
    { year: 2024, round: 1, rank: 230, score: 702 },
    { year: 2024, round: 2, rank: 260, score: 700 },
    { year: 2025, round: 1, rank: 210, score: 705 },
    { year: 2025, round: 2, rank: 240, score: 703 },
  ]),
  // JIPMER - OBC
  ...makeEntries('jipmer', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 2800, score: 635 },
    { year: 2024, round: 1, rank: 2600, score: 640 },
    { year: 2025, round: 1, rank: 2400, score: 645 },
  ]),

  // Seth GS / KEM - General - Maharashtra
  ...makeEntries('seth', 'MBBS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 800, score: 694 },
    { year: 2023, round: 2, rank: 900, score: 691 },
    { year: 2024, round: 1, rank: 720, score: 697 },
    { year: 2024, round: 2, rank: 830, score: 694 },
    { year: 2025, round: 1, rank: 650, score: 700 },
    { year: 2025, round: 2, rank: 750, score: 697 },
  ]),
  // Seth GS - OBC
  ...makeEntries('seth', 'MBBS', 'OBC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 3800, score: 645 },
    { year: 2024, round: 1, rank: 3500, score: 650 },
    { year: 2025, round: 1, rank: 3200, score: 654 },
  ]),

  // Stanley - General - Tamil Nadu
  ...makeEntries('stanley', 'MBBS', 'General', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 3500, score: 650 },
    { year: 2024, round: 1, rank: 3200, score: 655 },
    { year: 2025, round: 1, rank: 2950, score: 660 },
  ]),
  // Stanley - OBC
  ...makeEntries('stanley', 'MBBS', 'OBC', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 8500, score: 620 },
    { year: 2024, round: 1, rank: 8000, score: 625 },
    { year: 2025, round: 1, rank: 7500, score: 630 },
  ]),
];

// Derive filter options from mock data
export const INSIGHT_FILTER_OPTIONS = {
  states: [...new Set(INSIGHTS_DATA.map((e) => e.college.state))].sort(),
  colleges: [...new Set(INSIGHTS_DATA.map((e) => e.college.name))].sort(),
  courses: [...new Set(INSIGHTS_DATA.map((e) => e.course))].sort(),
  categories: [...new Set(INSIGHTS_DATA.map((e) => e.category))].sort(),
  quotas: [...new Set(INSIGHTS_DATA.map((e) => e.quota))].sort(),
  rounds: [...new Set(INSIGHTS_DATA.map((e) => e.round))].sort(),
};

// Get historical data for a specific college+course+category+quota combo
export function getHistoricalData(
  collegeId: string,
  course: string,
  category: string,
  quota: string
): HistoricalPoint[] {
  return INSIGHTS_DATA
    .filter(
      (e) =>
        e.collegeId === collegeId &&
        e.course === course &&
        e.category === category &&
        e.quota === quota
    )
    .map((e) => ({
      year: e.year,
      round: e.round,
      closingRank: e.closingRank,
      closingScore: e.closingScore,
    }))
    .sort((a, b) => a.year - b.year || a.round - b.round);
}

// Get the latest (most recent year, round 1) entry per college+course+category+quota
export function getLatestEntries(): InsightEntry[] {
  const grouped = new Map<string, InsightEntry>();
  for (const entry of INSIGHTS_DATA) {
    const key = `${entry.collegeId}|${entry.course}|${entry.category}|${entry.quota}`;
    const existing = grouped.get(key);
    if (
      !existing ||
      entry.year > existing.year ||
      (entry.year === existing.year && entry.round > existing.round)
    ) {
      grouped.set(key, entry);
    }
  }
  return [...grouped.values()];
}
