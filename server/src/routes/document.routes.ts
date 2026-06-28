import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { validateRequest } from '../middlewares/validate';
import { listDocumentsSchema } from '../validators/document.validator';

const router = Router();

router.get('/filters', documentController.getFilterOptions);
router.get('/', validateRequest(listDocumentsSchema), documentController.list);

export default router;
