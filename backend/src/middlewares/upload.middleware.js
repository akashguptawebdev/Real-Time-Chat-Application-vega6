import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Storage engine ────────────────────────────────────────────────────────────
// Files are stored in /backend/uploads/<conversationId>/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const convId = req.params.id || 'misc';
    const dir = path.join(__dirname, '../..', 'uploads', convId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${unique}${ext}`);
  },
});

// ── Allowed types ─────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/bmp',
]);

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

// ── Size limits ───────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE  = 25 * 1024 * 1024; // 25 MB

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype) || ALLOWED_FILE_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export { MAX_IMAGE_SIZE, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_FILE_TYPES };
