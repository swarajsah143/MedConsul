import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../utils/errors';
import { notificationQuerySchema } from '../validators/notification.validator';
import type { AuthenticatedRequest } from '../types';

const notificationService = new NotificationService();

export class NotificationController {
  /**
   * Create notification (admin) — supports multipart/form-data with PDF
   */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pdfFile = req.file;
      const pdfUrl = pdfFile ? `/uploads/notifications/${pdfFile.filename}` : undefined;
      const pdfOriginalName = pdfFile ? pdfFile.originalname : undefined;

      const notification = await notificationService.create(
        req.body,
        pdfUrl,
        pdfOriginalName
      );

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification (admin)
   */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const pdfFile = req.file;
      const pdfUrl = pdfFile ? `/uploads/notifications/${pdfFile.filename}` : undefined;
      const pdfOriginalName = pdfFile ? pdfFile.originalname : undefined;

      const notification = await notificationService.update(id, req.body, pdfUrl, pdfOriginalName);

      res.status(200).json({
        success: true,
        message: 'Notification updated successfully',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete notification (admin)
   */
  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await notificationService.delete(id);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List notifications with filters + pagination (public)
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const userId = (req as AuthenticatedRequest).user?.userId;
      const result = await notificationService.list(query, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single notification detail (public)
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as AuthenticatedRequest).user?.userId;
      const notification = await notificationService.getById(id, userId);

      res.status(200).json({
        success: true,
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle bookmark
   */
  async toggleBookmark(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const id = req.params.id as string;
      const result = await notificationService.toggleBookmark(id, req.user.userId);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookmarks for current user
   */
  async getBookmarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await notificationService.getBookmarks(req.user.userId, page, limit);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available filter options for dropdowns
   */
  async getFilterOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const options = await notificationService.getFilterOptions();
      res.status(200).json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  }
}
