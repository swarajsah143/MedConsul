import './config/load-env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase, initializeDatabase } from './config/database';
import routes from './routes';
import { sseRoutes } from './routes/chat.sse';
import { startScheduler } from './jobs/scheduler';
import { apiLimiter } from './middlewares/rate-limit';

const app = express();

// Behind nginx — trust the first proxy so req.ip is the real client (X-Forwarded-For), which the
// rate limiters key on. Without this every request would look like 127.0.0.1.
app.set('trust proxy', 1);

// Baseline security headers (HSTS, no-sniff, frameguard/deny, referrer-policy). CSP is disabled
// here because this process serves only the JSON/file API — nginx serves the HTML.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: env.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Default is 100kb, which a bulk import (CSV of rank rows, or 30 colleges of
// review prose) blows past instantly with an opaque PayloadTooLargeError.
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

// SSE streaming routes. Mounted BEFORE compression on purpose: gzip buffers the response,
// which would break the token-by-token chat stream. SSE requests are handled here and never
// reach the compression middleware below.
app.use('/api/chat', sseRoutes);

// gzip the JSON API — the closingRanks (6.6k rows) and facet responses are the payloads that
// matter for students on mobile data. ~5-8x smaller on the wire.
app.use(compression());

// Generous global abuse ceiling on the REST API (the strict per-endpoint auth limiter lives in
// auth.routes.ts). Applied after SSE so the chat stream is unaffected.
app.use('/api', apiLimiter);

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Initialize JSON file store (for chat sessions)
initializeDatabase();

// Start server immediately, connect MongoDB in background
app.listen(env.port, () => {
  console.log(`\n  MedCounsel AI Server running on http://localhost:${env.port}\n`);
  // Nudge contributors who cloned the repo without an AI key. The chatbot still works
  // (keyless offline fallback), but a free Groq key unlocks the conversational answers.
  if (!process.env.AI_API_KEY) {
    console.log('  MedAssist AI: AI_API_KEY not set — running the keyless offline fallback.');
    console.log('  Add a free Groq key to .env for full ChatGPT-style answers (see .env.example).\n');
  }
});

connectDatabase().catch((err) => {
  console.error('  MongoDB connection failed — auth features will not work until reconnected');
});

// Reminder scheduler (daily + boot catch-up). Idempotent and no-ops when SMTP/Mongo aren't ready.
startScheduler();
