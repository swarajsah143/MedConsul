/**
 * RAG Context Builder
 *
 * 1. Classifies user intent
 * 2. Retrieves relevant data
 * 3. Builds a context-enriched system prompt
 *
 * The AI model receives the real data as context and is instructed to
 * answer ONLY from that data, or state when information is unavailable.
 */

import { retrieve, type RetrievedChunk } from './retriever';

// ── Intent Classification ──────────────────────────────────

export type Intent =
  | 'college_info'
  | 'cutoff_query'
  | 'rank_prediction'
  | 'fee_comparison'
  | 'document_info'
  | 'process_guidance'
  | 'general';

interface IntentPattern {
  intent: Intent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'rank_prediction',
    patterns: [/(?:air|rank)\s*(?:of\s*)?\d/i, /get\s+(?:in|into|with)/i, /chance/i, /eligible/i, /predict/i],
    keywords: ['rank', 'air', 'get with', 'chances', 'eligible', 'predict'],
  },
  {
    intent: 'cutoff_query',
    patterns: [/cutoff/i, /closing\s*rank/i, /round\s*\d/i],
    keywords: ['cutoff', 'closing rank', 'round', 'allotment', 'trend'],
  },
  {
    intent: 'fee_comparison',
    patterns: [/fee/i, /cost/i, /tuition/i, /hostel\s*(?:fee|charge)/i, /afford/i, /expens/i, /cheap/i, /budget/i],
    keywords: ['fee', 'cost', 'tuition', 'hostel', 'affordable', 'cheap', 'expensive', 'budget', 'compare fees'],
  },
  {
    intent: 'document_info',
    patterns: [/document/i, /certificate/i, /checklist/i, /required\s+for\s+admission/i, /what.*(?:bring|carry|need)/i],
    keywords: ['document', 'certificate', 'checklist', 'required', 'needed', 'bring', 'carry', 'reporting'],
  },
  {
    intent: 'college_info',
    patterns: [/college/i, /institute/i, /university/i, /review/i, /campus/i, /faculty/i, /about.*(?:aiims|mamc|kmc|cmc|afmc|bmcri|jipmer)/i],
    keywords: ['college', 'review', 'campus', 'faculty', 'infrastructure', 'aiims', 'mamc', 'kmc', 'cmc'],
  },
  {
    intent: 'process_guidance',
    patterns: [/counselling/i, /process/i, /how\s+to/i, /step/i, /procedure/i, /timeline/i, /registration/i],
    keywords: ['counselling', 'process', 'how to', 'step', 'procedure', 'timeline', 'mcc', 'registration'],
  },
];

export function classifyIntent(query: string): Intent {
  const q = query.toLowerCase();
  let bestIntent: Intent = 'general';
  let bestScore = 0;

  for (const ip of INTENT_PATTERNS) {
    let score = 0;
    for (const p of ip.patterns) {
      if (p.test(q)) score += 2;
    }
    for (const kw of ip.keywords) {
      if (q.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = ip.intent;
    }
  }

  return bestIntent;
}

// ── Context Assembly ───────────────────────────────────────

const RAG_SYSTEM_PROMPT = `You are MedAssist, an expert AI counselling assistant for NEET UG medical admissions in India.

## CRITICAL RULES
1. Answer ONLY using the data provided in the CONTEXT section below.
2. If the user's question cannot be answered from the provided context, say: "I don't have specific data for that in my database. Please check the relevant module in MedCounsel AI or visit the official counselling portal."
3. NEVER fabricate college names, ranks, fees, or any data not present in the context.
4. When presenting data, use markdown tables for comparisons.
5. Be concise but thorough. Structure your response with headers and bullet points.
6. When discussing ranks/cutoffs, always mention the year, round, category, and quota.
7. When discussing fees, always mention whether it's tuition only or total first-year cost.

## RESPONSE FORMAT
- Use markdown formatting (headers, tables, bold, lists)
- For college queries: include name, type, location, key stats
- For cutoff queries: include rank, score, year, round, category
- For fee queries: include tuition, hostel, total, seat counts
- For document queries: separate online registration from physical reporting`;

export function buildContextPrompt(query: string): { systemPrompt: string; intent: Intent; chunks: RetrievedChunk[] } {
  const intent = classifyIntent(query);
  const chunks = retrieve(query);

  // Build context section from retrieved data
  let contextSection = '';

  if (chunks.length > 0) {
    const bySource = new Map<string, RetrievedChunk[]>();
    for (const chunk of chunks) {
      const existing = bySource.get(chunk.source) || [];
      existing.push(chunk);
      bySource.set(chunk.source, existing);
    }

    contextSection = '\n\n## CONTEXT (from MedCounsel AI database)\n';
    for (const [source, sourceChunks] of bySource) {
      contextSection += `\n### Data Source: ${source}\n`;
      for (const chunk of sourceChunks) {
        contextSection += `\n${chunk.content}\n`;
      }
    }
  } else {
    contextSection = '\n\n## CONTEXT\nNo matching data found in the database for this query.';
  }

  // Add intent-specific guidance
  let intentGuidance = '';
  switch (intent) {
    case 'rank_prediction':
      intentGuidance = '\n\n## TASK\nThe user is asking about college eligibility based on their NEET rank. List colleges where their rank falls within the closing rank range. Clearly state which are safe choices vs. borderline. Mention the category and quota for each.';
      break;
    case 'cutoff_query':
      intentGuidance = '\n\n## TASK\nThe user is asking about closing ranks/cutoffs. Present the data in a table format with college, category, quota, year, round, closing rank, and score.';
      break;
    case 'fee_comparison':
      intentGuidance = '\n\n## TASK\nThe user wants to compare fees. Present a comparison table including tuition, hostel, total first-year cost, and seat distribution (govt/mgmt/NRI).';
      break;
    case 'document_info':
      intentGuidance = '\n\n## TASK\nThe user is asking about required documents. Organize by section (Online Registration vs Physical Reporting). Mark each as mandatory or conditional. Include format and important notes.';
      break;
    case 'college_info':
      intentGuidance = '\n\n## TASK\nThe user wants to know about specific colleges. Include key details: type, location, established year, seats, fees, cutoff range, and a brief description.';
      break;
    case 'process_guidance':
      intentGuidance = '\n\n## TASK\nThe user is asking about the counselling process. Explain clearly using numbered steps. If specific process data is not in the context, provide general guidance based on standard MCC/state counselling procedures.';
      break;
    default:
      intentGuidance = '\n\n## TASK\nAnswer the user\'s question using the context data provided. If insufficient data, state what you do have and recommend the relevant MedCounsel AI module.';
  }

  const systemPrompt = RAG_SYSTEM_PROMPT + contextSection + intentGuidance;

  return { systemPrompt, intent, chunks };
}
