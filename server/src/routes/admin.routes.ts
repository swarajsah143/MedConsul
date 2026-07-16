import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { studentsController } from '../controllers/students.controller';
import { broadcastController } from '../controllers/broadcast.controller';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import resourceRoutes from './admin.resources.routes';

const router = Router();

// All admin routes require an authenticated admin user
router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.get('/stats', adminController.stats);

// User management. Previously the admin panel could only LOOK at users — it had no
// write endpoints at all: no role change, no delete, no create, no password reset.
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/password', adminController.resetPassword);
router.delete('/users/:id', adminController.deleteUser);

// Students overview: real checklist progress (derived from admin-VERIFIED uploads,
// not a client-side tick) plus the admin-set plan.
router.get('/students', studentsController.list);
// Broadcast + reminders. These 3-segment paths are declared BEFORE '/students/:id' so 'broadcast'
// is never captured as an :id.
router.get('/students/broadcast/recipients', broadcastController.previewRecipients);
router.post('/students/broadcast', broadcastController.broadcast);
router.post('/students/run-reminders', broadcastController.runReminders);
router.get('/students/:id', studentsController.detail);
router.put('/students/:id/plan', studentsController.setPlan);

// Schema-driven CRUD for every admin-managed collection.
router.use('/', resourceRoutes);

export default router;
