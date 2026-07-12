import { CollectionSchema, Field } from './types';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Validates + coerces a record against a CollectionSchema.
 *
 * Coercion matters as much as validation: CSV import hands us everything as
 * strings, so "1998" must become the number 1998 and "true" the boolean true,
 * or Mongo stores the wrong type and every numeric filter silently misses.
 *
 * Returns field-level errors so the admin form can highlight the offending input
 * and a CSV import can say "row 42, column `year`".
 */
export function validate(
  schema: CollectionSchema,
  input: Record<string, any>,
  opts: { partial?: boolean } = {}
): { value: Record<string, any>; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const value: Record<string, any> = {};

  for (const f of schema.fields) {
    const present = Object.prototype.hasOwnProperty.call(input, f.name);

    // PATCH semantics: absent field means "leave alone", not "clear".
    if (!present) {
      if (opts.partial) continue;
      if (f.required) {
        errors.push({ field: f.name, message: `${f.label} is required` });
      } else if (f.default !== undefined) {
        value[f.name] = f.default;
      }
      continue;
    }

    const raw = input[f.name];
    const empty = raw === '' || raw === null || raw === undefined;

    if (empty) {
      if (f.required) errors.push({ field: f.name, message: `${f.label} is required` });
      else value[f.name] = coerceEmpty(f);
      continue;
    }

    const [ok, coerced, msg] = coerce(f, raw);
    if (!ok) errors.push({ field: f.name, message: msg! });
    else value[f.name] = coerced;
  }

  return { value, errors };
}

function coerceEmpty(f: Field): any {
  if (f.type === 'string[]' || f.type === 'enum[]' || f.type === 'object[]') return [];
  if (f.type === 'number') return null;
  if (f.type === 'boolean') return false;
  return '';
}

function coerce(f: Field, raw: any): [boolean, any?, string?] {
  switch (f.type) {
    case 'number': {
      if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) return [false, undefined, `${f.label} must be a number (got "${raw}")`];
        return [true, raw];
      }
      const s = String(raw).replace(/,/g, '').trim();
      // A value with no digits at all is not a number. Without this, ",,," (or any
      // run of commas/whitespace) survived the empty check above, then had its commas
      // stripped to "" — and Number("") is 0, so the field was silently stored as 0
      // instead of being rejected.
      if (!/\d/.test(s)) return [false, undefined, `${f.label} must be a number (got "${raw}")`];
      const n = Number(s);
      if (!Number.isFinite(n)) return [false, undefined, `${f.label} must be a number (got "${raw}")`];
      return [true, n];
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return [true, raw];
      const s = String(raw).trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(s)) return [true, true];
      if (['false', '0', 'no', 'n'].includes(s)) return [true, false];
      return [false, undefined, `${f.label} must be true or false (got "${raw}")`];
    }
    case 'enum': {
      const s = String(raw).trim();
      const match = f.options?.find((o) => o.toLowerCase() === s.toLowerCase());
      if (!match) return [false, undefined, `${f.label} must be one of: ${f.options?.join(', ')} (got "${s}")`];
      return [true, match];   // normalise casing to the canonical option
    }
    case 'enum[]':
    case 'string[]': {
      // CSV gives "a|b|c"; the admin form gives a real array.
      const arr = Array.isArray(raw)
        ? raw.map((x) => String(x).trim())
        : String(raw).split(/[|;]/).map((x) => x.trim());
      const clean = arr.filter(Boolean);
      if (f.type === 'enum[]') {
        const bad = clean.filter((v) => !f.options?.some((o) => o.toLowerCase() === v.toLowerCase()));
        if (bad.length) return [false, undefined, `${f.label}: invalid value(s) ${bad.join(', ')}. Allowed: ${f.options?.join(', ')}`];
        return [true, clean.map((v) => f.options!.find((o) => o.toLowerCase() === v.toLowerCase())!)];
      }
      return [true, clean];
    }
    case 'object[]': {
      if (!Array.isArray(raw)) return [false, undefined, `${f.label} must be a list`];
      const out: any[] = [];
      for (let i = 0; i < raw.length; i++) {
        const row = raw[i] ?? {};
        const sub: Record<string, any> = {};
        for (const sf of f.of || []) {
          const v = row[sf.name];
          if (v === undefined || v === '' || v === null) {
            if (sf.required) return [false, undefined, `${f.label} row ${i + 1}: ${sf.label} is required`];
            sub[sf.name] = coerceEmpty(sf);
            continue;
          }
          const [ok, c, msg] = coerce(sf, v);
          if (!ok) return [false, undefined, `${f.label} row ${i + 1}: ${msg}`];
          sub[sf.name] = c;
        }
        out.push(sub);
      }
      return [true, out];
    }
    case 'ref': {
      // Shape check only; existence is verified against the DB in the route
      // (validate() has no DB access). Previously refs fell through to `default`
      // and any garbage string was stored as a foreign key.
      const v = String(raw).trim();
      if (!/^[a-f0-9]{24}$/i.test(v)) {
        return [false, undefined, `${f.label}: "${v}" is not a valid id`];
      }
      return [true, v];
    }
    case 'url': {
      const s = String(raw).trim();
      if (s && !/^(https?:\/\/|\/)/i.test(s)) {
        return [false, undefined, `${f.label} must be a URL starting with http:// or https:// (got "${s}")`];
      }
      return [true, s];
    }
    default: {
      // 'string' | 'text'
      if (!f.pattern) return [true, String(raw)];
      // A format-constrained field is trimmed first: a CSV cell of " 2026-03-12 "
      // is a valid date with stray whitespace, not a validation error.
      const s = String(raw).trim();
      if (!new RegExp(f.pattern).test(s)) {
        return [
          false,
          undefined,
          f.patternMessage || `${f.label} has an invalid format (got "${s}")`,
        ];
      }
      return [true, s];
    }
  }
}
