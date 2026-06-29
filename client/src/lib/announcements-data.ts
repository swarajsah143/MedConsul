export type AnnouncementType =
  | 'Allotment'
  | 'Counselling'
  | 'Eligible list'
  | 'Last rank'
  | 'List of candidates'
  | 'Merit List'
  | 'Merit list'
  | 'Mock allotment'
  | 'Opening and closing rank'
  | 'Provisional Final list'
  | 'Provisional selection list'
  | 'Public Notice'
  | 'Rank List'
  | 'Rank list'
  | 'Rank wise result'
  | 'Seat Matrix'
  | 'Seat matrix';

export interface Announcement {
  id: number;
  month: string;
  day: string;
  state: string | null;
  announcementType: AnnouncementType;
  title: string;
  shortDescription: string;
  documentLabel: string;
  documentUrl: string | null;
}

const gdrive = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=sharing`;

export const ANNOUNCEMENTS_DATA: Announcement[] = [
  // ═══════════════ JUNE 2026 ═══════════════
  { id: 1, month: 'JUN', day: '25', state: null, announcementType: 'Public Notice', title: 'NTA Re-NEET Provisional Answer Key Released', shortDescription: 'NTA Re-NEET Provisional Answer Key Released', documentLabel: 'Public Notice', documentUrl: gdrive('1SC9IxR7y0nCwoPnSPo0C28U_VPfs5vnj') },
  { id: 2, month: 'JUN', day: '14', state: null, announcementType: 'Public Notice', title: 'Notice Regarding Release of Admit Cards', shortDescription: 'Notice Regarding Release of Admit Cards', documentLabel: 'Public Notice', documentUrl: gdrive('1zQHic8gcUWjwhXFPqDAwKcwls2pSKH42') },
  { id: 3, month: 'JUN', day: '10', state: 'Tamil Nadu', announcementType: 'Counselling', title: 'TN NEET UG 2026 Counselling Registration Opens', shortDescription: 'Tamil Nadu NEET UG 2026 Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 4, month: 'JUN', day: '8', state: 'Karnataka', announcementType: 'Counselling', title: 'KEA NEET UG 2026 Registration Notice', shortDescription: 'Karnataka KEA NEET UG 2026 Registration Notice', documentLabel: 'Counselling', documentUrl: null },

  // ═══════════════ MAY 2026 ═══════════════
  { id: 5, month: 'MAY', day: '22', state: null, announcementType: 'Public Notice', title: 'NTA Notice Regarding Refund of Examination Fee', shortDescription: 'NTA Notice Regarding Refund of Examination Fee', documentLabel: 'Public Notice', documentUrl: gdrive('1XxNxo9jOwygE8J0MZWTjAB7SNEHLzajz') },
  { id: 6, month: 'MAY', day: '22', state: 'Karnataka', announcementType: 'Public Notice', title: 'Notice Regarding confirmation of 12th Standard marks of CBSE, CISCE and other State Board', shortDescription: 'Notice Regarding confirmation of 12th Standard marks', documentLabel: 'Public Notice', documentUrl: null },
  { id: 7, month: 'MAY', day: '16', state: null, announcementType: 'Public Notice', title: 'Frequently Asked Questions (FAQs) on NEET (UG)-2026 Re-examination', shortDescription: 'FAQs on NEET (UG)-2026 Re-examination', documentLabel: 'Public Notice', documentUrl: gdrive('196zytdjXQaAGT2OzpYEZTLF-WmEj69aR') },
  { id: 8, month: 'MAY', day: '15', state: null, announcementType: 'Public Notice', title: 'NTA Conduct of Re-Examination of NEET UG', shortDescription: 'NTA Conduct of Re-Examination of NEET UG', documentLabel: 'Public Notice', documentUrl: gdrive('1_fzZOjtEd1X_h1QNvYGJOiuZHlvhygXv') },
  { id: 9, month: 'MAY', day: '8', state: 'Sikkim', announcementType: 'Counselling', title: 'Applications are Invited for MBBS', shortDescription: 'Sikkim Applications are Invited for MBBS', documentLabel: 'Counselling', documentUrl: gdrive('16hB3aXfjcfC0T5K1535gNTd6uqGDizLo') },
  { id: 10, month: 'MAY', day: '3', state: null, announcementType: 'Public Notice', title: 'NTA Answer Key Released', shortDescription: 'NTA Answer Key Released', documentLabel: 'Public Notice', documentUrl: gdrive('1d4hUyn9V0nOqiF6WT2I3lAgObq72VFbr') },

  // ═══════════════ APRIL 2026 ═══════════════
  { id: 11, month: 'APR', day: '26', state: null, announcementType: 'Public Notice', title: 'NTA Release of Admit Cards for the Candidates', shortDescription: 'NTA Release of Admit Cards for NEET UG 2026', documentLabel: 'Public Notice', documentUrl: gdrive('1RLib0Zu13lN516NH9iItpx1cEiv4ZMap') },
  { id: 12, month: 'APR', day: '12', state: null, announcementType: 'Public Notice', title: 'NTA Notice Advance Intimation of Examination City', shortDescription: 'Advance Intimation of Examination City for NEET UG 2026', documentLabel: 'Public Notice', documentUrl: gdrive('1kSU8HVhDnLpPTSn4JkAsRTfaNECBqEHR') },

  // ═══════════════ FEB 2026 ═══════════════
  { id: 13, month: 'FEB', day: '8', state: null, announcementType: 'Public Notice', title: 'NTA Information Bulletin', shortDescription: 'NTA NEET UG 2026 Information Bulletin Released', documentLabel: 'Public Notice', documentUrl: gdrive('17cKpv4fvA5R6zHULkk1Ql0Hm8yjfyO_V') },

  // ═══════════════ JAN 2026 ═══════════════
  { id: 14, month: 'JAN', day: '28', state: 'Delhi', announcementType: 'Counselling', title: 'IPU Brochure', shortDescription: 'Delhi IPU Brochure for NEET UG Counselling', documentLabel: 'Counselling', documentUrl: gdrive('1jYrv4z3mgbu2PokYInzWPMqBJ9_Y_QO8') },
  { id: 15, month: 'JAN', day: '22', state: 'Kerala', announcementType: 'Counselling', title: 'Documents to be submitted by candidates seeking admissions under NRI category for Medical Courses', shortDescription: 'Kerala NRI Category Document Requirements', documentLabel: 'Counselling', documentUrl: null },
  { id: 16, month: 'JAN', day: '16', state: 'Karnataka', announcementType: 'Counselling', title: 'Information Bulletin and Schedule', shortDescription: 'Karnataka Information Bulletin and Counselling Schedule', documentLabel: 'Counselling', documentUrl: gdrive('1L7IWzzFQkVUDd66yCdy3OYjlk58Ri-tr') },
  { id: 17, month: 'JAN', day: '8', state: 'Gujarat', announcementType: 'Counselling', title: 'Rank wise Result For one more Special Stray Round', shortDescription: 'Gujarat Rank wise Result For Special Stray Round', documentLabel: 'Counselling', documentUrl: gdrive('1MTOL3j2CnSGnHlfX-DxQGeY0OK_NfFvN') },
  { id: 18, month: 'JAN', day: '8', state: 'Gujarat', announcementType: 'Allotment', title: 'One more Special Stray Round Allotment as per order of High Court', shortDescription: 'Gujarat Special Stray Round Allotment by High Court Order', documentLabel: 'Allotment', documentUrl: null },
  { id: 19, month: 'JAN', day: '8', state: 'Gujarat', announcementType: 'Last rank', title: 'Last Rank of one more Special Stray Round', shortDescription: 'Gujarat Last Rank of Special Stray Round', documentLabel: 'Last rank', documentUrl: null },
  { id: 20, month: 'JAN', day: '2', state: 'Andhra Pradesh', announcementType: 'Counselling', title: 'MQ Quota List of Not Reported Candidates', shortDescription: 'Andhra Pradesh MQ Quota List of Not Reported Candidates', documentLabel: 'Counselling', documentUrl: null },
  { id: 21, month: 'JAN', day: '1', state: 'Kerala', announcementType: 'Counselling', title: 'Prospectus for NEET UG', shortDescription: 'Kerala Prospectus for NEET UG Counselling', documentLabel: 'Counselling', documentUrl: null },
  { id: 22, month: 'JAN', day: '1', state: 'Sikkim', announcementType: 'Counselling', title: 'Prospectus', shortDescription: 'Sikkim Prospectus for NEET UG 2026', documentLabel: 'Counselling', documentUrl: null },

  // ═══════════════ DEC 2025 ═══════════════
  { id: 23, month: 'DEC', day: '28', state: 'MCC', announcementType: 'Counselling', title: 'Stray Round Counselling Notice', shortDescription: 'MCC Stray Round Counselling Notice for NEET UG 2025', documentLabel: 'Counselling', documentUrl: null },
  { id: 24, month: 'DEC', day: '22', state: 'Maharashtra', announcementType: 'Allotment', title: 'Stray Round Allotment Result', shortDescription: 'Maharashtra Stray Round MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 25, month: 'DEC', day: '20', state: 'Tamil Nadu', announcementType: 'Allotment', title: 'Mop-up Round Allotment Order', shortDescription: 'Tamil Nadu Mop-up Round MBBS Allotment Order', documentLabel: 'Allotment', documentUrl: null },
  { id: 26, month: 'DEC', day: '18', state: 'Karnataka', announcementType: 'Allotment', title: 'Round 3 Allotment Result', shortDescription: 'Karnataka Round 3 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 27, month: 'DEC', day: '15', state: 'Uttar Pradesh', announcementType: 'Allotment', title: 'Stray Round Allotment', shortDescription: 'UP Stray Round MBBS/BDS Allotment', documentLabel: 'Allotment', documentUrl: null },
  { id: 28, month: 'DEC', day: '12', state: 'Rajasthan', announcementType: 'Counselling', title: 'Mop-up Round Schedule', shortDescription: 'Rajasthan Mop-up Round Counselling Schedule', documentLabel: 'Counselling', documentUrl: null },
  { id: 29, month: 'DEC', day: '10', state: 'West Bengal', announcementType: 'Allotment', title: 'Round 3 Seat Allotment', shortDescription: 'West Bengal Round 3 MBBS Seat Allotment', documentLabel: 'Allotment', documentUrl: null },

  // ═══════════════ NOV 2025 ═══════════════
  { id: 30, month: 'NOV', day: '25', state: 'MCC', announcementType: 'Allotment', title: 'Round 3 Allotment Result', shortDescription: 'MCC AIQ Round 3 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 31, month: 'NOV', day: '22', state: 'MCC', announcementType: 'Seat Matrix', title: 'Round 3 Seat Matrix', shortDescription: 'MCC AIQ Round 3 Updated Seat Matrix', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 32, month: 'NOV', day: '21', state: 'Andhra Pradesh', announcementType: 'Counselling', title: 'MQ Quota Final Allotment Order', shortDescription: 'Andhra Pradesh MQ Quota Final Allotment Order', documentLabel: 'Counselling', documentUrl: null },
  { id: 33, month: 'NOV', day: '20', state: 'Andhra Pradesh', announcementType: 'Seat Matrix', title: 'MQ Quota List of Vacancies For Stray Round III', shortDescription: 'AP MQ Quota Vacancies for Stray Round III', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 34, month: 'NOV', day: '20', state: 'Gujarat', announcementType: 'Counselling', title: 'Final Admitted list MBBS and BDS till Stray Round', shortDescription: 'Gujarat Final Admitted List MBBS/BDS till Stray Round', documentLabel: 'Counselling', documentUrl: null },
  { id: 35, month: 'NOV', day: '18', state: 'Madhya Pradesh', announcementType: 'Allotment', title: 'Round 3 Allotment Result', shortDescription: 'MP Round 3 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 36, month: 'NOV', day: '15', state: 'Telangana', announcementType: 'Allotment', title: 'Round 2 Final Allotment', shortDescription: 'Telangana Round 2 MBBS Final Allotment', documentLabel: 'Allotment', documentUrl: null },
  { id: 37, month: 'NOV', day: '12', state: 'Haryana', announcementType: 'Seat Matrix', title: 'Stray Round Seat Matrix', shortDescription: 'Haryana Stray Round MBBS/BDS Seat Matrix', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 38, month: 'NOV', day: '10', state: 'Puducherry', announcementType: 'Counselling', title: 'Round 3 Admitted Candidates List', shortDescription: 'Puducherry Round 3 Admitted Candidates List', documentLabel: 'Counselling', documentUrl: null },
  { id: 39, month: 'NOV', day: '10', state: 'Gujarat', announcementType: 'Merit list', title: 'Stray Round merit list', shortDescription: 'Gujarat Stray Round Merit List', documentLabel: 'Merit list', documentUrl: null },
  { id: 40, month: 'NOV', day: '8', state: 'Bihar', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'Bihar Round 2 MBBS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 41, month: 'NOV', day: '5', state: 'Odisha', announcementType: 'Allotment', title: 'Round 2 Allotment Order', shortDescription: 'Odisha Round 2 MBBS Allotment Order', documentLabel: 'Allotment', documentUrl: null },
  { id: 42, month: 'NOV', day: '3', state: 'Punjab', announcementType: 'Counselling', title: 'Round 3 Counselling Schedule', shortDescription: 'Punjab Round 3 MBBS/BDS Counselling Schedule', documentLabel: 'Counselling', documentUrl: null },

  // ═══════════════ OCT 2025 ═══════════════
  { id: 43, month: 'OCT', day: '28', state: 'MCC', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'MCC AIQ Round 2 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 44, month: 'OCT', day: '25', state: 'MCC', announcementType: 'Opening and closing rank', title: 'Round 1 Opening and Closing Ranks', shortDescription: 'MCC AIQ Round 1 Opening & Closing Ranks Published', documentLabel: 'Opening and closing rank', documentUrl: null },
  { id: 45, month: 'OCT', day: '23', state: 'Madhya Pradesh', announcementType: 'Counselling', title: 'Revised Names of Participating Medical and Dental Colleges', shortDescription: 'MP Revised List of Participating Colleges', documentLabel: 'Counselling', documentUrl: null },
  { id: 46, month: 'OCT', day: '20', state: 'Maharashtra', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'Maharashtra Round 2 MBBS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 47, month: 'OCT', day: '18', state: 'Tamil Nadu', announcementType: 'Allotment', title: 'Round 2 Allotment Order', shortDescription: 'Tamil Nadu Round 2 MBBS Allotment Order', documentLabel: 'Allotment', documentUrl: null },
  { id: 48, month: 'OCT', day: '15', state: 'Rajasthan', announcementType: 'Allotment', title: 'Round 2 Seat Allotment', shortDescription: 'Rajasthan Round 2 MBBS Seat Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 49, month: 'OCT', day: '12', state: 'Karnataka', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'Karnataka Round 2 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 50, month: 'OCT', day: '10', state: 'Uttar Pradesh', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'UP Round 2 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 51, month: 'OCT', day: '8', state: 'Gujarat', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'Gujarat Round 2 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 52, month: 'OCT', day: '5', state: 'Telangana', announcementType: 'Rank List', title: 'Final Merit List for MBBS/BDS', shortDescription: 'Telangana Final Merit List for MBBS/BDS Admissions', documentLabel: 'Rank List', documentUrl: null },
  { id: 53, month: 'OCT', day: '3', state: 'West Bengal', announcementType: 'Allotment', title: 'Round 2 Allotment Result', shortDescription: 'West Bengal Round 2 MBBS Allotment Result', documentLabel: 'Allotment', documentUrl: null },

  // ═══════════════ SEP 2025 ═══════════════
  { id: 54, month: 'SEP', day: '29', state: 'Madhya Pradesh', announcementType: 'Counselling', title: 'Extension of Last Date of Admission', shortDescription: 'MP Extension of Last Date for Admission Reporting', documentLabel: 'Counselling', documentUrl: null },
  { id: 55, month: 'SEP', day: '28', state: 'MCC', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'MCC AIQ Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 56, month: 'SEP', day: '25', state: 'MCC', announcementType: 'Seat Matrix', title: 'Round 1 Seat Matrix Published', shortDescription: 'MCC AIQ Round 1 Seat Matrix for MBBS/BDS', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 57, month: 'SEP', day: '22', state: 'Maharashtra', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Maharashtra Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 58, month: 'SEP', day: '20', state: 'Tamil Nadu', announcementType: 'Allotment', title: 'Round 1 Allotment Order', shortDescription: 'Tamil Nadu Round 1 MBBS Allotment Order', documentLabel: 'Allotment', documentUrl: null },
  { id: 59, month: 'SEP', day: '18', state: 'Karnataka', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Karnataka Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 60, month: 'SEP', day: '15', state: 'Uttar Pradesh', announcementType: 'Counselling', title: 'Round 1 Notice Regarding Resignation of Admitted Candidates', shortDescription: 'UP Round 1 Resignation Notice', documentLabel: 'Counselling', documentUrl: null },
  { id: 61, month: 'SEP', day: '12', state: 'Rajasthan', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Rajasthan Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 62, month: 'SEP', day: '10', state: 'Gujarat', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Gujarat Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 63, month: 'SEP', day: '8', state: 'Telangana', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Telangana Round 1 MBBS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 64, month: 'SEP', day: '5', state: 'Kerala', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Kerala Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 65, month: 'SEP', day: '3', state: 'Haryana', announcementType: 'Allotment', title: 'Round 1 Allotment Result', shortDescription: 'Haryana Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },

  // ═══════════════ AUG 2025 ═══════════════
  { id: 66, month: 'AUG', day: '28', state: 'MCC', announcementType: 'Counselling', title: 'Choice Filling Window Opens for Round 1', shortDescription: 'MCC AIQ Choice Filling Window Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 67, month: 'AUG', day: '25', state: 'MCC', announcementType: 'Counselling', title: 'Registration for AIQ Counselling 2025', shortDescription: 'MCC AIQ NEET UG 2025 Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 68, month: 'AUG', day: '22', state: 'Maharashtra', announcementType: 'Counselling', title: 'CET Cell Counselling Registration Opens', shortDescription: 'Maharashtra CET Cell NEET UG Counselling Registration', documentLabel: 'Counselling', documentUrl: null },
  { id: 69, month: 'AUG', day: '20', state: 'Karnataka', announcementType: 'Counselling', title: 'KEA Counselling Registration Opens', shortDescription: 'Karnataka KEA NEET UG Counselling Registration', documentLabel: 'Counselling', documentUrl: null },
  { id: 70, month: 'AUG', day: '18', state: 'Tamil Nadu', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Registration Opens', shortDescription: 'Tamil Nadu MBBS/BDS Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 71, month: 'AUG', day: '15', state: 'Uttar Pradesh', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Schedule Released', shortDescription: 'UP MBBS/BDS Counselling Schedule for NEET UG 2025', documentLabel: 'Counselling', documentUrl: null },
  { id: 72, month: 'AUG', day: '14', state: 'Delhi', announcementType: 'Allotment', title: 'Round 1 allotment', shortDescription: 'Delhi Round 1 MBBS/BDS Allotment Result', documentLabel: 'Allotment', documentUrl: null },
  { id: 73, month: 'AUG', day: '12', state: 'Gujarat', announcementType: 'Counselling', title: 'ACPUGMEC Counselling Registration Opens', shortDescription: 'Gujarat ACPUGMEC NEET UG Counselling Registration', documentLabel: 'Counselling', documentUrl: null },
  { id: 74, month: 'AUG', day: '10', state: 'Rajasthan', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Registration', shortDescription: 'Rajasthan MBBS/BDS Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 75, month: 'AUG', day: '8', state: 'Telangana', announcementType: 'Counselling', title: 'KNRUHS Counselling Registration', shortDescription: 'Telangana KNRUHS NEET UG Counselling Registration', documentLabel: 'Counselling', documentUrl: null },
  { id: 76, month: 'AUG', day: '5', state: 'West Bengal', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Schedule', shortDescription: 'West Bengal MBBS/BDS Counselling Schedule Released', documentLabel: 'Counselling', documentUrl: null },
  { id: 77, month: 'AUG', day: '3', state: 'Madhya Pradesh', announcementType: 'Counselling', title: 'DME Counselling Registration Opens', shortDescription: 'MP DME NEET UG Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },
  { id: 78, month: 'AUG', day: '1', state: 'Odisha', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Registration', shortDescription: 'Odisha MBBS/BDS Counselling Registration Opens', documentLabel: 'Counselling', documentUrl: null },

  // ═══════════════ JUL 2025 ═══════════════
  { id: 79, month: 'JUL', day: '30', state: 'MCC', announcementType: 'Counselling', title: 'NEET UG 2025 Counselling Schedule', shortDescription: 'MCC NEET UG 2025 Counselling Schedule Published', documentLabel: 'Counselling', documentUrl: null },
  { id: 80, month: 'JUL', day: '29', state: 'Bihar', announcementType: 'Seat Matrix', title: 'Round 1 seat matrix', shortDescription: 'Bihar Round 1 MBBS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 81, month: 'JUL', day: '28', state: 'MCC', announcementType: 'Seat Matrix', title: 'AIQ Seat Matrix for MBBS/BDS 2025', shortDescription: 'MCC AIQ Seat Matrix Published for NEET UG 2025', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 82, month: 'JUL', day: '25', state: null, announcementType: 'Public Notice', title: 'NEET UG 2025 Result Declared', shortDescription: 'NTA NEET UG 2025 Result and Scorecard Available', documentLabel: 'Public Notice', documentUrl: null },
  { id: 83, month: 'JUL', day: '22', state: 'Maharashtra', announcementType: 'Seat Matrix', title: 'State Quota Seat Matrix Published', shortDescription: 'Maharashtra State Quota MBBS/BDS Seat Matrix', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 84, month: 'JUL', day: '20', state: 'Karnataka', announcementType: 'Seat Matrix', title: 'KEA MBBS/BDS Seat Matrix', shortDescription: 'Karnataka KEA MBBS/BDS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 85, month: 'JUL', day: '18', state: 'Tamil Nadu', announcementType: 'Rank List', title: 'State Merit List for MBBS/BDS', shortDescription: 'Tamil Nadu State Merit List Published', documentLabel: 'Rank List', documentUrl: null },
  { id: 86, month: 'JUL', day: '15', state: 'Uttar Pradesh', announcementType: 'Seat Matrix', title: 'State Quota Seat Matrix', shortDescription: 'UP State Quota MBBS/BDS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 87, month: 'JUL', day: '12', state: 'Gujarat', announcementType: 'Rank List', title: 'State Merit List Published', shortDescription: 'Gujarat State Merit List for MBBS/BDS', documentLabel: 'Rank List', documentUrl: null },
  { id: 88, month: 'JUL', day: '10', state: 'Rajasthan', announcementType: 'Seat Matrix', title: 'State Quota Seat Matrix', shortDescription: 'Rajasthan State Quota MBBS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 89, month: 'JUL', day: '8', state: 'Telangana', announcementType: 'Seat Matrix', title: 'MBBS/BDS Seat Matrix', shortDescription: 'Telangana MBBS/BDS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 90, month: 'JUL', day: '5', state: 'Kerala', announcementType: 'Seat Matrix', title: 'State Quota Seat Matrix for MBBS', shortDescription: 'Kerala State Quota MBBS Seat Matrix Published', documentLabel: 'Seat Matrix', documentUrl: null },
  { id: 91, month: 'JUL', day: '3', state: 'Himachal Pradesh', announcementType: 'Counselling', title: 'MBBS Counselling Schedule Released', shortDescription: 'HP MBBS Counselling Schedule for NEET UG 2025', documentLabel: 'Counselling', documentUrl: null },
  { id: 92, month: 'JUL', day: '1', state: 'Jharkhand', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Registration Opens', shortDescription: 'Jharkhand MBBS/BDS Counselling Registration', documentLabel: 'Counselling', documentUrl: null },
  { id: 93, month: 'JUL', day: '1', state: 'Chhattisgarh', announcementType: 'Counselling', title: 'MBBS/BDS Counselling Schedule', shortDescription: 'Chhattisgarh MBBS/BDS Counselling Schedule Released', documentLabel: 'Counselling', documentUrl: null },
  { id: 94, month: 'JUL', day: '1', state: 'Assam', announcementType: 'Counselling', title: 'MBBS Counselling Registration Opens', shortDescription: 'Assam MBBS Counselling Registration for NEET UG 2025', documentLabel: 'Counselling', documentUrl: null },
];

// Derived filter options
export const ANNOUNCEMENT_FILTER_OPTIONS = {
  states: [...new Set(ANNOUNCEMENTS_DATA.filter((a) => a.state).map((a) => a.state!))].sort(),
  types: [...new Set(ANNOUNCEMENTS_DATA.map((a) => a.announcementType))].sort(),
  months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

export function getRecentAnnouncements(count = 10): Announcement[] {
  const monthOrder: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  return [...ANNOUNCEMENTS_DATA]
    .sort((a, b) => {
      const ma = monthOrder[a.month] ?? 0;
      const mb = monthOrder[b.month] ?? 0;
      if (mb !== ma) return mb - ma;
      return parseInt(b.day) - parseInt(a.day);
    })
    .slice(0, count);
}
