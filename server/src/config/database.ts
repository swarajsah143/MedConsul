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

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
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
