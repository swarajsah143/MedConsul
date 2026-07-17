import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const authService = new AuthService();

// A `secure` cookie is dropped by the browser over plain HTTP, which would make
// refresh silently fail on a TLS-less deployment. Tie it to NODE_ENV by default,
// but let COOKIE_SECURE override so an HTTP host can opt out explicitly.
// Set COOKIE_SECURE=true as soon as the host is behind TLS.
const cookieSecure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register(name, email, password);
      setRefreshCookie(res, result.refreshToken);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { user: result.user, accessToken: result.accessToken },
      });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Registration failed',
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      setRefreshCookie(res, result.refreshToken);
      res.json({
        success: true,
        message: 'Login successful',
        data: { user: result.user, accessToken: result.accessToken },
      });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Login failed',
      });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshToken(token);
      setRefreshCookie(res, result.refreshToken);
      res.json({
        success: true,
        message: 'Token refreshed',
        data: { user: result.user, accessToken: result.accessToken },
      });
    } catch (err: any) {
      clearRefreshCookie(res);
      res.status(err.status || 401).json({
        success: false,
        message: err.message || 'Token refresh failed',
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const token = req.cookies?.refreshToken;
      await authService.logout(token);
      clearRefreshCookie(res);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch {
      clearRefreshCookie(res);
      res.json({ success: true, message: 'Logged out' });
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      // In dev mode include resetToken in response for testing
      const data: any = { message: result.message };
      if (process.env.NODE_ENV !== 'production' && result.resetToken) {
        data.resetToken = result.resetToken;
      }
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to process request',
      });
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      clearRefreshCookie(res);
      res.json({ success: true, message: result.message });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Password reset failed',
      });
    }
  },

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.json({ success: true, data: { user } });
    } catch (err: any) {
      console.error("LOGIN ERROR:", err); res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to fetch profile',
      });
    }
  },
};
