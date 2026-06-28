import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/sessions', chatController.createSession);
router.get('/sessions', chatController.listSessions);
router.get('/sessions/:id', chatController.getSession);
router.delete('/sessions/:id', chatController.deleteSession);
// Note: /sessions/:id/messages and /sessions/:id/regenerate are handled
// by chat.sse.ts for raw socket streaming (mounted in server.ts)

export default router;
