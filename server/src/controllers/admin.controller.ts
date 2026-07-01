import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserModel } from '../models/user.model';

export const adminController = {
  async listUsers(_req: AuthRequest, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    res.json({ success: true, data: { users } });
  },

  async stats(_req: AuthRequest, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    const admins = users.filter((u) => u.role === 'admin').length;
    const students = users.filter((u) => u.role === 'student').length;
    res.json({
      success: true,
      data: { totalUsers: users.length, admins, students },
    });
  },
};
