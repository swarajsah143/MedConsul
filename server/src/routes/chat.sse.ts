/**
 * SSE streaming routes for chat.
 * Uses the raw Node socket to bypass Express 5's async response wrapping.
 */
import { Router, Request, Response } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { aiService } from '../services/ai.service';
import { store } from '../config/database';
import { hasUnlimitedAi, FREE_AI_PER_DAY } from '../utils/plan';

const router = Router();

function getAuth(req: Request): JwtPayload | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return verifyAccessToken(header.slice(7));
  } catch {
    return null;
  }
}

// Per-user daily AI counter (non-premium cap). Kept in the always-present JSON store, keyed by
// user + local day so it resets at midnight. Premium is unlimited so it is never counted.
const aiDayKey = (userId: string) => { const d = new Date(); return `${userId}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function aiCount(userId: string): number { const db = store.load() as any; return db.aiDaily?.[aiDayKey(userId)] || 0; }
function aiBump(userId: string): void { const db = store.load() as any; db.aiDaily = db.aiDaily || {}; const k = aiDayKey(userId); db.aiDaily[k] = (db.aiDaily[k] || 0) + 1; store.save(db); }

function handleSSE(req: Request, res: Response, sessionId: string, action: 'send' | 'regenerate') {
  const user = getAuth(req);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const userId = user.userId;

  const rateCheck = aiService.checkRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ success: false, message: `Rate limit exceeded. Try again in ${rateCheck.retryAfter}s`, retryAfter: rateCheck.retryAfter });
    return;
  }

  const session = aiService.getSession(sessionId, userId);
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  if (action === 'send') {
    const content = req.body?.content;
    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ success: false, message: 'Message content is required' });
      return;
    }
    // Subscription gate: unlimited AI is Premium (₹4,999). Free/Pro get FREE_AI_PER_DAY questions/day.
    if (!hasUnlimitedAi(user) && aiCount(userId) >= FREE_AI_PER_DAY) {
      res.status(402).json({ success: false, upgrade: true, message: `You've used your ${FREE_AI_PER_DAY} free MedAssist questions for today. Upgrade to Premium for unlimited answers.` });
      return;
    }
    aiService.addMessage(sessionId, userId, { role: 'user', content: content.trim() });
    if (!hasUnlimitedAi(user)) aiBump(userId);
  } else {
    aiService.removeLastAssistantMessage(sessionId, userId);
  }

  // Get the underlying Node socket for raw writes
  const socket = req.socket;
  if (!socket || socket.destroyed) {
    res.status(500).json({ success: false, message: 'Connection lost' });
    return;
  }

  // Write HTTP response headers directly to socket
  socket.write(
    'HTTP/1.1 200 OK\r\n' +
    'Content-Type: text/event-stream\r\n' +
    'Cache-Control: no-cache\r\n' +
    'Connection: keep-alive\r\n' +
    `Access-Control-Allow-Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}\r\n` +
    'Access-Control-Allow-Credentials: true\r\n' +
    'X-Accel-Buffering: no\r\n' +
    '\r\n'
  );

  const ac = new AbortController();
  // Abort on client disconnect — watch the SOCKET, not the request.
  // IncomingMessage emits 'close' as soon as the request body has been fully
  // received, so req.on('close') fires immediately on every call and would
  // abort the provider fetch before it is even issued. That went unnoticed
  // while the keyless RAG fallback was in use, because it writes its chunks
  // synchronously and never checks the signal.
  socket.on('close', () => ac.abort());

  aiService.streamResponse(
    sessionId, userId,
    (chunk) => {
      if (!socket.destroyed) {
        socket.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    },
    (fullText) => {
      if (!socket.destroyed) {
        socket.write(`data: ${JSON.stringify({ type: 'done', content: fullText })}\n\n`);
        socket.end();
      }
    },
    ac.signal,
  ).catch((err) => {
    if (err.name === 'AbortError' || err.message === 'Aborted') {
      if (!socket.destroyed) socket.end();
      return;
    }
    if (!socket.destroyed) {
      socket.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'AI error' })}\n\n`);
      socket.end();
    }
  });
}

router.post('/sessions/:id/messages', (req, res) => handleSSE(req, res, req.params.id, 'send'));
router.post('/sessions/:id/regenerate', (req, res) => handleSSE(req, res, req.params.id, 'regenerate'));

export { router as sseRoutes };
