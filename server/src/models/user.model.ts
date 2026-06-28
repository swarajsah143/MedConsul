import { store } from '../config/database';
import { v4 as uuid } from 'uuid';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'password'>;

export const UserModel = {
  findByEmail(email: string): User | undefined {
    const db = store.load();
    return Object.values(db.users).find(
      (u: any) => u.email === email.toLowerCase()
    ) as User | undefined;
  },

  findById(id: string): User | undefined {
    const db = store.load();
    return db.users[id] as User | undefined;
  },

  create(name: string, email: string, hashedPassword: string, role = 'student'): SafeUser {
    const db = store.load();
    const id = uuid();
    const now = new Date().toISOString();
    const user: User = {
      id,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: now,
      updatedAt: now,
    };
    db.users[id] = user;
    store.save(db);
    return toSafe(user);
  },

  updatePassword(id: string, hashedPassword: string): void {
    const db = store.load();
    if (db.users[id]) {
      db.users[id].password = hashedPassword;
      db.users[id].updatedAt = new Date().toISOString();
      store.save(db);
    }
  },
};

export function toSafe(user: User): SafeUser {
  const { password: _, ...safe } = user;
  return safe;
}
