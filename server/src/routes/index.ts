import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'MedCounsel AI API is running' });
});

router.use('/auth', authRoutes);

export default router;
