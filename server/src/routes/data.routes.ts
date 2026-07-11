import { Router, Request, Response } from 'express';
import { COLLECTIONS, getSchema } from '../schema/collections';
import { resource } from '../models/resource.model';
import { isMongoConnected } from '../config/database';

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

router.get('/:collection/paged', async (req: Request, res: Response) => {
  const r = publicResource(String(req.params.collection));
  if (!r) { res.status(404).json({ success: false, message: 'Unknown collection' }); return; }

  const { page, limit, sort, q, ...filters } = req.query as Record<string, any>;
  res.json({ success: true, data: await r.list({ page, limit, sort, q, filters }) });
});

router.get('/:collection', async (req: Request, res: Response) => {
  const r = publicResource(String(req.params.collection));
  if (!r) { res.status(404).json({ success: false, message: 'Unknown collection' }); return; }

  const { sort, q, ...filters } = req.query as Record<string, any>;
  const items = await r.all({ sort, q, filters });
  res.json({ success: true, data: { items, total: items.length } });
});

export default router;
