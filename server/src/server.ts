import './config/load-env';

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase, initializeDatabase } from './config/database';
import routes from './routes';
import { sseRoutes } from './routes/chat.sse';

const app = express();

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

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Initialize JSON file store (for chat sessions)
initializeDatabase();

// Start server immediately, connect MongoDB in background
app.listen(env.port, () => {
  console.log(`\n  MedCounsel AI Server running on http://localhost:${env.port}\n`);
});

connectDatabase().catch((err) => {
  console.error('  MongoDB connection failed — auth features will not work until reconnected');
});
