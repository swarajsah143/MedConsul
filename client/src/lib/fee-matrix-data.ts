export interface FeeBreakdownItem {
  label: string;
  amount: number;
}

export interface YearWiseFee {
  year: string;
  tuition: number;
  hostel: number;
  misc: number;
  deposit: number;
  total: number;
}

export interface CollegeFeeEntry {
  id: string;
  name: string;
  state: string;
  city: string;
  type: 'Government' | 'Private' | 'Deemed';
  course: string;
  category: string;
  quota: string;
  tuitionFee: number;
  hostelFee: number;
  miscCharges: number;
  securityDeposit: number;
  totalFirstYear: number;
  govtSeats: number;
  mgmtSeats: number;
  nriSeats: number;
  // Detail fields
  yearWiseFees: YearWiseFee[];
  feeBreakdown: FeeBreakdownItem[];
  scholarships: string[];
  paymentSchedule: string;
  refundPolicy: string;
  bondDetails: string | null;
}

function entry(
  id: string,
  name: string,
  state: string,
  city: string,
  type: 'Government' | 'Private' | 'Deemed',
  course: string,
  category: string,
  quota: string,
  tuition: number,
  hostel: number,
  misc: number,
  deposit: number,
  govtSeats: number,
  mgmtSeats: number,
  nriSeats: number,
  extras: Partial<Pick<CollegeFeeEntry, 'yearWiseFees' | 'feeBreakdown' | 'scholarships' | 'paymentSchedule' | 'refundPolicy' | 'bondDetails'>> = {}
): CollegeFeeEntry {
  return {
    id,
    name,
    state,
    city,
    type,
    course,
    category,
    quota,
    tuitionFee: tuition,
    hostelFee: hostel,
    miscCharges: misc,
    securityDeposit: deposit,
    totalFirstYear: tuition + hostel + misc + deposit,
    govtSeats,
    mgmtSeats,
    nriSeats,
    yearWiseFees: extras.yearWiseFees ?? [
      { year: '1st Year', tuition, hostel, misc, deposit, total: tuition + hostel + misc + deposit },
      { year: '2nd Year', tuition, hostel, misc, deposit: 0, total: tuition + hostel + misc },
      { year: '3rd Year', tuition, hostel, misc, deposit: 0, total: tuition + hostel + misc },
      { year: '4th Year', tuition, hostel, misc: Math.round(misc * 0.8), deposit: 0, total: tuition + hostel + Math.round(misc * 0.8) },
      { year: 'Internship', tuition: 0, hostel, misc: Math.round(misc * 0.5), deposit: 0, total: hostel + Math.round(misc * 0.5) },
    ],
    feeBreakdown: extras.feeBreakdown ?? [
      { label: 'Tuition Fee', amount: tuition },
      { label: 'Hostel & Mess', amount: hostel },
      { label: 'Library & Lab', amount: Math.round(misc * 0.4) },
      { label: 'Exam & Registration', amount: Math.round(misc * 0.3) },
      { label: 'Student Welfare', amount: Math.round(misc * 0.2) },
      { label: 'Insurance & Medical', amount: Math.round(misc * 0.1) },
      { label: 'Security Deposit (Refundable)', amount: deposit },
    ],
    scholarships: extras.scholarships ?? [
      'Merit-based fee waiver for top 10 rankers',
      'SC/ST full fee exemption under government scheme',
      'EWS scholarship covering 50% tuition',
    ],
    paymentSchedule: extras.paymentSchedule ?? 'Fees payable annually before July 31. Late payment attracts 1.5% monthly interest.',
    refundPolicy: extras.refundPolicy ?? 'Full refund (minus processing fee) if cancelled within 15 days of admission. 50% refund up to 30 days. No refund after 30 days.',
    bondDetails: extras.bondDetails ?? null,
  };
}

export const FEE_MATRIX_DATA: CollegeFeeEntry[] = [
  // AIIMS
  entry('fee-1', 'AIIMS, New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    1628, 1200, 4500, 5000, 107, 0, 18, {
      bondDetails: 'No service bond required.',
      scholarships: [
        'Virtually free education — tuition is only Rs 1,628/yr',
        'AIIMS-funded merit scholarships for research projects',
        'SC/ST/PwD full fee waiver under central government scheme',
      ],
    }),
  entry('fee-1b', 'AIIMS, New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'OBC', 'All India Quota (AIQ)',
    1628, 1200, 4500, 5000, 30, 0, 0),
  entry('fee-1c', 'AIIMS, New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'SC', 'All India Quota (AIQ)',
    0, 0, 2000, 0, 22, 0, 0, {
      scholarships: ['Complete fee exemption for SC/ST students', 'Free hostel and mess facility', 'Monthly stipend of Rs 2,500'],
    }),

  // MAMC
  entry('fee-2', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'Delhi State Quota',
    4445, 3600, 12000, 10000, 200, 0, 0, {
      bondDetails: 'No compulsory service bond.',
    }),
  entry('fee-2b', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    4445, 3600, 12000, 10000, 38, 0, 0),

  // Grant Medical College
  entry('fee-3', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'General', 'Maharashtra State Quota',
    28000, 18000, 22000, 15000, 200, 0, 0, {
      bondDetails: '1-year rural service bond for government seat holders in Maharashtra.',
    }),
  entry('fee-3b', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'BDS', 'General', 'Maharashtra State Quota',
    22000, 18000, 18000, 12000, 60, 0, 0),
  entry('fee-3c', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'OBC', 'Maharashtra State Quota',
    14000, 18000, 22000, 15000, 55, 0, 0),

  // BMCRI
  entry('fee-4', 'Bangalore Medical College (BMCRI)', 'Karnataka', 'Bengaluru', 'Government', 'MBBS', 'General', 'Karnataka State Quota',
    70150, 24000, 28000, 20000, 200, 0, 0, {
      bondDetails: 'Compulsory 1-year rural service in Karnataka after PG.',
    }),
  entry('fee-4b', 'Bangalore Medical College (BMCRI)', 'Karnataka', 'Bengaluru', 'Government', 'MBBS', 'OBC', 'Karnataka State Quota',
    35075, 24000, 28000, 20000, 50, 0, 0),

  // KMC Manipal
  entry('fee-5', 'Kasturba Medical College (KMC), Manipal', 'Karnataka', 'Manipal', 'Deemed', 'MBBS', 'General', 'Management Quota',
    1780000, 180000, 95000, 200000, 0, 200, 50, {
      yearWiseFees: [
        { year: '1st Year', tuition: 1780000, hostel: 180000, misc: 95000, deposit: 200000, total: 2255000 },
        { year: '2nd Year', tuition: 1870000, hostel: 190000, misc: 95000, deposit: 0, total: 2155000 },
        { year: '3rd Year', tuition: 1965000, hostel: 200000, misc: 100000, deposit: 0, total: 2265000 },
        { year: '4th Year', tuition: 2065000, hostel: 210000, misc: 100000, deposit: 0, total: 2375000 },
        { year: 'Internship', tuition: 0, hostel: 210000, misc: 50000, deposit: 0, total: 260000 },
      ],
      scholarships: [
        'MAHE Merit Scholarship — up to 100% tuition waiver for AIR < 100',
        'MAHE Need-Based Financial Aid — up to 50% reduction',
        'Karnataka State Scholarship for domicile students',
      ],
      paymentSchedule: 'Fees payable per semester. 5% annual escalation applies. Education loan tie-ups with SBI, HDFC Credila, Axis Bank.',
      bondDetails: null,
    }),
  entry('fee-5b', 'Kasturba Medical College (KMC), Manipal', 'Karnataka', 'Manipal', 'Deemed', 'MBBS', 'General', 'All India Quota (AIQ)',
    950000, 180000, 85000, 150000, 100, 0, 25),

  // CMC Vellore
  entry('fee-6', 'Christian Medical College (CMC), Vellore', 'Tamil Nadu', 'Vellore', 'Private', 'MBBS', 'General', 'Management Quota',
    52000, 36000, 28000, 20000, 60, 30, 10, {
      scholarships: [
        'CMC Merit-cum-Means scholarship — up to full tuition waiver',
        'Church sponsorship seats with subsidized fees',
        'Economically Weaker Section grant up to Rs 50,000/yr',
      ],
      bondDetails: '2-year rural/mission hospital service bond post-MBBS.',
    }),
  entry('fee-6b', 'Christian Medical College (CMC), Vellore', 'Tamil Nadu', 'Vellore', 'Private', 'MBBS', 'SC', 'Management Quota',
    26000, 18000, 20000, 10000, 15, 0, 0),

  // AFMC
  entry('fee-7', 'Armed Forces Medical College (AFMC), Pune', 'Maharashtra', 'Pune', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    0, 0, 15000, 0, 130, 0, 0, {
      yearWiseFees: [
        { year: '1st Year', tuition: 0, hostel: 0, misc: 15000, deposit: 0, total: 15000 },
        { year: '2nd Year', tuition: 0, hostel: 0, misc: 15000, deposit: 0, total: 15000 },
        { year: '3rd Year', tuition: 0, hostel: 0, misc: 15000, deposit: 0, total: 15000 },
        { year: '4th Year', tuition: 0, hostel: 0, misc: 15000, deposit: 0, total: 15000 },
        { year: 'Internship', tuition: 0, hostel: 0, misc: 10000, deposit: 0, total: 10000 },
      ],
      scholarships: [
        'Fully funded by Indian Armed Forces — no tuition or hostel fees',
        'Monthly stipend of Rs 56,100 (as per 7th Pay Commission)',
        'Free uniform, mess, and medical cover',
      ],
      paymentSchedule: 'Only nominal exam and registration fees payable at the start of each year.',
      refundPolicy: 'N/A — fully funded. Withdrawal triggers recovery of training costs.',
      bondDetails: 'Mandatory 7-year short service commission bond post-MBBS. 14-year bond if PG is pursued through Armed Forces.',
    }),

  // JIPMER
  entry('fee-8', 'JIPMER, Puducherry', 'Puducherry', 'Puducherry', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    5750, 4800, 8500, 7500, 150, 0, 15, {
      bondDetails: 'No service bond.',
    }),
  entry('fee-8b', 'JIPMER, Puducherry', 'Puducherry', 'Puducherry', 'Government', 'MBBS', 'OBC', 'All India Quota (AIQ)',
    2875, 4800, 8500, 5000, 40, 0, 0),

  // Seth GS / KEM
  entry('fee-9', 'Seth GS Medical College & KEM Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'General', 'Maharashtra State Quota',
    35000, 22000, 25000, 18000, 180, 0, 0, {
      bondDetails: '1-year compulsory rural service bond in Maharashtra.',
    }),
  entry('fee-9b', 'Seth GS Medical College & KEM Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'OBC', 'Maharashtra State Quota',
    17500, 22000, 25000, 15000, 48, 0, 0),

  // Stanley Medical College
  entry('fee-10', 'Stanley Medical College, Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'General', 'Tamil Nadu State Quota',
    13500, 12000, 15000, 10000, 200, 0, 0, {
      bondDetails: '2-year compulsory government service in Tamil Nadu.',
    }),
  entry('fee-10b', 'Stanley Medical College, Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'OBC', 'Tamil Nadu State Quota',
    6750, 12000, 15000, 8000, 65, 0, 0),
];

// Derived filter options
export const FEE_FILTER_OPTIONS = {
  states: [...new Set(FEE_MATRIX_DATA.map((e) => e.state))].sort(),
  colleges: [...new Set(FEE_MATRIX_DATA.map((e) => e.name))].sort(),
  courses: [...new Set(FEE_MATRIX_DATA.map((e) => e.course))].sort(),
  categories: [...new Set(FEE_MATRIX_DATA.map((e) => e.category))].sort(),
  quotas: [...new Set(FEE_MATRIX_DATA.map((e) => e.quota))].sort(),
};

export function formatINR(amount: number): string {
  if (amount === 0) return 'Free';
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)}L`;
  return `${amount.toLocaleString('en-IN')}`;
}

export function formatINRFull(amount: number): string {
  if (amount === 0) return 'Free';
  return `Rs ${amount.toLocaleString('en-IN')}`;
}
