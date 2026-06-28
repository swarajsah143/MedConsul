/**
 * RAG Data Retriever
 *
 * Each data source implements the DataSource interface.
 * To add a new source, create a class implementing DataSource and register it
 * in the SOURCES array at the bottom. No other file needs to change.
 */

// ── Data Source Interface ──────────────────────────────────

export interface RetrievedChunk {
  source: string;
  title: string;
  content: string;
  relevance: number; // 0-1
}

export interface DataSource {
  name: string;
  keywords: string[];
  search(query: string, params: Record<string, string>): RetrievedChunk[];
}

// ── Utility ────────────────────────────────────────────────

function matchScore(query: string, text: string): number {
  const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const tLower = text.toLowerCase();
  let matched = 0;
  for (const w of qWords) {
    if (tLower.includes(w)) matched++;
  }
  return qWords.length > 0 ? matched / qWords.length : 0;
}

function extractParam(query: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = query.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

// ── 1. College Reviews Source ──────────────────────────────

const colleges = [
  { name: 'AIIMS, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government', established: 1956, seats: 125, fees: '~1,628/yr', cutoff: 'AIR 1-57 (General)', about: 'India\'s premier medical institute. 2400-bed hospital, world-class research, 110-acre campus.' },
  { name: 'Maulana Azad Medical College (MAMC), New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government', established: 1958, seats: 250, fees: '~4,445/yr', cutoff: 'AIR 60-150 (General)', about: 'Associated with Lok Nayak (2800 beds), GB Pant, and Guru Nanak Eye Centre. 4000+ combined beds.' },
  { name: 'Grant Medical College & Sir JJ Hospital, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Government', established: 1845, seats: 250, fees: '~28,000/yr', cutoff: 'AIR 500-2500 (State)', about: 'One of Asia\'s oldest medical colleges. 1350-bed Sir JJ Hospital. Major trauma center.' },
  { name: 'Bangalore Medical College (BMCRI)', state: 'Karnataka', city: 'Bengaluru', type: 'Government', established: 1955, seats: 250, fees: '~70,150/yr', cutoff: 'AIR 400-1500 (State)', about: 'Karnataka\'s premier govt medical college. Victoria Hospital (900 beds), Vani Vilas (500 beds).' },
  { name: 'Kasturba Medical College (KMC), Manipal', state: 'Karnataka', city: 'Manipal', type: 'Deemed', established: 1953, seats: 250, fees: '~17,80,000/yr', cutoff: 'AIR 15K-45K (Mgmt)', about: 'Under MAHE. 2000-bed NABH hospital. International curriculum, 600-acre campus.' },
  { name: 'Christian Medical College (CMC), Vellore', state: 'Tamil Nadu', city: 'Vellore', type: 'Private', established: 1900, seats: 100, fees: '~52,000/yr', cutoff: 'AIR 2K-6K (General)', about: 'Pioneer in Indian medicine. 2700-bed JCI hospital. First renal transplant in India.' },
  { name: 'Armed Forces Medical College (AFMC), Pune', state: 'Maharashtra', city: 'Pune', type: 'Government', established: 1948, seats: 150, fees: 'Fully funded', cutoff: 'AIR 100-800', about: 'Military medical school. Free education with stipend. 7-14 year service bond.' },
  { name: 'St. John\'s Medical College, Bengaluru', state: 'Karnataka', city: 'Bengaluru', type: 'Private', established: 1963, seats: 150, fees: '~6,25,000/yr', cutoff: 'AIR 8K-25K', about: 'WHO Collaborating Centre. 1200-bed NABH hospital. 135-acre green campus.' },
];

class CollegeSource implements DataSource {
  name = 'College Reviews';
  keywords = ['college', 'university', 'institute', 'medical school', 'aiims', 'mamc', 'kmc', 'cmc', 'afmc', 'bmcri', 'campus', 'faculty', 'hospital', 'infrastructure', 'review', 'profile', 'about', 'government', 'private', 'deemed'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const state = params.state || extractParam(q, [/in\s+(\w[\w\s]*?)(?:\s+state|\s*\?|$)/i, /(\w+)\s+colleges?/i]);
    const type = params.type || extractParam(q, [/(government|private|deemed)\s/i]);

    let results = colleges;
    if (state) results = results.filter((c) => c.state.toLowerCase().includes(state.toLowerCase()) || c.city.toLowerCase().includes(state.toLowerCase()));
    if (type) results = results.filter((c) => c.type.toLowerCase() === type.toLowerCase());

    return results.map((c) => ({
      source: this.name,
      title: c.name,
      content: `**${c.name}** (${c.type}) — ${c.city}, ${c.state}\nEstablished: ${c.established} | Seats: ${c.seats} | Fees: ${c.fees} | Cutoff: ${c.cutoff}\n${c.about}`,
      relevance: matchScore(query, `${c.name} ${c.state} ${c.city} ${c.type} ${c.about}`),
    })).sort((a, b) => b.relevance - a.relevance).slice(0, 6);
  }
}

// ── 2. Closing Rank Insights Source ───────────────────────

const cutoffs = [
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 57, score: 715 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'OBC', quota: 'AIQ', year: 2025, round: 1, rank: 450, score: 686 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'SC', quota: 'AIQ', year: 2025, round: 1, rank: 2700, score: 630 },
  { college: 'MAMC, New Delhi', course: 'MBBS', category: 'General', quota: 'Delhi State', year: 2025, round: 1, rank: 85, score: 710 },
  { college: 'MAMC, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 98, score: 708 },
  { college: 'Grant MC, Mumbai', course: 'MBBS', category: 'General', quota: 'Maharashtra State', year: 2025, round: 1, rank: 1900, score: 683 },
  { college: 'Grant MC, Mumbai', course: 'MBBS', category: 'OBC', quota: 'Maharashtra State', year: 2025, round: 1, rank: 5100, score: 655 },
  { college: 'Grant MC, Mumbai', course: 'BDS', category: 'General', quota: 'Maharashtra State', year: 2025, round: 1, rank: 15420, score: 615 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'General', quota: 'Karnataka State', year: 2025, round: 1, rank: 945, score: 695 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'OBC', quota: 'Karnataka State', year: 2025, round: 1, rank: 3900, score: 662 },
  { college: 'KMC Manipal', course: 'MBBS', category: 'General', quota: 'Management', year: 2025, round: 1, rank: 42150, score: 565 },
  { college: 'KMC Manipal', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 10500, score: 648 },
  { college: 'CMC Vellore', course: 'MBBS', category: 'General', quota: 'Management', year: 2025, round: 1, rank: 5410, score: 662 },
  { college: 'AFMC Pune', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 720, score: 698 },
  { college: 'JIPMER, Puducherry', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 210, score: 705 },
  { college: 'Seth GS / KEM, Mumbai', course: 'MBBS', category: 'General', quota: 'Maharashtra State', year: 2025, round: 1, rank: 650, score: 700 },
  { college: 'Stanley MC, Chennai', course: 'MBBS', category: 'General', quota: 'Tamil Nadu State', year: 2025, round: 1, rank: 2950, score: 660 },
  // Historical
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2024, round: 1, rank: 62, score: 712 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2023, round: 1, rank: 68, score: 710 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'General', quota: 'Karnataka State', year: 2024, round: 1, rank: 1050, score: 692 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'General', quota: 'Karnataka State', year: 2023, round: 1, rank: 1200, score: 688 },
];

class CutoffSource implements DataSource {
  name = 'Closing Rank Insights';
  keywords = ['rank', 'cutoff', 'closing', 'air', 'score', 'neet', 'admission', 'round', 'allotment', 'seat', 'quota', 'category', 'get with', 'chances', 'predict', 'eligible'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();

    // Try to extract rank from query
    const rankMatch = q.match(/(?:air|rank)\s*(?:of\s*)?(\d[\d,]*)/i) || q.match(/(\d{3,6})/);
    const targetRank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : null;
    const category = params.category || extractParam(q, [/(general|obc|sc|st|ews)/i]) || null;

    let results = cutoffs;

    if (targetRank) {
      // Find colleges where the student's rank is within reach
      results = results.filter((c) => c.rank >= targetRank * 0.5 && c.year === 2025);
      results.sort((a, b) => Math.abs(a.rank - targetRank) - Math.abs(b.rank - targetRank));
    }

    if (category) {
      const cat = category.toUpperCase();
      results = results.filter((c) => c.category.toUpperCase() === cat || (!targetRank && c.year === 2025));
    }

    if (!targetRank && !category) {
      results = results.filter((c) => c.year === 2025);
    }

    return results.slice(0, 10).map((c) => ({
      source: this.name,
      title: `${c.college} — ${c.category} ${c.quota}`,
      content: `${c.college} | ${c.course} | ${c.category} | ${c.quota} | ${c.year} R${c.round} | Closing Rank: #${c.rank.toLocaleString()} | Score: ${c.score}`,
      relevance: targetRank ? 1 - Math.abs(c.rank - targetRank) / 100000 : matchScore(query, `${c.college} ${c.category} ${c.quota}`),
    }));
  }
}

// ── 3. Fee & Seat Matrix Source ───────────────────────────

const fees = [
  { name: 'AIIMS, New Delhi', state: 'Delhi', type: 'Government', course: 'MBBS', category: 'General', quota: 'AIQ', tuition: 1628, hostel: 1200, total: 12328, govtSeats: 107, mgmtSeats: 0, nriSeats: 18 },
  { name: 'MAMC, New Delhi', state: 'Delhi', type: 'Government', course: 'MBBS', category: 'General', quota: 'Delhi State', tuition: 4445, hostel: 3600, total: 30045, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'Grant MC, Mumbai', state: 'Maharashtra', type: 'Government', course: 'MBBS', category: 'General', quota: 'Maharashtra State', tuition: 28000, hostel: 18000, total: 83000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'BMCRI, Bengaluru', state: 'Karnataka', type: 'Government', course: 'MBBS', category: 'General', quota: 'Karnataka State', tuition: 70150, hostel: 24000, total: 142150, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'KMC Manipal', state: 'Karnataka', type: 'Deemed', course: 'MBBS', category: 'General', quota: 'Management', tuition: 1780000, hostel: 180000, total: 2255000, govtSeats: 0, mgmtSeats: 200, nriSeats: 50 },
  { name: 'CMC Vellore', state: 'Tamil Nadu', type: 'Private', course: 'MBBS', category: 'General', quota: 'Management', tuition: 52000, hostel: 36000, total: 136000, govtSeats: 60, mgmtSeats: 30, nriSeats: 10 },
  { name: 'AFMC Pune', state: 'Maharashtra', type: 'Government', course: 'MBBS', category: 'General', quota: 'AIQ', tuition: 0, hostel: 0, total: 15000, govtSeats: 130, mgmtSeats: 0, nriSeats: 0 },
  { name: 'JIPMER, Puducherry', state: 'Puducherry', type: 'Government', course: 'MBBS', category: 'General', quota: 'AIQ', tuition: 5750, hostel: 4800, total: 26550, govtSeats: 150, mgmtSeats: 0, nriSeats: 15 },
  { name: 'Seth GS / KEM, Mumbai', state: 'Maharashtra', type: 'Government', course: 'MBBS', category: 'General', quota: 'Maharashtra State', tuition: 35000, hostel: 22000, total: 100000, govtSeats: 180, mgmtSeats: 0, nriSeats: 0 },
  { name: 'St. John\'s, Bengaluru', state: 'Karnataka', type: 'Private', course: 'MBBS', category: 'General', quota: 'Management', tuition: 625000, hostel: 80000, total: 805000, govtSeats: 0, mgmtSeats: 150, nriSeats: 0 },
];

function formatRupees(n: number): string {
  if (n === 0) return 'Free';
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(2)} Lakh`;
  return `Rs ${n.toLocaleString('en-IN')}`;
}

class FeeSource implements DataSource {
  name = 'Fee & Seat Matrix';
  keywords = ['fee', 'fees', 'tuition', 'hostel', 'cost', 'expense', 'affordable', 'cheap', 'expensive', 'seat', 'seats', 'nri', 'management', 'budget', 'compare', 'price'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const state = params.state || extractParam(q, [/in\s+(\w[\w\s]*?)(?:\s+state|\s*\?|$)/i]);
    const type = params.type || extractParam(q, [/(government|private|deemed)/i]);

    let results = fees;
    if (state) results = results.filter((f) => f.state.toLowerCase().includes(state.toLowerCase()));
    if (type) results = results.filter((f) => f.type.toLowerCase() === type.toLowerCase());

    if (q.includes('cheap') || q.includes('affordable') || q.includes('low')) {
      results = [...results].sort((a, b) => a.total - b.total);
    } else if (q.includes('expensive') || q.includes('high')) {
      results = [...results].sort((a, b) => b.total - a.total);
    }

    return results.slice(0, 8).map((f) => ({
      source: this.name,
      title: f.name,
      content: `**${f.name}** (${f.type}, ${f.state})\nTuition: ${formatRupees(f.tuition)} | Hostel: ${formatRupees(f.hostel)} | Total 1st Year: ${formatRupees(f.total)}\nGovt Seats: ${f.govtSeats} | Mgmt Seats: ${f.mgmtSeats} | NRI Seats: ${f.nriSeats}`,
      relevance: matchScore(query, `${f.name} ${f.state} ${f.type} fee cost`),
    }));
  }
}

// ── 4. Document Checklist Source ──────────────────────────

const documents = [
  { name: 'NEET UG Scorecard / Rank Letter', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Download from nta.ac.in. Both scorecard and rank letter needed.' },
  { name: 'NEET UG Admit Card', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Must show photograph, roll number, and exam center.' },
  { name: 'Class 10th Marksheet & Certificate', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'For DOB verification. Name must match NEET application.' },
  { name: 'Class 12th Marksheet & Certificate', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Must show PCB + English aggregate.' },
  { name: 'Aadhar Card / Government Photo ID', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Aadhar universally accepted.' },
  { name: 'Category Certificate (SC/ST/OBC/EWS)', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'OBC must have non-creamy layer clause, issued within last year.' },
  { name: 'Domicile / Residence Certificate', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'Required for state quota. Proves 10-15 years continuous residence.' },
  { name: 'Provisional Allotment Letter', section: 'Physical Reporting', mandatory: true, format: 'A4 Printout', notes: 'Download from MCC/state counselling portal after allotment.' },
  { name: 'Transfer Certificate (TC)', section: 'Physical Reporting', mandatory: true, format: 'Original', notes: 'From last school. May need DEO countersign.' },
  { name: 'Migration Certificate', section: 'Physical Reporting', mandatory: false, format: 'Original', notes: 'Required for AIQ/Deemed if studied in different state.' },
  { name: 'Anti-Ragging Affidavit', section: 'Physical Reporting', mandatory: true, format: 'Stamp Paper', notes: 'Both student and parent sign. Generate at antiragging.in.' },
  { name: 'Medical Fitness Certificate', section: 'Physical Reporting', mandatory: true, format: 'Original', notes: 'From registered MBBS practitioner. Some colleges do own exam.' },
  { name: 'Passport-size Photographs (10 copies)', section: 'Physical Reporting', mandatory: true, format: 'Physical', notes: 'White background, 3.5x4.5cm. Match NEET application photo.' },
  { name: 'Demand Draft / Fee Payment Receipt', section: 'Physical Reporting', mandatory: true, format: 'DD/Receipt', notes: 'Confirm payee name from allotment letter.' },
];

class DocumentSource implements DataSource {
  name = 'Document Checklist';
  keywords = ['document', 'documents', 'certificate', 'marksheet', 'admit card', 'scorecard', 'aadhar', 'domicile', 'caste', 'tc', 'transfer', 'migration', 'affidavit', 'reporting', 'registration', 'checklist', 'required', 'needed', 'prepare', 'bring', 'carry'];

  search(query: string, _params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const isOnline = q.includes('online') || q.includes('registration');
    const isPhysical = q.includes('physical') || q.includes('reporting') || q.includes('bring') || q.includes('carry');

    let results = documents;
    if (isOnline) results = results.filter((d) => d.section === 'Online Registration');
    else if (isPhysical) results = results.filter((d) => d.section === 'Physical Reporting');

    return results.map((d) => ({
      source: this.name,
      title: d.name,
      content: `**${d.name}** [${d.section}] — ${d.mandatory ? 'MANDATORY' : 'Conditional'}\nFormat: ${d.format}\n${d.notes}`,
      relevance: matchScore(query, `${d.name} ${d.notes} ${d.section}`),
    }));
  }
}

// ── Source Registry ────────────────────────────────────────

const SOURCES: DataSource[] = [
  new CollegeSource(),
  new CutoffSource(),
  new FeeSource(),
  new DocumentSource(),
];

/**
 * Retrieve relevant data chunks for a user query.
 * Automatically determines which sources to query based on keyword matching.
 */
export function retrieve(query: string, params: Record<string, string> = {}): RetrievedChunk[] {
  const q = query.toLowerCase();

  // Score each source by keyword relevance
  const scored = SOURCES.map((source) => {
    const kwScore = source.keywords.filter((kw) => q.includes(kw)).length;
    return { source, kwScore };
  });

  // Always include sources with keyword hits; include top 2 if no hits
  let activeSources = scored.filter((s) => s.kwScore > 0).map((s) => s.source);
  if (activeSources.length === 0) {
    activeSources = SOURCES.slice(0, 2); // default to colleges + cutoffs
  }

  // Collect and deduplicate results
  const allChunks: RetrievedChunk[] = [];
  for (const source of activeSources) {
    allChunks.push(...source.search(query, params));
  }

  // Sort by relevance and cap at 12 chunks to stay within token limits
  return allChunks
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 12);
}

/** List all registered data source names (for diagnostics) */
export function listSources(): string[] {
  return SOURCES.map((s) => s.name);
}
