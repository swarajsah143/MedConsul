/**
 * College enrichment data — sourced from the internet, applied by scripts/enrich-colleges.ts.
 *
 * Photos
 * ──────
 *  • REAL_PHOTOS  — real campus photos hosted on Wikimedia Commons, keyed by the college's
 *    MongoDB id. Resolved from the Wikipedia/Commons API (see the fetch scripts that produced
 *    this list). These are genuine photographs of the named institution.
 *  • STOCK_PHOTOS — a small pool of real medical-campus photographs (also Wikimedia Commons)
 *    used as a generic cover for every college that has no dedicated photo. These are NOT the
 *    actual building of the college they end up on — they are representative stock, assigned
 *    deterministically by id so the choice is stable across re-imports.
 *
 * Fees & courses  (CURATED_FEES)
 * ──────────────────────────────
 *  Real, sourced fee figures for a curated set of flagship colleges. Government figures are the
 *  well-known state/central MBBS tuition; private/deemed figures were taken from 2025 fee pages
 *  (KMC Manipal, St John's, CMC Vellore, KIMS — see the PR notes / chat sources).
 *
 *  ⚠️  These are INDICATIVE, last-known figures for display and comparison — NOT a substitute
 *  for the official fee notification a student must check before paying. Fees change yearly and
 *  vary by quota. We deliberately do NOT fabricate fees for the ~790 non-curated colleges.
 *
 *  Each fee row's `course` is always an NEET-UG course (the app's fees enum is UG-only:
 *  MBBS/BDS/BAMS/...), so these populate the "Fee & Seat Matrix" the counselling pages read.
 */

export interface FeeRow {
  course?: string;      // defaults to 'MBBS'
  category: string;     // General | OBC | SC | ST | EWS | PwD
  quota: string;        // free text, e.g. 'Maharashtra State Quota', 'Management Quota', 'NRI Quota'
  tuitionFee: number;   // ₹ per year (annual tuition)
  totalFirstYear?: number;
  hostelFee?: number;
  note?: string;
}

export interface CuratedCollege {
  id: string;
  name: string;         // for readability only; matching is by id
  annualFees: string;   // short display string shown on the college card / Quick Info
  courses?: string[];   // optional coursesOffered override (UG only)
  fees: FeeRow[];
}

/** Real Wikimedia Commons campus photos, keyed by college id. */
export const REAL_PHOTOS: Record<string, string> = {
  '6a5a7d6074ae724c3a61e61c': 'https://upload.wikimedia.org/wikipedia/commons/1/1a/AFMC_Main_Building.jpg',
  '6a5a7d6074ae724c3a61e669': 'https://upload.wikimedia.org/wikipedia/commons/3/3b/CMCH_Vellore.JPG',
  '6a5a7d6074ae724c3a61e5f9': 'https://upload.wikimedia.org/wikipedia/commons/c/cd/AIIMS_-New_Delhi%27s_Ward_Block.jpg',
  '6a5a7d6174ae724c3a61e7a0': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/JIPMER.jpg',
  '6a5a7d6174ae724c3a61e817': 'https://upload.wikimedia.org/wikipedia/commons/d/da/Maulana_Azad_Medical_College.jpg',
  '6a5a7d6174ae724c3a61e7f0': 'https://upload.wikimedia.org/wikipedia/commons/d/da/Mmc-new.jpg',
  '6a5a7d6074ae724c3a61e643': 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Bangalore_Medical_College_and_Research_Institute.jpg',
  '6a5a7d6174ae724c3a61e7df': 'https://upload.wikimedia.org/wikipedia/commons/2/22/LHMC.jpg',
  '6a5a7d6174ae724c3a61e842': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Osmania_Medical_College_Image.jpg',
  '6a5a7d6074ae724c3a61e73f': 'https://upload.wikimedia.org/wikipedia/commons/d/df/Nagpur_Government_Medical_College_and_Hospital.jpg',
  '6a5a7d6074ae724c3a61e63b': 'https://upload.wikimedia.org/wikipedia/en/2/21/Institute_Of_Medical_Sciences_BHU.jpg',
  '6a5a7d6074ae724c3a61e5ee': 'https://upload.wikimedia.org/wikipedia/commons/a/ad/AIIMS_Bhubaneswar%2C_Odisha.jpg',
};

/** Generic medical-campus stock photos (Wikimedia Commons) for colleges without a dedicated shot. */
export const STOCK_PHOTOS: string[] = [
  'https://upload.wikimedia.org/wikipedia/commons/f/f1/Building_in_Government_Medical_College%2C_Kollam.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/1/1a/Main_building_of_Osmania_Medical_College.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/7/7f/Facade_of_the_outpatient_building_at_Government_E._N._T._Hospital.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/d/df/Nagpur_Government_Medical_College_and_Hospital.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/c/c7/Calcutta_Medical_College_and_Hospital_building_and_campus_04.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/1/10/Calcutta_Medical_College_and_Hospital_building_and_campus_09.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/4/42/Calcutta_Medical_College_and_Hospital_building_and_campus_13.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/0/04/Calcutta_Medical_College_and_Hospital_building_and_campus_17.jpg',
];

/** The caption used on stock-photo galleries, so the UI never implies it is the real building. */
export const STOCK_CAPTION = 'Representative medical-campus photo (not the actual college)';

// ── Curated, sourced fees for flagship colleges ──────────────────────────────
// Government MBBS tuition (₹/yr) is the well-known state/central figure. Private/deemed rows
// are from 2025 fee pages. quota strings describe the seat pool the figure applies to.

const G = 'General';

export const CURATED_FEES: CuratedCollege[] = [
  // ── Central / All-India government (very low tuition) ──
  { id: '6a5a7d6074ae724c3a61e5f9', name: 'AIIMS New Delhi', annualFees: '≈ ₹1,628 / year',
    fees: [{ category: G, quota: 'All India Quota (INI)', tuitionFee: 1628, note: 'Includes annual charges; hostel extra.' }] },
  { id: '6a5a7d6074ae724c3a61e5ee', name: 'AIIMS Bhubaneswar', annualFees: '≈ ₹1,628 / year',
    fees: [{ category: G, quota: 'All India Quota (INI)', tuitionFee: 1628 }] },
  { id: '6a5a7d6174ae724c3a61e7a0', name: 'JIPMER Puducherry', annualFees: '≈ ₹1,150 / year',
    fees: [{ category: G, quota: 'All India Quota (INI)', tuitionFee: 1150 }] },
  { id: '6a5a7d6074ae724c3a61e61c', name: 'AFMC Pune', annualFees: 'No tuition — funded, bonded service',
    fees: [{ category: G, quota: 'All India (AFMC merit)', tuitionFee: 0, note: 'Fully funded; cadets serve a bond.' }] },
  { id: '6a5a7d6074ae724c3a61e63b', name: 'IMS BHU, Varanasi', annualFees: '≈ ₹13,000 / year',
    fees: [{ category: G, quota: 'All India Quota (AIQ)', tuitionFee: 13000 }] },

  // ── Delhi government (very low) ──
  { id: '6a5a7d6174ae724c3a61e817', name: 'Maulana Azad Medical College', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Delhi State / AIQ', tuitionFee: 10000 }] },
  { id: '6a5a7d6174ae724c3a61e7df', name: 'Lady Hardinge Medical College', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Delhi State / AIQ', tuitionFee: 10000 }] },
  { id: '6a5a7d6174ae724c3a61e908', name: 'University College of Medical Sciences', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Delhi State / AIQ', tuitionFee: 10000 }] },
  { id: '6a5a7d6174ae724c3a61e90c', name: 'VMMC & Safdarjung Hospital', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Delhi State / AIQ', tuitionFee: 10000 }] },

  // ── Maharashtra government ──
  { id: '6a5a7d6174ae724c3a61e77e', name: 'Grant Medical College & JJ Hospital, Mumbai', annualFees: '≈ ₹1.13 L / year',
    fees: [{ category: G, quota: 'Maharashtra State Quota', tuitionFee: 113000 }] },
  { id: '6a5a7d6174ae724c3a61e8a1', name: 'Seth GS Medical College & KEM Hospital, Mumbai', annualFees: '≈ ₹1.13 L / year',
    fees: [{ category: G, quota: 'Maharashtra State Quota', tuitionFee: 113000 }] },
  { id: '6a5a7d6174ae724c3a61e902', name: 'Topiwala National (Nair) Medical College, Mumbai', annualFees: '≈ ₹1.13 L / year',
    fees: [{ category: G, quota: 'Maharashtra State Quota', tuitionFee: 113000 }] },
  { id: '6a5a7d6074ae724c3a61e656', name: 'BJ Government Medical College (Sassoon), Pune', annualFees: '≈ ₹1.13 L / year',
    fees: [{ category: G, quota: 'Maharashtra State Quota', tuitionFee: 113000 }] },
  { id: '6a5a7d6074ae724c3a61e73f', name: 'Government Medical College, Nagpur', annualFees: '≈ ₹1.13 L / year',
    fees: [{ category: G, quota: 'Maharashtra State Quota', tuitionFee: 113000 }] },

  // ── South government ──
  { id: '6a5a7d6174ae724c3a61e7f0', name: 'Madras Medical College, Chennai', annualFees: '≈ ₹13,600 / year',
    fees: [{ category: G, quota: 'Tamil Nadu State Quota', tuitionFee: 13600 }] },
  { id: '6a5a7d6174ae724c3a61e8e3', name: 'Stanley Medical College, Chennai', annualFees: '≈ ₹13,600 / year',
    fees: [{ category: G, quota: 'Tamil Nadu State Quota', tuitionFee: 13600 }] },
  { id: '6a5a7d6074ae724c3a61e643', name: 'Bangalore Medical College (BMCRI)', annualFees: '≈ ₹1.10 L / year',
    fees: [{ category: G, quota: 'Karnataka State Quota (KEA)', tuitionFee: 110000 }] },
  { id: '6a5a7d6174ae724c3a61e842', name: 'Osmania Medical College, Hyderabad', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Telangana Convener Quota', tuitionFee: 10000 }] },
  { id: '6a5a7d6074ae724c3a61e6c3', name: 'Gandhi Medical College, Secunderabad', annualFees: '≈ ₹10,000 / year',
    fees: [{ category: G, quota: 'Telangana Convener Quota', tuitionFee: 10000 }] },

  // ── Other government ──
  { id: '6a5a7d6174ae724c3a61e7d4', name: "King George's Medical University, Lucknow", annualFees: '≈ ₹54,000 / year',
    fees: [{ category: G, quota: 'UP State Quota', tuitionFee: 54000 }] },
  { id: '6a5a7d6174ae724c3a61e81a', name: 'Medical College, Kolkata', annualFees: '≈ ₹9,000 / year',
    fees: [{ category: G, quota: 'West Bengal State Quota', tuitionFee: 9000 }] },
  { id: '6a5a7d6174ae724c3a61e881', name: 'RIMS Imphal', annualFees: '≈ ₹24,500 / year',
    fees: [{ category: G, quota: 'All India / State Quota', tuitionFee: 24500 }] },

  // ── Deemed / Private (sourced 2025 fee pages) ──
  { id: '6a5a7d6174ae724c3a61e7cf', name: 'Kasturba Medical College, Manipal', annualFees: '≈ ₹9.77 L / year tuition (₹17.8 L all-in)',
    fees: [
      { category: G, quota: 'Institute / Management Quota', tuitionFee: 977000, totalFirstYear: 1780000, note: 'Tuition ₹43.96 L over 4.5 yrs; all-in package much higher.' },
      { category: G, quota: 'NRI Quota', tuitionFee: 2600000, note: 'NRI first instalment ≈ US$37,100.' },
    ] },
  { id: '6a5a7d6174ae724c3a61e8e1', name: "St John's Medical College, Bangalore", annualFees: '≈ ₹7.30 L / year',
    fees: [{ category: G, quota: 'Karnataka (KEA) / Management', tuitionFee: 730000, totalFirstYear: 788000 }] },
  { id: '6a5a7d6074ae724c3a61e669', name: 'Christian Medical College, Vellore', annualFees: '₹3,000/yr tuition (merit) · ₹13.5 L (mgmt)',
    fees: [
      { category: G, quota: 'Merit (Sponsored/Non-sponsored)', tuitionFee: 3000, totalFirstYear: 84330, note: 'Famously low merit-quota tuition; other annual charges ≈ ₹48,345.' },
      { category: G, quota: 'Management / Minority Quota', tuitionFee: 1350000 },
    ] },
  { id: '6a5a7d6174ae724c3a61e7d2', name: 'Kempegowda Institute of Medical Sciences (KIMS), Bangalore', annualFees: '≈ ₹2.11 L (Govt) – ₹12.6 L (Mgmt) / year',
    fees: [
      { category: G, quota: 'Karnataka Govt Quota (KEA)', tuitionFee: 211000 },
      { category: G, quota: 'Management Quota', tuitionFee: 1258000 },
    ] },
];
