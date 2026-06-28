import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { requestOtpSchema, verifyOtpSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Mobile login flows
router.post('/request-otp', validate(requestOtpSchema), (req, res, next) => authController.requestOtp(req, res, next));
router.post('/verify-otp', validate(verifyOtpSchema), (req, res, next) => authController.verifyOtp(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

// Protected flows
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));

export default router;
