import { api } from './api';

/**
 * Client mirror of the server's field-schema (server/src/schema/types.ts).
 *
 * The admin UI does not hardcode any collection. It fetches these schemas at
 * runtime and renders the table, the form and the CSV importer from them — so
 * adding a collection on the server makes it appear in the admin with no client
 * change at all.
 */

export type FieldType =
  | 'string' | 'text' | 'number' | 'boolean' | 'enum'
  | 'url' | 'string[]' | 'enum[]' | 'object[]' | 'ref';

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[];
  ref?: string;
  of?: Field[];
  inList?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  default?: unknown;
  help?: string;
  /** Render without thousands separators (years: 2025, not "2,025"). */
  plain?: boolean;
}

export interface CollectionSchema {
  name: string;
  label: string;
  labelPlural: string;
  fields: Field[];
  defaultSort?: string;
  publicRead?: boolean;
  description?: string;
}

export interface ListResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

/** Thrown on 400 so forms can highlight the offending inputs. */
export class ValidationError extends Error {
  // Declared explicitly rather than as a constructor parameter property —
  // this project sets erasableSyntaxOnly, which forbids that shorthand.
  errors: FieldError[];

  constructor(errors: FieldError[], message = 'Validation failed') {
    super(message);
    this.errors = errors;
  }
}

async function call<T>(fn: () => Promise<any>): Promise<T> {
  try {
    const res = await fn();
    return (res?.data ?? res) as T;
  } catch (e: any) {
    const errors = e?.body?.errors ?? e?.errors;
    if (Array.isArray(errors)) throw new ValidationError(errors, e?.message);
    throw e;   // keeps `status` and `references` (the 409 delete guard needs both)
  }
}

/** One collection that blocks a delete, and how many rows point at the record. */
export interface Reference {
  collection: string;
  label: string;
  field: string;
  count: number;
}

const qs = (params: Record<string, any>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const adminApi = {
  schemas: () =>
    call<{ collections: CollectionSchema[] }>(() => api.get('/admin/schema')).then((d) => d.collections),

  list: (collection: string, params: Record<string, any> = {}) =>
    call<ListResult>(() => api.get(`/admin/resources/${collection}${qs(params)}`)),

  get: (collection: string, id: string) =>
    call<{ item: any }>(() => api.get(`/admin/resources/${collection}/${id}`)).then((d) => d.item),

  create: (collection: string, body: any) =>
    call<{ item: any }>(() => api.post(`/admin/resources/${collection}`, body)).then((d) => d.item),

  update: (collection: string, id: string, body: any) =>
    call<{ item: any }>(() => api.put(`/admin/resources/${collection}/${id}`, body)).then((d) => d.item),

  remove: (collection: string, id: string, cascade = false) =>
    call<any>(() =>
      api.delete(`/admin/resources/${collection}/${id}${cascade ? '?cascade=true' : ''}`)
    ),

  /**
   * Bulk import. The server UPSERTS on each collection's natural key, so `inserted`
   * counts only genuinely new rows — re-importing an unchanged file legitimately
   * returns inserted: 0, updated: N. Report all three or the UI claims nothing happened.
   */
  bulk: (collection: string, rows: any[], replace = false) =>
    call<BulkResult>(() => api.post(`/admin/resources/${collection}/bulk`, { rows, replace })),
};

export interface BulkResult {
  inserted: number;
  updated: number;
  deleted: number;
  replaced: boolean;
}

/** Blank record matching a schema — the "create" form's initial state. */
export function emptyRecord(schema: CollectionSchema): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of schema.fields) {
    if (f.default !== undefined) out[f.name] = f.default;
    else if (f.type === 'string[]' || f.type === 'enum[]' || f.type === 'object[]') out[f.name] = [];
    else if (f.type === 'boolean') out[f.name] = false;
    else if (f.type === 'number') out[f.name] = '';
    else out[f.name] = '';
  }
  return out;
}

/** A blank row for one entry of an object[] field. */
export function emptySubRow(field: Field): Record<string, any> {
  const out: Record<string, any> = {};
  for (const sf of field.of || []) out[sf.name] = sf.type === 'number' ? '' : '';
  return out;
}
