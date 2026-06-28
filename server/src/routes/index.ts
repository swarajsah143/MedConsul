import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import notificationRoutes from './notification.routes';
import cutoffRoutes from './cutoff.routes';

import documentRoutes from './document.routes';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MedCounsel AI API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/cutoffs', cutoffRoutes);
router.use('/documents', documentRoutes);

export default router;
