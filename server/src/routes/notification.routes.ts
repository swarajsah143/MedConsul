import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createNotificationSchema, updateNotificationSchema } from '../validators/notification.validator';

const router = Router();
const ctrl = new NotificationController();

// Multer config for PDF uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads/notifications'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.PDF'];
    const ext = path.extname(file.originalname);
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ─── Public Routes ──────────────────────────────────────────
router.get('/', (req, res, next) => ctrl.list(req, res, next));
router.get('/filters', (req, res, next) => ctrl.getFilterOptions(req, res, next));
router.get('/:id', (req, res, next) => ctrl.getById(req, res, next));

// ─── Protected Routes (Bookmark) ────────────────────────────
router.post('/:id/bookmark', authenticate, (req, res, next) => ctrl.toggleBookmark(req, res, next));
router.get('/user/bookmarks', authenticate, (req, res, next) => ctrl.getBookmarks(req, res, next));

// ─── Admin Routes ───────────────────────────────────────────
router.post(
  '/',
  authenticate,
  upload.single('pdf'),
  validate(createNotificationSchema),
  (req, res, next) => ctrl.create(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  upload.single('pdf'),
  validate(updateNotificationSchema),
  (req, res, next) => ctrl.update(req, res, next)
);

router.delete('/:id', authenticate, (req, res, next) => ctrl.delete(req, res, next));

export default router;
