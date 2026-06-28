import { Router } from 'express';
import { CutoffController } from '../controllers/cutoff.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new CutoffController();

// ─── Public Cutoff Query Endpoints ─────────────────────────
router.get('/', (req, res, next) => ctrl.list(req, res, next));
router.get('/filters', (req, res, next) => ctrl.getFilterOptions(req, res, next));
router.get('/export', (req, res, next) => ctrl.exportCsv(req, res, next));

// ─── Bookmarked Filters Endpoints (Authenticated) ──────────
router.post('/saved-filters', authenticate, (req, res, next) => ctrl.saveFilter(req, res, next));
router.get('/saved-filters', authenticate, (req, res, next) => ctrl.listSavedFilters(req, res, next));
router.delete('/saved-filters/:id', authenticate, (req, res, next) => ctrl.deleteSavedFilter(req, res, next));

export default router;
