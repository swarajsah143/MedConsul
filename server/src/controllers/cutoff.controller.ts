import { Request, Response, NextFunction } from 'express';
import { CutoffService } from '../services/cutoff.service';
import { cutoffQuerySchema, createSavedFilterSchema } from '../validators/cutoff.validator';
import type { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/errors';

const cutoffService = new CutoffService();

export class CutoffController {
  /**
   * Search and list cutoff records
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = cutoffQuerySchema.parse(req.query);
      const data = await cutoffService.list(query);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dynamic list of available dropdown filter options
   */
  async getFilterOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cutoffService.getFilterOptions();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export matching cutoff records as CSV file
   */
  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const query = cutoffQuerySchema.parse(req.query);
      const csvData = await cutoffService.exportCsv(query);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=cutoff-data.csv');
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save filter / bookmark filter
   */
  async saveFilter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const body = createSavedFilterSchema.parse(req.body);
      const data = await cutoffService.saveFilter(req.user.userId, body);

      res.status(201).json({
        success: true,
        message: 'Filter bookmarked successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List saved filters
   */
  async listSavedFilters(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const data = await cutoffService.listSavedFilters(req.user.userId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete saved filter
   */
  async deleteSavedFilter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const id = req.params.id as string;
      const data = await cutoffService.deleteSavedFilter(id, req.user.userId);

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}
export default CutoffController;
