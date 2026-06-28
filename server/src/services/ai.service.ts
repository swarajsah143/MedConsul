/**
 * AI Service with RAG (Retrieval-Augmented Generation)
 *
 * Pipeline: User Query → Intent Classification → Data Retrieval → Context Building → AI Provider
 *
 * When no API key is set, the RAG retriever still runs and generates
 * structured fallback responses from the application data.
 */

import { store } from '../config/database';
import { v4 as uuid } from 'uuid';
import { buildContextPrompt } from './rag/context-builder';
import { retrieve, listSources } from './rag/retriever';

// ── Types ──────────────────────────────────────────────────

export interface ChatMsg {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMsg[];
  createdAt: string;
  updatedAt: string;
}

type StreamCallback = (chunk: string) => void;
type DoneCallback = (fullText: string) => void;

// ── Rate limiter (in-memory) ───────────────────────────────

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let bucket = rateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(userId, bucket);
  }
  if (bucket.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { allowed: true };
}

// ── RAG Fallback Response Generator ────────────────────────
// When no AI API key is set, we generate a formatted response
// directly from the retrieved data chunks.

function generateFallbackFromRAG(query: string): string {
  const { intent, chunks } = buildContextPrompt(query);

  if (chunks.length === 0) {
    return `I don't have specific data matching your query in my database.

You can explore the relevant modules in MedCounsel AI for detailed information:
- **Closing Rank Insights** — cutoff and rank analysis
- **College Reviews** — detailed college profiles
- **Fee & Seat Matrix** — fee comparisons
- **Document Checklist** — admission preparation

> *Try rephrasing your question with specific details like college names, ranks, states, or categories.*`;
  }

  // Group chunks by source
  const bySource = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const existing = bySource.get(chunk.source) || [];
    existing.push(chunk);
    bySource.set(chunk.source, existing);
  }

  let response = '';

  // Add intent-specific header
  switch (intent) {
    case 'rank_prediction':
      response += '## College Options Based on Your Rank\n\n';
      break;
    case 'cutoff_query':
      response += '## Closing Rank Data\n\n';
      break;
    case 'fee_comparison':
      response += '## Fee Comparison\n\n';
      break;
    case 'document_info':
      response += '## Required Documents\n\n';
      break;
    case 'college_info':
      response += '## College Information\n\n';
      break;
    default:
      response += '## Search Results\n\n';
  }

  // Format each source's results
  for (const [source, sourceChunks] of bySource) {
    response += `### From ${source}\n\n`;

    if (source === 'Closing Rank Insights' && sourceChunks.length > 1) {
      // Format as table
      response += '| College | Course | Category | Quota | Year | Rank | Score |\n';
      response += '|---------|--------|----------|-------|------|------|-------|\n';
      for (const chunk of sourceChunks) {
        const parts = chunk.content.split(' | ');
        if (parts.length >= 7) {
          response += `| ${parts.join(' | ')} |\n`;
        } else {
          response += `- ${chunk.content}\n`;
        }
      }
      response += '\n';
    } else if (source === 'Fee & Seat Matrix' && sourceChunks.length > 1) {
      for (const chunk of sourceChunks) {
        response += chunk.content + '\n\n';
      }
    } else {
      for (const chunk of sourceChunks) {
        response += chunk.content + '\n\n';
      }
    }
  }

  response += `\n> *Data sourced from MedCounsel AI database. For interactive analysis, use the dedicated modules.*`;

  return response;
}

// ── Provider call (OpenAI-compatible) ──────────────────────

async function callProvider(
  messages: ChatMsg[],
  onChunk: StreamCallback,
  onDone: DoneCallback,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  // No API key → generate response from RAG data directly
  if (!apiKey) {
    const userMsg = messages.filter((m) => m.role === 'user').pop();
    const text = generateFallbackFromRAG(userMsg?.content || '');
    // In fallback mode, send the complete response.
    // The frontend handles typing animation on its side.
    onChunk(text);
    onDone(text);
    return;
  }

  // Real API call with streaming
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.3, // Lower temperature for factual responses
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI provider error (${res.status}): ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      } catch { /* skip malformed */ }
    }
  }

  onDone(fullText);
}

// ── Session persistence ────────────────────────────────────

function loadSessions(): Record<string, ChatSession> {
  const db = store.load();
  return (db as any).chatSessions || {};
}

function saveSessions(sessions: Record<string, ChatSession>) {
  const db = store.load();
  (db as any).chatSessions = sessions;
  store.save(db);
}

// ── Public API ─────────────────────────────────────────────

export const aiService = {
  checkRateLimit,

  createSession(userId: string): ChatSession {
    const sessions = loadSessions();
    const session: ChatSession = {
      id: uuid(),
      userId,
      title: 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions[session.id] = session;
    saveSessions(sessions);
    return session;
  },

  getSession(sessionId: string, userId: string): ChatSession | null {
    const sessions = loadSessions();
    const s = sessions[sessionId];
    if (!s || s.userId !== userId) return null;
    return s;
  },

  getUserSessions(userId: string): ChatSession[] {
    const sessions = loadSessions();
    return Object.values(sessions)
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  deleteSession(sessionId: string, userId: string): boolean {
    const sessions = loadSessions();
    const s = sessions[sessionId];
    if (!s || s.userId !== userId) return false;
    delete sessions[sessionId];
    saveSessions(sessions);
    return true;
  },

  addMessage(sessionId: string, userId: string, msg: ChatMsg): void {
    const sessions = loadSessions();
    const s = sessions[sessionId];
    if (!s || s.userId !== userId) return;
    s.messages.push(msg);
    if (s.title === 'New conversation' && msg.role === 'user') {
      s.title = msg.content.slice(0, 60) + (msg.content.length > 60 ? '...' : '');
    }
    s.updatedAt = new Date().toISOString();
    saveSessions(sessions);
  },

  removeLastAssistantMessage(sessionId: string, userId: string): void {
    const sessions = loadSessions();
    const s = sessions[sessionId];
    if (!s || s.userId !== userId) return;
    for (let i = s.messages.length - 1; i >= 0; i--) {
      if (s.messages[i].role === 'assistant') {
        s.messages.splice(i, 1);
        break;
      }
    }
    s.updatedAt = new Date().toISOString();
    saveSessions(sessions);
  },

  async streamResponse(
    sessionId: string,
    userId: string,
    onChunk: StreamCallback,
    onDone: DoneCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const sessions = loadSessions();
    const s = sessions[sessionId];
    if (!s || s.userId !== userId) throw new Error('Session not found');

    // Get the latest user message for RAG context building
    const lastUserMsg = s.messages.filter((m) => m.role === 'user').pop();
    const query = lastUserMsg?.content || '';

    // Build RAG-enriched system prompt
    const { systemPrompt } = buildContextPrompt(query);

    const messages: ChatMsg[] = [
      { role: 'system', content: systemPrompt },
      // Include conversation history (last 16 user/assistant messages)
      ...s.messages.filter((m) => m.role !== 'system').slice(-16),
    ];

    await callProvider(messages, onChunk, (fullText) => {
      this.addMessage(sessionId, userId, { role: 'assistant', content: fullText });
      onDone(fullText);
    }, signal);
  },

  /** Expose data source names for diagnostics */
  getDataSources(): string[] {
    return listSources();
  },
};
