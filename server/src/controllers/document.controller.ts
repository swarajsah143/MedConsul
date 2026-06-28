import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';

export class DocumentController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await documentService.list(req.query as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFilterOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await documentService.getFilterOptions();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
