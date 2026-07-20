/**
 * Abroad-university enrichment data — applied by scripts/enrich-abroad.ts.
 *
 * Fills in the fields the collection was missing: photos (25 of 39 had none), tuition/living
 * cost, a rating, and the descriptive fields that power the new "View details" panel
 * (about, eligibility, licensing, advantages, hostel, website, established, intake).
 *
 * ⚠️  Costs and ratings are INDICATIVE, last-known figures for orientation and comparison —
 *  MBBS-abroad tuition is marketed in ranges and changes yearly. They are NOT a quote. Always
 *  confirm the current fee with the university / an authorised admission office before deciding.
 *  Eligibility & licensing text is the standard, accurate NMC/FMGE-NExT framework for Indian
 *  students. Photos for universities without a dedicated shot are representative stock, not the
 *  actual campus.
 *
 * Data is layered: COUNTRY defaults apply to every university in that country, and OVERRIDES
 * refine individual well-known universities (established year, official website, a sharper
 * tuition/rating). The importer only fills fields that are still empty — it never overwrites
 * real data an admin already entered.
 */

export interface CountryProfile {
  tuitionPerYearUSD: number;      // typical annual tuition for the country
  livingCostPerYearUSD: number;   // typical annual living cost
  rating: number;                 // indicative
  intake: string;
  advantages: string[];
  licensingExams: string[];
  recognitions: string[];         // used only if the university has none recorded
}

export interface UniOverride {
  tuitionPerYearUSD?: number;
  livingCostPerYearUSD?: number;
  rating?: number;
  established?: number;
  website?: string;
  about?: string;                 // optional custom blurb; otherwise a template is used
}

/** Same for every university — the standard route for an Indian NEET student studying abroad. */
export const ELIGIBILITY =
  'NEET-UG qualified with a valid score, plus Class 12 with Physics, Chemistry, Biology and ' +
  'English (minimum 50%, or 40% for reserved categories). The candidate must be at least 17 ' +
  'years old by 31 December of the admission year.';

export const HOSTEL_INFO =
  'On-campus and university-arranged hostels are available with separate blocks for boys and ' +
  'girls. Indian mess / self-cooking options are common, and the monthly cost is usually ' +
  'included in the living-cost estimate above.';

/** Generic foreign medical-university building photos (Wikimedia Commons) for missing images. */
export const STOCK_IMAGES: string[] = [
  'https://upload.wikimedia.org/wikipedia/commons/9/97/%E6%B8%85%E8%8F%AF%E5%A4%A7%E5%AD%B8%E9%86%AB%E5%AD%B8%E7%A7%91%E5%AD%B8%E6%A8%932.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/0/06/%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C%2C_%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D1%8B%D0%B9_%D0%BA%D0%BE%D1%80%D0%BF%D1%83%D1%81_%D0%9A%D0%93%D0%9C%D0%A3.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/7/7c/%D0%9B%D1%83%D1%86%D1%8C%D0%BA_-_%D0%9F%D1%80._%D0%92%D0%BE%D0%BB%D1%96%2C_13_P1080117.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/6/65/Eastern_European_National_University_named_after_Lesya_Ukrainka._Reflection_in_the_pool.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/7/75/Kazan_State_Medical_University_building_%282024-05-18%29_02.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/8/83/Kazan_State_Medical_University_building_%282024-05-18%29_03.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/f/f7/Kazan_State_Medical_University_building_%282024-05-18%29_01.jpg',
];

const LIC_STD = ['FMGE / NExT — required to practise in India', 'Eligible for USMLE (USA) & PLAB (UK) after screening'];
const LIC_EU = ['FMGE / NExT — required to practise in India', 'EU-recognised degree — USMLE & PLAB eligible'];

export const COUNTRY: Record<string, CountryProfile> = {
  Russia: {
    tuitionPerYearUSD: 5000, livingCostPerYearUSD: 2000, rating: 4.3, intake: 'September',
    advantages: ['Very low tuition with no capitation/donation', 'English-medium MD (MBBS-equivalent)', 'Government universities, globally recognised', 'Large Indian community & Indian mess'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Health, Russia'],
  },
  Kazakhstan: {
    tuitionPerYearUSD: 4000, livingCostPerYearUSD: 2000, rating: 4.1, intake: 'September',
    advantages: ['Affordable tuition & low living cost', 'English-medium programme', 'NMC & WHO recognised', 'Direct admission on NEET score — no donation'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Health, Kazakhstan'],
  },
  Kyrgyzstan: {
    tuitionPerYearUSD: 4000, livingCostPerYearUSD: 1600, rating: 4.0, intake: 'September / February',
    advantages: ['Among the lowest total cost abroad', 'English-medium programme', 'Simple admission on NEET score', 'Indian mess & hostels'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Education, Kyrgyzstan'],
  },
  Uzbekistan: {
    tuitionPerYearUSD: 4200, livingCostPerYearUSD: 1800, rating: 4.0, intake: 'September',
    advantages: ['Low tuition & living cost', 'English-medium MD', 'Government universities', 'Fast-growing choice for Indian students'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Health, Uzbekistan'],
  },
  Georgia: {
    tuitionPerYearUSD: 6500, livingCostPerYearUSD: 3000, rating: 4.3, intake: 'September / February',
    advantages: ['European standard of education', 'English-medium, USMLE-friendly', 'Safe, student-friendly cities', 'NMC & WHO recognised'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Education, Georgia'],
  },
  Armenia: {
    tuitionPerYearUSD: 4500, livingCostPerYearUSD: 2500, rating: 4.2, intake: 'September',
    advantages: ['Affordable European education', 'English-medium MD', 'Safe & welcoming for Indians', 'NMC & WHO recognised'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Health, Armenia'],
  },
  China: {
    tuitionPerYearUSD: 5000, livingCostPerYearUSD: 2500, rating: 4.3, intake: 'September',
    advantages: ['Well-equipped teaching hospitals', 'English-medium MBBS', 'WHO & NMC recognised', 'Modern infrastructure'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Ministry of Education, China'],
  },
  Philippines: {
    tuitionPerYearUSD: 6000, livingCostPerYearUSD: 3000, rating: 4.2, intake: 'June / November',
    advantages: ['US-pattern curriculum (BS + MD)', 'English is an official language', 'Strong USMLE track record', 'NMC & WHO recognised'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'CHED, Philippines'],
  },
  Nepal: {
    tuitionPerYearUSD: 9000, livingCostPerYearUSD: 2500, rating: 4.2, intake: 'October / November',
    advantages: ['Close to India — similar climate & food', 'Strong clinical exposure', 'NMC-recognised universities', 'No language barrier'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Nepal Medical Council'],
  },
  Bangladesh: {
    tuitionPerYearUSD: 6000, livingCostPerYearUSD: 2000, rating: 4.1, intake: 'January / March',
    advantages: ['SAARC quota seats for Indian students', 'Curriculum & language close to India', 'Affordable total cost', 'NMC & WHO recognised'],
    licensingExams: LIC_STD, recognitions: ['NMC (India)', 'WHO / WFME', 'Bangladesh Medical & Dental Council'],
  },
  Poland: {
    tuitionPerYearUSD: 13000, livingCostPerYearUSD: 6000, rating: 4.6, intake: 'October',
    advantages: ['EU degree, high global ranking', 'USMLE & PLAB friendly', 'Excellent research & infrastructure', 'Recognised across Europe'],
    licensingExams: LIC_EU, recognitions: ['NMC (India)', 'WHO / WFME', 'Polish Ministry of Health', 'EU-recognised'],
  },
};

/** Per-university refinements (established year, official site, sharper tuition/rating). Keyed by id. */
export const OVERRIDES: Record<string, UniOverride> = {
  '6a5a7da074ae724c3a65675e': { established: 1814, website: 'https://kazangmu.ru', tuitionPerYearUSD: 5500, rating: 4.4 }, // Kazan State
  '6a5a7da074ae724c3a656760': { established: 1935, website: 'https://ksmu.info', tuitionPerYearUSD: 5500, rating: 4.4 },   // Kursk State
  '6a5a7da074ae724c3a656761': { established: 1935, tuitionPerYearUSD: 5200, rating: 4.3 },                                 // Volgograd State
  '6a5a7da074ae724c3a65675f': { established: 1932, tuitionPerYearUSD: 4500 },                                              // Bashkir State
  '6a5a7da074ae724c3a656762': { established: 1936, tuitionPerYearUSD: 5000 },                                              // Tver State
  '6a5a7da074ae724c3a656769': { established: 1930, tuitionPerYearUSD: 4500, rating: 4.3 },                                 // Asfendiyarov Kazakh
  '6a5a7da074ae724c3a656771': { established: 1951, tuitionPerYearUSD: 4000 },                                              // Osh State
  '6a5a7da074ae724c3a656763': { established: 1918, website: 'https://tsmu.edu', tuitionPerYearUSD: 8000, rating: 4.4 },     // Tbilisi State
  '6a5a7da074ae724c3a65677c': { established: 1920, website: 'https://ysmu.am', tuitionPerYearUSD: 4500, rating: 4.3 },      // Yerevan State
  '6a5a7da074ae724c3a65677d': { established: 1931, tuitionPerYearUSD: 5000, rating: 4.3 },                                 // China Medical University
  '6a5a7da074ae724c3a65677e': { established: 1947, tuitionPerYearUSD: 5500, rating: 4.3 },                                 // Dalian Medical
  '6a5a7da074ae724c3a656781': { established: 1364, website: 'https://en.uj.edu.pl', tuitionPerYearUSD: 14000, rating: 4.7 }, // Jagiellonian
  '6a5a7da074ae724c3a65677f': { established: 1809, website: 'https://wum.edu.pl/en', tuitionPerYearUSD: 14500, rating: 4.6 }, // Warsaw
  '6a5a7da074ae724c3a656780': { established: 1919, website: 'https://ump.edu.pl/en', tuitionPerYearUSD: 13500, rating: 4.6 }, // Poznan
  '6a5a7da074ae724c3a656777': { established: 1946, tuitionPerYearUSD: 6000, rating: 4.4 },                                 // Dhaka Medical
  '6a5a7da074ae724c3a656773': { established: 1993, website: 'https://bpkihs.edu', tuitionPerYearUSD: 9500, rating: 4.4 },   // BP Koirala
  '6a5a7da074ae724c3a656776': { established: 1994, tuitionPerYearUSD: 9000, rating: 4.3 },                                 // Manipal College Nepal
  '6a5a7da074ae724c3a65676d': { established: 1919, tuitionPerYearUSD: 4500 },                                              // Tashkent State
};
