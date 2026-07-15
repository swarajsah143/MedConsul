import mongoose, { Schema, SchemaDefinition } from 'mongoose';
import { CollectionSchema, Field } from '../schema/types';

/**
 * Compiles a CollectionSchema into a Mongoose model + CRUD API.
 *
 * Deliberately Mongo-only, unlike user.model.ts which dual-branches on
 * isMongoConnected(). The JSON file store rewrites db.json in full on every
 * write — fine for three users, fatal for tens of thousands of rank rows. Auth
 * keeps its JSON fallback; domain data requires Mongo.
 */

function mongoType(f: Field): any {
  switch (f.type) {
    case 'number':   return Number;
    case 'boolean':  return Boolean;
    case 'string[]': return [String];
    case 'enum[]':   return [String];
    case 'object[]': return [subSchema(f.of || [])];
    default:         return String;   // string | text | enum | url | ref
  }
}

function subSchema(fields: Field[]): Schema {
  const def: SchemaDefinition = {};
  for (const f of fields) def[f.name] = { type: mongoType(f), required: !!f.required };
  return new Schema(def, { _id: false });
}

/**
 * Ceiling on the unpaginated public read (`all()` / GET /api/data/:collection).
 *
 * The truly large collection — allotments (~222k rows) — no longer rides this path at all; its
 * pages use `/paged` + `/facets`. What remains on the unpaginated path is closingRanks (~6.6k),
 * whose rank-insights page collapses to the latest entry per college/course/category/quota — a
 * grouping that needs the whole set, not a page. At the old 5000 ceiling that page silently lost
 * ~24% of the ranks. 20000 clears closingRanks with headroom; if it ever outgrows this, that page
 * needs a server-side aggregation, not a higher cap.
 */
export const PUBLIC_MAX = 20000;

const models = new Map<string, mongoose.Model<any>>();

function modelFor(schema: CollectionSchema): mongoose.Model<any> {
  const cached = models.get(schema.name);
  if (cached) return cached;

  const def: SchemaDefinition = {};
  for (const f of schema.fields) {
    const entry: any = { type: mongoType(f) };
    if (f.required) entry.required = true;
    if (f.default !== undefined) entry.default = f.default;
    // enum values are validated in schema/validate.ts rather than by Mongoose, so
    // that a bad CSV row yields a readable field-level error instead of a
    // ValidationError blob.
    def[f.name] = entry;
  }

  const s = new Schema(def, { timestamps: true, strict: true });

  // Index every filterable/ref field — these are exactly the columns the admin
  // list and the public API filter on.
  for (const f of schema.fields) {
    if (f.filterable || f.type === 'ref') s.index({ [f.name]: 1 });
  }
  const searchable = schema.fields.filter((f) => f.searchable).map((f) => f.name);
  if (searchable.length) {
    s.index(Object.fromEntries(searchable.map((n) => [n, 'text'])) as any);
  }

  // Unique natural key — makes bulk import idempotent (re-running a CSV updates
  // rather than duplicating) and guarantees the upsert below matches at most one doc.
  if (schema.naturalKey?.length) {
    s.index(Object.fromEntries(schema.naturalKey.map((n) => [n, 1])), { unique: true });
  }

  const m = mongoose.model(schema.name, s, schema.name);
  models.set(schema.name, m);
  return m;
}

function toPlain(doc: any): any {
  if (!doc) return doc;
  const o = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = o;
  return {
    ...rest,
    id: _id?.toString?.() ?? o.id,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

export interface ListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  q?: string;
  filters?: Record<string, string | string[]>;
}

export interface ListResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function resource(schema: CollectionSchema) {
  const M = () => modelFor(schema);

  const buildFilter = (query: ListQuery) => {
    const where: Record<string, any> = {};

    for (const [key, raw] of Object.entries(query.filters || {})) {
      // Range filters: `<numberField>_min` / `_max` -> $gte / $lte. This is what lets the
      // allotment + rank-insight pages ask the server for "AIR between X and Y" instead of
      // pulling every row down and filtering in the browser (which the 5000-row public cap
      // silently truncated). Non-numeric bounds are ignored rather than 500-ing the endpoint.
      const range = key.match(/^(.+)_(min|max)$/);
      if (range) {
        const field = schema.fields.find((x) => x.name === range[1] && x.type === 'number');
        if (!field) continue;
        const n = Number(Array.isArray(raw) ? raw[0] : raw);
        if (!Number.isFinite(n)) continue;
        const op = range[2] === 'min' ? '$gte' : '$lte';
        where[range[1]] = { ...(where[range[1]] || {}), [op]: n };
        continue;
      }

      const f = schema.fields.find((x) => x.name === key);
      if (!f) continue;                       // ignore unknown params rather than 500

      const vals = (Array.isArray(raw) ? raw : [raw]).map((v) => String(v));

      if (f.type === 'number') {
        // A non-numeric value used to reach Mongo as NaN and 500 a PUBLIC endpoint.
        const nums = vals.map(Number).filter((n) => Number.isFinite(n));
        if (!nums.length) { where[key] = { $in: [] }; continue; }   // match nothing, don't crash
        where[key] = nums.length > 1 ? { $in: nums } : nums[0];
      } else if (f.type === 'boolean') {
        // Anything that isn't an explicit true/false used to silently become `false`.
        const bools = vals
          .map((v) => v.toLowerCase())
          .filter((v) => ['true', 'false', '1', '0'].includes(v))
          .map((v) => v === 'true' || v === '1');
        if (!bools.length) continue;                                // ignore junk instead of inverting
        where[key] = bools.length > 1 ? { $in: bools } : bools[0];
      } else if (f.type === 'string' && !f.options) {
        // Free-text filters are contains/case-insensitive. An exact, case-sensitive
        // equality match meant typing "delhi" into the State filter returned nothing.
        const rxs = vals.map((v) => new RegExp(escapeRx(v), 'i'));
        where[key] = rxs.length > 1 ? { $in: rxs } : rxs[0];
      } else {
        where[key] = vals.length > 1 ? { $in: vals } : vals[0];
      }
    }

    // `?q=a&q=b` arrives as an array, and .trim() on an array threw TypeError -> 500.
    const qRaw = Array.isArray(query.q) ? query.q[0] : query.q;
    const q = typeof qRaw === 'string' ? qRaw.trim() : '';
    if (q) {
      const searchable = schema.fields.filter((f) => f.searchable).map((f) => f.name);
      // No searchable field used to mean "drop q silently and return EVERYTHING".
      if (!searchable.length) return { _id: { $in: [] } };
      const rx = new RegExp(escapeRx(q), 'i');
      where.$or = searchable.map((n) => ({ [n]: rx }));
    }
    return where;
  };

  return {
    schema,

    async list(query: ListQuery = {}): Promise<ListResult> {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(500, Math.max(1, Number(query.limit) || 50));
      const sort = query.sort || schema.defaultSort || '-createdAt';
      const where = buildFilter(query);

      const [docs, total] = await Promise.all([
        M().find(where).sort(sort).skip((page - 1) * limit).limit(limit),
        M().countDocuments(where),
      ]);
      return {
        items: docs.map(toPlain),
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      };
    },

    /**
     * Unpaginated read for the public app, which filters client-side on small sets.
     * Hard-capped: without a limit, one /api/data/closingRanks with 50k rows would
     * ship the entire collection to every visitor's browser.
     */
    async all(query: ListQuery = {}): Promise<any[]> {
      const docs = await M()
        .find(buildFilter(query))
        .sort(query.sort || schema.defaultSort || '-createdAt')
        .limit(PUBLIC_MAX);
      return docs.map(toPlain);
    },

    /**
     * Distinct values of the requested fields, honouring any filters — this is how a page
     * that no longer holds every row builds its filter dropdowns (e.g. "which categories
     * exist in this counselling?") without downloading the collection. Unknown fields are
     * skipped, not errored, so a stray param cannot 500 a public endpoint.
     */
    async facets(fields: string[], query: ListQuery = {}): Promise<Record<string, any[]>> {
      const where = buildFilter(query);
      const wanted = fields.filter((name) => schema.fields.some((f) => f.name === name));
      const pairs = await Promise.all(
        wanted.map(async (name) => {
          const vals = (await M().distinct(name, where)) as any[];
          const clean = vals.filter((v) => v !== null && v !== undefined && v !== '');
          clean.sort((a, b) =>
            typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)),
          );
          return [name, clean] as const;
        }),
      );
      return Object.fromEntries(pairs);
    },

    async get(id: string): Promise<any | null> {
      if (!mongoose.isValidObjectId(id)) return null;
      return toPlain(await M().findById(id));
    },

    async create(data: Record<string, any>): Promise<any> {
      return toPlain(await M().create(data));
    },

    async update(id: string, data: Record<string, any>): Promise<any | null> {
      if (!mongoose.isValidObjectId(id)) return null;
      return toPlain(await M().findByIdAndUpdate(id, data, { new: true, runValidators: true }));
    },

    async remove(id: string): Promise<boolean> {
      if (!mongoose.isValidObjectId(id)) return false;
      const r = await M().findByIdAndDelete(id);
      return !!r;
    },

    /**
     * Bulk import — UPSERT on the natural key, never delete-then-insert.
     *
     * The previous implementation did deleteAll() + insertMany(), which minted a
     * fresh ObjectId for every row. Re-importing `colleges` therefore orphaned
     * every closingRanks/fees/allotments row that referenced the old ids, and the
     * whole site rendered "Unknown college". Upserting keeps each row's _id, so
     * foreign keys survive — and because the natural key is a unique index, running
     * the same CSV twice updates rather than duplicating.
     *
     * `replace` now means "make the collection match this file": rows in the DB whose
     * natural key is absent from the import are deleted. It no longer means "wipe it".
     */
    async importMany(
      rows: Record<string, any>[],
      opts: { replace?: boolean } = {}
    ): Promise<{ created: number; updated: number; deleted: number }> {
      if (!rows.length) return { created: 0, updated: 0, deleted: 0 };
      const key = schema.naturalKey;

      if (!key?.length) {
        // No natural key: fall back to plain insert (nothing can reference it anyway).
        if (opts.replace) await M().deleteMany({});
        const r = await M().insertMany(rows, { ordered: false });
        return { created: r.length, updated: 0, deleted: 0 };
      }

      const keyOf = (row: Record<string, any>) =>
        Object.fromEntries(key.map((k) => [k, row[k]]));

      const ops = rows.map((row) => ({
        updateOne: {
          filter: keyOf(row),
          update: { $set: row, $setOnInsert: {} },
          upsert: true,
        },
      }));

      const res = await M().bulkWrite(ops as any, { ordered: false });
      const created = res.upsertedCount ?? 0;
      const updated = res.modifiedCount ?? 0;

      let deleted = 0;
      if (opts.replace) {
        const keep = rows.map(keyOf);
        const r = await M().deleteMany({ $nor: keep });
        deleted = r.deletedCount ?? 0;
      }
      return { created, updated, deleted };
    },

    async count(): Promise<number> {
      return M().countDocuments({});
    },

    /** How many docs in this collection point at `id` via `field`. Used by the delete guard. */
    async countBy(field: string, value: string): Promise<number> {
      return M().countDocuments({ [field]: value });
    },

    /** Do all these ids exist? Returns the ones that do NOT. */
    async missingIds(ids: string[]): Promise<string[]> {
      const valid = ids.filter((i) => mongoose.isValidObjectId(i));
      const found = await M().find({ _id: { $in: valid } }).select('_id');
      const have = new Set(found.map((d: any) => d._id.toString()));
      return [...new Set(ids)].filter((i) => !have.has(i));
    },

    raw: M,
  };
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type Resource = ReturnType<typeof resource>;
