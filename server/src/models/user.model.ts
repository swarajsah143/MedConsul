import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<IUser, 'password'> & { id: string };

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
  },
  { timestamps: true }
);

const UserDoc = mongoose.model<IUser>('User', userSchema);

export const UserModel = {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserDoc.findOne({ email: email.toLowerCase() });
  },

  async findById(id: string): Promise<IUser | null> {
    return UserDoc.findById(id);
  },

  async create(name: string, email: string, hashedPassword: string, role = 'student'): Promise<SafeUser> {
    const user = await UserDoc.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });
    return toSafe(user);
  },

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await UserDoc.findByIdAndUpdate(id, { password: hashedPassword });
  },
};

export function toSafe(user: IUser): SafeUser {
  const obj = user.toObject();
  const { password: _, _id, __v, ...rest } = obj;
  return { ...rest, id: _id.toString() } as SafeUser;
}

// Re-export for backward compat
export type User = IUser;
