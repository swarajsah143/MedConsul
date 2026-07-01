import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'MedCounsel AI API is running' });
});

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);

export default router;
