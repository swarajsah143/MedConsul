import { DataSource, RetrievedChunk, matchScore, extractParam } from './retriever';
import { resource } from '../../models/resource.model';
import * as S from '../../schema/collections';

/**
 * DB-backed RAG sources.
 *
 * These replace the hardcoded arrays that used to live inside retriever.ts — a
 * second, hand-maintained copy of the app's data in a different shape. That copy
 * was the reason an admin edit could never reach the chatbot: the site would show
 * the new fee while the bot kept quoting the old hardcoded one.
 *
 * Chunk shape is deliberately identical to the static sources, so context-builder
 * and the prompt are unchanged.
 */

const colleges = () => resource(S.colleges);
const ranks = () => resource(S.closingRanks);
const fees = () => resource(S.fees);
const docs = () => resource(S.checklistDocs);
const kb = () => resource(S.knowledgeBase);

/** collegeId -> record, so rank/fee chunks can name the college. */
async function collegeMap(): Promise<Map<string, any>> {
  const all = await colleges().all();
  return new Map(all.map((c: any) => [c.id, c]));
}

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export class DbCollegeSource implements DataSource {
  name = 'College Reviews';
  keywords = ['college', 'university', 'institute', 'medical school', 'aiims', 'mamc', 'kmc', 'cmc', 'afmc', 'bmcri', 'campus', 'faculty', 'hospital', 'infrastructure', 'review', 'profile', 'about', 'government', 'private', 'deemed', 'jipmer', 'kem', 'grant', 'stanley', 'madras', 'patna', 'bhu', 'sms', 'best', 'top'];

  async search(query: string, params: Record<string, string>): Promise<RetrievedChunk[]> {
    const q = query.toLowerCase();
    const state = params.state || extractParam(q, [/in\s+(\w[\w\s]*?)(?:\s+state|\s*\?|$)/i, /(\w+)\s+colleges?/i]);
    const type = params.type || extractParam(q, [/(government|private|deemed)\s/i]);

    let results = await colleges().all();
    if (state) {
      const s = state.toLowerCase();
      results = results.filter((c: any) =>
        c.state?.toLowerCase().includes(s) || c.city?.toLowerCase().includes(s));
    }
    if (type) results = results.filter((c: any) => c.type?.toLowerCase() === type.toLowerCase());

    return results
      .map((c: any) => ({
        source: this.name,
        title: c.name,
        content:
          `**${c.name}** (${c.type}) — ${c.city}, ${c.state}\n` +
          `Established: ${c.established || 'n/a'} | Seats: ${c.totalSeats || 'n/a'}` +
          `${c.annualFees ? ` | Fees: ${c.annualFees}` : ''}` +
          `${c.neetCutoffRange ? ` | Cutoff: ${c.neetCutoffRange}` : ''}\n` +
          `${c.about || c.description || ''}`,
        relevance: matchScore(query, `${c.name} ${(c.aliases || []).join(' ')} ${c.state} ${c.city} ${c.type} ${c.about || ''}`),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  }
}

export class DbCutoffSource implements DataSource {
  name = 'Closing Rank Insights';
  keywords = ['rank', 'cutoff', 'closing', 'air', 'score', 'neet', 'admission', 'round', 'allotment', 'seat', 'quota', 'category', 'get with', 'chances', 'predict', 'eligible', 'safe', 'trend', 'obc', 'ews', 'general'];

  async search(query: string, params: Record<string, string>): Promise<RetrievedChunk[]> {
    const q = query.toLowerCase();
    const rankMatch = q.match(/(?:air|rank)\s*(?:of\s*)?(\d[\d,]*)/i) || q.match(/(\d{3,6})/);
    const targetRank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : null;
    const category = params.category || extractParam(q, [/(general|obc|sc|st|ews)/i]) || null;

    const [rows, cmap] = await Promise.all([ranks().all(), collegeMap()]);
    let results = rows;

    // Latest year present in the data, rather than a hardcoded 2025 — the admin
    // will add new years and the bot must follow without a code change.
    const latestYear = results.reduce((m: number, r: any) => Math.max(m, r.year || 0), 0);

    if (targetRank) {
      const maxReach = targetRank * 1.5;
      results = results.filter((r: any) => r.closingRank <= maxReach && r.year === latestYear);
      results.sort((a: any, b: any) => Math.abs(a.closingRank - targetRank) - Math.abs(b.closingRank - targetRank));
    }
    if (category) {
      const cat = category.toUpperCase();
      const filtered = results.filter((r: any) => String(r.category).toUpperCase() === cat);
      if (filtered.length) results = filtered;
    }
    if (!targetRank && !category) {
      results = results.filter((r: any) => r.year === latestYear);
    }

    // Sort by relevance BEFORE slicing. Slicing first meant that for any question
    // without a numeric rank in it, the 12 rows handed to the model were simply the
    // first 12 in insertion order — not the 12 that actually matched the question.
    return results
      .map((r: any) => {
        const name = cmap.get(r.collegeId)?.name ?? 'Unknown college';
        return {
          source: this.name,
          title: `${name} — ${r.category} ${r.quota}`,
          content: `${name} | ${r.course} | ${r.category} | ${r.quota} | ${r.year} R${r.round} | Closing Rank: #${Number(r.closingRank).toLocaleString()} | Score: ${r.closingScore ?? 'n/a'}`,
          relevance: targetRank
            ? 1 - Math.abs(r.closingRank - targetRank) / 100000
            : matchScore(query, `${name} ${r.category} ${r.quota}`),
        };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 12);
  }
}

export class DbFeeSource implements DataSource {
  name = 'Fee & Seat Matrix';
  keywords = ['fee', 'fees', 'cost', 'tuition', 'hostel', 'expensive', 'cheap', 'affordable', 'deposit', 'scholarship', 'payment', 'seat', 'seats', 'management', 'nri', 'budget', 'lakh', 'price'];

  async search(query: string, params: Record<string, string>): Promise<RetrievedChunk[]> {
    const [rows, cmap] = await Promise.all([fees().all(), collegeMap()]);
    const type = params.type || extractParam(query.toLowerCase(), [/(government|private|deemed)\s/i]);

    let results = rows;
    if (type) {
      results = results.filter((f: any) => cmap.get(f.collegeId)?.type?.toLowerCase() === type.toLowerCase());
    }

    return results
      .map((f: any) => {
        const c = cmap.get(f.collegeId);
        const name = c?.name ?? 'Unknown college';
        return {
          source: this.name,
          title: `${name} — ${f.course} fees`,
          content:
            `${name} (${c?.type ?? '?'}) | ${f.course} | ${f.category} | ${f.quota}\n` +
            `Tuition: ${inr(f.tuitionFee)}/yr | Hostel: ${inr(f.hostelFee)} | Misc: ${inr(f.miscCharges)} | ` +
            `Deposit: ${inr(f.securityDeposit)} | First-year total: ${inr(f.totalFirstYear)}\n` +
            `Seats — Govt: ${f.govtSeats ?? 0}, Management: ${f.mgmtSeats ?? 0}, NRI: ${f.nriSeats ?? 0}` +
            `${f.scholarships?.length ? `\nScholarships: ${f.scholarships.join('; ')}` : ''}`,
          relevance: matchScore(query, `${name} ${f.course} ${f.category} ${f.quota} fees`),
        };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  }
}

export class DbDocumentSource implements DataSource {
  name = 'Document Checklist';
  keywords = ['document', 'documents', 'certificate', 'checklist', 'required', 'need', 'carry', 'bring', 'proof', 'original', 'photocopy', 'aadhaar', 'admit card', 'scorecard', 'allotment letter', 'reporting', 'registration'];

  async search(query: string, _params: Record<string, string>): Promise<RetrievedChunk[]> {
    const rows = await docs().all();
    return rows
      .map((d: any) => ({
        source: this.name,
        title: d.name,
        content:
          `**${d.name}** (${d.section === 'online' ? 'Online registration' : 'Physical reporting'})` +
          ` — ${d.mandatory ? 'Mandatory' : 'Optional'}\n` +
          `${d.format ? `Format: ${d.format}` : ''}${d.fileSize ? ` | Size: ${d.fileSize}` : ''}\n` +
          `${d.notes || ''}`,
        relevance: matchScore(query, `${d.name} ${d.notes || ''} ${d.format || ''}`),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  }
}

export class DbKnowledgeBaseSource implements DataSource {
  name = 'NEET Counselling Guide';
  keywords = ['what', 'how', 'when', 'why', 'process', 'counselling', 'counseling', 'mcc', 'procedure', 'step', 'explain', 'guide', 'help', 'mop up', 'stray', 'choice filling', 'locking', 'security'];

  async search(query: string, _params: Record<string, string>): Promise<RetrievedChunk[]> {
    const rows = await kb().all();
    return rows
      .map((k: any) => ({
        source: this.name,
        title: k.title,
        content: k.content,
        relevance: matchScore(query, `${k.title} ${(k.tags || []).join(' ')} ${k.content}`),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 4);
  }
}

export const DB_SOURCES: DataSource[] = [
  new DbCollegeSource(),
  new DbCutoffSource(),
  new DbFeeSource(),
  new DbDocumentSource(),
  new DbKnowledgeBaseSource(),
];
