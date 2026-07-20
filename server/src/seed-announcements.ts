/**
 * Seed additional state-wise announcements into MongoDB.
 *
 *   npx tsx server/src/seed-announcements.ts
 *
 * Idempotent: announcements upsert on their natural key (date + title), so running
 * this twice updates the same rows instead of duplicating them. It never deletes —
 * the existing All-India / Tamil Nadu / West Bengal rows are left untouched.
 *
 * Purpose: the announcements list only carried two named states. This adds 2–3
 * realistic NEET-UG 2026 counselling notifications for 16 more states so the new
 * "All States" filter actually has data to filter by.
 */
import { connectDatabase, isMongoConnected } from './config/database';
import { getSchema } from './schema/collections';
import { resource } from './models/resource.model';
import mongoose from 'mongoose';

interface Row {
  date: string;
  title: string;
  announcementType: string;
  state: string;
  shortDescription: string;
  documentLabel: string;
  documentUrl: string;
}

/** Compact row builder — documentUrl is intentionally blank (no real PDFs to link). */
function a(
  date: string,
  state: string,
  announcementType: string,
  title: string,
  shortDescription: string,
  documentLabel = announcementType,
): Row {
  return { date, state, announcementType, title, shortDescription, documentLabel, documentUrl: '' };
}

// 16 states × 2–3 announcements. Dates are spread across the 2026 counselling
// cycle so the month filter has several options; some fall inside the last 60
// days (relative to a mid-2026 "today") and so render with the red "recent" chip.
const ROWS: Row[] = [
  // ── Andhra Pradesh (NTRUHS) ──
  a('2026-07-14', 'Andhra Pradesh', 'Counselling', 'AP NEET UG 2026: Web Options Entry for Round 1 Opens', 'Dr. NTR University of Health Sciences opens web options entry for Round 1 MBBS/BDS counselling.'),
  a('2026-06-28', 'Andhra Pradesh', 'Seat Matrix', 'AP NEET UG 2026: Round 1 Seat Matrix Published', 'Government and private college seat matrix released ahead of Round 1 web options.'),
  a('2026-05-30', 'Andhra Pradesh', 'Public Notice', 'AP NEET UG 2026: Certificate Verification Schedule', 'Slot-wise certificate verification schedule for eligible candidates announced.'),

  // ── Karnataka (KEA) ──
  a('2026-07-16', 'Karnataka', 'Allotment', 'Karnataka NEET UG 2026: Round 1 Provisional Allotment Result', 'KEA publishes provisional seat allotment for Round 1 medical and dental counselling.'),
  a('2026-07-02', 'Karnataka', 'Counselling', 'Karnataka NEET UG 2026: Document Verification & Option Entry', 'KEA opens document verification and online option entry for Round 1.'),
  a('2026-06-10', 'Karnataka', 'Merit list', 'Karnataka NEET UG 2026: Provisional Merit List Released', 'Provisional state merit list for MBBS/BDS admissions published by KEA.'),

  // ── Maharashtra (State CET Cell) ──
  a('2026-07-12', 'Maharashtra', 'Seat Matrix', 'Maharashtra NEET UG 2026: CAP Round 1 Seat Matrix', 'State CET Cell releases the CAP Round 1 seat matrix for government and private colleges.'),
  a('2026-06-25', 'Maharashtra', 'Counselling', 'Maharashtra NEET UG 2026: CAP Registration Begins', 'Online registration and document upload for Centralized Admission Process opens.'),

  // ── Uttar Pradesh (DGME UP) ──
  a('2026-07-09', 'Uttar Pradesh', 'Counselling', 'UP NEET UG 2026: Online Registration for State Counselling', 'DGME Uttar Pradesh opens registration and security-fee payment for state counselling.'),
  a('2026-06-18', 'Uttar Pradesh', 'Public Notice', 'UP NEET UG 2026: Counselling Schedule & Fee Structure', 'Detailed round-wise schedule and fee structure notified for MBBS/BDS aspirants.'),

  // ── Rajasthan (RUHS) ──
  a('2026-07-15', 'Rajasthan', 'Merit list', 'Rajasthan NEET UG 2026: State Merit List Published', 'Rajasthan University of Health Sciences releases the provisional state merit list.'),
  a('2026-06-20', 'Rajasthan', 'Counselling', 'Rajasthan NEET UG 2026: Round 1 Registration & Choice Filling', 'Registration, fee payment and college choice filling for Round 1 begins.'),

  // ── Madhya Pradesh (DME MP) ──
  a('2026-07-08', 'Madhya Pradesh', 'Allotment', 'MP NEET UG 2026: Round 1 Allotment Letters Released', 'Directorate of Medical Education MP publishes Round 1 seat allotment results.'),
  a('2026-06-15', 'Madhya Pradesh', 'Seat Matrix', 'MP NEET UG 2026: Round 1 Seat Availability', 'Government and private MBBS/BDS seat availability for Round 1 released.'),

  // ── Kerala (CEE Kerala) ──
  a('2026-07-11', 'Kerala', 'Counselling', 'Kerala NEET UG 2026: Online Option Registration Opens', 'Commissioner for Entrance Examinations opens online option registration for allotment.'),
  a('2026-06-22', 'Kerala', 'Merit list', 'Kerala NEET UG 2026: Category-wise Rank List Published', 'Category-wise rank list for medical and allied courses released by CEE.'),

  // ── Telangana (KNRUHS) ──
  a('2026-07-13', 'Telangana', 'Seat Matrix', 'Telangana NEET UG 2026: Convener Quota Seat Matrix', 'KNRUHS releases the convener-quota seat matrix for Round 1 web counselling.'),
  a('2026-06-27', 'Telangana', 'Counselling', 'Telangana NEET UG 2026: Web Counselling Registration', 'Online registration and slot booking for certificate verification announced.'),

  // ── Gujarat (ACPUGMEC) ──
  a('2026-07-06', 'Gujarat', 'Counselling', 'Gujarat NEET UG 2026: Round 1 Choice Filling Begins', 'Admission Committee for Professional UG Medical Courses opens Round 1 choice filling.'),
  a('2026-06-12', 'Gujarat', 'Public Notice', 'Gujarat NEET UG 2026: PIN Purchase & Registration Notice', 'Candidates advised to complete PIN purchase and online registration within the window.'),

  // ── Bihar (BCECEB) ──
  a('2026-07-05', 'Bihar', 'Counselling', 'Bihar NEET UG 2026: State Quota Counselling Registration', 'Bihar Combined Entrance Competitive Examination Board opens state-quota registration.'),
  a('2026-06-08', 'Bihar', 'Merit list', 'Bihar NEET UG 2026: Provisional State Merit List', 'Provisional 85% state-quota merit list for MBBS/BDS published by BCECEB.'),

  // ── Delhi (DGHS) ──
  a('2026-07-10', 'Delhi', 'Public Notice', 'Delhi NEET UG 2026: State Quota Counselling Guidelines', 'DGHS Delhi issues eligibility and domicile guidelines for the 85% state quota.'),
  a('2026-06-16', 'Delhi', 'Counselling', 'Delhi NEET UG 2026: Registration for Delhi University Colleges', 'Counselling registration for MAMC, LHMC and UCMS state-quota seats begins.'),

  // ── Punjab (BFUHS) ──
  a('2026-07-07', 'Punjab', 'Seat Matrix', 'Punjab NEET UG 2026: Round 1 Seat Matrix Released', 'Baba Farid University of Health Sciences publishes the Round 1 seat matrix.'),
  a('2026-06-14', 'Punjab', 'Counselling', 'Punjab NEET UG 2026: Online Registration Opens', 'Online registration and prospectus release for state MBBS/BDS counselling.'),

  // ── Haryana (DMER Haryana) ──
  a('2026-07-04', 'Haryana', 'Counselling', 'Haryana NEET UG 2026: Round 1 Registration & Fee Payment', 'DMER Haryana opens Round 1 registration and counselling-fee payment.'),
  a('2026-06-09', 'Haryana', 'Public Notice', 'Haryana NEET UG 2026: Eligibility & Domicile Notice', 'Clarification on domicile and eligibility norms for the Haryana state quota.'),

  // ── Odisha (DMET Odisha) ──
  a('2026-07-03', 'Odisha', 'Merit list', 'Odisha NEET UG 2026: State Rank List Published', 'DMET Odisha releases the provisional state rank list for medical admissions.'),
  a('2026-06-11', 'Odisha', 'Counselling', 'Odisha NEET UG 2026: e-Counselling Registration Begins', 'Online e-counselling registration and document upload window opens.'),

  // ── Jharkhand (JCECEB) ──
  a('2026-07-01', 'Jharkhand', 'Counselling', 'Jharkhand NEET UG 2026: State Counselling Registration', 'Jharkhand Combined Entrance Competitive Examination Board opens registration.'),
  a('2026-06-05', 'Jharkhand', 'Seat Matrix', 'Jharkhand NEET UG 2026: Government College Seat Matrix', 'Seat matrix for government MBBS colleges under the 85% state quota released.'),

  // ── Chhattisgarh (DME Chhattisgarh) ──
  a('2026-06-30', 'Chhattisgarh', 'Counselling', 'Chhattisgarh NEET UG 2026: Round 1 Online Counselling', 'Directorate of Medical Education Chhattisgarh opens Round 1 online counselling.'),
  a('2026-06-06', 'Chhattisgarh', 'Public Notice', 'Chhattisgarh NEET UG 2026: Registration Schedule Notice', 'Round-wise registration and choice-filling schedule notified for aspirants.'),
];

async function main() {
  await connectDatabase();
  if (!isMongoConnected()) {
    console.error('\n  MongoDB is not connected — set MONGODB_URI in the repo-root .env and try again.\n');
    process.exit(1);
  }

  const schema = getSchema('announcements');
  if (!schema) {
    console.error('  announcements schema not found');
    process.exit(1);
  }

  const r = resource(schema);
  const before = await r.count();
  const res = await r.importMany(ROWS, { replace: false });
  const after = await r.count();

  const states = [...new Set(ROWS.map((row) => row.state))];
  console.log(`\n  Announcements seeded across ${states.length} states (2–3 each):`);
  console.log(`    ${states.join(', ')}`);
  console.log(`\n  created: ${res.created}   updated: ${res.updated}`);
  console.log(`  total announcements: ${before} -> ${after}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('\n  Seed failed:', e?.message || e, '\n');
  process.exit(1);
});
