/**
 * Counselling Conditions content — the seed data.
 *
 * This used to live inline in counselling-conditions.tsx: ~600 lines of quota rules and
 * eligibility copy that no admin could edit. It now lives in MongoDB
 * (counsellingSections / counsellingQuotas); this file is only the SEED, read once by
 * scripts/migrate-counselling.ts. The page reads the database, not this file.
 *
 * Kept as plain TypeScript (no JSX, no path aliases) so the migration script can import
 * it directly under tsx.
 */

export type SectionKey = 'eligibility' | 'application' | 'domicile' | 'counselling' | 'quota';

export const ALL_INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];


export const SECTION_META: { key: SectionKey; label: string; blurb: string }[] = [
  { key: 'eligibility', label: 'Eligibility', blurb: 'Who can apply' },
  { key: 'application', label: 'Application', blurb: 'How to register' },
  { key: 'domicile', label: 'Domicile', blurb: 'Home-state rules' },
  { key: 'counselling', label: 'Counselling', blurb: 'Allotment flow' },
  { key: 'quota', label: 'Quota & Reservation', blurb: 'All quota types' },
];

export interface Block {
  heading: string;
  intro?: string;
  note?: string;
  items?: string[];
  ordered?: boolean;
}

export interface SectionContent {
  authority: string;
  blocks: Block[];
}

// ── Quota-specific detailed content ────────────────────────

export interface QuotaInfo {
  label: string;
  group: string; // for grouping in dropdown
  authority: string;
  blocks: Block[];
}

export const QUOTA_LIST: QuotaInfo[] = [
  {
    label: 'All India Quota (AIQ)',
    group: 'Central Quotas',
    authority: 'Managed by Medical Counselling Committee (MCC), DGHS, Ministry of Health & Family Welfare. 15% of seats in all state government medical/dental colleges + 100% seats in central institutions.',
    blocks: [
      {
        heading: 'Overview',
        intro: 'The All India Quota (AIQ) was introduced by the Supreme Court in 1986 to provide domicile-free, merit-based access to government medical college seats across India.',
        items: [
          '15% of total MBBS/BDS seats in every state government medical/dental college are surrendered to AIQ.',
          '100% seats in central institutions — AIIMS (all campuses), JIPMER, AFMC, ESIC colleges — are filled through MCC.',
          'No domicile, state, or residence requirement — open to all Indian citizens on NEET AIR merit.',
          'Counselling conducted online through mcc.nic.in in 4 rounds: Round 1, Round 2, Mop-up, and Stray Vacancy.',
        ],
      },
      {
        heading: 'Reservation Breakdown (Central Roster)',
        items: [
          'General (Unreserved) — ~40.5% of AIQ seats. Open merit, no reservation.',
          'OBC (Non-Creamy Layer) — 27% reservation. Central OBC list only (not state OBC list).',
          'Scheduled Castes (SC) — 15% reservation.',
          'Scheduled Tribes (ST) — 7.5% reservation.',
          'EWS (Economically Weaker Sections) — 10% reservation. Family income < Rs 8 LPA. Cannot be SC/ST/OBC.',
          'PwBD — 5% horizontal reservation across all categories. Min 40% disability.',
        ],
        note: 'OBC-NCL certificate must be from the central list and issued within the current financial year. State OBC certificates are NOT valid for AIQ.',
      },
      {
        heading: 'Security Deposit & Fees',
        items: [
          'Registration fee: Rs 1,000 (General/EWS), Rs 500 (SC/ST/PwBD) — non-refundable.',
          'Security deposit (Round 1): Rs 10,000 (refundable if no allotment).',
          'After allotment: Rs 1,00,000 security deposit for reporting.',
          'Forfeiture: Full deposit forfeited if candidate does not report after allotment.',
        ],
      },
      {
        heading: 'Documents Required',
        items: [
          'NEET UG Scorecard and Rank Letter',
          'Class 10th & 12th Marksheets and Certificates',
          'Aadhar Card / Government Photo ID',
          'Category certificate (SC/ST/OBC-NCL/EWS) if applicable — from central list',
          'PwBD certificate if applicable (from government medical board)',
          'Passport-size photographs (8-10 copies)',
        ],
      },
    ],
  },
  {
    label: 'State Quota (85%)',
    group: 'Central Quotas',
    authority: 'Managed by respective State Counselling Authorities (e.g., DME, CET Cell, KEA). 85% of seats in state government medical colleges are filled through state-level counselling.',
    blocks: [
      {
        heading: 'Overview',
        intro: '85% of seats in state government medical colleges are reserved for candidates with domicile of that state. Each state conducts its own separate counselling.',
        items: [
          'Domicile / residence certificate of the state is MANDATORY.',
          'Counselling conducted by the state authority — separate registration from MCC.',
          'Reservation percentages vary by state — each state has its own OBC/SC/ST/EWS breakdown.',
          'Candidates can participate in BOTH AIQ and state counselling simultaneously.',
          'If allotted in both, must choose one and surrender the other before the deadline.',
        ],
      },
      {
        heading: 'Typical State Reservation Pattern',
        intro: 'While each state has its own percentages, a common pattern is:',
        items: [
          'General / Open Category — 30-50% (varies significantly)',
          'OBC — 15-32% (state OBC list, NOT central)',
          'SC — 12-18%',
          'ST — 3-22% (higher in tribal-heavy states)',
          'EWS — 10% (implemented in most states post-2019)',
          'Additional: Some states have SEBC, VJ/NT, SBC, MBC and other sub-categories.',
        ],
        note: 'State OBC list differs from central OBC list. Always get the correct certificate for the quota you\'re applying under.',
      },
      {
        heading: 'Additional Documents for State Quota',
        items: [
          'Domicile / Residence Certificate (proving 10-15 years residence)',
          'State-specific category certificate (from state OBC/SC/ST list)',
          'Income certificate for EWS (state-issued)',
          'School/college study certificates proving education within the state',
        ],
      },
    ],
  },
  {
    label: 'OBC (Non-Creamy Layer)',
    group: 'Category Reservations',
    authority: 'OBC reservation is governed by the Mandal Commission recommendations, upheld by the Supreme Court in Indra Sawhney case (1992). OBC-NCL gets 27% reservation in AIQ and central institutions.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must belong to a caste/community listed in the Central OBC list (for AIQ) or State OBC list (for state quota).',
          'Family must NOT fall under the "Creamy Layer" — annual family income must be below Rs 8 Lakh per annum.',
          'OBC-NCL certificate must be issued within the current financial year (April 1 to March 31).',
          'Certificate must explicitly mention "Non-Creamy Layer" clause.',
        ],
        note: 'A central OBC certificate is different from a state OBC certificate. For AIQ, only the central list is valid. Many communities are in one list but not the other.',
      },
      {
        heading: 'Reservation Percentage',
        items: [
          'AIQ / Central Institutions — 27% of total seats reserved for OBC-NCL.',
          'State Quota — Varies by state (typically 15-32%).',
          'Deemed Universities (MCC) — 27% in the AIQ portion (50% of seats).',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'OBC Non-Creamy Layer Certificate in the prescribed format',
          'Certificate must be from a competent authority (Tehsildar / SDM / District Magistrate)',
          'Must be from the CENTRAL OBC list for AIQ (verify on ncbc.nic.in)',
          'Must be issued within the current financial year',
          'Self-declaration of income for Non-Creamy Layer status',
        ],
      },
    ],
  },
  {
    label: 'SC (Scheduled Caste)',
    group: 'Category Reservations',
    authority: 'SC reservation is a constitutional provision under Articles 15(4) and 16(4). SCs get 15% reservation in AIQ and central institutions.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must belong to a Scheduled Caste as notified by the President of India for the respective state/UT.',
          'There is NO income/creamy layer restriction for SC candidates.',
          'Caste certificate must be from a competent authority of the candidate\'s home state.',
          'SC candidates also get relaxation in qualifying marks: 40th percentile (vs 50th for General).',
        ],
      },
      {
        heading: 'Reservation Percentage',
        items: [
          'AIQ / Central Institutions — 15% of total seats.',
          'State Quota — Typically 15-18% (varies by state).',
          'SC-PwBD — 5% horizontal reservation within SC category for persons with disabilities.',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'Caste Certificate from Tehsildar / District Magistrate / SDM',
          'Certificate must clearly state the caste is listed in the Scheduled Caste list for the state',
          'No income certificate needed (unlike OBC-NCL)',
        ],
      },
    ],
  },
  {
    label: 'ST (Scheduled Tribe)',
    group: 'Category Reservations',
    authority: 'ST reservation is a constitutional provision. STs get 7.5% reservation in AIQ and central institutions.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must belong to a Scheduled Tribe as notified by the President of India for the respective state/UT.',
          'No income/creamy layer restriction for ST candidates.',
          'Tribe certificate from competent authority of the home state required.',
          'ST candidates get the same qualifying marks relaxation as SC: 40th percentile.',
        ],
      },
      {
        heading: 'Reservation Percentage',
        items: [
          'AIQ / Central Institutions — 7.5% of total seats.',
          'State Quota — Varies significantly: 3% in some states to 22%+ in tribal-heavy states (Jharkhand, Chhattisgarh, MP).',
          'ST-PwBD — 5% horizontal reservation within ST category.',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'Tribe Certificate from Tehsildar / District Magistrate / SDM',
          'Must clearly list the tribe in the state\'s Scheduled Tribe notification',
          'Some states require additional verification through Scrutiny Committees',
        ],
      },
    ],
  },
  {
    label: 'EWS (Economically Weaker)',
    group: 'Category Reservations',
    authority: 'EWS reservation was introduced by the 103rd Constitutional Amendment (2019). 10% reservation for economically weaker sections of General category.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must belong to the General (Unreserved) category — NOT SC, ST, or OBC.',
          'Gross annual family income must be below Rs 8 Lakh per annum.',
          'Family must NOT own agricultural land of 5 acres or more.',
          'Family must NOT own a residential flat of 1000 sq ft or more.',
          'Family must NOT own residential plot of 100 yards or more in notified municipalities / 200 yards in other areas.',
        ],
        note: 'EWS is ONLY for General category candidates. If you are SC/ST/OBC, you should apply under your respective category, not EWS.',
      },
      {
        heading: 'Reservation Percentage',
        items: [
          'AIQ / Central Institutions — 10% of total seats.',
          'State Quota — 10% in most states (some states are still implementing).',
          'EWS-PwBD — 5% horizontal reservation within EWS for persons with disabilities.',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'EWS Certificate issued by the District Magistrate / SDM / Tehsildar',
          'Valid for one financial year only (April 1 to March 31)',
          'Income certificate covering all sources of family income',
          'Property/asset declaration (self-attested)',
        ],
      },
    ],
  },
  {
    label: 'PwBD (Disability)',
    group: 'Category Reservations',
    authority: 'PwBD reservation is governed by the Rights of Persons with Disabilities Act, 2016. 5% horizontal reservation across all categories.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must have a benchmark disability of 40% or more.',
          'Disability must be certified by a designated government medical board.',
          'Eligible disability categories: Locomotor, Visual, Hearing, Intellectual, Mental illness, Multiple disabilities.',
          'PwBD is a HORIZONTAL reservation — it applies within each vertical category (General, OBC, SC, ST, EWS).',
          'Qualifying marks relaxation: 45th percentile for General-PwBD, 40th for SC/ST/OBC-PwBD.',
        ],
      },
      {
        heading: 'Reservation Percentage',
        items: [
          '5% horizontal reservation within each category.',
          'Example: If OBC has 100 seats, 5 will be reserved for OBC-PwBD candidates.',
          'PwBD candidates can also compete for unreserved seats if their rank qualifies.',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'Disability Certificate (min 40%) from a government medical board designated by the state government',
          'Certificate must be in the prescribed format under RPwD Act 2016',
          'UDID (Unique Disability ID) card is also accepted',
          'Some colleges conduct their own disability verification at the time of reporting',
        ],
      },
    ],
  },
  {
    label: 'Management Quota',
    group: 'Institutional Quotas',
    authority: 'Management quota seats are available in private medical colleges and deemed universities. NEET qualification is mandatory. Fees are significantly higher than government seats.',
    blocks: [
      {
        heading: 'Overview',
        items: [
          'Available in private and deemed university medical colleges.',
          'In deemed universities: 50% seats are AIQ (filled by MCC), 50% are management/institutional quota.',
          'In private colleges: Percentage varies by state regulation (typically 30-50% management quota).',
          'NEET qualification is mandatory even for management quota — no college can admit without valid NEET score.',
          'No category-based reservation in management quota.',
        ],
      },
      {
        heading: 'Fees',
        items: [
          'Tuition fees: Rs 5-25 Lakh per year (significantly higher than government).',
          'Total MBBS cost: Rs 40 Lakh to Rs 1.5 Crore for the complete course.',
          'Some states have fee regulatory committees that cap maximum management quota fees.',
          'NRI seats within management quota have even higher fees (Rs 15-30 Lakh per year).',
        ],
        note: 'Always verify fees directly with the college. Fee regulatory committee caps may change annually.',
      },
      {
        heading: 'How to Apply',
        items: [
          'For deemed universities: Register on MCC portal for MCC-managed management seats.',
          'For state private colleges: Register on the state counselling portal.',
          'Some colleges conduct separate institutional-level counselling for their quota.',
          'Merit is based on NEET score — higher score = better management seat options.',
        ],
      },
    ],
  },
  {
    label: 'NRI Quota',
    group: 'Institutional Quotas',
    authority: 'NRI quota is available in select private, deemed, and some government colleges. Typically 15% of total seats. NEET qualification mandatory.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'At least one parent must be a Non-Resident Indian (NRI) with valid proof.',
          'NRI is defined as an Indian citizen residing abroad for employment, business, or education.',
          'Some colleges accept OCI (Overseas Citizen of India) and PIO candidates.',
          'NEET qualification is mandatory — no exemption for NRI candidates.',
          'NRI status of the PARENT (not the candidate) is what matters.',
        ],
      },
      {
        heading: 'Fees & Seats',
        items: [
          'Fees are 3-10x higher than regular seats — typically Rs 15-30 Lakh per year.',
          'Usually 15% of total seats in a college are designated as NRI quota.',
          'Total MBBS cost under NRI quota: Rs 75 Lakh to Rs 2 Crore.',
          'Payment is often required in USD or equivalent foreign currency.',
        ],
        note: 'Unfilled NRI seats are often converted to management or general quota in later rounds. Keep watching for opportunities.',
      },
      {
        heading: 'Required Documents',
        items: [
          'NRI parent\'s valid passport (with visa stamps)',
          'Valid work visa / employment visa / business visa of the NRI parent',
          'NRI certificate from the Indian Embassy or Consulate',
          'Relationship proof — candidate\'s birth certificate showing parent\'s name',
          'NEET UG Scorecard',
          'Bank statements / income proof of the NRI parent',
        ],
      },
    ],
  },
  {
    label: 'Defence / Ex-Servicemen',
    group: 'Special Quotas',
    authority: 'Defence quota seats are reserved for wards of serving/retired defence personnel, ex-servicemen, and war widows. Available in select colleges and states.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Wards (children) of serving defence personnel (Army, Navy, Air Force).',
          'Wards of ex-servicemen (retired defence personnel).',
          'Wards of war widows and disabled soldiers.',
          'Wards of defence personnel killed/disabled in action get priority.',
          'AFMC Pune has 100% defence-linked admission (with service bond).',
        ],
      },
      {
        heading: 'Reservation Details',
        items: [
          'AFMC — 100% seats for defence-linked candidates. Free education with stipend. 7-14 year service bond.',
          'State Quota — Some states reserve 1-5% seats for defence wards.',
          'Central institutions — Small number of nominated seats in some AIIMS.',
          'Priority order: Killed in action > Disabled in action > Serving > Ex-servicemen.',
        ],
      },
      {
        heading: 'Required Documents',
        items: [
          'Service certificate of the parent from the concerned defence authority',
          'Ex-serviceman discharge certificate (if retired)',
          'War widow certificate (if applicable)',
          'Relationship certificate (proving candidate is the ward)',
          'Priority certificate from Record Office',
        ],
      },
    ],
  },
  {
    label: 'Sports Quota',
    group: 'Special Quotas',
    authority: 'Some states reserve 1-3% seats for candidates with outstanding sports achievements at national or state level.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must have represented the state or country in a recognized sport.',
          'Achievement at national/international level in sports recognized by the Indian Olympic Association.',
          'State-level achievements may qualify in some states.',
          'Sports certificate must be issued by the state sports authority or national federation.',
          'NEET qualification is mandatory — sports quota does not exempt from NEET.',
        ],
        note: 'Sports quota is quite limited (1-3% in select states). It provides a small advantage, not a guaranteed seat.',
      },
      {
        heading: 'Available In',
        items: [
          'Select state government medical colleges (not all states offer this).',
          'States like Maharashtra, Karnataka, and Tamil Nadu have formal sports quota provisions.',
          'Not available in AIQ/MCC counselling or central institutions.',
        ],
      },
    ],
  },
  {
    label: 'J&K Migrant Quota',
    group: 'Special Quotas',
    authority: 'Special provision for Kashmiri migrant candidates in central institutions and some state colleges under the PM\'s Special Scholarship Scheme.',
    blocks: [
      {
        heading: 'Eligibility',
        items: [
          'Candidate must be a registered Kashmiri migrant (Kashmiri Pandit / displaced person).',
          'Family must be registered with the Relief Commissioner, J&K.',
          'Supernumerary seats are created for J&K migrants — they don\'t take from the regular pool.',
          'NEET qualification is mandatory.',
        ],
      },
      {
        heading: 'Available In',
        items: [
          'Central institutions (AIIMS, JIPMER) — supernumerary seats.',
          'Some state government colleges across India accept J&K migrants.',
          'PM\'s Special Scholarship Scheme covers tuition fees.',
        ],
      },
    ],
  },
];

export const QUOTA_GROUPS = [...new Set(QUOTA_LIST.map((q) => q.group))];

// ── Section content (non-quota tabs) ──────────────────────

export const CONTENT: Record<Exclude<SectionKey, 'quota'>, SectionContent> = {
  eligibility: {
    authority: 'The Directorate General of Health Services (DGHS), Ministry of Health & Family Welfare, conducts online counselling for the 15% All India Quota seats for UG courses.',
    blocks: [
      {
        heading: 'A. Domicile / Home-State Candidates',
        intro: 'For the purpose of AIQ counselling, there is no domicile or home-state requirement — NEET-qualified candidates across India compete on equal merit for AIQ seats.',
        items: [
          'The candidate must be an Indian citizen, an NRI, an OCI, a PIO or a foreign national.',
          'The candidate must have qualified NEET-UG in the same academic year as the counselling.',
          'The candidate must have attained, or will attain, 17 years of age on or before 31 December of the admission year.',
          'There is no upper age limit for appearing in NEET-UG or for participating in counselling.',
        ],
        note: 'Foundational note: counselling for 15% AIQ is open to all qualified candidates regardless of the state they belong to.',
      },
      {
        heading: 'B. Qualifying Marks (Category-wise NEET Percentile)',
        items: [
          'General / EWS — 50th percentile',
          'OBC / SC / ST — 40th percentile',
          'General-PwBD — 45th percentile',
          'SC / ST / OBC-PwBD — 40th percentile',
        ],
      },
    ],
  },
  application: {
    authority: 'Registration for AIQ counselling is done exclusively through the official MCC portal — mcc.nic.in.',
    blocks: [
      {
        heading: 'Step-by-Step Registration Process',
        ordered: true,
        items: [
          'Visit the official MCC website at mcc.nic.in and open the UG Medical Counselling section.',
          'Click on "New Registration" and enter your NEET-UG roll number, application number, and registered mobile and email ID.',
          'Complete the full registration form with personal details, NEET score card details, and the required communication address.',
          'Upload a recent passport-size photograph and signature in the prescribed format and file size.',
          'Pay the non-refundable registration fee and the refundable security deposit online.',
          'Proceed to choice filling: search, add, and reorder your preferred colleges and courses.',
          'Lock your choices before the deadline — un-locked choices are auto-locked at the end of the window.',
          'After provisional allotment is published, download the allotment letter and report to the allotted institute.',
        ],
        note: 'Keep your registered mobile number and email active throughout — all OTPs and result notifications are sent there.',
      },
    ],
  },
  domicile: {
    authority: 'AIQ seats carry no domicile restriction. State quota (85%) seats require a valid domicile certificate from the respective state.',
    blocks: [
      {
        heading: 'AIQ is Domicile-Free',
        intro: 'There are no domicile conditions for 15% AIQ seats in government medical colleges, 100% Deemed University seats, AFMS, ESIC and central institutions.',
        items: [
          'Candidates do not need a domicile or residence certificate from any state to participate in AIQ / MCC counselling.',
          'Reservation benefits (SC/ST/OBC/EWS) follow the central list, not the state list, for AIQ seats.',
        ],
      },
      {
        heading: 'Institutional / Internal Quota of Central Universities',
        intro: 'Some central institutions reserve a share of seats for their own internal-quota candidates:',
        items: [
          'Delhi University (UCMS, MAMC, LHMC) — seats reserved for candidates who passed Class 12 from a recognised school in NCT of Delhi.',
          'BHU (Institute of Medical Sciences) — internal and state-specific eligibility apply.',
          'AMU (Aligarh Muslim University) — internal-quota seats reserved under AMU eligibility norms.',
        ],
        note: 'Always verify the latest internal-quota and domicile criteria from the official prospectus of each institution.',
      },
    ],
  },
  counselling: {
    authority: 'All four rounds of AIQ online counselling — Round 1, Round 2, Mop-up and Stray Vacancy — are conducted through the MCC portal.',
    blocks: [
      {
        heading: 'Mode of Counselling',
        items: [
          'All counselling is conducted entirely online; candidates physically report to their allotted college only for document verification.',
          'All admissions and resignations are made through online mode — no offline surrender of seat is permitted.',
          'Candidates can download the provisional allotment letter directly from the MCC website.',
        ],
      },
      {
        heading: 'Basis of Seat Allotment',
        ordered: true,
        items: [
          'Seat allotment is based on the candidate\'s NEET-UG All India Rank, choices filled, category and seat availability.',
          'The allotment algorithm matches candidates to the highest-ranked available choice when their AIR qualifies.',
          'MCC publishes a seat matrix before each round; the seat matrix and result are released per the published schedule.',
          'A candidate can be upgraded in a later round if a higher-preference choice becomes available.',
        ],
        note: 'Free-exit, upgrade and resignation rules differ by round — read the round-wise business rules carefully before locking choices.',
      },
    ],
  },
};
