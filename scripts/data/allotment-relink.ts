/**
 * HAND-VERIFIED allotment institute-name → collegeId links.
 *
 * Produced by reviewing `npx tsx scripts/relink-allotments-candidates.ts --min-rows 300` by hand.
 * Every pair below was checked on all four axes the automated matcher cannot safely judge:
 * name expansion, CITY, kind (medical vs dental), and absence of a duplicate-college tie.
 *
 * This table is deliberately SHORT. The 57k unlinked rows are the residue the automated matcher
 * already declined, and the candidate report shows why thresholding them is unsafe — the
 * top-scoring candidate is outright wrong in several cases:
 *
 *   "Dr. DY Patil Dental College and Hosp. Navi Mumbai" scored 1.00 against
 *       Government Dental College and Hospital, MUMBAI          (wrong institution entirely)
 *       — the correct one, DY Patil School of Dentistry Navi Mumbai, scored only 0.81.
 *   "Sri Ramachandra Med. College and Res. Inst., Chennai" scored 0.85 against
 *       Government Medical College, RAMANATHAPURAM             (wrong city, wrong sector)
 *
 * DELIBERATELY EXCLUDED — do not "fix" these by adding them:
 *   Dr. DY Patil Pune, IMS BHU, JNMC Belagavi/Belgaum, Sri Siddhartha T-Begur
 *     → each matches 2-3 of OUR OWN duplicate college docs equally well. Picking one splits that
 *       college's cutoffs across the cluster. The duplicate cluster has to be resolved first.
 *   Raja Rajeswari (Bengaluru), B.L.D.E University (Bijapur), Faculty of Dentistry Jamia Millia,
 *   Maulana Azad Institute of Dental Sciences
 *     → NO candidate in that state at any score. These are a COLLEGES gap, not a matching gap:
 *       the institution is absent from `colleges` entirely and must be added before it can link.
 */
export type RelinkPair = {
  /** Exact `allotments.instituteName` value. Matched literally — never fuzzily. */
  instituteName: string;
  collegeId: string;
  /** Why this pair is safe. Kept in-code so a future reader can re-check the reasoning. */
  why: string;
};

export const RELINK: RelinkPair[] = [
  {
    instituteName: 'SBKS Med. Inst. and Res. Centre, Sumandeep Vidyapeeth',
    collegeId: '6a550a1dc4a52ebb2122e9a0',
    why: 'SBKS = Smt. B. K. Shah. Sole Gujarat candidate, same Sumandeep Vidyapeeth deemed university.',
  },
  {
    instituteName: 'K.S Hegde Medical Academy, Mangaluru',
    collegeId: '6a550a1dc4a52ebb2122e97e',
    why: 'Exact name, city Mangaluru = Mangalore, no rival candidate above 0.67.',
  },
  {
    instituteName: 'Sri Ramachandra Med. College and Res. Inst., Chennai',
    collegeId: '6a52cf0aa5e47faff144ca9a',
    why: 'SRIHER is Sri Ramachandra, Chennai. City confirms; the 0.85 rival is a GMC in Ramanathapuram.',
  },
  {
    instituteName: 'BHAARATH MEDICAL COLLEGE AND HOSPITAL',
    collegeId: '6a550a1dc4a52ebb2122e956',
    why: 'Exact 1.00 name match, Chennai deemed. Rival "Bhaarat" (one a) is a duplicate doc with no city.',
  },
  {
    instituteName: 'Jawaharlal Nehru Medical College, AMU',
    collegeId: '6a61b3d69ca58bcb33fe94a1',
    why: 'AMU is Aligarh Muslim University; JNMC AMU is in Aligarh. Sole UP candidate. Gains cutoffs.',
  },
  {
    instituteName: 'SDU Medical College, Kolar',
    collegeId: '6a55cca1fc69feb1f0b8f410',
    why: 'SDU = Sri Devaraj Urs. City Kolar matches; the rival Sambharam is a different Kolar college.',
  },
  {
    instituteName: 'BV Deemed Uni. Med. College and Hos., Sangli',
    collegeId: '6a550a1dc4a52ebb2122ea79',
    why: 'BV = Bharati Vidyapeeth, Sangli deemed. Rival Prakash IMS is a different Sangli institution.',
  },
  {
    instituteName: 'ESIC Medical College, Gulbarga',
    collegeId: '6a55cca1fc69feb1f0b8f3be',
    why: 'Expands to Employees State Insurance Corporation MC, Gulbarga — exact city. Not ESIC Bangalore.',
  },
  {
    instituteName: 'Dr. DY Patil Dental College and Hosp. Navi Mumbai',
    collegeId: '6a550a1dc4a52ebb2122e81d',
    why: 'DENTAL + city Navi Mumbai. Hand-picked over the 1.00 top score, which was a Mumbai GDC.',
  },
];
