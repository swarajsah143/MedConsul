/**
 * The field-schema layer — the single source of truth for every admin-managed
 * collection.
 *
 * One CollectionSchema drives all of:
 *   - the Mongoose model              (models/resource.model.ts)
 *   - request validation             (schema/validate.ts)
 *   - the admin CRUD routes          (routes/admin.resources.routes.ts)
 *   - the public read API            (routes/data.routes.ts)
 *   - the RAG retriever's sources    (services/rag/retriever.ts)
 *   - the admin table + form in the client, which fetches these schemas at runtime
 *
 * Adding a new admin-managed collection means adding one entry to
 * schema/collections.ts. It must not mean writing ten near-identical files.
 */

export type FieldType =
  | 'string'    // single-line text
  | 'text'      // multi-line prose
  | 'number'
  | 'boolean'
  | 'enum'      // one of `options`
  | 'url'
  | 'string[]'  // list of free strings (pros, cons, tags, courses…)
  | 'enum[]'    // multi-select from `options` (applicability filters)
  | 'object[]'  // repeating sub-form, shape given by `of`
  | 'ref';      // foreign key into another collection

export interface Field {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  /** for enum / enum[] */
  options?: string[];
  /** for ref — the target collection's `name` */
  ref?: string;
  /** for object[] — the shape of each row */
  of?: Field[];
  /** show this column in the admin list table (keep to ~5 or the table is unreadable) */
  inList?: boolean;
  /** expose as a filter control in the admin list + public API */
  filterable?: boolean;
  /** included in the free-text search */
  searchable?: boolean;
  default?: unknown;
  help?: string;
  /**
   * Regex source (not a literal) a string value must match end-to-end.
   *
   * Load-bearing for fields that are stored as strings but ordered as data —
   * `announcements.date` is sorted with `-date`, i.e. LEXICOGRAPHICALLY, so a
   * value like "12/03/2026" or "Mar 12" sorts to a wrong position forever.
   * Only applied to `string` / `text` fields.
   */
  pattern?: string;
  /** Human-readable message shown when `pattern` fails. */
  patternMessage?: string;
  /**
   * Render this number without thousands separators. Years are numbers but not
   * quantities: grouping turns 2025 into "2,025" and 1956 into "1,956".
   */
  plain?: boolean;
}

export interface CollectionSchema {
  /** url-safe id: /api/admin/resources/<name> */
  name: string;
  label: string;
  /** plural noun for UI copy */
  labelPlural: string;
  fields: Field[];
  /** default sort, e.g. '-createdAt' or 'name' */
  defaultSort?: string;
  /** if set, this collection is exposed read-only at /api/data/<name> for the app */
  publicRead?: boolean;
  description?: string;

  /**
   * Fields that together identify a record independently of its _id.
   *
   * Load-bearing. Bulk import UPSERTS on this key instead of delete-then-insert,
   * so re-importing a CSV keeps each row's existing _id. Without it, re-importing
   * `colleges` minted fresh ObjectIds and orphaned every closingRanks/fees/allotments
   * row that referenced them — the entire site rendered "Unknown college".
   *
   * It is also enforced as a unique index, which makes import idempotent: running
   * the same CSV twice updates rows rather than duplicating them.
   */
  naturalKey?: string[];

  /**
   * Recompute fields that are a function of other fields, on every write.
   *
   * `fees.totalFirstYear` advertised "Recomputed on save from the components above"
   * and nothing recomputed it. The migrated rows happened to be consistent, so it
   * looked fine — but the first admin to edit a tuition fee would have left the total
   * silently wrong, and the site and chatbot would both have quoted it.
   */
  derive?: (row: Record<string, any>) => void;

  /**
   * Extra indexes beyond the automatic ones (every filterable/ref field gets a single-field
   * index, searchable fields a text index, the natural key a unique compound). Declare compound
   * or sort-supporting indexes here — e.g. a range/sort column like `allIndiaRank` that is not a
   * plain equality filter. Without one, a query that sorts or ranges on it scans the whole
   * collection and sorts in memory (222k allotment rows → a ~130ms COLLSCAN per rank search).
   */
  indexes?: Record<string, 1 | -1>[];
}

/** Every field a record always carries, injected by the model layer. */
export const SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;
