import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';
import { resource } from '../models/resource.model';
import { checklistDocs } from '../schema/collections';
import { isMongoConnected } from '../config/database';
import { requireAuth, requireAdmin, requireStudent, AuthRequest } from '../middlewares/auth.middleware';
import {
  UPLOAD_DIR,
  MAX_FILE_BYTES,
  MAX_USER_BYTES,
  ALLOWED_MIME,
  ensureUploadDir,
  resolveStored,
} from '../config/uploads';

/**
 * Student document uploads + admin verification.
 *
 *   POST   /api/documents/:docId        student uploads/replaces a file (multipart)
 *   GET    /api/documents/mine          the student's own submissions + statuses
 *   GET    /api/documents/:id/file      download — OWNER OR ADMIN ONLY
 *   DELETE /api/documents/:id           student withdraws their own submission
 *
 *   GET    /api/documents/admin/queue   admin review queue (filter by status)
 *   GET    /api/documents/admin/stats   pending/verified/rejected counts
 *   POST   /api/documents/admin/:id     admin verifies or rejects (with remarks)
 *
 * These are identity documents. Nothing here is public, nothing is served statically,
 * and the on-disk name is never derived from user input.
 */

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // NEVER use file.originalname for the path — it is attacker-controlled
    // ("../../etc/cron.d/x"). The real name is kept in Mongo as metadata only.
    const ext = ALLOWED_MIME[file.mimetype] || '';
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      cb(new Error(`Unsupported file type "${file.mimetype}". Allowed: PDF, JPG, PNG, WEBP.`));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.use(requireAuth);
router.use((_req, res, next) => {
  if (!isMongoConnected()) {
    res.status(503).json({ success: false, message: 'Document storage unavailable (MongoDB not connected).' });
    return;
  }
  next();
});

const unlinkQuiet = (p: string | null) => { if (p) fs.promises.unlink(p).catch(() => {}); };

// ── student ────────────────────────────────────────────────────────────

// Only students have a document requirement — staff (admin/counsellor) must never be
// able to create a submission of their own, or they'd show up in the review queue.
router.post('/:docId', requireStudent, (req: AuthRequest, res: Response) => {
  upload.single('file')(req as any, res as any, async (err: any) => {
    if (err) {
      const tooBig = err?.code === 'LIMIT_FILE_SIZE';
      res.status(400).json({
        success: false,
        message: tooBig
          ? `File is too large. Maximum ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.`
          : err.message || 'Upload failed',
      });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file was uploaded.' });
      return;
    }

    const userId = req.user!.userId;
    const docId = String(req.params.docId);

    // The checklist document must actually exist, or the submission is unattached.
    const doc = await resource(checklistDocs).get(docId);
    if (!doc) {
      unlinkQuiet(resolveStored(file.filename));
      res.status(404).json({ success: false, message: 'Unknown checklist document.' });
      return;
    }

    // Per-user quota. Replacing a file frees its old bytes, so exclude the row we overwrite.
    const existing = await SubmissionModel.findByUserAndDoc(userId, docId);
    const used = (await SubmissionModel.bytesUsedBy(userId)) - (existing?.size ?? 0);
    if (used + file.size > MAX_USER_BYTES) {
      unlinkQuiet(resolveStored(file.filename));
      res.status(413).json({
        success: false,
        message: `Storage limit reached (${Math.round(MAX_USER_BYTES / 1024 / 1024)}MB). Remove a document and try again.`,
      });
      return;
    }

    const saved = await SubmissionModel.upsert({
      userId,
      docId,
      originalName: file.originalname.slice(0, 200),
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    });

    // A replacement leaves the previous file orphaned on disk.
    if (existing && existing.storedName !== saved.storedName) {
      unlinkQuiet(resolveStored(existing.storedName));
    }

    res.status(201).json({ success: true, data: { submission: saved } });
  });
});

router.get('/mine', async (req: AuthRequest, res: Response) => {
  const items = await SubmissionModel.forUser(req.user!.userId);
  res.json({ success: true, data: { items } });
});

/**
 * Download. This is the whole security story: an identity document must only ever
 * reach its owner or an admin, and must never render inline in our origin.
 */
router.get('/:id/file', async (req: AuthRequest, res: Response) => {
  const sub = await SubmissionModel.get(String(req.params.id));
  if (!sub) { res.status(404).json({ success: false, message: 'Not found' }); return; }

  const isOwner = sub.userId === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    // 404, not 403 — a stranger should not even learn that this id exists.
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  const full = resolveStored(sub.storedName);
  if (!full || !fs.existsSync(full)) {
    res.status(410).json({ success: false, message: 'The stored file is missing.' });
    return;
  }

  // Force a download and forbid sniffing: an uploaded file must never be interpreted
  // as HTML/JS in our own origin, which would be stored XSS against the reviewer.
  res.setHeader('Content-Type', sub.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${sub.originalName.replace(/[^\w.\- ]/g, '_')}"`
  );
  fs.createReadStream(full).pipe(res);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const sub = await SubmissionModel.get(String(req.params.id));
  if (!sub) { res.status(404).json({ success: false, message: 'Not found' }); return; }

  const isOwner = sub.userId === req.user!.userId;
  if (!isOwner && req.user!.role !== 'admin') {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  await SubmissionModel.remove(sub.id);
  unlinkQuiet(resolveStored(sub.storedName));
  res.json({ success: true, message: 'Removed' });
});

// ── admin ──────────────────────────────────────────────────────────────

router.get('/admin/stats', requireAdmin, async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await SubmissionModel.counts() });
});

/** The review queue, enriched with who submitted what — ids alone are unusable. */
router.get('/admin/queue', requireAdmin, async (req: AuthRequest, res: Response) => {
  const status = req.query.status as any;
  const page = Math.max(1, Number(req.query.page) || 1);

  const result = await SubmissionModel.list(
    status && ['pending', 'verified', 'rejected'].includes(status) ? { status } : {},
    page,
    50
  );

  const docs = await resource(checklistDocs).all();
  const docById = new Map(docs.map((d: any) => [d.id, d]));

  const users = await UserModel.findAll();
  const userById = new Map(users.map((u: any) => [u.id, u]));

  const items = result.items.map((s) => ({
    ...s,
    documentName: docById.get(s.docId)?.name ?? 'Unknown document',
    section: docById.get(s.docId)?.section ?? '',
    studentName: userById.get(s.userId)?.name ?? 'Unknown student',
    studentEmail: userById.get(s.userId)?.email ?? '',
  }));

  res.json({ success: true, data: { ...result, items } });
});

router.post('/admin/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { status, remarks } = req.body || {};
  if (!['verified', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, message: 'status must be "verified" or "rejected"' });
    return;
  }
  // A rejection with no reason is useless to the student — they cannot fix it.
  if (status === 'rejected' && !String(remarks || '').trim()) {
    res.status(400).json({ success: false, message: 'A reason is required when rejecting a document.' });
    return;
  }

  const updated = await SubmissionModel.setStatus(
    String(req.params.id),
    status,
    req.user!.userId,
    String(remarks || '').slice(0, 500)
  );
  if (!updated) { res.status(404).json({ success: false, message: 'Not found' }); return; }

  res.json({ success: true, data: { submission: updated } });
});

export default router;
