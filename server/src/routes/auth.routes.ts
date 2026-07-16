import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rate-limit';

const router = Router();

// Strict rate limit on the credential endpoints — closes the brute-force / credential-stuffing
// hole. `refresh`, `logout`, and `me` are deliberately NOT limited (they run often on normal use).
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.get('/me', requireAuth, authController.me);

export default router;
