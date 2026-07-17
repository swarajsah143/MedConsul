import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { aiService } from '../services/ai.service';

export const chatController = {
  createSession(req: AuthRequest, res: Response) {
    const session = aiService.createSession(req.user!.userId);
    res.status(201).json({ success: true, data: { session } });
  },

  listSessions(req: AuthRequest, res: Response) {
    const sessions = aiService.getUserSessions(req.user!.userId);
    const list = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    res.json({ success: true, data: { sessions: list } });
  },

  getSession(req: AuthRequest, res: Response) {
    const session = aiService.getSession(String(req.params.id), req.user!.userId);
    if (!session) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    res.json({ success: true, data: { session } });
  },

  deleteSession(req: AuthRequest, res: Response) {
    const deleted = aiService.deleteSession(String(req.params.id), req.user!.userId);
    if (!deleted) { res.status(404).json({ success: false, message: 'Session not found' }); return; }
    res.json({ success: true, message: 'Session deleted' });
  },
};
