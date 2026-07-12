import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { emptyRecord, emptySubRow } from '@/lib/admin-api';
import type { CollectionSchema, Field, FieldError } from '@/lib/admin-api';

/* -------------------------------------------------------------------------- */
/* types                                                                      */
/* -------------------------------------------------------------------------- */

/** The form's working value — mirrors the record shape the API accepts. */
type FormValue = Record<string, any>;

/** Options for a 'ref' field, keyed by the referenced collection name. */
export type RefOptions = Record<string, { id: string; label: string }[]>;

export interface SchemaFormProps {
  schema: CollectionSchema;
  initial?: FormValue;
  refOptions?: RefOptions;
  submitting?: boolean;
  errors?: FieldError[];
  onSubmit: (value: FormValue) => void;
  onCancel: () => void;
}

/* -------------------------------------------------------------------------- */
/* shared styling (matches ui/input.tsx so native selects/textareas blend in)  */
/* -------------------------------------------------------------------------- */

const controlBase =
  'flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600';

const selectClass = cn(controlBase, 'h-10');
const textareaClass = cn(controlBase, 'min-h-[7rem] resize-y leading-relaxed');
const errorRing = 'border-destructive dark:border-destructive focus-visible:ring-destructive';

/* -------------------------------------------------------------------------- */
/* value helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Merge a server record over a blank one so every schema field has a key. */
function hydrate(schema: CollectionSchema, initial?: FormValue): FormValue {
  const base = emptyRecord(schema);
  if (!initial) return base;

  const out: FormValue = { ...base };
  for (const f of schema.fields) {
    const v = initial[f.name];
    if (v === undefined || v === null) continue;

    if (f.type === 'object[]') {
      const blank = emptySubRow(f);
      out[f.name] = Array.isArray(v)
        ? v.map((row) => ({ ...blank, ...(row && typeof row === 'object' ? row : {}) }))
        : [];
    } else if (f.type === 'string[]' || f.type === 'enum[]') {
      out[f.name] = Array.isArray(v) ? [...v] : [];
    } else if (f.type === 'boolean') {
      out[f.name] = Boolean(v);
    } else {
      out[f.name] = v;
    }
  }
  // Carry the id through so the caller can PUT without re-plumbing it.
  if (initial._id !== undefined) out._id = initial._id;
  if (initial.id !== undefined) out.id = initial.id;
  return out;
}

/** Numbers go out as numbers when they cleanly parse; the server coerces the rest. */
function toNumber(v: unknown): unknown {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || v.trim() === '') return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

function coerce(fields: Field[], value: FormValue): FormValue {
  const out: FormValue = { ...value };
  for (const f of fields) {
    const v = value[f.name];
    if (f.type === 'number') {
      out[f.name] = v === '' || v === null || v === undefined ? '' : toNumber(v);
    } else if (f.type === 'object[]') {
      const rows: FormValue[] = Array.isArray(v) ? v : [];
      out[f.name] = rows.map((row) => coerce(f.of || [], row));
    } else if (f.type === 'string[]') {
      out[f.name] = (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean);
    } else if (f.type === 'string' || f.type === 'text' || f.type === 'url') {
      out[f.name] = typeof v === 'string' ? v.trim() : v;
    }
  }
  return out;
}

function isEmpty(field: Field, v: unknown): boolean {
  if (field.type === 'boolean') return false; // false is a legitimate value
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'number') return Number.isNaN(v);
  return v === undefined || v === null || String(v).trim() === '';
}

/** Required-field check, including required sub-fields inside object[] rows. */
function validate(fields: Field[], value: FormValue): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const v = value[f.name];
    if (f.required && isEmpty(f, v)) {
      errs[f.name] = `${f.label} is required`;
      continue;
    }
    if (f.type === 'object[]' && Array.isArray(v)) {
      const rows = v as FormValue[];
      for (let i = 0; i < rows.length; i++) {
        for (const sf of f.of || []) {
          if (sf.required && isEmpty(sf, rows[i]?.[sf.name])) {
            errs[f.name] = `Row ${i + 1}: ${sf.label} is required`;
            break;
          }
        }
        if (errs[f.name]) break;
      }
    }
  }
  return errs;
}

/* -------------------------------------------------------------------------- */
/* small presentational pieces                                                */
/* -------------------------------------------------------------------------- */

function Help({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-xs font-medium text-destructive">{text}</p>;
}

/* -------------------------------------------------------------------------- */
/* one control per FieldType                                                  */
/* -------------------------------------------------------------------------- */

interface ControlProps {
  field: Field;
  id: string;
  value: unknown;
  invalid: boolean;
  refOptions?: RefOptions;
  onChange: (v: unknown) => void;
}

function FieldControl({ field, id, value, invalid, refOptions, onChange }: ControlProps) {
  const ring = invalid ? errorRing : '';

  switch (field.type) {
    case 'text':
      return (
        <textarea
          id={id}
          rows={5}
          className={cn(textareaClass, ring)}
          value={typeof value === 'string' ? value : value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          className={ring}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'boolean':
      return (
        <label className="flex h-10 items-center gap-2 cursor-pointer select-none">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            {Boolean(value) ? 'Yes' : 'No'}
          </span>
        </label>
      );

    case 'enum':
      return (
        <select
          id={id}
          className={cn(selectClass, ring)}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.required ? 'Select…' : '—'}</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'ref': {
      const opts = (field.ref && refOptions?.[field.ref]) || [];
      return (
        <select
          id={id}
          className={cn(selectClass, ring)}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.required ? 'Select…' : '—'}</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case 'url':
      return (
        <Input
          id={id}
          type="url"
          placeholder="https://…"
          className={ring}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'string[]':
      return (
        <StringListEditor
          id={id}
          values={Array.isArray(value) ? (value as unknown[]).map(String) : []}
          label={field.label}
          invalid={invalid}
          onChange={onChange}
        />
      );

    case 'enum[]': {
      const selected = Array.isArray(value) ? (value as unknown[]).map(String) : [];
      return (
        <div className={cn('flex flex-wrap gap-2', invalid && 'rounded-lg ring-1 ring-destructive p-2')}>
          {(field.options || []).map((opt) => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(on ? selected.filter((s) => s !== opt) : [...selected, opt])
                }
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.97]',
                  on
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {opt}
              </button>
            );
          })}
          {(field.options || []).length === 0 && (
            <p className="text-xs text-muted-foreground">No options defined.</p>
          )}
        </div>
      );
    }

    case 'object[]':
      return (
        <ObjectListEditor
          field={field}
          rows={Array.isArray(value) ? (value as FormValue[]) : []}
          refOptions={refOptions}
          onChange={onChange}
        />
      );

    case 'string':
    default:
      return (
        <Input
          id={id}
          type="text"
          className={ring}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* -------------------------------------------------------------------------- */
/* string[] — repeatable text rows                                            */
/* -------------------------------------------------------------------------- */

function StringListEditor({
  id,
  values,
  label,
  invalid,
  onChange,
}: {
  id: string;
  values: string[];
  label: string;
  invalid: boolean;
  onChange: (v: string[]) => void;
}) {
  const set = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            id={i === 0 ? id : undefined}
            type="text"
            value={v}
            className={invalid && values.length === 0 ? errorRing : undefined}
            onChange={(e) => set(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${label} ${i + 1}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...values, ''])}>
        <Plus /> Add {label.toLowerCase()}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* object[] — repeating sub-form                                              */
/* -------------------------------------------------------------------------- */

function ObjectListEditor({
  field,
  rows,
  refOptions,
  onChange,
}: {
  field: Field;
  rows: FormValue[];
  refOptions?: RefOptions;
  onChange: (rows: FormValue[]) => void;
}) {
  const subFields = field.of || [];

  const setCell = (i: number, name: string, v: unknown) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, [name]: v } : row)));
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const addRow = () => onChange([...rows, emptySubRow(field)]);

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-center text-xs text-muted-foreground">
          No {field.label.toLowerCase()} yet.
        </p>
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {field.label} {i + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(i)}
            >
              <Trash2 /> Remove
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {subFields.map((sf) => {
              const id = `${field.name}-${i}-${sf.name}`;
              // Long prose inside a row spans the full width.
              const wide = sf.type === 'text' || sf.type === 'object[]' || sf.type === 'string[]';
              return (
                <div key={sf.name} className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
                  <Label htmlFor={id} required={sf.required} className="text-xs">
                    {sf.label}
                  </Label>
                  <FieldControl
                    field={sf}
                    id={id}
                    value={row?.[sf.name]}
                    invalid={false}
                    refOptions={refOptions}
                    onChange={(v) => setCell(i, sf.name, v)}
                  />
                  <Help text={sf.help} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus /> Add {field.label.toLowerCase()}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SchemaForm                                                                 */
/* -------------------------------------------------------------------------- */

export function SchemaForm({
  schema,
  initial,
  refOptions,
  submitting,
  errors,
  onSubmit,
  onCancel,
}: SchemaFormProps) {
  const [value, setValue] = useState<FormValue>(() => hydrate(schema, initial));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  /**
   * Fields whose SERVER error the user has already addressed by editing them.
   * Without this, the red border, the message and the top banner survive every
   * keystroke until the next submit — the form looks broken after it's been fixed.
   */
  const [fixedServerFields, setFixedServerFields] = useState<Record<string, boolean>>({});

  // A fresh set of server errors (a new submit) makes every dismissal stale.
  useEffect(() => {
    setFixedServerFields({});
  }, [errors]);

  /**
   * Sections: everything that isn't long prose goes in "Details" (required and
   * list-visible fields first, so the top of the form is the useful part), and
   * the 'text' fields collapse into "Content" below — colleges has 27 fields and
   * a flat wall of inputs is unusable.
   */
  const { details, content } = useMemo(() => {
    const prose = schema.fields.filter((f) => f.type === 'text');
    const rest = schema.fields.filter((f) => f.type !== 'text');
    const rank = (f: Field) => (f.required ? 0 : f.inList ? 1 : 2);
    const ordered = rest
      .map((f, i) => ({ f, i }))
      .sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i)
      .map((x) => x.f);
    return { details: ordered, content: prose };
  }, [schema]);

  /** Server errors win over stale client ones; object[] sub-paths roll up to the group. */
  const serverErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of errors || []) {
      const top = e.field.split(/[.[]/)[0];
      if (!map[top]) map[top] = e.field === top ? e.message : `${e.field}: ${e.message}`;
    }
    return map;
  }, [errors]);

  const serverErrorFor = (name: string): string | undefined =>
    fixedServerFields[name] ? undefined : serverErrors[name];

  const errorFor = (name: string): string | undefined => serverErrorFor(name) ?? clientErrors[name];

  const setField = (name: string, v: unknown) => {
    setValue((prev) => ({ ...prev, [name]: v }));
    setClientErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    // Editing a field the server flagged clears that flag too — otherwise it stays
    // red (and the banner stays up) no matter what the user types.
    setFixedServerFields((prev) => {
      if (!serverErrors[name] || prev[name]) return prev;
      return { ...prev, [name]: true };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = coerce(schema.fields, value);
    const errs = validate(schema.fields, next);
    setClientErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector(`[data-field="${Object.keys(errs)[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onSubmit(next);
  };

  const renderField = (f: Field) => {
    const id = `sf-${f.name}`;
    const err = errorFor(f.name);
    const full =
      f.type === 'text' || f.type === 'object[]' || f.type === 'string[]' || f.type === 'enum[]';
    return (
      <div key={f.name} data-field={f.name} className={cn('space-y-2', full && 'sm:col-span-2')}>
        <Label htmlFor={id} required={f.required}>
          {f.label}
        </Label>
        <FieldControl
          field={f}
          id={id}
          value={value[f.name]}
          invalid={Boolean(err)}
          refOptions={refOptions}
          onChange={(v) => setField(f.name, v)}
        />
        <Help text={f.help} />
        <ErrorText text={err} />
      </div>
    );
  };

  const isEdit = Boolean(initial);
  const openServerErrors = Object.keys(serverErrors).filter((name) => !fixedServerFields[name]);
  const hasErrors = Object.keys(clientErrors).length > 0 || openServerErrors.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasErrors && (
        <div className="animate-fade-in rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Please fix the highlighted fields below.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          {schema.description && (
            <p className="text-sm text-muted-foreground">{schema.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">{details.map(renderField)}</div>
        </CardContent>
      </Card>

      {content.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <p className="text-sm text-muted-foreground">Long-form text shown on the public page.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">{content.map(renderField)}</div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="min-w-[8rem]">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            `Save ${schema.label.toLowerCase()}`
          ) : (
            `Create ${schema.label.toLowerCase()}`
          )}
        </Button>
      </div>
    </form>
  );
}

export default SchemaForm;
