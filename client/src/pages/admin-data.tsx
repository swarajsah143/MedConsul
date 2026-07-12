import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Database, Loader2, ArrowLeft } from 'lucide-react';
import {
  adminApi,
  emptyRecord,
  ValidationError,
  type CollectionSchema,
  type FieldError,
} from '@/lib/admin-api';
import { DataTable } from '@/components/admin/data-table';
import { SchemaForm } from '@/components/admin/schema-form';
import { CsvImport } from '@/components/admin/csv-import';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Admin data management, driven entirely by the server's field-schemas.
 *
 * /admin/data            -> pick a collection
 * /admin/data/:name      -> table + create/edit form + CSV import
 *
 * Nothing here knows what a "college" is. Add a collection to the server's
 * schema/collections.ts and it shows up here with a working table, form,
 * filters, search, CSV import and export — no client change.
 */

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; item: any } | { kind: 'import' };

function useSchemas() {
  const [schemas, setSchemas] = useState<CollectionSchema[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.schemas().then(setSchemas).catch((e) => setError(e?.message || 'Failed to load schemas'));
  }, []);

  return { schemas, error };
}

/** The server caps `limit` at 500, so one request can never see past the 500th row. */
const REF_PAGE_SIZE = 500;

/** Ref fields need id -> human label, or the table shows raw Mongo ids. */
function useRefLabels(schema: CollectionSchema | undefined) {
  const [labels, setLabels] = useState<Record<string, Record<string, string>>>({});
  const [refError, setRefError] = useState<string | null>(null);

  useEffect(() => {
    if (!schema) return;
    const refs = [...new Set(schema.fields.filter((f) => f.type === 'ref' && f.ref).map((f) => f.ref!))];
    if (!refs.length) return;

    let cancelled = false;

    /** Page through the whole collection — stopping at 500 makes every row past the
     *  cap unselectable in the ref <select> and unfilterable in the table. */
    const loadRef = async (ref: string) => {
      const map: Record<string, string> = {};
      let page = 1;
      let pages = 1;
      do {
        const res = await adminApi.list(ref, { limit: REF_PAGE_SIZE, page, sort: 'name' });
        for (const item of res.items) map[item.id] = item.name ?? item.title ?? item.id;
        pages = Math.max(1, Number(res.pages) || 1);
        if (!res.items.length) break; // defensive: never spin on a server that keeps saying "more"
        page += 1;
      } while (page <= pages);
      return [ref, map] as const;
    };

    // Without a catch this was an unhandled rejection: the College dropdown just
    // stayed empty forever with nothing on screen to explain why.
    Promise.all(refs.map(loadRef))
      .then((pairs) => {
        if (cancelled) return;
        setLabels(Object.fromEntries(pairs));
        setRefError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setLabels({});
        setRefError(e?.message || 'Failed to load linked records. Reference dropdowns will be empty.');
      });

    return () => { cancelled = true; };
  }, [schema]);

  return { labels, refError };
}

export default function AdminDataPage() {
  const { collection } = useParams<{ collection?: string }>();
  const { schemas, error } = useSchemas();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const schema = useMemo(
    () => schemas?.find((s) => s.name === collection),
    [schemas, collection]
  );
  const { labels: refLabels, refError } = useRefLabels(schema);

  // Leaving a form or switching collections must clear stale server errors.
  useEffect(() => {
    setMode({ kind: 'list' });
    setFieldErrors([]);
  }, [collection]);

  const refOptions = useMemo(() => {
    const out: Record<string, { id: string; label: string }[]> = {};
    for (const [ref, map] of Object.entries(refLabels)) {
      out[ref] = Object.entries(map)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
  }, [refLabels]);

  const save = useCallback(
    async (value: Record<string, any>) => {
      if (!schema) return;
      setSubmitting(true);
      setFieldErrors([]);
      try {
        if (mode.kind === 'edit') await adminApi.update(schema.name, mode.item.id, value);
        else await adminApi.create(schema.name, value);

        setMode({ kind: 'list' });
        setReloadKey((k) => k + 1);
        setFlash(mode.kind === 'edit' ? 'Saved.' : 'Created.');
      } catch (e: any) {
        if (e instanceof ValidationError) setFieldErrors(e.errors);
        else setFlash(e?.message || 'Save failed');
      } finally {
        setSubmitting(false);
      }
    },
    [schema, mode]
  );

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  if (error) {
    return (
      <Card><CardContent className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Admin-managed data requires MongoDB. Check that MONGODB_URI is set and mongod is reachable.
        </p>
      </CardContent></Card>
    );
  }

  if (!schemas) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-red-600" /></div>;
  }

  // ── index: pick a collection ──
  if (!collection) {
    return (
      <div className="space-y-6 page-enter">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Manage Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every collection below is stored in MongoDB and read by both the app and the chatbot.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemas.map((s) => (
            <Link key={s.name} to={`/admin/data/${s.name}`}>
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{s.labelPlural}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {s.description || `${s.fields.length} fields`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!schema) return <Navigate to="/admin/data" replace />;

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/data" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> All collections
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{schema.labelPlural}</h1>
          {schema.description && <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>}
        </div>
        {flash && (
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{flash}</span>
        )}
      </div>

      {refError && (
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{refError}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Linked records could not be loaded, so reference dropdowns and filters are empty. Reload the page to try again.
            </p>
          </CardContent>
        </Card>
      )}

      {mode.kind === 'list' && (
        <DataTable
          schema={schema}
          refLabels={refLabels}
          reloadKey={reloadKey}
          onCreate={() => { setFieldErrors([]); setMode({ kind: 'create' }); }}
          onEdit={(item) => { setFieldErrors([]); setMode({ kind: 'edit', item }); }}
          onImport={() => setMode({ kind: 'import' })}
        />
      )}

      {(mode.kind === 'create' || mode.kind === 'edit') && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {mode.kind === 'edit' ? `Edit ${schema.label}` : `New ${schema.label}`}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setMode({ kind: 'list' })}>Cancel</Button>
            </div>
            <SchemaForm
              schema={schema}
              initial={mode.kind === 'edit' ? mode.item : emptyRecord(schema)}
              refOptions={refOptions}
              submitting={submitting}
              errors={fieldErrors}
              onSubmit={save}
              onCancel={() => setMode({ kind: 'list' })}
            />
          </CardContent>
        </Card>
      )}

      {mode.kind === 'import' && (
        <CsvImport
          schema={schema}
          onCancel={() => setMode({ kind: 'list' })}
          onDone={(res) => {
            setMode({ kind: 'list' });
            setReloadKey((k) => k + 1);
            // Import upserts, so a re-import of an unchanged file is legitimately
            // 0 added / N updated. Reporting only "inserted" would claim nothing happened.
            const parts: string[] = [];
            if (res.inserted) parts.push(`${res.inserted} added`);
            if (res.updated) parts.push(`${res.updated} updated`);
            if (res.deleted) parts.push(`${res.deleted} deleted`);
            setFlash(parts.length ? `Imported: ${parts.join(', ')}.` : 'Nothing changed.');
          }}
        />
      )}
    </div>
  );
}
