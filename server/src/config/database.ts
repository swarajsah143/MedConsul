import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  users: Record<string, any>;
  refreshTokens: Record<string, any>;
  passwordResets: Record<string, any>;
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
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function initializeDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    save({ users: {}, refreshTokens: {}, passwordResets: {} });
  }
  console.log('  Database initialized');
}

export const store = { load, save };
