import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import resourceRoutes from './admin.resources.routes';

const router = Router();

// All admin routes require an authenticated admin user
router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.get('/stats', adminController.stats);

// Schema-driven CRUD for every admin-managed collection.
router.use('/', resourceRoutes);

export default router;
