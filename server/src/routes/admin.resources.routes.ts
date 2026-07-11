import { Router, Response } from 'express';
import { COLLECTIONS, getSchema } from '../schema/collections';
import { validate } from '../schema/validate';
import { resource } from '../models/resource.model';
import { isMongoConnected } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * One generic CRUD router serving every admin-managed collection.
 *
 *   GET    /api/admin/schema                  all field-schemas (the admin UI renders from these)
 *   GET    /api/admin/resources/:c            list (paginated, filtered, searched)
 *   GET    /api/admin/resources/:c/:id
 *   POST   /api/admin/resources/:c
 *   PUT    /api/admin/resources/:c/:id
 *   DELETE /api/admin/resources/:c/:id
 *   POST   /api/admin/resources/:c/bulk       bulk insert (CSV import lands here)
 *
 * Mounted behind requireAuth + requireAdmin by admin.routes.ts.
 */

const router = Router();

// Domain data is Mongo-only. Without this guard every call would hang for
// Mongoose's 10s buffer timeout and surface as an opaque failure.
router.use((_req, res, next) => {
  if (!isMongoConnected()) {
    res.status(503).json({
      success: false,
      message: 'MongoDB is not connected. Admin-managed data requires Mongo (set MONGODB_URI).',
    });
    return;
  }
  next();
});

router.get('/schema', (_req, res: Response) => {
  res.json({ success: true, data: { collections: COLLECTIONS } });
});

function withSchema(req: AuthRequest, res: Response) {
  const schema = getSchema(String(req.params.collection));
  if (!schema) {
    res.status(404).json({ success: false, message: `Unknown collection "${req.params.collection}"` });
    return null;
  }
  return resource(schema);
}

router.get('/resources/:collection', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;

  const { page, limit, sort, q, ...rest } = req.query as Record<string, any>;
  const result = await r.list({ page, limit, sort, q, filters: rest });
  res.json({ success: true, data: result });
});

router.get('/resources/:collection/:id', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const item = await r.get(String(req.params.id));
  if (!item) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: { item } });
});

router.post('/resources/:collection', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const { value, errors } = validate(r.schema, req.body || {});
  if (errors.length) { res.status(400).json({ success: false, message: 'Validation failed', errors }); return; }
  const item = await r.create(value);
  res.status(201).json({ success: true, data: { item } });
});

router.put('/resources/:collection/:id', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const { value, errors } = validate(r.schema, req.body || {}, { partial: true });
  if (errors.length) { res.status(400).json({ success: false, message: 'Validation failed', errors }); return; }
  const item = await r.update(String(req.params.id), value);
  if (!item) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: { item } });
});

router.delete('/resources/:collection/:id', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const ok = await r.remove(String(req.params.id));
  if (!ok) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, message: 'Deleted' });
});

/**
 * Bulk insert. Validates every row first and rejects the whole batch on any
 * error, reporting row + field — a half-imported CSV is worse than a rejected one.
 */
router.post('/resources/:collection/bulk', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;

  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) {
    res.status(400).json({ success: false, message: 'rows[] is required' });
    return;
  }
  if (rows.length > 20000) {
    res.status(413).json({ success: false, message: 'Too many rows in one batch (max 20000)' });
    return;
  }

  const clean: Record<string, any>[] = [];
  const rowErrors: { row: number; field: string; message: string }[] = [];

  rows.forEach((raw: any, i: number) => {
    const { value, errors } = validate(r.schema, raw || {});
    if (errors.length) errors.forEach((e) => rowErrors.push({ row: i + 1, ...e }));
    else clean.push(value);
  });

  if (rowErrors.length) {
    res.status(400).json({
      success: false,
      message: `${rowErrors.length} validation error(s); nothing was imported`,
      errors: rowErrors.slice(0, 50),
      totalErrors: rowErrors.length,
    });
    return;
  }

  const replace = req.body?.replace === true;
  if (replace) await r.deleteAll();

  const inserted = await r.insertMany(clean);
  res.json({ success: true, data: { inserted, replaced: replace } });
});

export default router;
