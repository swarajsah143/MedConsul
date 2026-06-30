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
  { name: 'AIIMS, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government', established: 1956, seats: 125, fees: '~1,628/yr', cutoff: 'AIR 1-57 (General)', about: 'India\'s premier medical institute. 2400-bed hospital, world-class research, 110-acre campus. Consistently ranked #1 for medical education in India.' },
  { name: 'Maulana Azad Medical College (MAMC), New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government', established: 1958, seats: 250, fees: '~4,445/yr', cutoff: 'AIR 60-150 (General)', about: 'Associated with Lok Nayak (2800 beds), GB Pant, and Guru Nanak Eye Centre. 4000+ combined beds. One of the best government medical colleges in North India.' },
  { name: 'Grant Medical College & Sir JJ Hospital, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Government', established: 1845, seats: 250, fees: '~28,000/yr', cutoff: 'AIR 500-2500 (State)', about: 'One of Asia\'s oldest medical colleges. 1350-bed Sir JJ Hospital. Major trauma center. Heritage campus in South Mumbai.' },
  { name: 'Bangalore Medical College (BMCRI)', state: 'Karnataka', city: 'Bengaluru', type: 'Government', established: 1955, seats: 250, fees: '~70,150/yr', cutoff: 'AIR 400-1500 (State)', about: 'Karnataka\'s premier govt medical college. Victoria Hospital (900 beds), Vani Vilas (500 beds). Excellent clinical exposure in cardiology and neurology.' },
  { name: 'Kasturba Medical College (KMC), Manipal', state: 'Karnataka', city: 'Manipal', type: 'Deemed', established: 1953, seats: 250, fees: '~17,80,000/yr', cutoff: 'AIR 15K-45K (Mgmt)', about: 'Under MAHE. 2000-bed NABH hospital. International curriculum, 600-acre campus. Known for strong research culture and global alumni network.' },
  { name: 'Christian Medical College (CMC), Vellore', state: 'Tamil Nadu', city: 'Vellore', type: 'Private', established: 1900, seats: 100, fees: '~52,000/yr', cutoff: 'AIR 2K-6K (General)', about: 'Pioneer in Indian medicine. 2700-bed JCI hospital. First renal transplant in India. Extremely affordable for a private college. Known for community medicine.' },
  { name: 'Armed Forces Medical College (AFMC), Pune', state: 'Maharashtra', city: 'Pune', type: 'Government', established: 1948, seats: 150, fees: 'Fully funded', cutoff: 'AIR 100-800', about: 'Military medical school. Free education with stipend. 7-14 year service bond. Excellent infrastructure, discipline, and placement in military hospitals.' },
  { name: 'St. John\'s Medical College, Bengaluru', state: 'Karnataka', city: 'Bengaluru', type: 'Private', established: 1963, seats: 150, fees: '~6,25,000/yr', cutoff: 'AIR 8K-25K', about: 'WHO Collaborating Centre. 1200-bed NABH hospital. 135-acre green campus. Known for community health programs.' },
  { name: 'JIPMER, Puducherry', state: 'Puducherry', city: 'Puducherry', type: 'Government', established: 1823, seats: 200, fees: '~5,750/yr', cutoff: 'AIR 150-500 (General)', about: 'Institute of National Importance. 2400-bed hospital. Free education for Indian students. Strong research output and PhD programs.' },
  { name: 'Seth GS Medical College & KEM Hospital, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Government', established: 1926, seats: 200, fees: '~35,000/yr', cutoff: 'AIR 500-1200 (State)', about: '1800-bed KEM Hospital. One of Mumbai\'s busiest hospitals. Excellent surgical training. Strong alumni network.' },
  { name: 'Madras Medical College, Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Government', established: 1835, seats: 250, fees: '~15,000/yr', cutoff: 'AIR 1000-3000 (State)', about: 'One of India\'s oldest medical colleges. Associated with Rajiv Gandhi Government General Hospital (2000+ beds). Heritage institution.' },
  { name: 'King George\'s Medical University, Lucknow', state: 'Uttar Pradesh', city: 'Lucknow', type: 'Government', established: 1911, seats: 250, fees: '~45,000/yr', cutoff: 'AIR 2000-5000 (State)', about: 'Largest medical university in UP. 4000+ bed hospital complex. Strong in orthopedics and trauma. Huge patient volume.' },
  { name: 'SMS Medical College, Jaipur', state: 'Rajasthan', city: 'Jaipur', type: 'Government', established: 1947, seats: 250, fees: '~35,000/yr', cutoff: 'AIR 3000-7000 (State)', about: 'Premier medical college of Rajasthan. 2700-bed Sawai Man Singh Hospital. Major referral center for western India.' },
  { name: 'B.J. Medical College, Ahmedabad', state: 'Gujarat', city: 'Ahmedabad', type: 'Government', established: 1936, seats: 250, fees: '~20,000/yr', cutoff: 'AIR 2000-5000 (State)', about: 'Gujarat\'s top government medical college. Civil Hospital Ahmedabad (2000+ beds). Known for emergency medicine and trauma care.' },
  { name: 'Government Medical College, Chandigarh', state: 'Chandigarh', city: 'Chandigarh', type: 'Government', established: 1991, seats: 150, fees: '~52,000/yr', cutoff: 'AIR 3000-8000 (State)', about: 'Associated with GMCH-32 and GMSH-16. Modern infrastructure in a planned city. Good faculty-student ratio.' },
  { name: 'Institute of Medical Sciences, BHU, Varanasi', state: 'Uttar Pradesh', city: 'Varanasi', type: 'Government', established: 1960, seats: 140, fees: '~12,000/yr', cutoff: 'AIR 1500-4000 (AIQ)', about: 'Part of Banaras Hindu University. Sir Sunderlal Hospital (1000+ beds). Strong in research and has dedicated trauma center.' },
  { name: 'Lady Hardinge Medical College, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government', established: 1916, seats: 200, fees: '~4,000/yr', cutoff: 'AIR 200-600 (Delhi State)', about: 'Women\'s medical college (now co-ed for PG). Associated with Smt. Sucheta Kriplani Hospital. Excellent location near Connaught Place.' },
  { name: 'Patna Medical College, Patna', state: 'Bihar', city: 'Patna', type: 'Government', established: 1925, seats: 200, fees: '~25,000/yr', cutoff: 'AIR 10000-25000 (State)', about: 'Bihar\'s oldest medical college. Patna Medical College Hospital (1200 beds). Historical institution with improving infrastructure.' },
];

class CollegeSource implements DataSource {
  name = 'College Reviews';
  keywords = ['college', 'university', 'institute', 'medical school', 'aiims', 'mamc', 'kmc', 'cmc', 'afmc', 'bmcri', 'campus', 'faculty', 'hospital', 'infrastructure', 'review', 'profile', 'about', 'government', 'private', 'deemed', 'jipmer', 'kem', 'grant', 'stanley', 'madras', 'patna', 'bhu', 'sms', 'best', 'top'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const state = params.state || extractParam(q, [/in\s+(\w[\w\s]*?)(?:\s+state|\s*\?|$)/i, /(\w+)\s+colleges?/i]);
    const type = params.type || extractParam(q, [/(government|private|deemed)\s/i]);

    let results = colleges;
    if (state) results = results.filter((c) => c.state.toLowerCase().includes(state.toLowerCase()) || c.city.toLowerCase().includes(state.toLowerCase()));
    if (type) results = results.filter((c) => c.type.toLowerCase() === type.toLowerCase());

    // If asking for "top" or "best", sort by cutoff prestige
    if (q.includes('top') || q.includes('best') || q.includes('ranking')) {
      // already in approximate order
    }

    return results.map((c) => ({
      source: this.name,
      title: c.name,
      content: `**${c.name}** (${c.type}) — ${c.city}, ${c.state}\nEstablished: ${c.established} | Seats: ${c.seats} | Fees: ${c.fees} | Cutoff: ${c.cutoff}\n${c.about}`,
      relevance: matchScore(query, `${c.name} ${c.state} ${c.city} ${c.type} ${c.about}`),
    })).sort((a, b) => b.relevance - a.relevance).slice(0, 8);
  }
}

// ── 2. Closing Rank Insights Source ───────────────────────

const cutoffs = [
  // 2025 data
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 57, score: 715 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'OBC', quota: 'AIQ', year: 2025, round: 1, rank: 450, score: 686 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'SC', quota: 'AIQ', year: 2025, round: 1, rank: 2700, score: 630 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'ST', quota: 'AIQ', year: 2025, round: 1, rank: 5500, score: 590 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'EWS', quota: 'AIQ', year: 2025, round: 1, rank: 350, score: 690 },
  { college: 'MAMC, New Delhi', course: 'MBBS', category: 'General', quota: 'Delhi State', year: 2025, round: 1, rank: 85, score: 710 },
  { college: 'MAMC, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 98, score: 708 },
  { college: 'MAMC, New Delhi', course: 'MBBS', category: 'OBC', quota: 'AIQ', year: 2025, round: 1, rank: 750, score: 695 },
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
  { college: 'JIPMER, Puducherry', course: 'MBBS', category: 'OBC', quota: 'AIQ', year: 2025, round: 1, rank: 1200, score: 678 },
  { college: 'Seth GS / KEM, Mumbai', course: 'MBBS', category: 'General', quota: 'Maharashtra State', year: 2025, round: 1, rank: 650, score: 700 },
  { college: 'Stanley MC, Chennai', course: 'MBBS', category: 'General', quota: 'Tamil Nadu State', year: 2025, round: 1, rank: 2950, score: 660 },
  { college: 'Madras MC, Chennai', course: 'MBBS', category: 'General', quota: 'Tamil Nadu State', year: 2025, round: 1, rank: 1200, score: 680 },
  { college: 'KGMU, Lucknow', course: 'MBBS', category: 'General', quota: 'UP State', year: 2025, round: 1, rank: 3500, score: 665 },
  { college: 'KGMU, Lucknow', course: 'MBBS', category: 'OBC', quota: 'UP State', year: 2025, round: 1, rank: 8500, score: 640 },
  { college: 'SMS MC, Jaipur', course: 'MBBS', category: 'General', quota: 'Rajasthan State', year: 2025, round: 1, rank: 5200, score: 658 },
  { college: 'BJ MC, Ahmedabad', course: 'MBBS', category: 'General', quota: 'Gujarat State', year: 2025, round: 1, rank: 4000, score: 665 },
  { college: 'IMS BHU, Varanasi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 2800, score: 668 },
  { college: 'GMC Chandigarh', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2025, round: 1, rank: 5000, score: 660 },
  { college: 'Patna MC, Patna', course: 'MBBS', category: 'General', quota: 'Bihar State', year: 2025, round: 1, rank: 15000, score: 620 },
  { college: 'Patna MC, Patna', course: 'MBBS', category: 'OBC', quota: 'Bihar State', year: 2025, round: 1, rank: 28000, score: 580 },
  { college: 'Lady Hardinge MC', course: 'MBBS', category: 'General', quota: 'Delhi State', year: 2025, round: 1, rank: 350, score: 692 },
  { college: 'St. John\'s, Bengaluru', course: 'MBBS', category: 'General', quota: 'Management', year: 2025, round: 1, rank: 18000, score: 630 },
  // Historical
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2024, round: 1, rank: 62, score: 712 },
  { college: 'AIIMS, New Delhi', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2023, round: 1, rank: 68, score: 710 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'General', quota: 'Karnataka State', year: 2024, round: 1, rank: 1050, score: 692 },
  { college: 'BMCRI, Bengaluru', course: 'MBBS', category: 'General', quota: 'Karnataka State', year: 2023, round: 1, rank: 1200, score: 688 },
  { college: 'JIPMER, Puducherry', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2024, round: 1, rank: 230, score: 703 },
  { college: 'JIPMER, Puducherry', course: 'MBBS', category: 'General', quota: 'AIQ', year: 2023, round: 1, rank: 245, score: 700 },
  { college: 'KGMU, Lucknow', course: 'MBBS', category: 'General', quota: 'UP State', year: 2024, round: 1, rank: 3800, score: 662 },
  { college: 'KGMU, Lucknow', course: 'MBBS', category: 'General', quota: 'UP State', year: 2023, round: 1, rank: 4200, score: 658 },
];

class CutoffSource implements DataSource {
  name = 'Closing Rank Insights';
  keywords = ['rank', 'cutoff', 'closing', 'air', 'score', 'neet', 'admission', 'round', 'allotment', 'seat', 'quota', 'category', 'get with', 'chances', 'predict', 'eligible', 'safe', 'trend', 'obc', 'ews', 'general'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const rankMatch = q.match(/(?:air|rank)\s*(?:of\s*)?(\d[\d,]*)/i) || q.match(/(\d{3,6})/);
    const targetRank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : null;
    const category = params.category || extractParam(q, [/(general|obc|sc|st|ews)/i]) || null;

    let results = cutoffs;

    if (targetRank) {
      // Show colleges the student can potentially get
      const maxReach = targetRank * 1.5;
      results = results.filter((c) => c.rank <= maxReach && c.year === 2025);
      results.sort((a, b) => Math.abs(a.rank - targetRank) - Math.abs(b.rank - targetRank));
    }

    if (category) {
      const cat = category.toUpperCase();
      const filtered = results.filter((c) => c.category.toUpperCase() === cat);
      if (filtered.length > 0) results = filtered;
    }

    if (!targetRank && !category) {
      results = results.filter((c) => c.year === 2025);
    }

    return results.slice(0, 12).map((c) => ({
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
  { name: 'KGMU, Lucknow', state: 'Uttar Pradesh', type: 'Government', course: 'MBBS', category: 'General', quota: 'UP State', tuition: 45000, hostel: 15000, total: 95000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'SMS MC, Jaipur', state: 'Rajasthan', type: 'Government', course: 'MBBS', category: 'General', quota: 'Rajasthan State', tuition: 35000, hostel: 12000, total: 80000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'BJ MC, Ahmedabad', state: 'Gujarat', type: 'Government', course: 'MBBS', category: 'General', quota: 'Gujarat State', tuition: 20000, hostel: 10000, total: 55000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'Madras MC, Chennai', state: 'Tamil Nadu', type: 'Government', course: 'MBBS', category: 'General', quota: 'Tamil Nadu State', tuition: 15000, hostel: 8000, total: 45000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
  { name: 'Patna MC, Patna', state: 'Bihar', type: 'Government', course: 'MBBS', category: 'General', quota: 'Bihar State', tuition: 25000, hostel: 10000, total: 60000, govtSeats: 200, mgmtSeats: 0, nriSeats: 0 },
];

function formatRupees(n: number): string {
  if (n === 0) return 'Free';
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(2)} Lakh`;
  return `Rs ${n.toLocaleString('en-IN')}`;
}

class FeeSource implements DataSource {
  name = 'Fee & Seat Matrix';
  keywords = ['fee', 'fees', 'tuition', 'hostel', 'cost', 'expense', 'affordable', 'cheap', 'expensive', 'seat', 'seats', 'nri', 'management', 'budget', 'compare', 'price', 'scholarship'];

  search(query: string, params: Record<string, string>): RetrievedChunk[] {
    const q = query.toLowerCase();
    const state = params.state || extractParam(q, [/in\s+(\w[\w\s]*?)(?:\s+state|\s*\?|$)/i]);
    const type = params.type || extractParam(q, [/(government|private|deemed)/i]);

    let results = fees;
    if (state) results = results.filter((f) => f.state.toLowerCase().includes(state.toLowerCase()));
    if (type) results = results.filter((f) => f.type.toLowerCase() === type.toLowerCase());

    if (q.includes('cheap') || q.includes('affordable') || q.includes('low') || q.includes('budget')) {
      results = [...results].sort((a, b) => a.total - b.total);
    } else if (q.includes('expensive') || q.includes('high')) {
      results = [...results].sort((a, b) => b.total - a.total);
    }

    return results.slice(0, 10).map((f) => ({
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
  { name: 'Class 12th Marksheet & Certificate', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Must show PCB + English aggregate. Min 50% (40% for reserved).' },
  { name: 'Aadhar Card / Government Photo ID', section: 'Online Registration', mandatory: true, format: 'PDF/JPEG', notes: 'Aadhar universally accepted. Passport also works.' },
  { name: 'Category Certificate (SC/ST/OBC/EWS)', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'OBC must have non-creamy layer clause, issued within last year. EWS certificate valid for one financial year.' },
  { name: 'Domicile / Residence Certificate', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'Required for state quota. Proves 10-15 years continuous residence. Not needed for AIQ.' },
  { name: 'Income Certificate', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'Required for EWS (below 8 LPA). Also needed for some fee concessions.' },
  { name: 'PwD Certificate', section: 'Online Registration', mandatory: false, format: 'PDF', notes: 'Required for PwD quota seats. Must be from designated government authority with 40%+ disability.' },
  { name: 'Provisional Allotment Letter', section: 'Physical Reporting', mandatory: true, format: 'A4 Printout', notes: 'Download from MCC/state counselling portal after allotment. Print 2-3 copies.' },
  { name: 'Transfer Certificate (TC)', section: 'Physical Reporting', mandatory: true, format: 'Original', notes: 'From last school/college. May need DEO countersign in some states.' },
  { name: 'Migration Certificate', section: 'Physical Reporting', mandatory: false, format: 'Original', notes: 'Required for AIQ/Deemed if studied in different state from allotted college.' },
  { name: 'Character/Conduct Certificate', section: 'Physical Reporting', mandatory: true, format: 'Original', notes: 'From school principal or district magistrate. Should be recent (within 6 months).' },
  { name: 'Anti-Ragging Affidavit', section: 'Physical Reporting', mandatory: true, format: 'Stamp Paper', notes: 'Both student and parent sign. Generate at antiragging.in. Two copies required.' },
  { name: 'Medical Fitness Certificate', section: 'Physical Reporting', mandatory: true, format: 'Original', notes: 'From registered MBBS practitioner. Some colleges do their own exam.' },
  { name: 'Passport-size Photographs (10 copies)', section: 'Physical Reporting', mandatory: true, format: 'Physical', notes: 'White background, 3.5x4.5cm. Match NEET application photo. Carry extra.' },
  { name: 'Demand Draft / Fee Payment Receipt', section: 'Physical Reporting', mandatory: true, format: 'DD/Receipt', notes: 'Confirm payee name from allotment letter. Some colleges accept online payment.' },
  { name: 'Gap Year Affidavit', section: 'Physical Reporting', mandatory: false, format: 'Stamp Paper', notes: 'Required if there is a gap year between Class 12 and admission. Notarized on stamp paper.' },
];

class DocumentSource implements DataSource {
  name = 'Document Checklist';
  keywords = ['document', 'documents', 'certificate', 'marksheet', 'admit card', 'scorecard', 'aadhar', 'domicile', 'caste', 'tc', 'transfer', 'migration', 'affidavit', 'reporting', 'registration', 'checklist', 'required', 'needed', 'prepare', 'bring', 'carry', 'gap year', 'pwd', 'income'];

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

// ── 5. Counselling Process & Knowledge Base ──────────────

interface KBEntry {
  title: string;
  content: string;
  tags: string[];
}

const knowledgeBase: KBEntry[] = [
  // ===== MCC AIQ Counselling Process =====
  {
    title: 'MCC AIQ Counselling Overview',
    content: `**MCC All India Quota (AIQ) Counselling** is conducted by the Medical Counselling Committee for 15% of seats in government medical colleges and 100% seats in central institutions (AIIMS, JIPMER, AFMC, etc.).\n\n**Steps:**\n1. **Registration** — Register on mcc.nic.in with NEET credentials. Pay registration fee (General: Rs 1000, SC/ST/PwD: Rs 500).\n2. **Choice Filling** — Fill college + course preferences. You can add up to 500+ choices. Order matters!\n3. **Seat Allotment** — Based on NEET AIR, category, and preferences. Results published on MCC website.\n4. **Reporting** — Report to allotted college within deadline with all original documents.\n5. **Subsequent Rounds** — If not satisfied, participate in Round 2. Mop-up and Stray rounds follow.\n\n**Important:** Failure to report after allotment leads to forfeiture of security deposit and seat.\n\n**Timeline:** Usually August-November for the main rounds.`,
    tags: ['mcc', 'aiq', 'all india quota', 'counselling', 'process', 'registration', 'choice filling', 'seat allotment', 'how to', 'step', 'procedure', 'timeline'],
  },
  {
    title: 'State Counselling Process',
    content: `**State Counselling** is conducted independently by each state for 85% of government college seats and 100% of private/deemed college seats under state quota.\n\n**Key Points:**\n- Each state has its own counselling authority (e.g., DME, CET Cell, KEA)\n- Domicile certificate required for state quota\n- Separate registration from MCC — you must register for both if interested\n- State counselling dates vary; check your state's official portal\n- Some states conduct 2-3 rounds, others have up to 5 rounds + mop-up\n\n**You can participate in BOTH AIQ and state counselling simultaneously.** If allotted in both, you must choose one and surrender the other before the deadline.`,
    tags: ['state counselling', 'state quota', 'domicile', '85%', 'private', 'deemed', 'dme', 'ket', 'kea', 'cet'],
  },
  {
    title: 'Counselling Rounds Explained',
    content: `**Round 1:** First allotment based on NEET AIR and choices. You can Accept (freeze), Float (upgrade attempt), or Slide (upgrade within same institute).\n\n**Round 2:** Vacant seats from Round 1 + newly added seats. Can change preferences. Important for upgrades.\n\n**Mop-up Round:** For seats remaining after Round 2. Open to fresh candidates too (who didn't participate earlier). Usually the last regular round.\n\n**Stray Round:** Final round. Colleges may directly admit from a list. Usually walk-in basis.\n\n**Options after allotment:**\n- **Freeze:** Accept the allotted seat. No further upgradation.\n- **Float:** Accept but allow upgradation to higher preference in next round.\n- **Slide:** Accept but allow upgradation within the same institute only.\n\n**Pro tip:** Always choose "Float" in Round 1 unless you got your top choice. This keeps upgrade possibilities open.`,
    tags: ['round 1', 'round 2', 'round 3', 'mop-up', 'stray', 'freeze', 'float', 'slide', 'upgrade', 'option', 'what happens'],
  },
  {
    title: 'Choice Filling Strategy',
    content: `**Smart Choice Filling Tips:**\n\n1. **Research first** — Use closing rank data from previous years to make realistic choices\n2. **Order matters** — Put your most preferred college+course combination first\n3. **Mix safe and aspirational** — Include colleges above your rank (aspirational), near your rank (realistic), and below your rank (safe/backup)\n4. **Fill maximum choices** — More choices = better chance of allotment\n5. **Consider location** — Factor in city, climate, distance from home\n6. **Check hospital strength** — Clinical exposure depends on attached hospital patient load\n7. **Government > Private** for fees — Govt college fees are 10-100x lower\n8. **Don't leave choices empty** — Even if you think you'll get a top college\n\n**Common mistake:** Filling only 5-10 top colleges and leaving the rest empty. If your rank doesn't match, you get no allotment and lose the round.`,
    tags: ['choice filling', 'strategy', 'tips', 'preference', 'how to fill', 'choices', 'safe', 'aspirational'],
  },
  // ===== Eligibility & Requirements =====
  {
    title: 'NEET UG Eligibility Criteria',
    content: `**Basic Eligibility for NEET UG:**\n\n- **Age:** Minimum 17 years at time of admission (no upper age limit since 2019 Supreme Court ruling)\n- **Qualification:** Class 12 or equivalent with Physics, Chemistry, Biology/Biotechnology and English\n- **Marks:** Minimum 50% aggregate in PCB for General; 40% for SC/ST/OBC; 45% for PwD\n- **Attempts:** No limit on number of attempts\n- **Nationality:** Indian citizens, NRIs, OCIs, PIOs, and foreign nationals can apply\n\n**For NEET UG 2026:**\n- Exam conducted by NTA (National Testing Agency)\n- Single exam for all medical/dental colleges in India (except AIIMS & JIPMER which now merged)\n- Pen-and-paper based exam (OMR sheet)\n- Duration: 3 hours 20 minutes\n- Total marks: 720 (180 questions × 4 marks each, -1 for wrong answer)`,
    tags: ['eligibility', 'neet', 'criteria', 'age', 'marks', 'qualification', 'who can apply', 'attempts', 'exam pattern', 'nta'],
  },
  {
    title: 'Category & Quota Reservations',
    content: `**Category-wise Reservation in Government Medical Colleges:**\n\n- **General (UR):** No reservation, open merit\n- **OBC (Non-Creamy Layer):** 27% reservation in AIQ and central institutions\n- **SC:** 15% reservation\n- **ST:** 7.5% reservation\n- **EWS:** 10% reservation (for General category with family income < 8 LPA)\n- **PwD:** 5% horizontal reservation across all categories\n\n**Quota Types:**\n- **AIQ (All India Quota):** 15% seats in state govt colleges. Based on NEET AIR.\n- **State Quota:** 85% seats in state govt colleges. Need domicile. Based on NEET score + state merit.\n- **Management Quota:** In private/deemed colleges. Higher fees. Based on NEET score.\n- **NRI Quota:** In some colleges. Very high fees. Based on NEET score.\n- **Institutional Quota:** Some colleges have reserved seats for specific categories.\n\n**Important:** You cannot claim both AIQ and state reservation simultaneously. Choose based on where you have a better chance.`,
    tags: ['category', 'reservation', 'obc', 'sc', 'st', 'ews', 'general', 'pwd', 'quota', 'aiq', 'state quota', 'management', 'nri', 'creamy layer'],
  },
  // ===== Practical Advice =====
  {
    title: 'What to Do After NEET Results',
    content: `**Step-by-step After NEET Results:**\n\n1. **Download scorecard** from nta.ac.in\n2. **Calculate your expected rank** using previous year data\n3. **Research colleges** in your rank range — use MedCounsel AI Rank Insights\n4. **Register for MCC AIQ** counselling on mcc.nic.in\n5. **Register for state counselling** on your state's counselling portal\n6. **Prepare all documents** — originals + photocopies + scanned copies\n7. **Start choice filling** when the window opens\n8. **Fill maximum choices** — aspirational + realistic + safe\n9. **Keep documents ready** for immediate reporting after allotment\n10. **Monitor results** and deadlines carefully — missing a deadline = losing seat\n\n**Pro tip:** Create a spreadsheet tracking all deadlines, portals, and login credentials. The counselling process can be overwhelming with multiple simultaneous registrations.`,
    tags: ['after result', 'what to do', 'next steps', 'neet result', 'plan', 'timeline', 'first time', 'beginner'],
  },
  {
    title: 'Government vs Private College',
    content: `**Government vs Private Medical Colleges — Key Differences:**\n\n| Factor | Government | Private/Deemed |\n|--------|-----------|----------------|\n| **Fees** | Rs 5K - 1.5L/year | Rs 5L - 25L/year |\n| **Total MBBS cost** | Rs 1-8 Lakh | Rs 30-1.5 Crore |\n| **Patient load** | Very high (great exposure) | Moderate |\n| **Infrastructure** | Varies (some old) | Usually modern |\n| **Faculty** | Experienced, may be overburdened | Good ratio, more accessible |\n| **Clinical exposure** | Excellent (high OPD/IPD) | Good but less volume |\n| **Bond** | Some states have bond (2-5 yrs) | Usually no bond |\n| **Hostel** | Basic but cheap | Better amenities, costlier |\n\n**Bottom line:** If you can get a government seat, it's almost always the better choice financially. A government college MBBS degree is valued equally (sometimes more) by employers and PG exam committees.\n\n**Exception:** Top deemed universities like KMC Manipal, CMC Vellore offer excellent education but at premium fees.`,
    tags: ['government', 'private', 'deemed', 'compare', 'difference', 'which is better', 'fees comparison', 'choose', 'pros cons'],
  },
  {
    title: 'MBBS vs BDS Decision',
    content: `**MBBS vs BDS — Should You Choose BDS?**\n\n**MBBS:**\n- 5.5 years (4.5 + 1 year internship)\n- Better long-term career prospects\n- Higher earning potential\n- More PG specialization options\n- More competitive (lower closing rank needed)\n\n**BDS:**\n- 5 years (4 + 1 year internship)\n- Easier to get admission (higher closing rank)\n- Good career in private practice\n- Fewer PG seats available\n- Lower initial investment in private practice setup\n\n**Our recommendation:** If your rank allows MBBS in a government college, always prefer it. Consider BDS only if:\n- Your rank doesn't qualify for MBBS anywhere\n- You have genuine interest in dentistry\n- Private college MBBS is unaffordable\n\n**Never drop a year just for MBBS** if you have a government BDS seat — unless you're very confident about improving your rank significantly.`,
    tags: ['mbbs', 'bds', 'dentistry', 'compare', 'which', 'career', 'choose', 'difference', 'better'],
  },
  {
    title: 'Security Deposit & Fee Refund Rules',
    content: `**Security Deposit Rules (MCC AIQ):**\n\n- **Registration deposit:** Rs 10,000 (refundable if you don't get allotment)\n- **After Round 1 allotment:** Rs 1,00,000 security deposit\n- **Forfeiture:** If you don't report or don't join, the full deposit is forfeited\n- **Exit rules:** You can exit after Round 1 by reporting and then choosing "Not to participate in further rounds"\n\n**Fee Refund Rules:**\n- If you surrender seat before start of academic session: Full refund minus Rs 1 Lakh\n- Within 1 month of joining: Refund minus Rs 1 Lakh\n- 1-3 months: 50% refund\n- After 3 months: No refund\n\n**Important:** These rules vary by state. Some states have different deposit amounts and refund policies. Always check the specific counselling body's rules.`,
    tags: ['security deposit', 'deposit', 'refund', 'fee refund', 'forfeit', 'money', 'exit', 'surrender', 'cancel'],
  },
  {
    title: 'NEET UG Exam Pattern & Preparation',
    content: `**NEET UG 2026 Exam Pattern:**\n\n- **Subjects:** Physics, Chemistry, Biology (Botany + Zoology)\n- **Total Questions:** 200 (180 to attempt)\n- **Each subject:** 50 questions (Section A: 35 mandatory, Section B: 15 choose 10)\n- **Marking:** +4 for correct, -1 for wrong, 0 for unattempted\n- **Total Marks:** 720\n- **Duration:** 3 hours 20 minutes\n- **Medium:** 13 languages including English, Hindi, and regional languages\n- **Mode:** Offline (OMR-based)\n\n**Scoring guide for college expectations:**\n- 650+ score (AIR ~1000): AIIMS/JIPMER/top government\n- 600-650 (AIR ~5000): Good government colleges\n- 550-600 (AIR ~15000): Mid-tier government colleges\n- 500-550 (AIR ~40000): Lower-tier government or good private\n- 450-500 (AIR ~80000): Private/deemed colleges\n- Below 450: Limited options, mostly private/management quota`,
    tags: ['exam', 'pattern', 'preparation', 'syllabus', 'marks', 'marking', 'questions', 'duration', 'score', 'expected rank', 'score to rank'],
  },
  {
    title: 'Bond Policy in Medical Colleges',
    content: `**Service Bond in Government Medical Colleges:**\n\nMany state governments impose a service bond on MBBS graduates from government colleges, requiring them to serve in rural areas or government hospitals after completing MBBS.\n\n**State-wise bond overview:**\n- **Rajasthan:** 1 year bond or Rs 15 Lakh penalty\n- **Madhya Pradesh:** 2 years bond or Rs 25 Lakh\n- **UP:** No bond for state quota, 1 year for AIQ\n- **Tamil Nadu:** 2 years or Rs 25 Lakh\n- **Karnataka:** 1 year or Rs 25 Lakh\n- **Maharashtra:** 1 year or Rs 10 Lakh\n- **Bihar:** 3 years or Rs 10 Lakh\n- **AIIMS/JIPMER:** No bond\n- **AFMC:** 7-14 years military service (not a fine-based bond)\n\n**Note:** Bond policies change frequently. Verify with your specific college before admission. Some students prefer to pay the penalty rather than serve, but consider that rural service provides valuable experience.`,
    tags: ['bond', 'service bond', 'rural', 'penalty', 'compulsory', 'years', 'fine', 'serve'],
  },
  {
    title: 'NRI Quota Admissions',
    content: `**NRI Quota in Medical Colleges:**\n\n- Available in private, deemed, and some government colleges\n- **Fees:** 3-10x higher than regular fees (Rs 15-30 Lakh/year typical)\n- **Eligibility:** One parent must be NRI (working abroad) with valid proof\n- **NEET required:** Yes, NEET qualification is mandatory even for NRI quota\n- **Cutoff:** Usually much higher rank (easier to get in) compared to general quota\n\n**Documents needed for NRI quota:**\n- NRI parent's passport copy\n- Visa/work permit copy\n- NRI certificate from Indian embassy\n- Relationship proof (birth certificate)\n- NEET scorecard\n\n**Pro tip:** Some colleges convert unfilled NRI seats to general/management quota in later rounds. Keep watching.`,
    tags: ['nri', 'nri quota', 'abroad', 'foreign', 'nri seats', 'nri fees', 'parent abroad'],
  },
  {
    title: 'Deemed Universities Guide',
    content: `**Deemed Universities for MBBS:**\n\nDeemed universities are autonomous institutions that conduct counselling through MCC for 50% seats (AIQ) and manage 50% seats themselves (management/NRI quota).\n\n**Top Deemed Medical Universities:**\n1. **KMC Manipal** — Rs 17.8L/yr, AIR 10K-45K\n2. **Kasturba Medical College, Mangalore** — Rs 16L/yr, AIR 12K-50K\n3. **JSS Medical College, Mysuru** — Rs 14L/yr, AIR 15K-55K\n4. **Sri Ramachandra Medical College, Chennai** — Rs 18L/yr\n5. **SRM Medical College, Chennai** — Rs 16L/yr\n6. **Amrita Medical College, Kochi** — Rs 15L/yr\n7. **MAHE (Manipal)** — Multiple campuses\n\n**Important:** MCC counselling for deemed universities happens separately from AIQ counselling. Register separately if interested.`,
    tags: ['deemed', 'deemed university', 'manipal', 'kmc', 'jss', 'srm', 'amrita', 'private university'],
  },
];

class KnowledgeBaseSource implements DataSource {
  name = 'NEET Counselling Guide';
  keywords = [
    'counselling', 'process', 'how to', 'step', 'procedure', 'timeline', 'mcc', 'registration',
    'round', 'freeze', 'float', 'slide', 'choice', 'filling', 'strategy', 'eligibility',
    'age', 'attempt', 'reservation', 'obc', 'sc', 'st', 'ews', 'pwd', 'quota', 'aiq',
    'state', 'management', 'nri', 'after result', 'what to do', 'government', 'private',
    'deemed', 'compare', 'difference', 'mbbs', 'bds', 'bond', 'deposit', 'refund',
    'exam', 'pattern', 'score', 'marks', 'preparation', 'explain', 'guide', 'help',
    'mop-up', 'stray', 'upgrade', 'allotment', 'reporting', 'join', 'admit',
    'neet ug', 'nta', 'penalty', 'rural', 'option', 'choose', 'which',
  ];

  search(query: string, _params: Record<string, string>): RetrievedChunk[] {
    return knowledgeBase
      .map((entry) => ({
        source: this.name,
        title: entry.title,
        content: entry.content,
        relevance: matchScore(query, `${entry.title} ${entry.tags.join(' ')}`),
      }))
      .filter((c) => c.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 4);
  }
}

// ── Source Registry ────────────────────────────────────────

const SOURCES: DataSource[] = [
  new CollegeSource(),
  new CutoffSource(),
  new FeeSource(),
  new DocumentSource(),
  new KnowledgeBaseSource(),
];

/**
 * Retrieve relevant data chunks for a user query.
 */
export function retrieve(query: string, params: Record<string, string> = {}): RetrievedChunk[] {
  const q = query.toLowerCase();

  const scored = SOURCES.map((source) => {
    const kwScore = source.keywords.filter((kw) => q.includes(kw)).length;
    return { source, kwScore };
  });

  let activeSources = scored.filter((s) => s.kwScore > 0).map((s) => s.source);
  if (activeSources.length === 0) {
    // Default: knowledge base + colleges + cutoffs
    activeSources = [SOURCES[4], SOURCES[0], SOURCES[1]];
  }

  const allChunks: RetrievedChunk[] = [];
  for (const source of activeSources) {
    allChunks.push(...source.search(query, params));
  }

  return allChunks
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 15);
}

export function listSources(): string[] {
  return SOURCES.map((s) => s.name);
}
