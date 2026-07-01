import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('  MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('  MongoDB connected successfully');
  } catch (err) {
    console.error('  MongoDB connection error:', err);
    process.exit(1);
  }
}

// Keep backward compat — old code used `store.load()` / `store.save()` for chat sessions.
// Now chat sessions live in MongoDB too, but we keep this shim for anything that still imports it.
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  chatSessions?: Record<string, any>;
  [key: string]: any;
}

function load(): DbSchema {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function save(data: DbSchema) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function initializeDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    save({});
  }
}

export const store = { load, save };
