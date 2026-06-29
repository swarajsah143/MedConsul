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
  // ═══════════════ AIIMS, New Delhi ═══════════════
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
  entry('fee-1d', 'AIIMS, New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'EWS', 'All India Quota (AIQ)',
    814, 600, 2500, 2500, 13, 0, 0, {
      scholarships: ['50% fee concession for EWS students', 'Central government EWS scholarship applicable'],
    }),

  // ═══════════════ MAMC, New Delhi ═══════════════
  entry('fee-2', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'Delhi State Quota',
    4445, 3600, 12000, 10000, 200, 0, 0, {
      bondDetails: 'No compulsory service bond.',
    }),
  entry('fee-2b', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    4445, 3600, 12000, 10000, 38, 0, 0),
  entry('fee-2c', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'OBC', 'Delhi State Quota',
    2223, 3600, 10000, 8000, 55, 0, 0),
  entry('fee-2d', 'Maulana Azad Medical College (MAMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'SC', 'Delhi State Quota',
    0, 0, 5000, 0, 38, 0, 0, {
      scholarships: ['Complete fee exemption for SC/ST students under Delhi government scheme', 'Free hostel facility', 'Post-matric scholarship applicable'],
    }),

  // ═══════════════ Grant Medical College, Mumbai ═══════════════
  entry('fee-3', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'General', 'Maharashtra State Quota',
    28000, 18000, 22000, 15000, 200, 0, 0, {
      bondDetails: '1-year rural service bond for government seat holders in Maharashtra.',
    }),
  entry('fee-3b', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'BDS', 'General', 'Maharashtra State Quota',
    22000, 18000, 18000, 12000, 60, 0, 0),
  entry('fee-3c', 'Grant Medical College & Sir JJ Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'OBC', 'Maharashtra State Quota',
    14000, 18000, 22000, 15000, 55, 0, 0),

  // ═══════════════ BMCRI, Bengaluru ═══════════════
  entry('fee-4', 'Bangalore Medical College (BMCRI)', 'Karnataka', 'Bengaluru', 'Government', 'MBBS', 'General', 'Karnataka State Quota',
    70150, 24000, 28000, 20000, 200, 0, 0, {
      bondDetails: 'Compulsory 1-year rural service in Karnataka after PG.',
    }),
  entry('fee-4b', 'Bangalore Medical College (BMCRI)', 'Karnataka', 'Bengaluru', 'Government', 'MBBS', 'OBC', 'Karnataka State Quota',
    35075, 24000, 28000, 20000, 50, 0, 0),
  entry('fee-4c', 'Bangalore Medical College (BMCRI)', 'Karnataka', 'Bengaluru', 'Government', 'MBBS', 'SC', 'Karnataka State Quota',
    0, 12000, 15000, 10000, 38, 0, 0, {
      scholarships: ['Full tuition waiver for SC/ST under Karnataka state scheme', 'Post-matric scholarship applicable', 'Free hostel for economically weaker SC/ST'],
    }),

  // ═══════════════ KMC Manipal ═══════════════
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

  // ═══════════════ CMC Vellore ═══════════════
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
  entry('fee-6c', 'Christian Medical College (CMC), Vellore', 'Tamil Nadu', 'Vellore', 'Private', 'MBBS', 'OBC', 'Management Quota',
    40000, 30000, 25000, 15000, 20, 10, 5),

  // ═══════════════ AFMC, Pune ═══════════════
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

  // ═══════════════ JIPMER, Puducherry ═══════════════
  entry('fee-8', 'JIPMER, Puducherry', 'Puducherry', 'Puducherry', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    5750, 4800, 8500, 7500, 150, 0, 15, {
      bondDetails: 'No service bond.',
    }),
  entry('fee-8b', 'JIPMER, Puducherry', 'Puducherry', 'Puducherry', 'Government', 'MBBS', 'OBC', 'All India Quota (AIQ)',
    2875, 4800, 8500, 5000, 40, 0, 0),
  entry('fee-8c', 'JIPMER, Puducherry', 'Puducherry', 'Puducherry', 'Government', 'MBBS', 'SC', 'All India Quota (AIQ)',
    0, 0, 4000, 0, 25, 0, 0, {
      scholarships: ['Complete fee exemption for SC/ST students', 'Free hostel and mess', 'Central government post-matric scholarship'],
    }),

  // ═══════════════ Seth GS / KEM, Mumbai ═══════════════
  entry('fee-9', 'Seth GS Medical College & KEM Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'General', 'Maharashtra State Quota',
    35000, 22000, 25000, 18000, 180, 0, 0, {
      bondDetails: '1-year compulsory rural service bond in Maharashtra.',
    }),
  entry('fee-9b', 'Seth GS Medical College & KEM Hospital, Mumbai', 'Maharashtra', 'Mumbai', 'Government', 'MBBS', 'OBC', 'Maharashtra State Quota',
    17500, 22000, 25000, 15000, 48, 0, 0),

  // ═══════════════ Stanley Medical College, Chennai ═══════════════
  entry('fee-10', 'Stanley Medical College, Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'General', 'Tamil Nadu State Quota',
    13500, 12000, 15000, 10000, 200, 0, 0, {
      bondDetails: '2-year compulsory government service in Tamil Nadu.',
    }),
  entry('fee-10b', 'Stanley Medical College, Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'OBC', 'Tamil Nadu State Quota',
    6750, 12000, 15000, 8000, 65, 0, 0),

  // ═══════════════ KGMU, Lucknow ═══════════════
  entry('fee-11', 'King George\'s Medical University (KGMU), Lucknow', 'Uttar Pradesh', 'Lucknow', 'Government', 'MBBS', 'General', 'UP State Quota',
    22500, 15000, 18000, 12000, 200, 0, 0, {
      bondDetails: 'No compulsory service bond for MBBS.',
      scholarships: [
        'UP state merit scholarship for top 100 rankers',
        'SC/ST/OBC fee concession under UP government scheme',
        'EWS scholarship covering 75% of tuition',
      ],
    }),
  entry('fee-11b', 'King George\'s Medical University (KGMU), Lucknow', 'Uttar Pradesh', 'Lucknow', 'Government', 'MBBS', 'OBC', 'UP State Quota',
    11250, 15000, 18000, 10000, 55, 0, 0),
  entry('fee-11c', 'King George\'s Medical University (KGMU), Lucknow', 'Uttar Pradesh', 'Lucknow', 'Government', 'BDS', 'General', 'UP State Quota',
    18000, 15000, 15000, 10000, 60, 0, 0),
  entry('fee-11d', 'King George\'s Medical University (KGMU), Lucknow', 'Uttar Pradesh', 'Lucknow', 'Government', 'MBBS', 'SC', 'UP State Quota',
    0, 0, 8000, 0, 38, 0, 0, {
      scholarships: ['Complete fee exemption under UP SC/ST scholarship', 'Free hostel and mess', 'Monthly maintenance allowance of Rs 3,000'],
    }),
  entry('fee-11e', 'King George\'s Medical University (KGMU), Lucknow', 'Uttar Pradesh', 'Lucknow', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    22500, 15000, 18000, 12000, 38, 0, 0),

  // ═══════════════ MMC (Madras Medical College), Chennai ═══════════════
  entry('fee-12', 'Madras Medical College (MMC), Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'General', 'Tamil Nadu State Quota',
    13000, 10000, 14000, 8000, 200, 0, 0, {
      bondDetails: '2-year compulsory government service in Tamil Nadu.',
      scholarships: [
        'Tamil Nadu government merit scholarship',
        'BC/MBC/SC/ST full fee waiver under state scheme',
        'First-generation graduate scholarship',
      ],
    }),
  entry('fee-12b', 'Madras Medical College (MMC), Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'MBBS', 'OBC', 'Tamil Nadu State Quota',
    6500, 10000, 14000, 6000, 65, 0, 0),
  entry('fee-12c', 'Madras Medical College (MMC), Chennai', 'Tamil Nadu', 'Chennai', 'Government', 'BDS', 'General', 'Tamil Nadu State Quota',
    10000, 10000, 12000, 6000, 60, 0, 0),

  // ═══════════════ LHMC, New Delhi ═══════════════
  entry('fee-13', 'Lady Hardinge Medical College (LHMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    3500, 3200, 10000, 8000, 180, 0, 0, {
      bondDetails: 'No compulsory service bond.',
      scholarships: [
        'Central government merit scholarship for top performers',
        'SC/ST full fee exemption under central scheme',
        'Women-specific scholarships from various trusts',
      ],
    }),
  entry('fee-13b', 'Lady Hardinge Medical College (LHMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'OBC', 'All India Quota (AIQ)',
    1750, 3200, 8000, 6000, 48, 0, 0),
  entry('fee-13c', 'Lady Hardinge Medical College (LHMC), New Delhi', 'Delhi', 'New Delhi', 'Government', 'MBBS', 'SC', 'All India Quota (AIQ)',
    0, 0, 4000, 0, 28, 0, 0),

  // ═══════════════ GMCH, Chandigarh ═══════════════
  entry('fee-14', 'Govt. Medical College & Hospital, Chandigarh', 'Chandigarh', 'Chandigarh', 'Government', 'MBBS', 'General', 'UT Chandigarh Quota',
    45000, 28000, 22000, 15000, 120, 0, 0, {
      bondDetails: 'No compulsory service bond.',
    }),
  entry('fee-14b', 'Govt. Medical College & Hospital, Chandigarh', 'Chandigarh', 'Chandigarh', 'Government', 'MBBS', 'OBC', 'UT Chandigarh Quota',
    22500, 28000, 20000, 12000, 35, 0, 0),
  entry('fee-14c', 'Govt. Medical College & Hospital, Chandigarh', 'Chandigarh', 'Chandigarh', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    45000, 28000, 22000, 15000, 30, 0, 0),

  // ═══════════════ B.J. Medical College, Ahmedabad ═══════════════
  entry('fee-15', 'B.J. Medical College, Ahmedabad', 'Gujarat', 'Ahmedabad', 'Government', 'MBBS', 'General', 'Gujarat State Quota',
    15000, 12000, 16000, 10000, 200, 0, 0, {
      bondDetails: '1-year rural service bond in Gujarat.',
      scholarships: [
        'Gujarat state merit-cum-means scholarship',
        'SC/ST/OBC fee concession under Gujarat government scheme',
        'EWS scholarship covering full tuition',
      ],
    }),
  entry('fee-15b', 'B.J. Medical College, Ahmedabad', 'Gujarat', 'Ahmedabad', 'Government', 'MBBS', 'OBC', 'Gujarat State Quota',
    7500, 12000, 16000, 8000, 55, 0, 0),
  entry('fee-15c', 'B.J. Medical College, Ahmedabad', 'Gujarat', 'Ahmedabad', 'Government', 'MBBS', 'SC', 'Gujarat State Quota',
    0, 0, 8000, 0, 38, 0, 0),

  // ═══════════════ IMS-BHU, Varanasi ═══════════════
  entry('fee-16', 'Institute of Medical Sciences (IMS-BHU), Varanasi', 'Uttar Pradesh', 'Varanasi', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    8400, 6000, 12000, 8000, 100, 0, 10, {
      bondDetails: 'No compulsory service bond.',
      scholarships: [
        'BHU Merit Scholarship for top 5% students',
        'Central government SC/ST/OBC fee exemption',
        'UGC scholarship for economically weaker students',
      ],
    }),
  entry('fee-16b', 'Institute of Medical Sciences (IMS-BHU), Varanasi', 'Uttar Pradesh', 'Varanasi', 'Government', 'MBBS', 'OBC', 'All India Quota (AIQ)',
    4200, 6000, 10000, 6000, 28, 0, 0),
  entry('fee-16c', 'Institute of Medical Sciences (IMS-BHU), Varanasi', 'Uttar Pradesh', 'Varanasi', 'Government', 'BDS', 'General', 'All India Quota (AIQ)',
    6800, 6000, 10000, 6000, 30, 0, 5),

  // ═══════════════ TMC, Thiruvananthapuram ═══════════════
  entry('fee-17', 'Govt. Medical College, Thiruvananthapuram', 'Kerala', 'Thiruvananthapuram', 'Government', 'MBBS', 'General', 'Kerala State Quota',
    18500, 14000, 16000, 10000, 200, 0, 0, {
      bondDetails: '1-year compulsory government service in Kerala.',
      scholarships: [
        'Kerala state merit scholarship',
        'SC/ST/OBC full fee waiver under Kerala government scheme',
        'Muslim/Christian minority scholarship available',
      ],
    }),
  entry('fee-17b', 'Govt. Medical College, Thiruvananthapuram', 'Kerala', 'Thiruvananthapuram', 'Government', 'MBBS', 'OBC', 'Kerala State Quota',
    9250, 14000, 16000, 8000, 55, 0, 0),

  // ═══════════════ SRIHER, Chennai ═══════════════
  entry('fee-18', 'SRIHER (Sri Ramachandra), Chennai', 'Tamil Nadu', 'Chennai', 'Deemed', 'MBBS', 'General', 'Management Quota',
    2250000, 220000, 120000, 250000, 0, 200, 50, {
      yearWiseFees: [
        { year: '1st Year', tuition: 2250000, hostel: 220000, misc: 120000, deposit: 250000, total: 2840000 },
        { year: '2nd Year', tuition: 2365000, hostel: 230000, misc: 120000, deposit: 0, total: 2715000 },
        { year: '3rd Year', tuition: 2485000, hostel: 240000, misc: 125000, deposit: 0, total: 2850000 },
        { year: '4th Year', tuition: 2610000, hostel: 250000, misc: 125000, deposit: 0, total: 2985000 },
        { year: 'Internship', tuition: 0, hostel: 250000, misc: 60000, deposit: 0, total: 310000 },
      ],
      scholarships: [
        'SRIHER Merit Scholarship — up to 50% tuition waiver for AIR < 500',
        'Need-based financial aid up to 25% reduction',
        'Tamil Nadu state domicile scholarship',
      ],
      paymentSchedule: 'Fees payable per semester. 5% annual escalation applies. Education loan tie-ups available.',
      bondDetails: null,
    }),
  entry('fee-18b', 'SRIHER (Sri Ramachandra), Chennai', 'Tamil Nadu', 'Chennai', 'Deemed', 'MBBS', 'General', 'All India Quota (AIQ)',
    1200000, 220000, 100000, 180000, 100, 0, 25),
  entry('fee-18c', 'SRIHER (Sri Ramachandra), Chennai', 'Tamil Nadu', 'Chennai', 'Deemed', 'BDS', 'General', 'Management Quota',
    800000, 180000, 80000, 150000, 0, 60, 15),

  // ═══════════════ SMS Medical College, Jaipur ═══════════════
  entry('fee-19', 'SMS Medical College, Jaipur', 'Rajasthan', 'Jaipur', 'Government', 'MBBS', 'General', 'Rajasthan State Quota',
    27000, 18000, 20000, 12000, 200, 0, 0, {
      bondDetails: '1-year rural service bond in Rajasthan.',
      scholarships: [
        'Rajasthan state merit scholarship',
        'SC/ST/OBC fee concession under Rajasthan government scheme',
        'Mukhyamantri Ucch Shiksha scholarship',
      ],
    }),
  entry('fee-19b', 'SMS Medical College, Jaipur', 'Rajasthan', 'Jaipur', 'Government', 'MBBS', 'OBC', 'Rajasthan State Quota',
    13500, 18000, 20000, 10000, 55, 0, 0),
  entry('fee-19c', 'SMS Medical College, Jaipur', 'Rajasthan', 'Jaipur', 'Government', 'MBBS', 'SC', 'Rajasthan State Quota',
    0, 0, 10000, 0, 38, 0, 0),
  entry('fee-19d', 'SMS Medical College, Jaipur', 'Rajasthan', 'Jaipur', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    27000, 18000, 20000, 12000, 38, 0, 0),

  // ═══════════════ D.Y. Patil, Pune ═══════════════
  entry('fee-20', 'D.Y. Patil Medical College, Pune', 'Maharashtra', 'Pune', 'Deemed', 'MBBS', 'General', 'Management Quota',
    1900000, 200000, 110000, 220000, 0, 160, 40, {
      yearWiseFees: [
        { year: '1st Year', tuition: 1900000, hostel: 200000, misc: 110000, deposit: 220000, total: 2430000 },
        { year: '2nd Year', tuition: 1995000, hostel: 210000, misc: 110000, deposit: 0, total: 2315000 },
        { year: '3rd Year', tuition: 2095000, hostel: 220000, misc: 115000, deposit: 0, total: 2430000 },
        { year: '4th Year', tuition: 2200000, hostel: 230000, misc: 115000, deposit: 0, total: 2545000 },
        { year: 'Internship', tuition: 0, hostel: 230000, misc: 55000, deposit: 0, total: 285000 },
      ],
      scholarships: [
        'D.Y. Patil Merit Scholarship — up to 75% tuition waiver for AIR < 200',
        'Need-based financial aid up to 30% reduction',
        'Maharashtra domicile concession',
      ],
      paymentSchedule: 'Fees payable per semester. 5% annual escalation applies. Education loan partnerships with major banks.',
      bondDetails: null,
    }),
  entry('fee-20b', 'D.Y. Patil Medical College, Pune', 'Maharashtra', 'Pune', 'Deemed', 'MBBS', 'General', 'All India Quota (AIQ)',
    1000000, 200000, 95000, 160000, 80, 0, 20),
  entry('fee-20c', 'D.Y. Patil Medical College, Pune', 'Maharashtra', 'Pune', 'Deemed', 'BDS', 'General', 'Management Quota',
    700000, 160000, 70000, 120000, 0, 50, 10),

  // ═══════════════ Osmania Medical College, Hyderabad ═══════════════
  entry('fee-21', 'Osmania Medical College, Hyderabad', 'Telangana', 'Hyderabad', 'Government', 'MBBS', 'General', 'Telangana State Quota',
    32000, 20000, 22000, 14000, 200, 0, 0, {
      bondDetails: '1-year compulsory rural service in Telangana.',
      scholarships: [
        'Telangana state merit scholarship',
        'SC/ST/BC full fee waiver under TS government scheme',
        'Minorities welfare scholarship',
      ],
    }),
  entry('fee-21b', 'Osmania Medical College, Hyderabad', 'Telangana', 'Hyderabad', 'Government', 'MBBS', 'OBC', 'Telangana State Quota',
    16000, 20000, 22000, 12000, 55, 0, 0),
  entry('fee-21c', 'Osmania Medical College, Hyderabad', 'Telangana', 'Hyderabad', 'Government', 'MBBS', 'SC', 'Telangana State Quota',
    0, 0, 10000, 0, 38, 0, 0),
  entry('fee-21d', 'Osmania Medical College, Hyderabad', 'Telangana', 'Hyderabad', 'Government', 'MBBS', 'General', 'All India Quota (AIQ)',
    32000, 20000, 22000, 14000, 38, 0, 0),

  // ═══════════════ St. John's, Bengaluru ═══════════════
  entry('fee-22', 'St. John\'s Medical College, Bengaluru', 'Karnataka', 'Bengaluru', 'Private', 'MBBS', 'General', 'Management Quota',
    625000, 120000, 65000, 80000, 0, 120, 30, {
      scholarships: [
        'St. John\'s Merit-cum-Means scholarship — up to full tuition waiver',
        'Catholic Diocese sponsored seats with subsidized fees',
        'EWS scholarship from institutional fund',
      ],
      bondDetails: null,
    }),
  entry('fee-22b', 'St. John\'s Medical College, Bengaluru', 'Karnataka', 'Bengaluru', 'Private', 'MBBS', 'OBC', 'Management Quota',
    480000, 100000, 55000, 60000, 0, 30, 0),
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
