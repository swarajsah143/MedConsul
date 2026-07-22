export interface VideoEntry {
  id: number;
  title: string;
  category: VideoCategory;
  level: string;
  thumbnail: string;
  embedUrl: string;
  duration: string;
}

export type VideoCategory =
  | 'MEDICAL COLLEGE REVIEW INDIA'
  | 'NEET UG COUNSELLING'
  | 'MBBS IN ABROAD'
  | 'MEDICAL COLLEGE REVIEW ABROAD';

export const VIDEO_CATEGORIES: { name: VideoCategory; count: number; color: string }[] = [
  { name: 'MEDICAL COLLEGE REVIEW INDIA', count: 88, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' },
  { name: 'NEET UG COUNSELLING', count: 57, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' },
  { name: 'MBBS IN ABROAD', count: 65, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' },
  { name: 'MEDICAL COLLEGE REVIEW ABROAD', count: 12, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' },
];

const placeholder = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const thumb = (id: number) =>
  `https://images.unsplash.com/photo-${1580281658223 + id * 7}-9b93f18ae9ae?w=400&h=225&fit=crop`;

export const VIDEOS_DATA: VideoEntry[] = [
  // ═══════════════ MEDICAL COLLEGE REVIEW INDIA (88) ═══════════════
  { id: 1, title: 'Dr. D. Y. Patil Medical College Pune Campus Tour | Fees, Seats, Courses & Full Review 2025', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(1), embedUrl: placeholder, duration: '18:42' },
  { id: 2, title: 'Dr Patnam Mahender Reddy Medical College Telangana Review | Fees, Academics, Campus & Facilities', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(2), embedUrl: placeholder, duration: '15:30' },
  { id: 3, title: 'MGM Medical College and Hospital Nerul Campus Tour | Fees, Seats, Academics & Full Review', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(3), embedUrl: placeholder, duration: '14:25' },
  { id: 4, title: 'MGM Medical College and Hospital Navi Mumbai Campus Tour | Fees, Seats, Academics & Full Review', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(4), embedUrl: placeholder, duration: '16:10' },
  { id: 5, title: 'MGM Medical College Vashi Full Campus Tour 2025 | Hostel, Fees, Cutoff, Facilities & More', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(5), embedUrl: placeholder, duration: '20:05' },
  { id: 6, title: 'Dr. DY Patil Medical College Navi Mumbai Review 2025 | Fees, Cutoff, Seats, Campus & Patient Flow', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(6), embedUrl: placeholder, duration: '17:35' },
  { id: 7, title: 'Symbiosis Medical College for Women Pune Review 2025 | Fees, Academics, Campus, Patient flow & More', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(7), embedUrl: placeholder, duration: '19:15' },
  { id: 8, title: 'Apollo Institute Hyderabad MBBS College Review 2025 | Fees, Cutoff, Eligibility, Campus & Academics', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(8), embedUrl: placeholder, duration: '16:50' },
  { id: 9, title: 'Arya Medical College & Hospital Jaipur Review 2025 | Fees, Seats, Cutoff & Campus Tour', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(9), embedUrl: placeholder, duration: '14:40' },
  { id: 10, title: 'Geetanjali Medical College Udaipur Review 2025 | Fees, Seats, Cutoff & Campus Tour', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(10), embedUrl: placeholder, duration: '15:20' },
  { id: 11, title: 'Amrita Medical College Faridabad Review 2025 | Fees, Cutoff, Campus & Academics', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(11), embedUrl: placeholder, duration: '18:10' },
  { id: 12, title: 'AIIMS New Delhi Campus Tour 2025 | Facilities, Hospital & Student Life', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(12), embedUrl: placeholder, duration: '22:30' },
  { id: 13, title: 'Maulana Azad Medical College (MAMC) Delhi Review | Lok Nayak Hospital Tour', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(13), embedUrl: placeholder, duration: '17:45' },
  { id: 14, title: 'Grant Medical College Mumbai Review 2025 | JJ Hospital, Fees & Cutoff Analysis', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(14), embedUrl: placeholder, duration: '16:20' },
  { id: 15, title: 'BMCRI Bengaluru Campus & Victoria Hospital Tour | Karnataka\'s Top Medical College', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(15), embedUrl: placeholder, duration: '19:00' },
  { id: 16, title: 'KMC Manipal Full Campus Tour 2025 | Hostel, Fees, Student Life & Hospital', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(16), embedUrl: placeholder, duration: '24:15' },
  { id: 17, title: 'CMC Vellore Medical College Review | A Medical Legacy Since 1900', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(17), embedUrl: placeholder, duration: '20:40' },
  { id: 18, title: 'AFMC Pune Review 2025 | Military Medical College Life, Fees & Selection Process', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(18), embedUrl: placeholder, duration: '21:10' },
  { id: 19, title: 'JIPMER Puducherry Campus Tour | Fees, Cutoff, Clinical Exposure & Student Life', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(19), embedUrl: placeholder, duration: '18:55' },
  { id: 20, title: 'Seth GS Medical College & KEM Hospital Mumbai Review | One of India\'s Best', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(20), embedUrl: placeholder, duration: '17:30' },
  { id: 21, title: 'Stanley Medical College Chennai Review 2025 | Heritage, Hospital & Student Experience', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(21), embedUrl: placeholder, duration: '15:45' },
  { id: 22, title: 'KGMU Lucknow Full Review 2025 | Asia\'s Largest Hospital, Fees & Campus', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(22), embedUrl: placeholder, duration: '19:20' },
  { id: 23, title: 'Madras Medical College Chennai Review | India\'s 2nd Oldest Medical College', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(23), embedUrl: placeholder, duration: '18:05' },
  { id: 24, title: 'Lady Hardinge Medical College Delhi Review | Premier Women\'s Medical College', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(24), embedUrl: placeholder, duration: '16:40' },
  { id: 25, title: 'B.J. Medical College Ahmedabad Review 2025 | Civil Hospital Tour & Cutoff', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(25), embedUrl: placeholder, duration: '17:15' },
  { id: 26, title: 'IMS-BHU Varanasi Review | Medical College Inside India\'s Largest University', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(26), embedUrl: placeholder, duration: '20:30' },
  { id: 27, title: 'Govt Medical College Thiruvananthapuram Review | Kerala\'s Premier Medical College', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(27), embedUrl: placeholder, duration: '16:55' },
  { id: 28, title: 'SMS Medical College Jaipur Review 2025 | Rajasthan\'s Top Medical Institution', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(28), embedUrl: placeholder, duration: '18:40' },
  { id: 29, title: 'Osmania Medical College Hyderabad Review | 175 Years of Medical Excellence', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(29), embedUrl: placeholder, duration: '17:20' },
  { id: 30, title: 'St. John\'s Medical College Bengaluru | Community Health Focused Review 2025', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(30), embedUrl: placeholder, duration: '15:50' },
  { id: 31, title: 'Sri Ramachandra Medical College Chennai Review | SRIHER Campus Tour 2025', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(31), embedUrl: placeholder, duration: '16:30' },
  { id: 32, title: 'GMCH Chandigarh Review 2025 | Modern Infrastructure & PGIMER Proximity', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(32), embedUrl: placeholder, duration: '14:55' },
  { id: 33, title: 'Topiwala National Medical College Mumbai Review | Nair Hospital Tour', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(33), embedUrl: placeholder, duration: '15:10' },
  { id: 34, title: 'Government Medical College Nagpur Review 2025 | Fees, Cutoff & Hospital', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(34), embedUrl: placeholder, duration: '14:30' },
  { id: 35, title: 'Calcutta Medical College Review 2025 | India\'s Oldest Medical College', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(35), embedUrl: placeholder, duration: '17:00' },
  { id: 36, title: 'PGIMER Chandigarh Campus Review | Not MBBS But Why It Matters', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(36), embedUrl: placeholder, duration: '19:45' },
  { id: 37, title: 'Kasturba Medical College Mangalore Review 2025 | KMC Mangalore vs Manipal', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(37), embedUrl: placeholder, duration: '16:25' },
  { id: 38, title: 'JSS Medical College Mysuru Review 2025 | Fees, Cutoff, Campus & Hospital Tour', category: 'MEDICAL COLLEGE REVIEW INDIA', level: 'All Levels', thumbnail: thumb(38), embedUrl: placeholder, duration: '15:40' },

  // ═══════════════ NEET UG COUNSELLING (57) ═══════════════
  { id: 89, title: 'Karnataka NEET UG 2026 Application Out | Cutoff, Score Required & MBBS Budget Planning', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(89), embedUrl: placeholder, duration: '25:10' },
  { id: 90, title: 'NEET UG 2026: How Was 2025 Counselling Process? Complete Preparation Strategy Explained', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(90), embedUrl: placeholder, duration: '32:45' },
  { id: 91, title: 'NEET 2025 Overall Counselling Analysis | Round-wise Cutoff Trends', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(91), embedUrl: placeholder, duration: '28:20' },
  { id: 92, title: 'Kerala NEET UG 2026 Application Open | Complete Guide for Kerala Students', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(92), embedUrl: placeholder, duration: '22:15' },
  { id: 93, title: 'MCC Counselling Complete Process Explained 2026 | AIQ Round 1, 2, 3 & Mop-up', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(93), embedUrl: placeholder, duration: '35:00' },
  { id: 94, title: 'How to Fill NEET UG Counselling Choices | Choice Filling Strategy for Maximum Chances', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(94), embedUrl: placeholder, duration: '28:30' },
  { id: 95, title: 'State Quota vs All India Quota | Which is Better? Complete Comparison', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(95), embedUrl: placeholder, duration: '20:45' },
  { id: 96, title: 'NEET UG 2025 Closing Rank Analysis | Category-wise Cutoff Trends for 2026', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(96), embedUrl: placeholder, duration: '30:15' },
  { id: 97, title: 'Documents Required for NEET UG Counselling 2026 | Complete Checklist', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(97), embedUrl: placeholder, duration: '18:20' },
  { id: 98, title: 'Maharashtra NEET UG Counselling 2026 | CET Cell Process, Dates & Documents', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(98), embedUrl: placeholder, duration: '24:40' },
  { id: 99, title: 'Tamil Nadu NEET UG Counselling 2026 | 7.5% Govt School Quota Explained', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(99), embedUrl: placeholder, duration: '26:10' },
  { id: 100, title: 'UP NEET UG Counselling 2026 | ABVMU Process, State Quota & Private Colleges', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(100), embedUrl: placeholder, duration: '23:55' },
  { id: 101, title: 'Gujarat NEET UG Counselling 2026 | ACPUGMEC Process & Seat Matrix', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(101), embedUrl: placeholder, duration: '21:30' },
  { id: 102, title: 'Rajasthan NEET UG Counselling 2026 | Rajasthan Medical Education Department Process', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(102), embedUrl: placeholder, duration: '22:40' },
  { id: 103, title: 'Deemed University Counselling 2026 | Complete Process, Fees & Top Colleges', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(103), embedUrl: placeholder, duration: '27:15' },
  { id: 104, title: 'NEET Score 500-550: Which Colleges Can You Get? | Realistic College Prediction', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(104), embedUrl: placeholder, duration: '24:00' },
  { id: 105, title: 'NEET Score 600-650: Government College Options | State-wise Analysis', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(105), embedUrl: placeholder, duration: '26:30' },
  { id: 106, title: 'OBC Category NEET Counselling Guide 2026 | Non-Creamy Layer Certificate & Cutoffs', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(106), embedUrl: placeholder, duration: '22:00' },
  { id: 107, title: 'SC/ST Category NEET Counselling 2026 | Special Provisions & College Options', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(107), embedUrl: placeholder, duration: '20:15' },
  { id: 108, title: 'EWS Category NEET Counselling 2026 | Income Certificate & Eligibility Criteria', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(108), embedUrl: placeholder, duration: '18:45' },
  { id: 109, title: 'Private Medical College Fees in India 2026 | State-wise Comparison & Budget Planning', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(109), embedUrl: placeholder, duration: '30:00' },
  { id: 110, title: 'MBBS vs BDS: Which to Choose in 2026? | Career Prospects & Salary Comparison', category: 'NEET UG COUNSELLING', level: 'All Levels', thumbnail: thumb(110), embedUrl: placeholder, duration: '25:20' },

  // ═══════════════ MBBS IN ABROAD (65) ═══════════════
  { id: 146, title: 'MBBS in Russia 2025 | Fees, Admission, Top Colleges & Complete Guide', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(146), embedUrl: placeholder, duration: '28:00' },
  { id: 147, title: 'MBBS in Philippines 2025 | Fees, Eligibility, Top Colleges & Complete Guide', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(147), embedUrl: placeholder, duration: '24:30' },
  { id: 148, title: 'MBBS in China 2025 | Fees, Admission, Top Colleges & Complete Guide', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(148), embedUrl: placeholder, duration: '26:15' },
  { id: 149, title: 'MBBS in Georgia 2025 | Fees, Living Cost, Top Universities & Indian Student Experience', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(149), embedUrl: placeholder, duration: '22:40' },
  { id: 150, title: 'MBBS in Kazakhstan 2025 | Al-Farabi, Astana Medical & Complete Admission Guide', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(150), embedUrl: placeholder, duration: '20:50' },
  { id: 151, title: 'MBBS in Kyrgyzstan 2025 | KSMA, ISMA & Budget-Friendly Options', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(151), embedUrl: placeholder, duration: '19:30' },
  { id: 152, title: 'MBBS in Bangladesh 2025 | Dhaka Medical, Fees & FMGE Pass Rate', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(152), embedUrl: placeholder, duration: '21:15' },
  { id: 153, title: 'MBBS in Nepal 2025 | KU, BPKIHS, IOM & Indian Student Guide', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(153), embedUrl: placeholder, duration: '18:45' },
  { id: 154, title: 'MBBS in Uzbekistan 2025 | Tashkent Medical, Samarkand & NMC Approved Colleges', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(154), embedUrl: placeholder, duration: '20:00' },
  { id: 155, title: 'MBBS in Ukraine 2025 (Post-War Update) | Is It Safe? Current Status & Alternatives', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(155), embedUrl: placeholder, duration: '25:30' },
  { id: 156, title: 'MBBS Abroad vs India 2025 | Complete Comparison: Fees, Quality, FMGE & Career', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(156), embedUrl: placeholder, duration: '32:00' },
  { id: 157, title: 'FMGE/NEXT Exam Guide 2025 | Pass Rate, Preparation & Tips for Abroad MBBS Graduates', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(157), embedUrl: placeholder, duration: '28:45' },
  { id: 158, title: 'NMC Approved Foreign Medical Colleges 2025 | Complete Updated List', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(158), embedUrl: placeholder, duration: '15:20' },
  { id: 159, title: 'MBBS in Germany 2025 | Free Education, Eligibility & Application Process', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(159), embedUrl: placeholder, duration: '30:10' },
  { id: 160, title: 'MBBS in UK 2025 | UCAT, Medical Schools & Indian Student Experience', category: 'MBBS IN ABROAD', level: 'All Levels', thumbnail: thumb(160), embedUrl: placeholder, duration: '27:20' },

  // ═══════════════ MEDICAL COLLEGE REVIEW ABROAD (12) ═══════════════
  { id: 211, title: 'Peoples\' Friendship University Russia (RUDN) Campus Review 2025', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(211), embedUrl: placeholder, duration: '22:15' },
  { id: 212, title: 'Sechenov University Moscow Medical Academy Review 2025', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(212), embedUrl: placeholder, duration: '24:30' },
  { id: 213, title: 'Tbilisi State Medical University Georgia Review | Campus, Hostel & Indian Students', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(213), embedUrl: placeholder, duration: '20:40' },
  { id: 214, title: 'Kazan Federal University Russia Review 2025 | MBBS Campus Tour', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(214), embedUrl: placeholder, duration: '18:55' },
  { id: 215, title: 'UV Gullas College of Medicine Philippines Review | Indian Students Experience', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(215), embedUrl: placeholder, duration: '19:30' },
  { id: 216, title: 'Osh State University Kyrgyzstan Review 2025 | Fees, Hostel & FMGE Coaching', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(216), embedUrl: placeholder, duration: '17:45' },
  { id: 217, title: 'Almaty Medical University Kazakhstan Review | Campus & Clinical Training', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(217), embedUrl: placeholder, duration: '21:00' },
  { id: 218, title: 'Dhaka National Medical College Bangladesh Review | Fees & Indian Student Life', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(218), embedUrl: placeholder, duration: '16:30' },
  { id: 219, title: 'Tashkent Medical Academy Uzbekistan Review 2025 | NMC Approved Campus Tour', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(219), embedUrl: placeholder, duration: '18:20' },
  { id: 220, title: 'Kathmandu University School of Medicine Nepal Review | KUSMS Campus Tour', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(220), embedUrl: placeholder, duration: '17:10' },
  { id: 221, title: 'European University Georgia Tbilisi | MBBS Campus & Hospital Review 2025', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(221), embedUrl: placeholder, duration: '19:50' },
  { id: 222, title: 'Samarkand State Medical University Uzbekistan Review | Campus & Facilities', category: 'MEDICAL COLLEGE REVIEW ABROAD', level: 'All Levels', thumbnail: thumb(222), embedUrl: placeholder, duration: '16:45' },
];

export const VIDEO_FILTER_OPTIONS = {
  categories: [...new Set(VIDEOS_DATA.map((v) => v.category))] as VideoCategory[],
};
