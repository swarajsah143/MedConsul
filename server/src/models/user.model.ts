import mongoose, { Schema, Document } from 'mongoose';
import { isMongoConnected, store } from '../config/database';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<IUser, 'password'>;
export type User = IUser;

// ── Mongoose schema (used when MongoDB is connected) ──────

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
  },
  { timestamps: true }
);

const UserDoc = mongoose.model('User', userSchema);

// ── Helpers ────────────────────────────────────────────────

function docToUser(doc: any): IUser {
  return {
    id: doc._id?.toString?.() || doc.id,
    name: doc.name,
    email: doc.email,
    password: doc.password,
    role: doc.role,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
  };
}

export function toSafe(user: IUser): SafeUser {
  const { password: _, ...safe } = user;
  return safe;
}

// ── Public API (auto-switches between Mongo and JSON) ─────

export const UserModel = {
  async findByEmail(email: string): Promise<IUser | null> {
    if (isMongoConnected()) {
      const doc = await UserDoc.findOne({ email: email.toLowerCase() });
      return doc ? docToUser(doc) : null;
    }
    const db = store.load();
    const users = db.users || {};
    const found = Object.values(users).find((u: any) => u.email === email.toLowerCase()) as IUser | undefined;
    return found || null;
  },

  async findById(id: string): Promise<IUser | null> {
    if (isMongoConnected()) {
      const doc = await UserDoc.findById(id);
      return doc ? docToUser(doc) : null;
    }
    const db = store.load();
    const user = db.users?.[id] as IUser | undefined;
    return user || null;
  },

  async findAll(): Promise<SafeUser[]> {
    if (isMongoConnected()) {
      const users = await UserDoc.find().sort({ createdAt: -1 });
      return users.map(toSafe);
    }
    const db = store.load();
    return Object.values(db.users || {})
      .map((u: any) => toSafe(u as IUser))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(name: string, email: string, hashedPassword: string, role = 'student'): Promise<SafeUser> {
    if (isMongoConnected()) {
      const doc = await UserDoc.create({ name, email: email.toLowerCase(), password: hashedPassword, role });
      return toSafe(docToUser(doc));
    }
    const db = store.load();
    if (!db.users) db.users = {};
    const id = uuid();
    const now = new Date().toISOString();
    const user: IUser = { id, name, email: email.toLowerCase(), password: hashedPassword, role, createdAt: now, updatedAt: now };
    db.users[id] = user;
    store.save(db);
    return toSafe(user);
  },

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    if (isMongoConnected()) {
      await UserDoc.findByIdAndUpdate(id, { password: hashedPassword });
      return;
    }
    const db = store.load();
    if (db.users?.[id]) {
      db.users[id].password = hashedPassword;
      db.users[id].updatedAt = new Date().toISOString();
      store.save(db);
    }
  },
};
