import './load-env';
import fs from 'fs';
import path from 'path';

/**
 * Where student document uploads live.
 *
 * These are identity documents — Aadhaar, marksheets, photographs, signatures.
 * Two rules follow from that and are enforced elsewhere in the code:
 *
 *   1. The directory is NOT inside the web root and is never served by nginx.
 *      Every download goes through an authenticated route that checks ownership.
 *   2. Stored filenames are random. The user's original filename is metadata only,
 *      never a path — otherwise "../../etc/passwd" is a filename.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../../uploads');

/** Per-file ceiling. nginx must allow at least this much (client_max_body_size). */
export const MAX_FILE_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || String(10 * 1024 * 1024), 10);

/** Total a single student may store. The box has ~2GB free; unbounded uploads fill it. */
export const MAX_USER_BYTES = parseInt(process.env.MAX_USER_UPLOAD_BYTES || String(60 * 1024 * 1024), 10);

/**
 * Allowed types, deliberately narrow.
 *
 * No SVG and no HTML: they can carry script, and a stored XSS served from our own
 * origin would run with the victim's session. PDFs are forced to download rather
 * than render inline for the same reason.
 */
export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function ensureUploadDir(): void {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });
}

/** Guards against a stored name escaping the upload directory. */
export function resolveStored(storedName: string): string | null {
  const full = path.resolve(UPLOAD_DIR, storedName);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;   // traversal attempt
  return full;
}
