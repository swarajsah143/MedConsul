import './load-env';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let mongoConnected = false;

export function isMongoConnected() {
  return mongoConnected;
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('  MONGODB_URI not set — using JSON file database');
    return;
  }

  // Keep the flag tracking reality. mongoose auto-reconnects in the background, but without
  // these listeners mongoConnected would freeze at whatever the initial connect left it — so a
  // cluster that came up a moment after boot would still be treated as down until a restart.
  mongoose.connection.on('connected', () => { mongoConnected = true; });
  mongoose.connection.on('disconnected', () => { mongoConnected = false; });

  try {
    // 30s, not 8s: on a high-latency link the initial SRV lookup + replica-set discovery + TLS
    // handshake to all three Atlas shards routinely takes longer than 8s. The old ceiling made the
    // app fall back to the JSON store even though the cluster was fully reachable (mongosh, at its
    // 30s default, connected and pinged fine from the same machine). Match that tolerance.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    mongoConnected = true;
    console.log('  MongoDB connected successfully');
  } catch (err: any) {
    console.warn('  MongoDB unavailable:', err.message?.split('\n')[0] || err);
    console.log('  Falling back to JSON file database');
  }
}

// ── JSON file store (fallback when MongoDB is unavailable) ──

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  users?: Record<string, any>;
  refreshTokens?: Record<string, any>;
  passwordResets?: Record<string, any>;
  chatSessions?: Record<string, any>;
  [key: string]: any;
}

function load(): DbSchema {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: {}, refreshTokens: {}, passwordResets: {} };
  }
}

function save(data: DbSchema) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function initializeDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    save({ users: {}, refreshTokens: {}, passwordResets: {} });
  }
}

export const store = { load, save };
