/**
 * RAG Context Builder
 *
 * 1. Classifies user intent
 * 2. Retrieves relevant data
 * 3. Builds a context-enriched system prompt
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
  | 'eligibility'
  | 'comparison'
  | 'general';

interface IntentPattern {
  intent: Intent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'rank_prediction',
    patterns: [/(?:air|rank)\s*(?:of\s*)?\d/i, /get\s+(?:in|into|with)/i, /chance/i, /eligible/i, /predict/i, /which\s+college/i, /can\s+i\s+get/i],
    keywords: ['rank', 'air', 'get with', 'chances', 'eligible', 'predict', 'which college', 'can i get', 'safe'],
  },
  {
    intent: 'cutoff_query',
    patterns: [/cutoff/i, /closing\s*rank/i, /round\s*\d/i, /last\s*year/i, /previous\s*year/i],
    keywords: ['cutoff', 'closing rank', 'round', 'allotment', 'trend', 'last year', 'previous year', 'opening rank'],
  },
  {
    intent: 'fee_comparison',
    patterns: [/fee/i, /cost/i, /tuition/i, /hostel\s*(?:fee|charge)/i, /afford/i, /expens/i, /cheap/i, /budget/i, /scholarship/i],
    keywords: ['fee', 'cost', 'tuition', 'hostel', 'affordable', 'cheap', 'expensive', 'budget', 'compare fees', 'scholarship', 'total cost'],
  },
  {
    intent: 'document_info',
    patterns: [/document/i, /certificate/i, /checklist/i, /required\s+for\s+admission/i, /what.*(?:bring|carry|need)/i],
    keywords: ['document', 'certificate', 'checklist', 'required', 'needed', 'bring', 'carry', 'reporting', 'tc', 'migration', 'affidavit'],
  },
  {
    intent: 'college_info',
    patterns: [/college/i, /institute/i, /university/i, /review/i, /campus/i, /faculty/i, /about.*(?:aiims|mamc|kmc|cmc|afmc|bmcri|jipmer)/i, /tell\s+me\s+about/i],
    keywords: ['college', 'review', 'campus', 'faculty', 'infrastructure', 'aiims', 'mamc', 'kmc', 'cmc', 'hospital', 'profile', 'about', 'best', 'top'],
  },
  {
    intent: 'process_guidance',
    patterns: [/counselling/i, /process/i, /how\s+to/i, /step/i, /procedure/i, /timeline/i, /registration/i, /choice\s*fill/i, /freeze|float|slide/i, /mop.*up/i, /stray/i],
    keywords: ['counselling', 'process', 'how to', 'step', 'procedure', 'timeline', 'mcc', 'registration', 'choice filling', 'freeze', 'float', 'slide', 'round', 'mop-up', 'stray'],
  },
  {
    intent: 'eligibility',
    patterns: [/eligible/i, /eligibility/i, /age\s*limit/i, /qualification/i, /attempt/i, /who\s+can/i, /criteria/i],
    keywords: ['eligibility', 'age', 'qualification', 'attempt', 'criteria', 'who can', 'minimum marks', 'neet pattern', 'exam pattern'],
  },
  {
    intent: 'comparison',
    patterns: [/(?:vs|versus|compared?\s+to|difference|better)/i, /govt.*private|private.*govt/i, /mbbs.*bds|bds.*mbbs/i],
    keywords: ['vs', 'versus', 'compare', 'difference', 'better', 'which is', 'pros cons', 'government private', 'mbbs bds'],
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

const RAG_SYSTEM_PROMPT = `You are MedAssist, an expert AI counselling assistant for NEET UG medical admissions in India. You are part of the MedCounsel AI platform.

## YOUR PERSONALITY
- You are friendly, encouraging, and supportive — like a helpful senior who has been through the process
- You address students warmly and understand their anxiety about admissions
- You give practical, actionable advice
- You use simple language, avoiding jargon unless explaining it

## CRITICAL RULES
1. Answer using the data provided in the CONTEXT section below. This is your primary knowledge.
2. For general counselling questions (process, eligibility, strategy), you can use your training knowledge about Indian medical admissions in addition to context.
3. For specific data questions (ranks, fees, college details), rely ONLY on the context data. If not available, say so clearly.
4. NEVER fabricate college names, ranks, fees, or statistics.
5. When presenting comparative data, use markdown tables.
6. Be concise but thorough. Use headers, bullet points, and bold text for readability.
7. When discussing ranks/cutoffs, always mention year, round, category, and quota.
8. When discussing fees, clarify if it's annual or total course cost.
9. Always end with a helpful next step or suggestion.

## RESPONSE FORMAT
- Use markdown formatting (## headers, **bold**, bullet lists, tables)
- Start with a direct answer, then elaborate
- For rank queries: mention safe, moderate, and aspirational options
- For process queries: use numbered steps
- Keep responses focused — don't dump all data unless asked
- If the student seems confused, break it down simply

## IMPORTANT CONTEXT
- Current counselling year: NEET UG 2025-2026 cycle
- MCC conducts AIQ counselling; states conduct their own
- NEET is the sole entrance exam for MBBS/BDS in India
- Total MBBS seats in India: ~1,10,000 (Govt ~55,000 + Private ~55,000)
- NEET UG max score: 720`;

/**
 * `params` is forwarded verbatim to every retrieval source. Today it carries `domicile` (the
 * asker's home state) so the fee source can drop state-quota seats they are not eligible for
 * before answering "cheapest college in X" — see DbFeeSource in ./db-sources.
 */
export async function buildContextPrompt(
  query: string,
  params: Record<string, string> = {},
): Promise<{ systemPrompt: string; intent: Intent; chunks: RetrievedChunk[] }> {
  const intent = classifyIntent(query);
  const chunks = await retrieve(query, params);

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
    contextSection = '\n\n## CONTEXT\nNo specific matching data found in the database. Use your general knowledge about Indian medical admissions to help the student.';
  }

  let intentGuidance = '';
  switch (intent) {
    case 'rank_prediction':
      intentGuidance = '\n\n## TASK\nThe student is asking about college eligibility based on their NEET rank. List colleges where their rank falls within range. Categorize as: **Safe choices** (closing rank > their rank), **Moderate** (close to their rank), and **Aspirational** (closing rank < their rank but worth trying in later rounds). Always mention category and quota.';
      break;
    case 'cutoff_query':
      intentGuidance = '\n\n## TASK\nThe student is asking about closing ranks/cutoffs. Present data in a table with college, category, quota, year, round, closing rank, and score. Mention trends if multi-year data is available.';
      break;
    case 'fee_comparison':
      intentGuidance = '\n\n## TASK\nThe student wants to compare fees. Present a comparison table with tuition, hostel, total first-year cost, and seat distribution. Mention any scholarships or fee concessions you know about.';
      break;
    case 'document_info':
      intentGuidance = '\n\n## TASK\nThe student needs document guidance. Organize clearly by section (Online Registration vs Physical Reporting). Mark each as MANDATORY or Conditional. Include practical tips like "carry extra copies" and format requirements.';
      break;
    case 'college_info':
      intentGuidance = '\n\n## TASK\nThe student wants college information. Include: type, location, established year, seats, fees, cutoff range, hospital strength, and notable features. Give an honest, balanced view.';
      break;
    case 'process_guidance':
      intentGuidance = '\n\n## TASK\nThe student needs counselling process guidance. Explain step-by-step with clear, actionable instructions. Mention important deadlines, dos and don\'ts, and common mistakes to avoid.';
      break;
    case 'eligibility':
      intentGuidance = '\n\n## TASK\nThe student is asking about eligibility or exam details. Provide accurate, up-to-date criteria. Be clear about which rules apply to which category.';
      break;
    case 'comparison':
      intentGuidance = '\n\n## TASK\nThe student wants to compare options. Use a clear comparison table or point-by-point analysis. Give your recommendation at the end with reasoning.';
      break;
    default:
      intentGuidance = '\n\n## TASK\nAnswer the student\'s question helpfully. If the question is about medical admissions, use both context and your training knowledge. If it\'s completely unrelated, politely redirect them to NEET/medical admission topics.';
  }

  const systemPrompt = RAG_SYSTEM_PROMPT + contextSection + intentGuidance;

  return { systemPrompt, intent, chunks };
}
