import { Router, Request, Response } from 'express';
import { COLLECTIONS, getSchema } from '../schema/collections';
import { resource } from '../models/resource.model';
import { isMongoConnected } from '../config/database';
import { optionalAuth, AuthRequest } from '../middlewares/auth.middleware';
import { isPro, FREE_ALLOTMENT_ROWS } from '../utils/plan';

/**
 * Public read-only API for the app.
 *
 *   GET /api/data/:collection          all rows (small sets — the pages filter client-side)
 *   GET /api/data/:collection/paged    paginated (closingRanks / allotments, which get large)
 *
 * Only collections marked publicRead in their schema are exposed; knowledgeBase
 * is not, since it is chatbot-internal.
 */

const router = Router();

router.use((_req, res, next) => {
  if (!isMongoConnected()) {
    res.status(503).json({ success: false, message: 'Data store unavailable' });
    return;
  }
  next();
});

function publicResource(name: string) {
  const schema = getSchema(name);
  if (!schema || !schema.publicRead) return null;
  return resource(schema);
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { collections: COLLECTIONS.filter((c) => c.publicRead).map((c) => c.name) },
  });
});

router.get('/:collection/paged', optionalAuth, async (req: AuthRequest, res: Response) => {
  const collection = String(req.params.collection);
  const r = publicResource(collection);
  if (!r) { res.status(404).json({ success: false, message: 'Unknown collection' }); return; }

  const { page, limit, sort, q, ...filters } = req.query as Record<string, any>;

  // Subscription gate: seat allotments are a Pro (₹3,999+) feature. Free users get a 25-row
  // sample of page 1 only — which also blocks CSV export, since export just pages this endpoint
  // deeper and `pages: 1` stops the loop. Real `total` is still returned so the UI can say
  // "25 of N — upgrade to see all".
  if (collection === 'allotments' && !isPro(req.user?.plan)) {
    const data = await r.list({ page: 1, limit: FREE_ALLOTMENT_ROWS, sort, q, filters });
    res.json({ success: true, data: { ...data, page: 1, pages: 1, gated: true } });
    return;
  }

  res.json({ success: true, data: await r.list({ page, limit, sort, q, filters }) });
});

// Distinct values for filter dropdowns on the paginated pages, which no longer hold every row.
//   GET /api/data/:collection/facets?fields=category,seatType,round&counselling=MCC%20UG%202024
// The extra query params (beyond `fields`) filter the facet set — so "which rounds exist" can be
// scoped to one counselling.
router.get('/:collection/facets', async (req: Request, res: Response) => {
  const r = publicResource(String(req.params.collection));
  if (!r) { res.status(404).json({ success: false, message: 'Unknown collection' }); return; }

  const { fields, ...filters } = req.query as Record<string, any>;
  const names = String(fields || '').split(',').map((s) => s.trim()).filter(Boolean);
  res.json({ success: true, data: await r.facets(names, { filters }) });
});

router.get('/:collection', async (req: Request, res: Response) => {
  const r = publicResource(String(req.params.collection));
  if (!r) { res.status(404).json({ success: false, message: 'Unknown collection' }); return; }

  const { sort, q, ...filters } = req.query as Record<string, any>;
  const items = await r.all({ sort, q, filters });
  res.json({ success: true, data: { items, total: items.length } });
});

export default router;
