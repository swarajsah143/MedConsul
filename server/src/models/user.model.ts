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

  /**
   * Plan, set BY AN ADMIN. This is not billing.
   *
   * There is no payment gateway in this application. The previous admin dashboard
   * invented a plan per user from `hash(email) % 3` and displayed it as if money had
   * changed hands. These fields are the honest version: a plan an admin grants and can
   * see, with a real expiry. If real payments are added later, they write to these
   * same fields.
   */
  plan?: 'free' | 'pro' | 'premium';
  planExpiresAt?: string | null;
  planNote?: string;
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
    plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free', index: true },
    planExpiresAt: { type: Date, default: null },
    planNote: { type: String, default: '' },
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
    plan: doc.plan || 'free',
    planExpiresAt: doc.planExpiresAt?.toISOString?.() || doc.planExpiresAt || null,
    planNote: doc.planNote || '',
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
    // Mirrors findByEmail/findById: a Mongoose document is not an IUser — spreading
    // one yields its internals, not name/email — so it must go through docToUser.
    // This branch was also missing the JSON-store path entirely, which meant the
    // admin user list queried Mongo even when running on the file store.
    if (isMongoConnected()) {
      const docs = await UserDoc.find().sort({ createdAt: -1 });
      return docs.map((doc) => toSafe(docToUser(doc)));
    }
    const db = store.load();
    const users = Object.values(db.users || {}) as IUser[];
    return users
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map(toSafe);
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

  /** Edit a user's profile/role. Password is NOT touched here — see updatePassword. */
  async update(
    id: string,
    patch: Partial<Pick<IUser, 'name' | 'email' | 'role' | 'plan' | 'planExpiresAt' | 'planNote'>>
  ): Promise<SafeUser | null> {
    const clean: Record<string, any> = {};
    if (patch.name !== undefined) clean.name = patch.name;
    if (patch.email !== undefined) clean.email = patch.email.toLowerCase();
    if (patch.role !== undefined) clean.role = patch.role;
    if (patch.plan !== undefined) clean.plan = patch.plan;
    if (patch.planExpiresAt !== undefined) clean.planExpiresAt = patch.planExpiresAt ? new Date(patch.planExpiresAt) : null;
    if (patch.planNote !== undefined) clean.planNote = patch.planNote;

    if (isMongoConnected()) {
      const doc = await UserDoc.findByIdAndUpdate(id, { $set: clean }, { new: true });
      return doc ? toSafe(docToUser(doc)) : null;
    }
    const db = store.load();
    const user = db.users?.[id] as IUser | undefined;
    if (!user) return null;
    Object.assign(user, clean, { updatedAt: new Date().toISOString() });
    store.save(db);
    return toSafe(user);
  },

  async remove(id: string): Promise<boolean> {
    if (isMongoConnected()) {
      const r = await UserDoc.findByIdAndDelete(id);
      return !!r;
    }
    const db = store.load();
    if (!db.users?.[id]) return false;
    delete db.users[id];
    store.save(db);
    return true;
  },

  /**
   * How many admins exist.
   *
   * Load-bearing: the routes use this to refuse the last admin demoting or deleting
   * themselves. Without it, one wrong click locks everyone out of the admin panel
   * permanently, with no recovery path short of editing the database by hand.
   */
  async countAdmins(): Promise<number> {
    if (isMongoConnected()) return UserDoc.countDocuments({ role: 'admin' });
    const db = store.load();
    return Object.values(db.users || {}).filter((u: any) => u.role === 'admin').length;
  },
};
