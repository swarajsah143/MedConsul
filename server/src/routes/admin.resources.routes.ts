import { Router, Response } from 'express';
import { COLLECTIONS, getSchema } from '../schema/collections';
import { CollectionSchema } from '../schema/types';
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

/**
 * Every `ref` value must point at a row that actually exists.
 *
 * validate.ts cannot do this — it has no DB access — so a CSV could previously set
 * collegeId to any string at all and the row would import "successfully" while
 * pointing at nothing.
 */
async function checkRefs(
  schema: CollectionSchema,
  rows: Record<string, any>[]
): Promise<{ row: number; field: string; message: string }[]> {
  const refFields = schema.fields.filter((f) => f.type === 'ref' && f.ref);
  if (!refFields.length) return [];

  const errors: { row: number; field: string; message: string }[] = [];

  for (const f of refFields) {
    const target = getSchema(f.ref!);
    if (!target) continue;

    const wanted = rows
      .map((r, i) => ({ i, v: r[f.name] }))
      .filter((x) => x.v !== undefined && x.v !== null && x.v !== '');
    if (!wanted.length) continue;

    const missing = new Set(await resource(target).missingIds(wanted.map((w) => String(w.v))));
    for (const w of wanted) {
      if (missing.has(String(w.v))) {
        errors.push({
          row: w.i + 1,
          field: f.name,
          message: `${f.label}: no ${target.label} exists with id "${w.v}"`,
        });
      }
    }
  }
  return errors;
}

/** Which collections point at `collection` and via which field. */
function referencersOf(collection: string): { schema: CollectionSchema; field: string }[] {
  const out: { schema: CollectionSchema; field: string }[] = [];
  for (const s of COLLECTIONS) {
    for (const f of s.fields) {
      if (f.type === 'ref' && f.ref === collection) out.push({ schema: s, field: f.name });
    }
  }
  return out;
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

  const refErrors = await checkRefs(r.schema, [value]);
  if (refErrors.length) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: refErrors.map(({ field, message }) => ({ field, message })) });
    return;
  }

  const item = await r.create(value);
  res.status(201).json({ success: true, data: { item } });
});

router.put('/resources/:collection/:id', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const { value, errors } = validate(r.schema, req.body || {}, { partial: true });
  if (errors.length) { res.status(400).json({ success: false, message: 'Validation failed', errors }); return; }

  const refErrors = await checkRefs(r.schema, [value]);
  if (refErrors.length) {
    res.status(400).json({ success: false, message: 'Validation failed', errors: refErrors.map(({ field, message }) => ({ field, message })) });
    return;
  }

  const item = await r.update(String(req.params.id), value);
  if (!item) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({ success: true, data: { item } });
});

/**
 * Delete, guarded against orphaning.
 *
 * Deleting a college that 40 rank rows point at used to succeed silently and leave
 * those rows rendering "Unknown college" forever. Now it 409s with the counts, and
 * the caller must opt in with ?cascade=true to delete the dependents too.
 */
router.delete('/resources/:collection/:id', async (req: AuthRequest, res: Response) => {
  const r = withSchema(req, res);
  if (!r) return;
  const id = String(req.params.id);
  const cascade = req.query.cascade === 'true';

  const refs = referencersOf(r.schema.name);
  const blocking: { collection: string; label: string; field: string; count: number }[] = [];
  for (const ref of refs) {
    const count = await resource(ref.schema).countBy(ref.field, id);
    if (count > 0) blocking.push({ collection: ref.schema.name, label: ref.schema.labelPlural, field: ref.field, count });
  }

  if (blocking.length && !cascade) {
    // The client renders `references` into a real choice ("delete it and the N linked
    // rows" / "keep it"). This message is the fallback for API consumers — it must not
    // tell a human to "re-send with ?cascade=true", which means nothing to an admin.
    res.status(409).json({
      success: false,
      message:
        `This ${r.schema.label.toLowerCase()} is still in use — ` +
        blocking.map((b) => `${b.count} ${b.label.toLowerCase()}`).join(' and ') +
        ` reference it, so deleting it would leave those rows pointing at nothing.`,
      references: blocking,
    });
    return;
  }

  if (blocking.length && cascade) {
    for (const b of blocking) {
      const target = getSchema(b.collection)!;
      await resource(target).raw().deleteMany({ [b.field]: id });
    }
  }

  const ok = await r.remove(id);
  if (!ok) { res.status(404).json({ success: false, message: 'Not found' }); return; }
  res.json({
    success: true,
    message: 'Deleted',
    data: { cascadedDeletes: blocking.reduce((n, b) => n + b.count, 0) },
  });
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

  // Every ref must resolve to a real row, or the import silently creates orphans.
  if (!rowErrors.length) {
    rowErrors.push(...(await checkRefs(r.schema, clean)));
  }

  if (rowErrors.length) {
    res.status(400).json({
      success: false,
      message: `${rowErrors.length} validation error(s); nothing was imported`,
      errors: rowErrors.slice(0, 50),
      totalErrors: rowErrors.length,
    });
    return;
  }

  // UPSERT on the natural key. This used to be deleteAll() + insertMany(), which
  // gave every row a fresh ObjectId — re-importing colleges orphaned all 279 rank
  // rows and 65 fee rows, and the site rendered "Unknown college" everywhere.
  // `replace` now means "make the collection match this file", not "wipe it first".
  const replace = req.body?.replace === true;
  const { created, updated, deleted } = await r.importMany(clean, { replace });

  res.json({
    success: true,
    data: { inserted: created, updated, deleted, replaced: replace },
  });
});

export default router;
