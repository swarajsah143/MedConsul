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
      const f = schema.fields.find((x) => x.name === key);
      if (!f) continue;                       // ignore unknown params rather than 500
      const vals = Array.isArray(raw) ? raw : [raw];
      const cast = (v: string) => (f.type === 'number' ? Number(v)
        : f.type === 'boolean' ? v === 'true'
        : v);
      where[key] = vals.length > 1 ? { $in: vals.map(cast) } : cast(vals[0]);
    }

    if (query.q?.trim()) {
      const searchable = schema.fields.filter((f) => f.searchable).map((f) => f.name);
      if (searchable.length) {
        const rx = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        where.$or = searchable.map((n) => ({ [n]: rx }));
      }
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

    /** No pagination — for the public app, which filters client-side on small sets. */
    async all(query: ListQuery = {}): Promise<any[]> {
      const docs = await M().find(buildFilter(query)).sort(query.sort || schema.defaultSort || '-createdAt');
      return docs.map(toPlain);
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

    /** Bulk insert — the only realistic way to load hundreds of rank/fee rows. */
    async insertMany(rows: Record<string, any>[]): Promise<number> {
      if (!rows.length) return 0;
      const r = await M().insertMany(rows, { ordered: false });
      return r.length;
    },

    async count(): Promise<number> {
      return M().countDocuments({});
    },

    async deleteAll(): Promise<number> {
      const r = await M().deleteMany({});
      return r.deletedCount ?? 0;
    },

    raw: M,
  };
}

export type Resource = ReturnType<typeof resource>;
