import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
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

app.use(express.json());
app.use(cookieParser());

// SSE streaming routes
app.use('/api/chat', sseRoutes);

app.use('/api', routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Initialize JSON file store (for chat sessions fallback) + connect MongoDB
initializeDatabase();

connectDatabase().then(() => {
  app.listen(env.port, () => {
    console.log(`\n  MedCounsel AI Server running on http://localhost:${env.port}\n`);
  });
});
