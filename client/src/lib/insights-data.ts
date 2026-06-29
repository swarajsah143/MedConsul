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
  kgmu: {
    id: 'col-kgmu',
    name: 'King George\'s Medical University (KGMU), Lucknow',
    state: 'Uttar Pradesh',
    city: 'Lucknow',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  mmc: {
    id: 'col-mmc',
    name: 'Madras Medical College (MMC), Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  lhmc: {
    id: 'col-lhmc',
    name: 'Lady Hardinge Medical College (LHMC), New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    totalSeats: 200,
    website: null,
    isActive: true,
  },
  gmch: {
    id: 'col-gmch',
    name: 'Govt. Medical College & Hospital, Chandigarh',
    state: 'Chandigarh',
    city: 'Chandigarh',
    type: 'Government',
    totalSeats: 150,
    website: null,
    isActive: true,
  },
  bjmc: {
    id: 'col-bjmc',
    name: 'B.J. Medical College, Ahmedabad',
    state: 'Gujarat',
    city: 'Ahmedabad',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  imsbhu: {
    id: 'col-imsbhu',
    name: 'Institute of Medical Sciences (IMS-BHU), Varanasi',
    state: 'Uttar Pradesh',
    city: 'Varanasi',
    type: 'Government',
    totalSeats: 120,
    website: null,
    isActive: true,
  },
  tmc: {
    id: 'col-tmc',
    name: 'Govt. Medical College, Thiruvananthapuram',
    state: 'Kerala',
    city: 'Thiruvananthapuram',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  sriher: {
    id: 'col-sriher',
    name: 'SRIHER (Sri Ramachandra), Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Deemed',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  sms: {
    id: 'col-sms',
    name: 'SMS Medical College, Jaipur',
    state: 'Rajasthan',
    city: 'Jaipur',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  dypatil: {
    id: 'col-dypatil',
    name: 'D.Y. Patil Medical College, Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Deemed',
    totalSeats: 200,
    website: null,
    isActive: true,
  },
  osmania: {
    id: 'col-osmania',
    name: 'Osmania Medical College, Hyderabad',
    state: 'Telangana',
    city: 'Hyderabad',
    type: 'Government',
    totalSeats: 250,
    website: null,
    isActive: true,
  },
  stjohns: {
    id: 'col-stjohns',
    name: 'St. John\'s Medical College, Bengaluru',
    state: 'Karnataka',
    city: 'Bengaluru',
    type: 'Private',
    totalSeats: 150,
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
  // ═══════════════ AIIMS, New Delhi ═══════════════
  ...makeEntries('aiims', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 68, score: 710 },
    { year: 2023, round: 2, rank: 72, score: 708 },
    { year: 2023, round: 3, rank: 75, score: 707 },
    { year: 2024, round: 1, rank: 62, score: 712 },
    { year: 2024, round: 2, rank: 65, score: 711 },
    { year: 2024, round: 3, rank: 68, score: 710 },
    { year: 2025, round: 1, rank: 57, score: 715 },
    { year: 2025, round: 2, rank: 60, score: 714 },
    { year: 2025, round: 3, rank: 62, score: 713 },
  ]),
  ...makeEntries('aiims', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 520, score: 680 },
    { year: 2023, round: 2, rank: 560, score: 677 },
    { year: 2024, round: 1, rank: 485, score: 683 },
    { year: 2024, round: 2, rank: 510, score: 681 },
    { year: 2025, round: 1, rank: 450, score: 686 },
    { year: 2025, round: 2, rank: 478, score: 684 },
  ]),
  ...makeEntries('aiims', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 3200, score: 620 },
    { year: 2024, round: 1, rank: 2950, score: 625 },
    { year: 2025, round: 1, rank: 2700, score: 630 },
  ]),
  ...makeEntries('aiims', 'MBBS', 'ST', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 8500, score: 585 },
    { year: 2024, round: 1, rank: 7800, score: 590 },
    { year: 2025, round: 1, rank: 7200, score: 595 },
  ]),
  ...makeEntries('aiims', 'MBBS', 'EWS', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 280, score: 695 },
    { year: 2024, round: 1, rank: 255, score: 698 },
    { year: 2025, round: 1, rank: 235, score: 700 },
  ]),

  // ═══════════════ MAMC, New Delhi ═══════════════
  ...makeEntries('mamc', 'MBBS', 'General', 'Delhi State Quota', [
    { year: 2023, round: 1, rank: 95, score: 706 },
    { year: 2023, round: 2, rank: 110, score: 703 },
    { year: 2024, round: 1, rank: 90, score: 708 },
    { year: 2024, round: 2, rank: 100, score: 706 },
    { year: 2025, round: 1, rank: 85, score: 710 },
    { year: 2025, round: 2, rank: 92, score: 708 },
  ]),
  ...makeEntries('mamc', 'MBBS', 'OBC', 'Delhi State Quota', [
    { year: 2023, round: 1, rank: 1400, score: 665 },
    { year: 2024, round: 1, rank: 1300, score: 668 },
    { year: 2025, round: 1, rank: 1200, score: 672 },
  ]),
  ...makeEntries('mamc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 120, score: 702 },
    { year: 2023, round: 2, rank: 135, score: 700 },
    { year: 2024, round: 1, rank: 108, score: 705 },
    { year: 2024, round: 2, rank: 118, score: 703 },
    { year: 2025, round: 1, rank: 98, score: 708 },
    { year: 2025, round: 2, rank: 105, score: 706 },
  ]),
  ...makeEntries('mamc', 'MBBS', 'SC', 'Delhi State Quota', [
    { year: 2023, round: 1, rank: 4800, score: 638 },
    { year: 2024, round: 1, rank: 4500, score: 642 },
    { year: 2025, round: 1, rank: 4200, score: 646 },
  ]),

  // ═══════════════ Grant Medical, Mumbai ═══════════════
  ...makeEntries('grant', 'MBBS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 2200, score: 678 },
    { year: 2023, round: 2, rank: 2500, score: 674 },
    { year: 2024, round: 1, rank: 2050, score: 680 },
    { year: 2024, round: 2, rank: 2300, score: 677 },
    { year: 2025, round: 1, rank: 1900, score: 683 },
    { year: 2025, round: 2, rank: 2150, score: 680 },
  ]),
  ...makeEntries('grant', 'MBBS', 'OBC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 5800, score: 648 },
    { year: 2024, round: 1, rank: 5400, score: 652 },
    { year: 2025, round: 1, rank: 5100, score: 655 },
  ]),
  ...makeEntries('grant', 'BDS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 18000, score: 600 },
    { year: 2024, round: 1, rank: 16500, score: 608 },
    { year: 2025, round: 1, rank: 15420, score: 615 },
  ]),
  ...makeEntries('grant', 'MBBS', 'SC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 12000, score: 612 },
    { year: 2024, round: 1, rank: 11200, score: 618 },
    { year: 2025, round: 1, rank: 10500, score: 622 },
  ]),

  // ═══════════════ BMCRI, Bengaluru ═══════════════
  ...makeEntries('bmcri', 'MBBS', 'General', 'Karnataka State Quota', [
    { year: 2023, round: 1, rank: 1200, score: 688 },
    { year: 2023, round: 2, rank: 1350, score: 685 },
    { year: 2024, round: 1, rank: 1050, score: 692 },
    { year: 2024, round: 2, rank: 1180, score: 689 },
    { year: 2025, round: 1, rank: 945, score: 695 },
    { year: 2025, round: 2, rank: 1080, score: 692 },
  ]),
  ...makeEntries('bmcri', 'MBBS', 'OBC', 'Karnataka State Quota', [
    { year: 2023, round: 1, rank: 4500, score: 655 },
    { year: 2024, round: 1, rank: 4200, score: 658 },
    { year: 2025, round: 1, rank: 3900, score: 662 },
  ]),
  ...makeEntries('bmcri', 'MBBS', 'SC', 'Karnataka State Quota', [
    { year: 2023, round: 1, rank: 15000, score: 598 },
    { year: 2024, round: 1, rank: 14000, score: 604 },
    { year: 2025, round: 1, rank: 13200, score: 608 },
  ]),

  // ═══════════════ KMC Manipal ═══════════════
  ...makeEntries('kmc', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 48000, score: 548 },
    { year: 2024, round: 1, rank: 45000, score: 555 },
    { year: 2025, round: 1, rank: 42150, score: 565 },
  ]),
  ...makeEntries('kmc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 12000, score: 638 },
    { year: 2023, round: 2, rank: 13500, score: 632 },
    { year: 2024, round: 1, rank: 11200, score: 642 },
    { year: 2024, round: 2, rank: 12400, score: 636 },
    { year: 2025, round: 1, rank: 10500, score: 648 },
    { year: 2025, round: 2, rank: 11600, score: 642 },
  ]),
  ...makeEntries('kmc', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 22000, score: 605 },
    { year: 2024, round: 1, rank: 20500, score: 610 },
    { year: 2025, round: 1, rank: 19200, score: 615 },
  ]),

  // ═══════════════ CMC Vellore ═══════════════
  ...makeEntries('cmc', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 6200, score: 652 },
    { year: 2024, round: 1, rank: 5800, score: 657 },
    { year: 2025, round: 1, rank: 5410, score: 662 },
  ]),
  ...makeEntries('cmc', 'MBBS', 'SC', 'Management Quota', [
    { year: 2023, round: 1, rank: 28000, score: 575 },
    { year: 2024, round: 1, rank: 26000, score: 580 },
    { year: 2025, round: 1, rank: 24000, score: 586 },
  ]),
  ...makeEntries('cmc', 'MBBS', 'OBC', 'Management Quota', [
    { year: 2023, round: 1, rank: 12500, score: 635 },
    { year: 2024, round: 1, rank: 11800, score: 640 },
    { year: 2025, round: 1, rank: 11200, score: 644 },
  ]),

  // ═══════════════ AFMC, Pune ═══════════════
  ...makeEntries('afmc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 850, score: 692 },
    { year: 2024, round: 1, rank: 780, score: 695 },
    { year: 2025, round: 1, rank: 720, score: 698 },
  ]),
  ...makeEntries('afmc', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 3800, score: 640 },
    { year: 2024, round: 1, rank: 3500, score: 645 },
    { year: 2025, round: 1, rank: 3200, score: 650 },
  ]),
  ...makeEntries('afmc', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 18000, score: 595 },
    { year: 2024, round: 1, rank: 16500, score: 600 },
    { year: 2025, round: 1, rank: 15200, score: 605 },
  ]),

  // ═══════════════ JIPMER, Puducherry ═══════════════
  ...makeEntries('jipmer', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 250, score: 700 },
    { year: 2023, round: 2, rank: 280, score: 698 },
    { year: 2024, round: 1, rank: 230, score: 702 },
    { year: 2024, round: 2, rank: 260, score: 700 },
    { year: 2025, round: 1, rank: 210, score: 705 },
    { year: 2025, round: 2, rank: 240, score: 703 },
  ]),
  ...makeEntries('jipmer', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 2800, score: 635 },
    { year: 2024, round: 1, rank: 2600, score: 640 },
    { year: 2025, round: 1, rank: 2400, score: 645 },
  ]),
  ...makeEntries('jipmer', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 9500, score: 578 },
    { year: 2024, round: 1, rank: 8800, score: 583 },
    { year: 2025, round: 1, rank: 8200, score: 588 },
  ]),

  // ═══════════════ Seth GS / KEM, Mumbai ═══════════════
  ...makeEntries('seth', 'MBBS', 'General', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 800, score: 694 },
    { year: 2023, round: 2, rank: 900, score: 691 },
    { year: 2024, round: 1, rank: 720, score: 697 },
    { year: 2024, round: 2, rank: 830, score: 694 },
    { year: 2025, round: 1, rank: 650, score: 700 },
    { year: 2025, round: 2, rank: 750, score: 697 },
  ]),
  ...makeEntries('seth', 'MBBS', 'OBC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 3800, score: 645 },
    { year: 2024, round: 1, rank: 3500, score: 650 },
    { year: 2025, round: 1, rank: 3200, score: 654 },
  ]),
  ...makeEntries('seth', 'MBBS', 'SC', 'Maharashtra State Quota', [
    { year: 2023, round: 1, rank: 10500, score: 618 },
    { year: 2024, round: 1, rank: 9800, score: 622 },
    { year: 2025, round: 1, rank: 9100, score: 627 },
  ]),

  // ═══════════════ Stanley, Chennai ═══════════════
  ...makeEntries('stanley', 'MBBS', 'General', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 3500, score: 650 },
    { year: 2023, round: 2, rank: 3800, score: 647 },
    { year: 2024, round: 1, rank: 3200, score: 655 },
    { year: 2024, round: 2, rank: 3500, score: 651 },
    { year: 2025, round: 1, rank: 2950, score: 660 },
    { year: 2025, round: 2, rank: 3200, score: 656 },
  ]),
  ...makeEntries('stanley', 'MBBS', 'OBC', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 8500, score: 620 },
    { year: 2024, round: 1, rank: 8000, score: 625 },
    { year: 2025, round: 1, rank: 7500, score: 630 },
  ]),

  // ═══════════════ KGMU, Lucknow ═══════════════
  ...makeEntries('kgmu', 'MBBS', 'General', 'UP State Quota', [
    { year: 2023, round: 1, rank: 2800, score: 672 },
    { year: 2023, round: 2, rank: 3200, score: 668 },
    { year: 2024, round: 1, rank: 2500, score: 676 },
    { year: 2024, round: 2, rank: 2900, score: 672 },
    { year: 2025, round: 1, rank: 2300, score: 680 },
    { year: 2025, round: 2, rank: 2650, score: 676 },
  ]),
  ...makeEntries('kgmu', 'MBBS', 'OBC', 'UP State Quota', [
    { year: 2023, round: 1, rank: 7200, score: 635 },
    { year: 2024, round: 1, rank: 6800, score: 640 },
    { year: 2025, round: 1, rank: 6400, score: 644 },
  ]),
  ...makeEntries('kgmu', 'MBBS', 'SC', 'UP State Quota', [
    { year: 2023, round: 1, rank: 22000, score: 588 },
    { year: 2024, round: 1, rank: 20500, score: 594 },
    { year: 2025, round: 1, rank: 19200, score: 598 },
  ]),
  ...makeEntries('kgmu', 'BDS', 'General', 'UP State Quota', [
    { year: 2023, round: 1, rank: 25000, score: 580 },
    { year: 2024, round: 1, rank: 23000, score: 586 },
    { year: 2025, round: 1, rank: 21500, score: 592 },
  ]),
  ...makeEntries('kgmu', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 3500, score: 660 },
    { year: 2024, round: 1, rank: 3200, score: 664 },
    { year: 2025, round: 1, rank: 2900, score: 668 },
  ]),

  // ═══════════════ MMC (Madras Medical College), Chennai ═══════════════
  ...makeEntries('mmc', 'MBBS', 'General', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 1500, score: 685 },
    { year: 2023, round: 2, rank: 1700, score: 682 },
    { year: 2024, round: 1, rank: 1350, score: 688 },
    { year: 2024, round: 2, rank: 1550, score: 685 },
    { year: 2025, round: 1, rank: 1200, score: 692 },
    { year: 2025, round: 2, rank: 1400, score: 688 },
  ]),
  ...makeEntries('mmc', 'MBBS', 'OBC', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 5500, score: 648 },
    { year: 2024, round: 1, rank: 5100, score: 652 },
    { year: 2025, round: 1, rank: 4800, score: 656 },
  ]),
  ...makeEntries('mmc', 'MBBS', 'SC', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 18000, score: 598 },
    { year: 2024, round: 1, rank: 16800, score: 604 },
    { year: 2025, round: 1, rank: 15800, score: 608 },
  ]),
  ...makeEntries('mmc', 'BDS', 'General', 'Tamil Nadu State Quota', [
    { year: 2023, round: 1, rank: 14000, score: 610 },
    { year: 2024, round: 1, rank: 12800, score: 616 },
    { year: 2025, round: 1, rank: 11900, score: 622 },
  ]),

  // ═══════════════ LHMC, New Delhi ═══════════════
  ...makeEntries('lhmc', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 160, score: 700 },
    { year: 2023, round: 2, rank: 185, score: 698 },
    { year: 2024, round: 1, rank: 145, score: 703 },
    { year: 2024, round: 2, rank: 170, score: 700 },
    { year: 2025, round: 1, rank: 130, score: 706 },
    { year: 2025, round: 2, rank: 155, score: 703 },
  ]),
  ...makeEntries('lhmc', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 1800, score: 660 },
    { year: 2024, round: 1, rank: 1650, score: 664 },
    { year: 2025, round: 1, rank: 1520, score: 668 },
  ]),
  ...makeEntries('lhmc', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 5500, score: 640 },
    { year: 2024, round: 1, rank: 5100, score: 645 },
    { year: 2025, round: 1, rank: 4700, score: 650 },
  ]),

  // ═══════════════ GMCH, Chandigarh ═══════════════
  ...makeEntries('gmch', 'MBBS', 'General', 'UT Chandigarh Quota', [
    { year: 2023, round: 1, rank: 4500, score: 652 },
    { year: 2023, round: 2, rank: 5000, score: 648 },
    { year: 2024, round: 1, rank: 4100, score: 656 },
    { year: 2024, round: 2, rank: 4600, score: 652 },
    { year: 2025, round: 1, rank: 3800, score: 660 },
    { year: 2025, round: 2, rank: 4200, score: 656 },
  ]),
  ...makeEntries('gmch', 'MBBS', 'OBC', 'UT Chandigarh Quota', [
    { year: 2023, round: 1, rank: 9800, score: 618 },
    { year: 2024, round: 1, rank: 9200, score: 622 },
    { year: 2025, round: 1, rank: 8600, score: 628 },
  ]),
  ...makeEntries('gmch', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 5200, score: 645 },
    { year: 2024, round: 1, rank: 4800, score: 650 },
    { year: 2025, round: 1, rank: 4500, score: 654 },
  ]),

  // ═══════════════ B.J. Medical College, Ahmedabad ═══════════════
  ...makeEntries('bjmc', 'MBBS', 'General', 'Gujarat State Quota', [
    { year: 2023, round: 1, rank: 3200, score: 665 },
    { year: 2023, round: 2, rank: 3600, score: 660 },
    { year: 2024, round: 1, rank: 2900, score: 670 },
    { year: 2024, round: 2, rank: 3300, score: 665 },
    { year: 2025, round: 1, rank: 2700, score: 674 },
    { year: 2025, round: 2, rank: 3050, score: 669 },
  ]),
  ...makeEntries('bjmc', 'MBBS', 'OBC', 'Gujarat State Quota', [
    { year: 2023, round: 1, rank: 8800, score: 622 },
    { year: 2024, round: 1, rank: 8200, score: 628 },
    { year: 2025, round: 1, rank: 7700, score: 632 },
  ]),
  ...makeEntries('bjmc', 'MBBS', 'SC', 'Gujarat State Quota', [
    { year: 2023, round: 1, rank: 25000, score: 572 },
    { year: 2024, round: 1, rank: 23500, score: 578 },
    { year: 2025, round: 1, rank: 22000, score: 584 },
  ]),

  // ═══════════════ IMS-BHU, Varanasi ═══════════════
  ...makeEntries('imsbhu', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 2200, score: 678 },
    { year: 2023, round: 2, rank: 2500, score: 674 },
    { year: 2024, round: 1, rank: 2000, score: 682 },
    { year: 2024, round: 2, rank: 2300, score: 677 },
    { year: 2025, round: 1, rank: 1850, score: 685 },
    { year: 2025, round: 2, rank: 2100, score: 681 },
  ]),
  ...makeEntries('imsbhu', 'MBBS', 'OBC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 6500, score: 638 },
    { year: 2024, round: 1, rank: 6000, score: 644 },
    { year: 2025, round: 1, rank: 5600, score: 648 },
  ]),
  ...makeEntries('imsbhu', 'BDS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 20000, score: 592 },
    { year: 2024, round: 1, rank: 18500, score: 598 },
    { year: 2025, round: 1, rank: 17200, score: 604 },
  ]),
  ...makeEntries('imsbhu', 'MBBS', 'SC', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 12500, score: 610 },
    { year: 2024, round: 1, rank: 11800, score: 615 },
    { year: 2025, round: 1, rank: 11000, score: 620 },
  ]),

  // ═══════════════ TMC, Thiruvananthapuram ═══════════════
  ...makeEntries('tmc', 'MBBS', 'General', 'Kerala State Quota', [
    { year: 2023, round: 1, rank: 6500, score: 645 },
    { year: 2023, round: 2, rank: 7200, score: 640 },
    { year: 2024, round: 1, rank: 6000, score: 650 },
    { year: 2024, round: 2, rank: 6700, score: 645 },
    { year: 2025, round: 1, rank: 5500, score: 655 },
    { year: 2025, round: 2, rank: 6200, score: 650 },
  ]),
  ...makeEntries('tmc', 'MBBS', 'OBC', 'Kerala State Quota', [
    { year: 2023, round: 1, rank: 14000, score: 608 },
    { year: 2024, round: 1, rank: 13200, score: 614 },
    { year: 2025, round: 1, rank: 12500, score: 618 },
  ]),

  // ═══════════════ SRIHER, Chennai ═══════════════
  ...makeEntries('sriher', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 62000, score: 520 },
    { year: 2024, round: 1, rank: 58000, score: 530 },
    { year: 2025, round: 1, rank: 55000, score: 538 },
  ]),
  ...makeEntries('sriher', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 22000, score: 600 },
    { year: 2024, round: 1, rank: 20500, score: 608 },
    { year: 2025, round: 1, rank: 19200, score: 614 },
  ]),
  ...makeEntries('sriher', 'BDS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 120000, score: 440 },
    { year: 2024, round: 1, rank: 115000, score: 448 },
    { year: 2025, round: 1, rank: 110000, score: 455 },
  ]),

  // ═══════════════ SMS Medical College, Jaipur ═══════════════
  ...makeEntries('sms', 'MBBS', 'General', 'Rajasthan State Quota', [
    { year: 2023, round: 1, rank: 4200, score: 650 },
    { year: 2023, round: 2, rank: 4800, score: 645 },
    { year: 2024, round: 1, rank: 3800, score: 656 },
    { year: 2024, round: 2, rank: 4400, score: 650 },
    { year: 2025, round: 1, rank: 3500, score: 660 },
    { year: 2025, round: 2, rank: 4000, score: 655 },
  ]),
  ...makeEntries('sms', 'MBBS', 'OBC', 'Rajasthan State Quota', [
    { year: 2023, round: 1, rank: 10500, score: 615 },
    { year: 2024, round: 1, rank: 9800, score: 620 },
    { year: 2025, round: 1, rank: 9200, score: 625 },
  ]),
  ...makeEntries('sms', 'MBBS', 'SC', 'Rajasthan State Quota', [
    { year: 2023, round: 1, rank: 30000, score: 565 },
    { year: 2024, round: 1, rank: 28000, score: 572 },
    { year: 2025, round: 1, rank: 26500, score: 578 },
  ]),
  ...makeEntries('sms', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 5500, score: 642 },
    { year: 2024, round: 1, rank: 5000, score: 648 },
    { year: 2025, round: 1, rank: 4600, score: 652 },
  ]),

  // ═══════════════ D.Y. Patil, Pune ═══════════════
  ...makeEntries('dypatil', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 72000, score: 510 },
    { year: 2024, round: 1, rank: 68000, score: 518 },
    { year: 2025, round: 1, rank: 65000, score: 525 },
  ]),
  ...makeEntries('dypatil', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 28000, score: 585 },
    { year: 2024, round: 1, rank: 26000, score: 592 },
    { year: 2025, round: 1, rank: 24500, score: 598 },
  ]),
  ...makeEntries('dypatil', 'BDS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 150000, score: 410 },
    { year: 2024, round: 1, rank: 142000, score: 418 },
    { year: 2025, round: 1, rank: 135000, score: 425 },
  ]),

  // ═══════════════ Osmania Medical College, Hyderabad ═══════════════
  ...makeEntries('osmania', 'MBBS', 'General', 'Telangana State Quota', [
    { year: 2023, round: 1, rank: 3000, score: 668 },
    { year: 2023, round: 2, rank: 3400, score: 663 },
    { year: 2024, round: 1, rank: 2750, score: 672 },
    { year: 2024, round: 2, rank: 3100, score: 668 },
    { year: 2025, round: 1, rank: 2500, score: 676 },
    { year: 2025, round: 2, rank: 2850, score: 672 },
  ]),
  ...makeEntries('osmania', 'MBBS', 'OBC', 'Telangana State Quota', [
    { year: 2023, round: 1, rank: 8200, score: 625 },
    { year: 2024, round: 1, rank: 7600, score: 630 },
    { year: 2025, round: 1, rank: 7100, score: 635 },
  ]),
  ...makeEntries('osmania', 'MBBS', 'SC', 'Telangana State Quota', [
    { year: 2023, round: 1, rank: 20000, score: 592 },
    { year: 2024, round: 1, rank: 18500, score: 598 },
    { year: 2025, round: 1, rank: 17200, score: 604 },
  ]),
  ...makeEntries('osmania', 'MBBS', 'General', 'All India Quota (AIQ)', [
    { year: 2023, round: 1, rank: 4200, score: 650 },
    { year: 2024, round: 1, rank: 3800, score: 656 },
    { year: 2025, round: 1, rank: 3500, score: 660 },
  ]),

  // ═══════════════ St. John's, Bengaluru ═══════════════
  ...makeEntries('stjohns', 'MBBS', 'General', 'Management Quota', [
    { year: 2023, round: 1, rank: 18000, score: 605 },
    { year: 2024, round: 1, rank: 16500, score: 612 },
    { year: 2025, round: 1, rank: 15200, score: 618 },
  ]),
  ...makeEntries('stjohns', 'MBBS', 'OBC', 'Management Quota', [
    { year: 2023, round: 1, rank: 32000, score: 570 },
    { year: 2024, round: 1, rank: 30000, score: 576 },
    { year: 2025, round: 1, rank: 28500, score: 582 },
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
